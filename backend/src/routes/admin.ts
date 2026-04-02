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
  [body("status").isIn(["pending", "under_review", "approved", "rejected"])],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;

      const band = await db.bands.updateStatus(id, status, admin_notes);
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
  [body("status").isIn(["pending", "under_review", "approved", "rejected"])],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;

      const porch = await db.porches.updateStatus(id, status, admin_notes);
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

    const allBands = await db.bands.findByEventId(activeEvent.id);
    const unassignedBands = allBands.filter((b) => b.assigned_reviewer_id == null);
    if (unassignedBands.length === 0) {
      return res.status(400).json({ error: "No unassigned bands to assign" });
    }

    const shuffledBands = [...unassignedBands].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledBands.length; i++) {
      const band = shuffledBands[i];
      const reviewerIndex = i % userIds.length;
      await db.bands.assignReviewer(band.id, userIds[reviewerIndex]);
    }

    const updatedBands = await db.bands.findByEventId(activeEvent.id);

    if (sendEmail) {
      const newlyAssignedUserIds = new Set(userIds as number[]);
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
      message: `Successfully assigned ${unassignedBands.length} bands to ${userIds.length} reviewers`,
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

      const band = await db.bands.updateReview(id, {
        reviewer_rating,
        reviewer_notes,
      });

      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      res.json(band);
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
