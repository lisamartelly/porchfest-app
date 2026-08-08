import { Router, Request, Response } from "express";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import { adminOnly, superDuperAdminOnly, AuthRequest } from "../middleware/auth.js";
import { db } from "../data/db.js";
import logger from "../lib/logger.js";
import type { Event } from "../data/db.js";
import { getPresignedUploadUrl } from "../services/s3.js";
import { sendReviewerAssignmentEmail } from "../services/email.js";
import { geocodeAddress } from "../services/geocode.js";

export const adminRouter: Router = Router();

// All admin routes require admin role (admin or super-duper-admin)
adminRouter.use(adminOnly);

async function resolveOrgActiveEvent(
  req: AuthRequest,
  orgId: number | string
): Promise<{ authorized: boolean; event: Event | null }> {
  if (req.user?.role !== "super-duper-admin") {
    const membership = await db.organizationUsers.findByUserAndOrg(
      req.user!.id,
      Number(orgId)
    );
    if (!membership) return { authorized: false, event: null };
  }
  const event = await db.events.findActiveByOrganizationId(orgId);
  return { authorized: true, event };
}

// Returns true if the current user is an organizer or owner of the org that
// owns the given event. Reviewers are intentionally excluded. Super-duper-admins
// always pass.
async function isOrganizerForEvent(
  req: AuthRequest,
  eventId: number | string
): Promise<boolean> {
  if (req.user?.role === "super-duper-admin") return true;
  const event = await db.events.findById(eventId);
  if (!event) return false;
  const membership = await db.organizationUsers.findByUserAndOrg(
    req.user!.id,
    event.organization_id
  );
  if (!membership) return false;
  return membership.role === "owner" || membership.role === "organizer";
}

// =========================================================================
// SUPER-DUPER-ADMIN ONLY: Organization management
// =========================================================================

// List all organizations
adminRouter.get("/organizations", superDuperAdminOnly, async (req: Request, res: Response) => {
  try {
    const orgs = await db.organizations.findAll();
    res.json(orgs);
  } catch (error) {
    logger.error({ err: error }, "Error fetching organizations");
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

// Create organization
adminRouter.post(
  "/organizations",
  superDuperAdminOnly,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("slug")
      .trim()
      .notEmpty()
      .matches(/^[a-z0-9-]+$/)
      .withMessage("Slug must be lowercase alphanumeric with hyphens"),
    body("city").optional().trim(),
    body("state").optional().trim(),
    body("description").optional().trim(),
    body("website").optional().trim(),
    body("contact_email").optional().isEmail(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, slug, city, state, description, website, contact_email } =
        req.body;

      const existingOrg = await db.organizations.findBySlug(slug);
      if (existingOrg) {
        return res.status(400).json({ error: "An organization with that slug already exists" });
      }

      const org = await db.organizations.create({
        name,
        slug,
        city: city || null,
        state: state || null,
        description: description || null,
        website: website || null,
        contact_email: contact_email || null,
      });

      res.json(org);
    } catch (error) {
      logger.error({ err: error }, "Error creating organization");
      res.status(500).json({ error: "Failed to create organization" });
    }
  }
);

// =========================================================================
// SUPER-DUPER-ADMIN ONLY: User management
// =========================================================================

// List users (scoped by org_id when provided)
adminRouter.get("/users", async (req: AuthRequest, res: Response) => {
  try {
    const { org_id } = req.query;

    if (org_id) {
      const orgIdNum = Number(org_id);
      if (req.user?.role !== "super-duper-admin") {
        const membership = await db.organizationUsers.findByUserAndOrg(
          req.user!.id,
          orgIdNum
        );
        if (!membership) {
          return res.status(403).json({ error: "Not a member of this organization" });
        }
      }
      const users = await db.organizationUsers.getUsersForOrganization(orgIdNum);
      const orgMemberships = await db.organizationUsers.findByOrganizationId(orgIdNum);
      const roleMap = new Map(orgMemberships.map((m) => [m.user_id, m.role]));
      return res.json(
        users.map((u) => ({
          id: u.id,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          org_role: roleMap.get(u.id) || "organizer",
          created_at: u.created_at,
        }))
      );
    }

    if (req.user?.role !== "super-duper-admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const users = await db.users.findAll();
    const usersWithOrgs = await Promise.all(
      users.map(async (u) => {
        const orgs = await db.organizationUsers.getOrganizationsForUser(u.id);
        return {
          id: u.id,
          email: u.email,
          role: u.role,
          first_name: u.first_name,
          last_name: u.last_name,
          created_at: u.created_at,
          organizations: orgs.map((o) => ({ id: o.id, name: o.name })),
        };
      })
    );
    res.json(usersWithOrgs);
  } catch (error) {
    logger.error({ err: error }, "Error fetching users");
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Create user and assign to organization
adminRouter.post(
  "/users",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("organization_id").notEmpty().withMessage("Organization is required"),
    body("org_role")
      .isIn(["owner", "organizer", "reviewer"])
      .withMessage("Role must be owner, organizer, or reviewer"),
    body("first_name").optional({ nullable: true }).trim(),
    body("last_name").optional({ nullable: true }).trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password, organization_id, org_role, first_name, last_name } = req.body;

      if (req.user?.role !== "super-duper-admin") {
        const membership = await db.organizationUsers.findByUserAndOrg(
          req.user!.id,
          organization_id
        );
        if (!membership) {
          return res.status(403).json({ error: "Not a member of this organization" });
        }
      }

      const org = await db.organizations.findById(organization_id);
      if (!org) {
        return res.status(400).json({ error: "Organization not found" });
      }

      let user = await db.users.findByEmail(email);
      if (user) {
        const existing = await db.organizationUsers.findByUserAndOrg(
          user.id,
          organization_id
        );
        if (existing) {
          return res.status(400).json({ error: "User is already a member of this organization" });
        }
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await db.users.create({
          email,
          password_hash: hashedPassword,
          role: "user",
          first_name,
          last_name,
        });
      }

      await db.organizationUsers.create({
        user_id: user.id,
        organization_id,
        role: org_role,
      });

      res.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        org_role,
        created_at: user.created_at,
      });
    } catch (error) {
      logger.error({ err: error }, "Error creating user");
      res.status(500).json({ error: "Failed to create user" });
    }
  }
);

