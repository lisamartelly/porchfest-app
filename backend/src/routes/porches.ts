import { Router } from "express";
import { body, validationResult } from "express-validator";
import { porches } from "../data/db.js";

export const porchesRouter = Router();

// Public: Submit porch application (no auth required)
porchesRouter.post(
  "/apply",
  [
    body("owner_name").trim().notEmpty().withMessage("Owner name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("address").trim().notEmpty().withMessage("Address is required"),
    body("city").trim().notEmpty().withMessage("City is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        owner_name,
        email,
        address,
        city,
        capacity,
        has_power,
        parking_notes,
        accessibility_notes,
      } = req.body;

      const porchData = {
        id: crypto.randomUUID(),
        owner_name,
        email,
        address,
        city,
        lat: null, // TODO: Geocode address
        lng: null,
        capacity: capacity || null,
        has_power: has_power || false,
        parking_notes: parking_notes || null,
        accessibility_notes: accessibility_notes || null,
        status: "pending",
        admin_notes: null,
        created_at: new Date().toISOString(),
      };

      porches.set(porchData.id, porchData);

      res.json({ success: true, id: porchData.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit application" });
    }
  }
);

// porches is exported from ../data/db.js
