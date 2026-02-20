import { Router, type Router as ExpressRouter, type Request, type Response } from "express";
import { body, validationResult } from "express-validator";
import { db } from "../data/db.js";

export const porchesRouter: ExpressRouter = Router();

// Public: Submit porch application (no auth required)
porchesRouter.post(
  "/apply",
  [
    body("event_id").trim().notEmpty().withMessage("Event ID is required"),
    body("owner_name").trim().notEmpty().withMessage("Owner name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("address").trim().notEmpty().withMessage("Address is required"),
    body("city").trim().notEmpty().withMessage("City is required"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const porch = await db.porches.create({
        event_id: req.body.event_id,
        owner_name: req.body.owner_name,
        email: req.body.email,
        address: req.body.address,
        city: req.body.city,
        lat: null, // TODO: Geocode address
        lng: null,
        capacity: req.body.capacity || null,
        has_power: req.body.has_power || false,
        parking_notes: req.body.parking_notes || null,
        accessibility_notes: req.body.accessibility_notes || null,
        status: "pending",
      });

      res.json({ success: true, id: porch.id });
    } catch (error) {
      console.error("Error submitting porch application:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  }
);