// Update a user's profile, org role, or password
adminRouter.patch(
  "/users/:userId",
  [
    body("email").optional().isEmail().withMessage("Valid email required"),
    body("first_name").optional({ nullable: true }).trim(),
    body("last_name").optional({ nullable: true }).trim(),
    body("org_role").optional().isIn(["owner", "organizer", "reviewer"]),
    body("new_password").optional().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const targetUserId = Number(req.params.userId);
      const { org_id } = req.query;
      const { email, first_name, last_name, org_role, new_password } = req.body;

      if (!org_id) {
        return res.status(400).json({ error: "org_id query parameter is required" });
      }
      const orgIdNum = Number(org_id);

      if (req.user?.role !== "super-duper-admin") {
        const membership = await db.organizationUsers.findByUserAndOrg(
          req.user!.id,
          orgIdNum
        );
        if (!membership) {
          return res.status(403).json({ error: "Not a member of this organization" });
        }
      }

      const targetMembership = await db.organizationUsers.findByUserAndOrg(
        targetUserId,
        orgIdNum
      );
      if (!targetMembership) {
        return res.status(404).json({ error: "User is not a member of this organization" });
      }

      if (email) {
        const existingUser = await db.users.findByEmail(email);
        if (existingUser && existingUser.id !== targetUserId) {
          return res.status(400).json({ error: "Another user already has that email" });
        }
      }

      const profileUpdates: { email?: string; first_name?: string | null; last_name?: string | null } = {};
      if (email !== undefined) profileUpdates.email = email;
      if (first_name !== undefined) profileUpdates.first_name = first_name;
      if (last_name !== undefined) profileUpdates.last_name = last_name;
      if (Object.keys(profileUpdates).length > 0) {
        await db.users.update(targetUserId, profileUpdates);
      }

      if (org_role) {
        if (targetMembership.role === "owner" && org_role !== "owner") {
          const members = await db.organizationUsers.findByOrganizationId(orgIdNum);
          const ownerCount = members.filter((m) => m.role === "owner").length;
          if (ownerCount <= 1) {
            return res.status(400).json({ error: "Cannot remove the last owner. Assign another owner first." });
          }
        }
        await db.organizationUsers.updateRole(targetUserId, orgIdNum, org_role);
      }

      if (new_password) {
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.users.updatePassword(targetUserId, hashedPassword);
      }

      const updatedUser = await db.users.findById(targetUserId);
      const updatedMembership = await db.organizationUsers.findByUserAndOrg(
        targetUserId,
        orgIdNum
      );

      res.json({
        id: updatedUser!.id,
        email: updatedUser!.email,
        first_name: updatedUser!.first_name,
        last_name: updatedUser!.last_name,
        org_role: updatedMembership!.role,
        created_at: updatedUser!.created_at,
      });
    } catch (error) {
      logger.error({ err: error }, "Error updating user");
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// =========================================================================
// ADMIN: Event management (any admin in the org can create events)
// =========================================================================

// List events for the current user's organizations
adminRouter.get("/my-events", async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === "super-duper-admin") {
      const allEvents = await db.events.findAll();
      const orgs = await db.organizations.findAll();
      const eventsWithOrgs = allEvents.map((e) => ({
        ...e,
        organization: orgs.find((o) => o.id === e.organization_id),
      }));
      return res.json(eventsWithOrgs);
    }

    const userOrgs = await db.organizationUsers.getOrganizationsForUser(
      req.user!.id
    );
    const allEvents: Array<Record<string, unknown>> = [];
    for (const org of userOrgs) {
      const events = await db.events.findByOrganizationId(org.id);
      for (const e of events) {
        allEvents.push({ ...e, organization: { id: org.id, name: org.name } });
      }
    }
    res.json(allEvents);
  } catch (error) {
    logger.error({ err: error }, "Error fetching events");
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get organizations the current user belongs to (for event creation dropdown)
adminRouter.get("/my-organizations", async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === "super-duper-admin") {
      const allOrgs = await db.organizations.findAll();
      return res.json(allOrgs.map((o) => ({ ...o, org_role: "owner" })));
    }

    const memberships = await db.organizationUsers.findByUserId(req.user!.id);
    const orgs = await db.organizationUsers.getOrganizationsForUser(req.user!.id);
    const roleMap = new Map(memberships.map((m) => [m.organization_id, m.role]));
    res.json(orgs.map((o) => ({ ...o, org_role: roleMap.get(o.id) || "organizer" })));
  } catch (error) {
    logger.error({ err: error }, "Error fetching user organizations");
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

// Get bands (scoped by org_id when provided)
adminRouter.get("/bands", async (req: AuthRequest, res: Response) => {
  try {
    const { status, org_id } = req.query;
    if (org_id) {
      const { authorized, event } = await resolveOrgActiveEvent(req, Number(org_id));
      if (!authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      if (!event) return res.json([]);
      const bands = await db.bands.findByEventId(event.id);
      if (status) {
        return res.json(bands.filter((b) => b.status === status));
      }
      return res.json(bands);
    }
    const allBands = await db.bands.findAll(status as string | undefined);
    res.json(allBands);
  } catch (error) {
    logger.error({ err: error }, "Error fetching bands");
    res.status(500).json({ error: "Failed to fetch bands" });
  }
});

// Update band status
adminRouter.patch(
  "/bands/:id/status",
  [body("status").isIn(["pending", "under_review", "approved", "rejected", "withdrew"])],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

      const band = await db.bands.updateStatus(id, status);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      res.json(band);
    } catch (error) {
      logger.error({ err: error }, "Error updating band status");
      res.status(500).json({ error: "Failed to update band status" });
    }
  }
);

// Update band admin notes (organizer/owner only — separate from the review process)
adminRouter.patch(
  "/bands/:id/notes",
  [body("admin_notes").optional({ nullable: true }).isString()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;

      const band = await db.bands.findById(id);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      const authorized = await isOrganizerForEvent(req, band.event_id);
      if (!authorized) {
        return res.status(403).json({ error: "Organizer access required" });
      }

      const updatedBand = await db.bands.updateAdminNotes(id, req.body.admin_notes ?? null);
      res.json(updatedBand);
    } catch (error) {
      logger.error({ err: error }, "Error updating band admin notes");
      res.status(500).json({ error: "Failed to update band admin notes" });
    }
  }
);

