import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import { adminOnly, superDuperAdminOnly, AuthRequest } from "../middleware/auth.js";
import { db } from "../data/db.js";
import type { Event } from "../data/db.js";

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
    console.error("Error fetching organizations:", error);
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
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  }
);

// =========================================================================
// SUPER-DUPER-ADMIN ONLY: User management
// =========================================================================

// List all users with their org memberships
adminRouter.get("/users", superDuperAdminOnly, async (req: Request, res: Response) => {
  try {
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
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Create admin user and assign to organization
adminRouter.post(
  "/users",
  superDuperAdminOnly,
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .isIn(["user"])
      .withMessage("Role must be user"),
    body("organization_id").optional().isNumeric(),
    body("first_name").optional({ nullable: true }).trim(),
    body("last_name").optional({ nullable: true }).trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password, role, organization_id, first_name, last_name } = req.body;

      const existingUser = await db.users.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await db.users.create({
        email,
        password_hash: hashedPassword,
        role,
        first_name,
        last_name,
      });

      if (organization_id) {
        const org = await db.organizations.findById(organization_id);
        if (!org) {
          return res.status(400).json({ error: "Organization not found" });
        }
        await db.organizationUsers.create({
          user_id: user.id,
          organization_id,
          role: "organizer",
        });
      }

      const orgs = organization_id
        ? [await db.organizations.findById(organization_id)]
        : [];

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at,
        organizations: orgs
          .filter(Boolean)
          .map((o) => ({ id: o!.id, name: o!.name })),
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
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
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get organizations the current user belongs to (for event creation dropdown)
adminRouter.get("/my-organizations", async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === "super-duper-admin") {
      const allOrgs = await db.organizations.findAll();
      return res.json(allOrgs);
    }

    const orgs = await db.organizationUsers.getOrganizationsForUser(
      req.user!.id
    );
    res.json(orgs);
  } catch (error) {
    console.error("Error fetching user organizations:", error);
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
    console.error("Error fetching bands:", error);
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
      console.error("Error updating band status:", error);
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
    console.error("Error fetching porches:", error);
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
      console.error("Error updating porch status:", error);
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
    console.error("Error fetching event:", error);
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
    body("reviewer_emails").optional().isArray(),
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
        reviewer_emails: req.body.reviewer_emails,
      });

      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
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
        console.error("Error copying recurring tasks to new event:", err);
      }

      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
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
    body("reviewer_emails").optional().isArray(),
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
        reviewer_emails: req.body.reviewer_emails,
        is_active: req.body.is_active,
      });

      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
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
      console.error("Error creating time slot:", error);
      res.status(500).json({ error: "Failed to create time slot" });
    }
  }
);

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
    console.error("Error fetching scheduling data:", error);
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
      console.error("Error scheduling band:", error);
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
    console.error("Error fetching approved porches:", error);
    res.status(500).json({ error: "Failed to fetch approved porches" });
  }
});

// Assign bands to reviewers (random, equal distribution)
adminRouter.post("/bands/assign-reviewers", async (req: AuthRequest, res) => {
  try {
    const { org_id } = req.query;
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

    const reviewerEmails = activeEvent.reviewer_emails || [];
    if (reviewerEmails.length === 0) {
      return res.status(400).json({ error: "No reviewers configured" });
    }

    const allBands = await db.bands.findByEventId(activeEvent.id);
    if (allBands.length === 0) {
      return res.status(400).json({ error: "No bands to assign" });
    }

    const shuffledBands = [...allBands].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledBands.length; i++) {
      const band = shuffledBands[i];
      const reviewerIndex = i % reviewerEmails.length;
      const reviewerEmail = reviewerEmails[reviewerIndex];
      await db.bands.assignReviewer(
        band.id,
        `reviewer-${reviewerIndex}`,
        reviewerEmail
      );
    }

    await db.events.update(activeEvent.id, { reviewers_assigned: true });

    const updatedBands = await db.bands.findByEventId(activeEvent.id);

    res.json({
      message: `Successfully assigned ${allBands.length} bands to ${reviewerEmails.length} reviewers`,
      bands: updatedBands,
    });
  } catch (error) {
    console.error("Error assigning reviewers:", error);
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
      console.error("Error updating band review:", error);
      res.status(500).json({ error: "Failed to update band review" });
    }
  }
);

// Get bands assigned to current user for review
adminRouter.get("/bands/my-reviews", async (req: AuthRequest, res: Response) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const myBands = await db.bands.findByReviewerEmail(userEmail);
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
    console.error("Error fetching assigned bands:", error);
    res.status(500).json({ error: "Failed to fetch assigned bands" });
  }
});

// Get unique reviewer emails from assigned bands
adminRouter.get("/reviewers", async (req: AuthRequest, res: Response) => {
  try {
    const { org_id } = req.query;
    if (org_id) {
      const { authorized, event } = await resolveOrgActiveEvent(req, Number(org_id));
      if (!authorized) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
      if (!event) return res.json([]);
      const bands = await db.bands.findByEventId(event.id);
      const emails = [...new Set(bands
        .map((b) => b.assigned_reviewer_email)
        .filter(Boolean)
      )];
      return res.json(emails);
    }
    const reviewerEmails = await db.bands.getReviewerEmails();
    res.json(reviewerEmails);
  } catch (error) {
    console.error("Error fetching reviewers:", error);
    res.status(500).json({ error: "Failed to fetch reviewers" });
  }
});
