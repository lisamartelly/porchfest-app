import { Router } from "express";
import { body, validationResult } from "express-validator";

export const porchesRouter = Router();

// In-memory store for development - replace with real database
const porches: Map<
  string,
  {
    id: string;
    owner_name: string;
    email: string;
    address: string;
    city: string;
    lat: number | null;
    lng: number | null;
    capacity: number | null;
    has_power: boolean;
    parking_notes: string | null;
    accessibility_notes: string | null;
    status: string;
    admin_notes: string | null;
    created_at: string;
  }
> = new Map();

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

// Export porches map for admin routes
export { porches };