// Edit band application fields (organizer/owner only)
adminRouter.patch(
  "/bands/:id/edit",
  [
    body("band_name").optional().trim().notEmpty().isLength({ max: 255 }),
    body("contact_name").optional().trim().notEmpty().isLength({ max: 255 }),
    body("contact_email").optional().isEmail().isLength({ max: 255 }),
    body("contact_phone").optional().trim().notEmpty().isLength({ max: 50 }),
    body("genre").optional().trim().notEmpty().isLength({ max: 100 }),
    body("member_count").optional().trim().notEmpty().isLength({ max: 100 }),
    body("music_sample_link").optional().trim().notEmpty(),
    body("bio").optional().trim(),
    body("set_length").optional().trim().isLength({ max: 100 }),
    body("venmo_handle").optional({ nullable: true }).isLength({ max: 100 }),
    body("instagram").optional({ nullable: true }).isLength({ max: 100 }),
    body("spotify").optional({ nullable: true }).isLength({ max: 100 }),
    body("soundcloud").optional({ nullable: true }).isLength({ max: 100 }),
    body("bandcamp").optional({ nullable: true }).isLength({ max: 100 }),
    body("facebook").optional({ nullable: true }).isLength({ max: 100 }),
    body("website").optional({ nullable: true }),
    body("scheduling_notes").optional({ nullable: true }),
    body("photo_key").optional({ nullable: true }).isString(),
    body("questions_comments").optional({ nullable: true }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;

      const band = await db.bands.findById(id);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      const authorized = await isOrganizerForEvent(req, band.event_id);
      if (!authorized) {
        return res.status(403).json({ error: "Organizer access required" });
      }

      const updatedBand = await db.bands.update(id, req.body);
      res.json(updatedBand);
    } catch (error) {
      logger.error({ err: error }, "Error editing band");
      res.status(500).json({ error: "Failed to edit band" });
    }
  }
);

// Update whether an accepted band has confirmed their acceptance.
// true = confirmed, false = canceled, null = no response yet (reset).
adminRouter.patch(
  "/bands/:id/acceptance",
  [body("acceptance_confirmed").optional({ nullable: true }).isBoolean()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const confirmed =
        req.body.acceptance_confirmed === undefined
          ? null
          : req.body.acceptance_confirmed;

      const band = await db.bands.updateAcceptance(id, confirmed);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      res.json(band);
    } catch (error) {
      logger.error({ err: error }, "Error updating band acceptance");
      res.status(500).json({ error: "Failed to update band acceptance" });
    }
  }
);

const VALID_SCHEDULE_STATUSES = ["needs_attention", "in_progress", "finalized"];

// Update band schedule status (needs_attention / in_progress / finalized)
adminRouter.patch(
  "/bands/:id/schedule-status",
  [body("schedule_status").optional({ nullable: true }).isString()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { schedule_status } = req.body;

      if (schedule_status !== null && !VALID_SCHEDULE_STATUSES.includes(schedule_status)) {
        return res.status(400).json({
          error: `Invalid schedule_status. Must be one of: ${VALID_SCHEDULE_STATUSES.join(", ")}`,
        });
      }

      const band = await db.bands.findById(id);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      if (schedule_status && !band.assigned_porch_id) {
        return res.status(400).json({
          error: "Cannot set schedule status on an unscheduled band",
        });
      }

      const updatedBand = await db.bands.updateScheduleStatus(id, schedule_status);
      res.json(updatedBand);
    } catch (error) {
      logger.error({ err: error }, "Error updating band schedule status");
      res.status(500).json({ error: "Failed to update band schedule status" });
    }
  }
);

// Update porch schedule status (needs_attention / in_progress / finalized)
adminRouter.patch(
  "/porches/:id/schedule-status",
  [body("schedule_status").optional({ nullable: true }).isString()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { schedule_status } = req.body;

      if (schedule_status !== null && !VALID_SCHEDULE_STATUSES.includes(schedule_status)) {
        return res.status(400).json({
          error: `Invalid schedule_status. Must be one of: ${VALID_SCHEDULE_STATUSES.join(", ")}`,
        });
      }

      const porch = await db.porches.findById(id);
      if (!porch) {
        return res.status(404).json({ error: "Porch not found" });
      }

      const updatedPorch = await db.porches.updateScheduleStatus(id, schedule_status);
      res.json(updatedPorch);
    } catch (error) {
      logger.error({ err: error }, "Error updating porch schedule status");
      res.status(500).json({ error: "Failed to update porch schedule status" });
    }
  }
);

