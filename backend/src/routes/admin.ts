import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { adminOnly, AuthRequest } from "../middleware/auth.js";
import { db } from "../data/db.js";

export const adminRouter: Router = Router();

// All admin routes require admin role
adminRouter.use(adminOnly);

// Get all bands
adminRouter.get("/bands", async (req, res) => {
  try {
    const { status } = req.query;
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

// Get all porches
adminRouter.get("/porches", async (req, res) => {
  try {
    const { status } = req.query;
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

// Get active event settings
adminRouter.get("/event", async (req, res) => {
  try {
    const activeEvent = await db.events.findActive();
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
      const activeEvent = await db.events.findActive();
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

// Create event
adminRouter.post(
  "/events",
  [body("name").trim().notEmpty(), body("date").isString()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, date, start_time, end_time, description } = req.body;

      const event = await db.events.create({
        name,
        date,
        start_time: start_time || "12:00",
        end_time: end_time || "18:00",
        description: description || null,
        is_active: true,
      });

      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
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

// Get scheduling data
adminRouter.get("/scheduling", async (req, res) => {
  try {
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
    body("assigned_porch_id").optional({ nullable: true }).isString(),
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

// Get approved porches (for scheduling dropdown)
adminRouter.get("/porches/approved", async (req, res) => {
  try {
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
    const activeEvent = await db.events.findActive();
    if (!activeEvent) {
      return res.status(404).json({ error: "No active event found" });
    }

    const reviewerEmails = activeEvent.reviewer_emails || [];
    if (reviewerEmails.length === 0) {
      return res.status(400).json({ error: "No reviewers configured" });
    }

    // Get all bands
    const allBands = await db.bands.findAll();
    if (allBands.length === 0) {
      return res.status(400).json({ error: "No bands to assign" });
    }

    // Shuffle bands for random assignment
    const shuffledBands = [...allBands].sort(() => Math.random() - 0.5);

    // Assign bands to reviewers in round-robin fashion
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

    // Mark reviewers as assigned
    await db.events.update(activeEvent.id, { reviewers_assigned: true });

    const updatedBands = await db.bands.findAll();

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
adminRouter.get("/bands/my-reviews", async (req: AuthRequest, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const myBands = await db.bands.findByReviewerEmail(userEmail);
    res.json(myBands);
  } catch (error) {
    console.error("Error fetching assigned bands:", error);
    res.status(500).json({ error: "Failed to fetch assigned bands" });
  }
});

// Get unique reviewer emails from assigned bands
adminRouter.get("/reviewers", async (req, res) => {
  try {
    const reviewerEmails = await db.bands.getReviewerEmails();
    res.json(reviewerEmails);
  } catch (error) {
    console.error("Error fetching reviewers:", error);
    res.status(500).json({ error: "Failed to fetch reviewers" });
  }
});
