import { Router } from "express";
import { body, validationResult } from "express-validator";
import { adminOnly, AuthRequest } from "../middleware/auth.js";
import { bands, porches, events, timeSlots } from "../data/db.js";

export const adminRouter = Router();

// All admin routes require admin role
adminRouter.use(adminOnly);

// Get all bands
adminRouter.get("/bands", async (req, res) => {
  try {
    const { status } = req.query;

    let allBands = Array.from(bands.values());

    if (status) {
      allBands = allBands.filter((b) => b.status === status);
    }

    allBands.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json(allBands);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bands" });
  }
});

// Update band status
adminRouter.patch(
  "/bands/:id/status",
  [body("status").isIn(["pending", "under_review", "approved", "rejected"])],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;

      const band = bands.get(id);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      band.status = status;
      band.admin_notes = admin_notes || null;
      bands.set(id, band);

      res.json(band);
    } catch (error) {
      res.status(500).json({ error: "Failed to update band status" });
    }
  }
);

// Get all porches
adminRouter.get("/porches", async (req, res) => {
  try {
    const { status } = req.query;

    let allPorches = Array.from(porches.values());

    if (status) {
      allPorches = allPorches.filter((p) => p.status === status);
    }

    allPorches.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json(allPorches);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch porches" });
  }
});

// Update porch status
adminRouter.patch(
  "/porches/:id/status",
  [body("status").isIn(["pending", "under_review", "approved", "rejected"])],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;

      const porch = porches.get(id);
      if (!porch) {
        return res.status(404).json({ error: "Porch not found" });
      }

      porch.status = status;
      porch.admin_notes = admin_notes || null;
      porches.set(id, porch);

      res.json(porch);
    } catch (error) {
      res.status(500).json({ error: "Failed to update porch status" });
    }
  }
);

// Get active event settings
adminRouter.get("/event", async (req, res) => {
  try {
    const activeEvent = Array.from(events.values()).find((e) => e.is_active);
    if (!activeEvent) {
      return res.status(404).json({ error: "No active event found" });
    }
    res.json(activeEvent);
  } catch (error) {
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
  async (req, res) => {
    try {
      const activeEvent = Array.from(events.values()).find((e) => e.is_active);
      if (!activeEvent) {
        return res.status(404).json({ error: "No active event found" });
      }

      const {
        name,
        date,
        start_time,
        end_time,
        description,
        band_applications_open,
        band_applications_close,
        porch_applications_open,
        porch_applications_close,
        reviewer_emails,
      } = req.body;

      if (name !== undefined) activeEvent.name = name;
      if (date !== undefined) activeEvent.date = date;
      if (start_time !== undefined) activeEvent.start_time = start_time;
      if (end_time !== undefined) activeEvent.end_time = end_time;
      if (description !== undefined) activeEvent.description = description;
      if (band_applications_open !== undefined)
        activeEvent.band_applications_open = band_applications_open;
      if (band_applications_close !== undefined)
        activeEvent.band_applications_close = band_applications_close;
      if (porch_applications_open !== undefined)
        activeEvent.porch_applications_open = porch_applications_open;
      if (porch_applications_close !== undefined)
        activeEvent.porch_applications_close = porch_applications_close;
      if (reviewer_emails !== undefined)
        activeEvent.reviewer_emails = reviewer_emails;

      events.set(activeEvent.id, activeEvent);

      res.json(activeEvent);
    } catch (error) {
      res.status(500).json({ error: "Failed to update event" });
    }
  }
);

// Create event
adminRouter.post(
  "/events",
  [body("name").trim().notEmpty(), body("date").isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, date, start_time, end_time, description } = req.body;

      const event = {
        id: crypto.randomUUID(),
        name,
        date,
        start_time: start_time || "12:00",
        end_time: end_time || "18:00",
        description: description || null,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      events.set(event.id, event);

      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to create event" });
    }
  }
);

// Create time slot
adminRouter.post(
  "/events/:eventId/slots",
  [body("start_time").isISO8601(), body("end_time").isISO8601()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { eventId } = req.params;
      const { start_time, end_time } = req.body;

      const slot = {
        id: crypto.randomUUID(),
        event_id: eventId,
        start_time,
        end_time,
      };

      timeSlots.set(slot.id, slot);

      res.json(slot);
    } catch (error) {
      res.status(500).json({ error: "Failed to create time slot" });
    }
  }
);