// Get porches (scoped by org_id when provided)
adminRouter.get("/porches", async (req: AuthRequest, res: Response) => {
  try {
    const { status, org_id } = req.query;
    if (org_id) {
      const { authorized, event } = await resolveOrgActiveEvent(req, Number(org_id));
      if (!authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      if (!event) return res.json([]);
      const porches = await db.porches.findByEventId(event.id);
      if (status) {
        return res.json(porches.filter((p) => p.status === status));
      }
      return res.json(porches);
    }
    const allPorches = await db.porches.findAll(status as string | undefined);
    res.json(allPorches);
  } catch (error) {
    logger.error({ err: error }, "Error fetching porches");
    res.status(500).json({ error: "Failed to fetch porches" });
  }
});

// Update porch status
adminRouter.patch(
  "/porches/:id/status",
  [body("status").isIn(["pending", "under_review", "approved", "rejected", "withdrew"])],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

      const porch = await db.porches.updateStatus(id, status);
      if (!porch) {
        return res.status(404).json({ error: "Porch not found" });
      }

      res.json(porch);
    } catch (error) {
      logger.error({ err: error }, "Error updating porch status");
      res.status(500).json({ error: "Failed to update porch status" });
    }
  }
);

// Update porch admin notes (organizer/owner only — separate from the review process)
adminRouter.patch(
  "/porches/:id/notes",
  [body("admin_notes").optional({ nullable: true }).isString()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;

      const porch = await db.porches.findById(id);
      if (!porch) {
        return res.status(404).json({ error: "Porch not found" });
      }

      const authorized = await isOrganizerForEvent(req, porch.event_id);
      if (!authorized) {
        return res.status(403).json({ error: "Organizer access required" });
      }

      const updatedPorch = await db.porches.updateAdminNotes(id, req.body.admin_notes ?? null);
      res.json(updatedPorch);
    } catch (error) {
      logger.error({ err: error }, "Error updating porch admin notes");
      res.status(500).json({ error: "Failed to update porch admin notes" });
    }
  }
);

// Edit porch application fields (organizer/owner only)
adminRouter.patch(
  "/porches/:id/edit",
  [
    body("owner_name").optional().trim().notEmpty().isLength({ max: 255 }),
    body("email").optional().isEmail().isLength({ max: 255 }),
    body("phone").optional({ nullable: true }).trim().isLength({ max: 50 }),
    body("address").optional().trim().notEmpty().isLength({ max: 255 }),
    body("city").optional().trim(),
    body("capacity").optional({ nullable: true }).isInt({ min: 0 }),
    body("has_power").optional().isBoolean(),
    body("parking_notes").optional({ nullable: true }),
    body("accessibility_notes").optional({ nullable: true }),
    body("space_description").optional({ nullable: true }),
    body("has_band_in_mind").optional({ nullable: true }),
    body("music_preferences").optional({ nullable: true }),
    body("band_count_preference").optional({ nullable: true }),
    body("rain_date_available").optional({ nullable: true }),
    body("comments").optional({ nullable: true }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;

      const porch = await db.porches.findById(id);
      if (!porch) {
        return res.status(404).json({ error: "Porch not found" });
      }

      const authorized = await isOrganizerForEvent(req, porch.event_id);
      if (!authorized) {
        return res.status(403).json({ error: "Organizer access required" });
      }

      const updatedPorch = await db.porches.update(id, req.body);
      res.json(updatedPorch);
    } catch (error) {
      logger.error({ err: error }, "Error editing porch");
      res.status(500).json({ error: "Failed to edit porch" });
    }
  }
);

