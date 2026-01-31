import { Router } from "express";
import { body, validationResult } from "express-validator";
import { adminOnly, AuthRequest } from "../middleware/auth.js";
import { bands } from "./bands.js";
import { porches } from "./porches.js";
import { events, timeSlots } from "./events.js";

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

// Create event
adminRouter.post(
  "/events",
  [body("name").trim().notEmpty(), body("date").isISO8601()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, date, description } = req.body;

      const event = {
        id: crypto.randomUUID(),
        name,
        date,
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