// Get scheduling data
adminRouter.get("/scheduling", async (req, res) => {
  try {
    const approvedBands = Array.from(bands.values()).filter(
      (b) => b.status === "approved"
    );
    const approvedPorches = Array.from(porches.values()).filter(
      (p) => p.status === "approved"
    );
    const allSlots = Array.from(timeSlots.values());

    res.json({
      bands: approvedBands,
      porches: approvedPorches,
      time_slots: allSlots,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scheduling data" });
  }
});

// Helper to convert HH:mm to minutes for comparison
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

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
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { assigned_porch_id, set_start_time, set_end_time } = req.body;

      const band = bands.get(id);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      // Validate porch exists and is approved
      if (assigned_porch_id) {
        const porch = porches.get(assigned_porch_id);
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
        const newStart = timeToMinutes(set_start_time);
        const newEnd = timeToMinutes(set_end_time);

        if (newEnd <= newStart) {
          return res
            .status(400)
            .json({ error: "End time must be after start time" });
        }

        // Find any bands scheduled at the same porch with overlapping times
        const overlappingBand = Array.from(bands.values()).find((b) => {
          // Skip the current band being updated
          if (b.id === id) return false;
          // Skip bands not assigned to this porch
          if (b.assigned_porch_id !== assigned_porch_id) return false;
          // Skip bands without scheduled times
          if (!b.set_start_time || !b.set_end_time) return false;

          const existingStart = timeToMinutes(b.set_start_time);
          const existingEnd = timeToMinutes(b.set_end_time);

          // Check for overlap: new set starts before existing ends AND new set ends after existing starts
          return newStart < existingEnd && newEnd > existingStart;
        });

        if (overlappingBand) {
          const porch = porches.get(assigned_porch_id);
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
      band.assigned_porch_id = assigned_porch_id || null;
      band.set_start_time = set_start_time || null;
      band.set_end_time = set_end_time || null;
      bands.set(id, band);

      res.json(band);
    } catch (error) {
      console.error("Error scheduling band:", error);
      res.status(500).json({ error: "Failed to schedule band" });
    }
  }
);

// Get approved porches (for scheduling dropdown)
adminRouter.get("/porches/approved", async (req, res) => {
  try {
    const approvedPorches = Array.from(porches.values())
      .filter((p) => p.status === "approved")
      .sort((a, b) => a.address.localeCompare(b.address));

    res.json(approvedPorches);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch approved porches" });
  }
});

// Assign bands to reviewers (random, equal distribution)
adminRouter.post("/bands/assign-reviewers", async (req: AuthRequest, res) => {
  try {
    const activeEvent = Array.from(events.values()).find((e) => e.is_active);
    if (!activeEvent) {
      return res.status(404).json({ error: "No active event found" });
    }

    const reviewerEmails = activeEvent.reviewer_emails || [];
    if (reviewerEmails.length === 0) {
      return res.status(400).json({ error: "No reviewers configured" });
    }

    // Get all bands (we'll assign reviewers to all bands, not just pending ones)
    const allBands = Array.from(bands.values());
    if (allBands.length === 0) {
      return res.status(400).json({ error: "No bands to assign" });
    }

    // Shuffle bands for random assignment
    const shuffledBands = [...allBands].sort(() => Math.random() - 0.5);

    // Assign bands to reviewers in round-robin fashion
    shuffledBands.forEach((band, index) => {
      const reviewerIndex = index % reviewerEmails.length;
      const reviewerEmail = reviewerEmails[reviewerIndex];
      band.assigned_reviewer_id = `reviewer-${reviewerIndex}`;
      band.assigned_reviewer_email = reviewerEmail;
      bands.set(band.id, band);
    });

    // Mark reviewers as assigned
    activeEvent.reviewers_assigned = true;
    events.set(activeEvent.id, activeEvent);

    res.json({
      message: `Successfully assigned ${allBands.length} bands to ${reviewerEmails.length} reviewers`,
      bands: Array.from(bands.values()),
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
    body("reviewer_rating").optional({ nullable: true }).isInt({ min: 1, max: 5 }),
    body("reviewer_notes").optional({ nullable: true }).isString(),
  ],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { reviewer_rating, reviewer_notes } = req.body;

      const band = bands.get(id);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      if (reviewer_rating !== undefined) band.reviewer_rating = reviewer_rating;
      if (reviewer_notes !== undefined) band.reviewer_notes = reviewer_notes;
      bands.set(id, band);

      res.json(band);
    } catch (error) {
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

    const myBands = Array.from(bands.values()).filter(
      (b) => b.assigned_reviewer_email === userEmail
    );

    myBands.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json(myBands);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assigned bands" });
  }
});

// Get unique reviewer emails from assigned bands
adminRouter.get("/reviewers", async (req, res) => {
  try {
    const reviewerEmails = new Set<string>();
    Array.from(bands.values()).forEach((band) => {
      if (band.assigned_reviewer_email) {
        reviewerEmails.add(band.assigned_reviewer_email);
      }
    });

    res.json(Array.from(reviewerEmails));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviewers" });
  }
});