// Get active event settings (scoped by org_id when provided)
adminRouter.get("/event", async (req: AuthRequest, res: Response) => {
  try {
    const { org_id } = req.query;
    let activeEvent;
    if (org_id) {
      const { authorized, event } = await resolveOrgActiveEvent(req, Number(org_id));
      if (!authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      activeEvent = event;
    } else {
      activeEvent = await db.events.findActive();
    }
    if (!activeEvent) {
      return res.status(404).json({ error: "No active event found" });
    }
    res.json(activeEvent);
  } catch (error) {
    logger.error({ err: error }, "Error fetching event");
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Update active event settings
adminRouter.patch(
  "/event",
  [
    body("name").optional().trim().notEmpty(),
    body("date").optional().isString(),
    body("start_time").optional().isString(),
    body("end_time").optional().isString(),
    body("description").optional(),
    body("band_applications_open").optional({ nullable: true }).isString(),
    body("band_applications_close").optional({ nullable: true }).isString(),
    body("porch_applications_open").optional({ nullable: true }).isString(),
    body("porch_applications_close").optional({ nullable: true }).isString(),
    body("porch_app_description").optional({ nullable: true }).isString(),
    body("porch_app_photo_key").optional({ nullable: true }).isString(),
    body("default_city").optional({ nullable: true }).isString(),
    body("default_state").optional({ nullable: true }).isString(),
    body("map_published").optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { org_id } = req.query;
      let activeEvent;
      if (org_id) {
        const { authorized, event } = await resolveOrgActiveEvent(req, Number(org_id));
        if (!authorized) {
          return res.status(403).json({ error: "Not a member of this organization" });
        }
        activeEvent = event;
      } else {
        activeEvent = await db.events.findActive();
      }
      if (!activeEvent) {
        return res.status(404).json({ error: "No active event found" });
      }

      const updatedEvent = await db.events.update(activeEvent.id, {
        name: req.body.name,
        date: req.body.date,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        description: req.body.description,
        band_applications_open: req.body.band_applications_open,
        band_applications_close: req.body.band_applications_close,
        porch_applications_open: req.body.porch_applications_open,
        porch_applications_close: req.body.porch_applications_close,
        porch_app_description: req.body.porch_app_description,
        porch_app_photo_key: req.body.porch_app_photo_key,
        default_city: req.body.default_city,
        default_state: req.body.default_state,
        map_published: req.body.map_published,
      });

      res.json(updatedEvent);
    } catch (error) {
      logger.error({ err: error }, "Error updating event");
      res.status(500).json({ error: "Failed to update event" });
    }
  }
);

// Create event (must belong to an organization the user is part of)
adminRouter.post(
  "/events",
  [
    body("name").trim().notEmpty(),
    body("date").isString(),
    body("organization_id").notEmpty().withMessage("Organization is required"),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, date, start_time, end_time, description, organization_id } =
        req.body;

      const org = await db.organizations.findById(organization_id);
      if (!org) {
        return res.status(400).json({ error: "Organization not found" });
      }

      // Verify user belongs to this organization (unless super-duper-admin)
      if (req.user?.role !== "super-duper-admin") {
        const membership = await db.organizationUsers.findByUserAndOrg(
          req.user!.id,
          organization_id
        );
        if (!membership) {
          return res
            .status(403)
            .json({ error: "You are not a member of this organization" });
        }
      }

      const event = await db.events.create({
        organization_id,
        name,
        date,
        start_time: start_time || "12:00",
        end_time: end_time || "18:00",
        description: description || null,
        is_active: true,
      });

      // Create event tasks for all recurring task templates in this org
      try {
        const orgTasks = await db.tasks.findByOrganizationId(organization_id);
        for (const task of orgTasks) {
          if (task.recurring) {
            await db.eventTasks.create({
              task_id: task.id,
              event_id: event.id,
            });
          }
        }
      } catch (err) {
        logger.error({ err }, "Error copying recurring tasks to new event");
      }

      res.json(event);
    } catch (error) {
      logger.error({ err: error }, "Error creating event");
      res.status(500).json({ error: "Failed to create event" });
    }
  }
);

// Update event by ID
adminRouter.patch(
  "/events/:eventId",
  [
    body("name").optional().trim().notEmpty(),
    body("date").optional().isString(),
    body("start_time").optional().isString(),
    body("end_time").optional().isString(),
    body("description").optional(),
    body("band_applications_open").optional({ nullable: true }).isString(),
    body("band_applications_close").optional({ nullable: true }).isString(),
    body("porch_applications_open").optional({ nullable: true }).isString(),
    body("porch_applications_close").optional({ nullable: true }).isString(),
    body("porch_app_description").optional({ nullable: true }).isString(),
    body("porch_app_photo_key").optional({ nullable: true }).isString(),
    body("is_active").optional().isBoolean(),
    body("default_city").optional({ nullable: true }).isString(),
    body("default_state").optional({ nullable: true }).isString(),
    body("map_published").optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const event = await db.events.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (req.user?.role !== "super-duper-admin") {
        const membership = await db.organizationUsers.findByUserAndOrg(
          req.user!.id,
          event.organization_id
        );
        if (!membership) {
          return res
            .status(403)
            .json({ error: "You are not a member of this event's organization" });
        }
      }

      const updatedEvent = await db.events.update(eventId, {
        name: req.body.name,
        date: req.body.date,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        description: req.body.description,
        band_applications_open: req.body.band_applications_open,
        band_applications_close: req.body.band_applications_close,
        porch_applications_open: req.body.porch_applications_open,
        porch_applications_close: req.body.porch_applications_close,
        porch_app_description: req.body.porch_app_description,
        porch_app_photo_key: req.body.porch_app_photo_key,
        is_active: req.body.is_active,
        default_city: req.body.default_city,
        default_state: req.body.default_state,
        map_published: req.body.map_published,
      });

      res.json(updatedEvent);
    } catch (error) {
      logger.error({ err: error }, "Error updating event");
      res.status(500).json({ error: "Failed to update event" });
    }
  }
);

// Create time slot
adminRouter.post(
  "/events/:eventId/slots",
  [body("start_time").isISO8601(), body("end_time").isISO8601()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { eventId } = req.params;
      const { start_time, end_time } = req.body;

      const slot = await db.timeSlots.create({
        event_id: eventId,
        start_time,
        end_time,
      });

      res.json(slot);
    } catch (error) {
      logger.error({ err: error }, "Error creating time slot");
      res.status(500).json({ error: "Failed to create time slot" });
    }
  }
);

// Get a presigned S3 upload URL for porch app configuration photo
adminRouter.get("/porch-app-photo/upload-url", async (req: AuthRequest, res: Response) => {
  const filename = req.query.filename as string;
  if (!filename) {
    return res.status(400).json({ error: "filename query parameter is required" });
  }

  try {
    const ext = filename.split(".").pop() || "jpg";
    const key = `porch-app-config/${crypto.randomUUID()}/${Date.now()}.${ext}`;
    const contentType = req.query.contentType as string || `image/${ext === "jpg" ? "jpeg" : ext}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    return res.json({ uploadUrl, key });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// Get scheduling data (scoped by org_id when provided)
adminRouter.get("/scheduling", async (req: AuthRequest, res: Response) => {
  try {
    const { org_id } = req.query;
    if (org_id) {
      const { authorized, event } = await resolveOrgActiveEvent(req, Number(org_id));
      if (!authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      if (!event) return res.json({ bands: [], porches: [], time_slots: [] });
      const [bands, porches, slots] = await Promise.all([
        db.bands.findByEventId(event.id),
        db.porches.findByEventId(event.id),
        db.timeSlots.findByEventId(event.id),
      ]);
      return res.json({
        bands: bands.filter((b) => b.status === "approved"),
        porches: porches.filter((p) => p.status === "approved"),
        time_slots: slots,
      });
    }
    const approvedBands = await db.bands.findApproved();
    const approvedPorches = await db.porches.findApproved();
    const allSlots = await db.timeSlots.findAll();
    res.json({
      bands: approvedBands,
      porches: approvedPorches,
      time_slots: allSlots,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching scheduling data");
    res.status(500).json({ error: "Failed to fetch scheduling data" });
  }
});

// Helper to format time for display (HH:mm to h:mm AM/PM)
function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Schedule a band (assign porch and set times)
adminRouter.patch(
  "/bands/:id/schedule",
  [
    body("assigned_porch_id").optional({ nullable: true }).isInt().toInt(),
    body("set_start_time").optional({ nullable: true }).isString(),
    body("set_end_time").optional({ nullable: true }).isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { assigned_porch_id, set_start_time, set_end_time } = req.body;

      const band = await db.bands.findById(id);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      // Validate porch exists and is approved
      if (assigned_porch_id) {
        const porch = await db.porches.findById(assigned_porch_id);
        if (!porch) {
          return res.status(400).json({ error: "Porch not found" });
        }
        if (porch.status !== "approved") {
          return res
            .status(400)
            .json({ error: "Porch must be approved to schedule bands" });
        }
      }

      // Check for overlapping sets at the same porch
      if (assigned_porch_id && set_start_time && set_end_time) {
        const overlappingBand = await db.bands.findOverlappingAtPorch(
          assigned_porch_id,
          set_start_time,
          set_end_time,
          id
        );

        if (overlappingBand) {
          const porch = await db.porches.findById(assigned_porch_id);
          return res.status(400).json({
            error: `Time conflict: "${
              overlappingBand.band_name
            }" is already scheduled at ${
              porch?.address
            } from ${formatTimeDisplay(
              overlappingBand.set_start_time!
            )} to ${formatTimeDisplay(overlappingBand.set_end_time!)}`,
          });
        }
      }

      // Update band scheduling
      const updatedBand = await db.bands.updateSchedule(id, {
        assigned_porch_id: assigned_porch_id || null,
        set_start_time: set_start_time || null,
        set_end_time: set_end_time || null,
      });

      res.json(updatedBand);
    } catch (error) {
      logger.error({ err: error }, "Error scheduling band");
      res.status(500).json({ error: "Failed to schedule band" });
    }
  }
);

// Get approved porches (scoped by org_id when provided)
adminRouter.get("/porches/approved", async (req: AuthRequest, res: Response) => {
  try {
    const { org_id } = req.query;
    if (org_id) {
      const { authorized, event } = await resolveOrgActiveEvent(req, Number(org_id));
      if (!authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      if (!event) return res.json([]);
      const porches = await db.porches.findByEventId(event.id);
      return res.json(porches.filter((p) => p.status === "approved"));
    }
    const approvedPorches = await db.porches.findApproved();
    res.json(approvedPorches);
  } catch (error) {
    logger.error({ err: error }, "Error fetching approved porches");
    res.status(500).json({ error: "Failed to fetch approved porches" });
  }
});

// Assign bands to reviewers (random, equal distribution)
adminRouter.post("/bands/assign-reviewers", async (req: AuthRequest, res) => {
  try {
    const { org_id } = req.query;
    const { userIds, sendEmail } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds must be a non-empty array" });
    }

    let activeEvent;
    if (org_id) {
      const result = await resolveOrgActiveEvent(req, Number(org_id));
      if (!result.authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      activeEvent = result.event;
    } else {
      activeEvent = await db.events.findActive();
    }
    if (!activeEvent) {
      return res.status(404).json({ error: "No active event found" });
    }

    const normalizedUserIds = (userIds as unknown[]).map((id) => Number(id));
    if (normalizedUserIds.some((id) => isNaN(id))) {
      return res.status(400).json({ error: "All userIds must be valid numbers" });
    }

    if (org_id) {
      const orgIdNum = Number(org_id);
      for (const uid of normalizedUserIds) {
        const membership = await db.organizationUsers.findByUserAndOrg(uid, orgIdNum);
        if (!membership) {
          return res.status(400).json({ error: `User ${uid} is not a member of this organization` });
        }
      }
    }

    const allBands = await db.bands.findByEventId(activeEvent.id);
    const unassignedBands = allBands.filter((b) => b.assigned_reviewer_id == null);
    if (unassignedBands.length === 0) {
      return res.status(400).json({ error: "No unassigned bands to assign" });
    }

    const shuffledBands = [...unassignedBands].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledBands.length; i++) {
      const band = shuffledBands[i];
      const reviewerIndex = i % normalizedUserIds.length;
      await db.bands.assignReviewer(band.id, normalizedUserIds[reviewerIndex]);
    }

    const updatedBands = await db.bands.findByEventId(activeEvent.id);

    if (sendEmail) {
      const newlyAssignedUserIds = new Set(normalizedUserIds);
      const bandCountByUser = new Map<number, number>();
      for (const band of updatedBands) {
        if (band.assigned_reviewer_id != null && newlyAssignedUserIds.has(band.assigned_reviewer_id)) {
          bandCountByUser.set(
            band.assigned_reviewer_id,
            (bandCountByUser.get(band.assigned_reviewer_id) || 0) + 1
          );
        }
      }

      for (const [userId, count] of bandCountByUser) {
        try {
          const user = await db.users.findById(userId);
          if (user) {
            const name = user.first_name || user.email.split("@")[0];
            await sendReviewerAssignmentEmail(user.email, name, count, activeEvent.name);
          }
        } catch (emailErr) {
          logger.error({ err: emailErr, userId }, "Failed to send reviewer assignment email");
        }
      }
    }

    res.json({
      message: `Successfully assigned ${unassignedBands.length} bands to ${normalizedUserIds.length} reviewers`,
      bands: updatedBands,
    });
  } catch (error) {
    logger.error({ err: error }, "Error assigning reviewers");
    res.status(500).json({ error: "Failed to assign reviewers" });
  }
});

// Update band review (rating and notes)
adminRouter.patch(
  "/bands/:id/review",
  [
    body("reviewer_rating")
      .optional({ nullable: true })
      .isInt({ min: 1, max: 5 }),
    body("reviewer_notes").optional({ nullable: true }).isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { reviewer_rating, reviewer_notes } = req.body;

      const band = await db.bands.findById(id);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      if (band.assigned_reviewer_id !== req.user?.id && req.user?.role !== "super-duper-admin") {
        return res.status(403).json({ error: "You are not the assigned reviewer for this band" });
      }

      const updatedBand = await db.bands.updateReview(id, {
        reviewer_rating,
        reviewer_notes,
      });

      res.json(updatedBand);
    } catch (error) {
      logger.error({ err: error }, "Error updating band review");
      res.status(500).json({ error: "Failed to update band review" });
    }
  }
);

// Get bands assigned to current user for review
adminRouter.get("/bands/my-reviews", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const myBands = await db.bands.findByReviewerId(userId);
    const { org_id } = req.query;
    if (org_id) {
      const { authorized, event } = await resolveOrgActiveEvent(req, Number(org_id));
      if (!authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      if (!event) return res.json([]);
      return res.json(myBands.filter((b) => b.event_id === event.id));
    }
    res.json(myBands);
  } catch (error) {
    logger.error({ err: error }, "Error fetching assigned bands");
    res.status(500).json({ error: "Failed to fetch assigned bands" });
  }
});

// Get reviewer users who have bands assigned to them
adminRouter.get("/reviewers", async (req: AuthRequest, res: Response) => {
  try {
    const { org_id } = req.query;

    let reviewerIds: number[];
    if (org_id) {
      const { authorized, event } = await resolveOrgActiveEvent(req, Number(org_id));
      if (!authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      if (!event) return res.json([]);
      const bands = await db.bands.findByEventId(event.id);
      reviewerIds = [...new Set(
        bands.map((b) => b.assigned_reviewer_id).filter((id): id is number => id != null)
      )];
    } else {
      reviewerIds = await db.bands.getReviewerUserIds();
    }

    const reviewerUsers = await Promise.all(
      reviewerIds.map(async (id) => {
        const user = await db.users.findById(id);
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        };
      })
    );

    res.json(reviewerUsers.filter(Boolean));
  } catch (error) {
    logger.error({ err: error }, "Error fetching reviewers");
    res.status(500).json({ error: "Failed to fetch reviewers" });
  }
});

// =========================================================================
// MAP FEATURES
// =========================================================================

// Bulk geocode porches missing coordinates (optionally filtered by statuses)
adminRouter.post("/porches/geocode", async (req: AuthRequest, res: Response) => {
  try {
    const { org_id, statuses } = req.query;
    const allowedStatuses = statuses
      ? (statuses as string).split(",")
      : ["pending", "under_review", "approved"];
    let porches;
    let event;

    if (org_id) {
      const result = await resolveOrgActiveEvent(req, Number(org_id));
      if (!result.authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      if (!result.event) return res.json({ geocoded: 0, failed: 0, total: 0, results: [] });
      event = result.event;
      const all = await db.porches.findByEventId(event.id);
      porches = all.filter((p) => allowedStatuses.includes(p.status) && p.lat == null);
    } else {
      const all = await db.porches.findAll();
      porches = all.filter((p) => allowedStatuses.includes(p.status) && p.lat == null);
      event = await db.events.findActive();
    }

    let geocoded = 0;
    let failed = 0;
    const results: Array<{ id: number; address: string; lat?: number; lng?: number; error?: string }> = [];

    for (const porch of porches) {
      try {
        const result = await geocodeAddress(
          porch.address,
          event?.default_city,
          event?.default_state
        );
        if (result) {
          await db.porches.updateCoordinates(porch.id, result.lat, result.lng);
          geocoded++;
          results.push({ id: porch.id, address: porch.address, lat: result.lat, lng: result.lng });
        } else {
          failed++;
          results.push({ id: porch.id, address: porch.address, error: "No results found" });
        }
      } catch (err) {
        failed++;
        results.push({ id: porch.id, address: porch.address, error: "Geocoding error" });
        logger.error({ err, porchId: porch.id }, "Bulk geocode error");
      }
    }

    res.json({ geocoded, failed, total: porches.length, results });
  } catch (error) {
    logger.error({ err: error }, "Error in bulk geocoding");
    res.status(500).json({ error: "Failed to bulk geocode" });
  }
});

// Update porch coordinates (manual placement)
adminRouter.patch(
  "/porches/:id/coordinates",
  [
    body("lat").isFloat({ min: -90, max: 90 }),
    body("lng").isFloat({ min: -180, max: 180 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { lat, lng } = req.body;

      const porch = await db.porches.updateCoordinates(id, lat, lng);
      if (!porch) {
        return res.status(404).json({ error: "Porch not found" });
      }

      res.json(porch);
    } catch (error) {
      logger.error({ err: error }, "Error updating porch coordinates");
      res.status(500).json({ error: "Failed to update coordinates" });
    }
  }
);

// =========================================================================
// PORCH AVAILABLE TIMES
// =========================================================================

// Get available times for a specific porch
adminRouter.get("/porches/:id/available-times", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const porch = await db.porches.findById(id);
    if (!porch) {
      return res.status(404).json({ error: "Porch not found" });
    }
    const times = await db.porchAvailableTimes.findByPorchId(id);
    res.json(times);
  } catch (error) {
    logger.error({ err: error }, "Error fetching porch available times");
    res.status(500).json({ error: "Failed to fetch porch available times" });
  }
});

// Get available times for all porches in the active event (bulk, for scheduler)
adminRouter.get("/porch-available-times", async (req: AuthRequest, res: Response) => {
  try {
    const { org_id } = req.query;
    let porches;
    if (org_id) {
      const { authorized, event } = await resolveOrgActiveEvent(req, Number(org_id));
      if (!authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      if (!event) return res.json([]);
      porches = await db.porches.findByEventId(event.id);
    } else {
      porches = await db.porches.findAll("approved");
    }
    const porchIds = porches
      .filter((p) => p.status === "approved")
      .map((p) => p.id);
    const times = await db.porchAvailableTimes.findByPorchIds(porchIds);
    res.json(times);
  } catch (error) {
    logger.error({ err: error }, "Error fetching all porch available times");
    res.status(500).json({ error: "Failed to fetch porch available times" });
  }
});

// Create an available time for a porch
adminRouter.post(
  "/porches/:id/available-times",
  [
    body("start_time").isString().notEmpty(),
    body("end_time").isString().notEmpty(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { start_time, end_time } = req.body;

      const porch = await db.porches.findById(id);
      if (!porch) {
        return res.status(404).json({ error: "Porch not found" });
      }

      const authorized = await isOrganizerForEvent(req, porch.event_id);
      if (!authorized) {
        return res.status(403).json({ error: "Organizer access required" });
      }

      const availableTime = await db.porchAvailableTimes.create({
        porch_id: id,
        start_time,
        end_time,
      });
      res.json(availableTime);
    } catch (error) {
      logger.error({ err: error }, "Error creating porch available time");
      res.status(500).json({ error: "Failed to create porch available time" });
    }
  }
);

// Delete an available time
adminRouter.delete("/porch-available-times/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await db.porchAvailableTimes.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Available time not found" });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Error deleting porch available time");
    res.status(500).json({ error: "Failed to delete porch available time" });
  }
});

// Update porch number
adminRouter.patch(
  "/porches/:id/porch-number",
  [body("porch_number").optional({ nullable: true }).isInt({ min: 1 })],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const porchNumber = req.body.porch_number ?? null;

      const porch = await db.porches.findById(id);
      if (!porch) {
        return res.status(404).json({ error: "Porch not found" });
      }

      const updated = await db.porches.updatePorchNumber(id, porchNumber);
      res.json(updated);
    } catch (error: unknown) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === "23505" && pgError.constraint?.includes("porch_number")) {
        return res.status(400).json({
          error: `Porch number ${req.body.porch_number} is already assigned to another porch in this event`,
        });
      }
      logger.error({ err: error }, "Error updating porch number");
      res.status(500).json({ error: "Failed to update porch number" });
    }
  }
);

// Update porch sound settings
adminRouter.patch(
  "/porches/:id/sound",
  [
    body("sound_radius_meters").optional().isInt({ min: 0, max: 500 }),
    body("sound_direction_degrees").optional({ nullable: true }).isInt({ min: 0, max: 359 }),
    body("sound_cone_width_degrees").optional().isInt({ min: 10, max: 360 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const porch = await db.porches.updateSoundSettings(id, {
        sound_radius_meters: req.body.sound_radius_meters,
        sound_direction_degrees: req.body.sound_direction_degrees,
        sound_cone_width_degrees: req.body.sound_cone_width_degrees,
      });
      if (!porch) {
        return res.status(404).json({ error: "Porch not found" });
      }

      res.json(porch);
    } catch (error) {
      logger.error({ err: error }, "Error updating porch sound settings");
      res.status(500).json({ error: "Failed to update sound settings" });
    }
  }
);

// =========================================================================
// LATE APPLY PASSWORD
// =========================================================================

// Set or update the late-apply password for an event
adminRouter.post(
  "/events/:eventId/late-apply-password",
  [
    body("password").trim().isLength({ min: 4 }).withMessage("Password must be at least 4 characters"),
    body("enabled").isBoolean().withMessage("enabled must be a boolean"),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { eventId } = req.params;
      const authorized = await isOrganizerForEvent(req, eventId);
      if (!authorized) {
        return res.status(403).json({ error: "Organizer access required" });
      }

      const hash = await bcrypt.hash(req.body.password, 10);
      const updatedEvent = await db.events.update(eventId, {
        band_late_apply_password_hash: hash,
        band_late_apply_enabled: req.body.enabled,
      });

      if (!updatedEvent) {
        return res.status(404).json({ error: "Event not found" });
      }

      res.json({
        success: true,
        band_late_apply_enabled: updatedEvent.band_late_apply_enabled,
        has_password: !!updatedEvent.band_late_apply_password_hash,
      });
    } catch (error) {
      logger.error({ err: error }, "Error setting late-apply password");
      res.status(500).json({ error: "Failed to set late-apply password" });
    }
  }
);

// Toggle late-apply enabled/disabled (without changing the password)
adminRouter.patch(
  "/events/:eventId/late-apply-password",
  [body("enabled").isBoolean().withMessage("enabled must be a boolean")],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { eventId } = req.params;
      const authorized = await isOrganizerForEvent(req, eventId);
      if (!authorized) {
        return res.status(403).json({ error: "Organizer access required" });
      }

      const updatedEvent = await db.events.update(eventId, {
        band_late_apply_enabled: req.body.enabled,
      });

      if (!updatedEvent) {
        return res.status(404).json({ error: "Event not found" });
      }

      res.json({
        success: true,
        band_late_apply_enabled: updatedEvent.band_late_apply_enabled,
        has_password: !!updatedEvent.band_late_apply_password_hash,
      });
    } catch (error) {
      logger.error({ err: error }, "Error toggling late-apply");
      res.status(500).json({ error: "Failed to toggle late-apply" });
    }
  }
);

// Remove the late-apply password entirely
adminRouter.delete(
  "/events/:eventId/late-apply-password",
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const authorized = await isOrganizerForEvent(req, eventId);
      if (!authorized) {
        return res.status(403).json({ error: "Organizer access required" });
      }

      const updatedEvent = await db.events.update(eventId, {
        band_late_apply_password_hash: null,
        band_late_apply_enabled: false,
      });

      if (!updatedEvent) {
        return res.status(404).json({ error: "Event not found" });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Error removing late-apply password");
      res.status(500).json({ error: "Failed to remove late-apply password" });
    }
  }
);
