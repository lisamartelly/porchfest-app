import { Router, type Router as ExpressRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import { db } from "../data/db.js";
import { getPresignedUploadUrl } from "../services/s3.js";
import logger from "../lib/logger.js";

export const porchesRouter: ExpressRouter = Router();

// Public: Get a presigned S3 upload URL for porch application photo
porchesRouter.get("/upload-url", async (req: Request, res: Response) => {
  const filename = req.query.filename as string;
  if (!filename) {
    return res.status(400).json({ error: "filename query parameter is required" });
  }

  try {
    const ext = filename.split(".").pop() || "jpg";
    const key = `porches/${crypto.randomUUID()}/${Date.now()}.${ext}`;
    const contentType = req.query.contentType as string || `image/${ext === "jpg" ? "jpeg" : ext}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    return res.json({ uploadUrl, key });
  } catch (error) {
    logger.error({ err: error }, "Error generating porch upload URL");
    return res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// Public: Submit porch application (no auth required)
porchesRouter.post(
  "/apply",
  [
    body("event_id").trim().notEmpty().withMessage("Event ID is required"),
    body("owner_name").trim().notEmpty().withMessage("Name is required").isLength({ max: 255 }).withMessage("Name must be 255 characters or fewer"),
    body("email").isEmail().withMessage("Valid email is required").isLength({ max: 255 }).withMessage("Email must be 255 characters or fewer"),
    body("phone").trim().notEmpty().withMessage("Phone number is required").isLength({ max: 50 }).withMessage("Phone number must be 50 characters or fewer"),
    body("address").trim().notEmpty().withMessage("Address is required").isLength({ max: 255 }).withMessage("Address must be 255 characters or fewer"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    logger.info({ body: req.body }, "Porch application received");

    try {
      const porch = await db.porches.create({
        event_id: req.body.event_id,
        owner_name: req.body.owner_name,
        email: req.body.email,
        phone: req.body.phone || null,
        address: req.body.address,
        city: req.body.city || "",
        lat: null,
        lng: null,
        capacity: req.body.capacity || null,
        has_power: req.body.has_power || false,
        parking_notes: req.body.parking_notes || null,
        accessibility_notes: req.body.accessibility_notes || null,
        space_description: req.body.space_description || null,
        has_band_in_mind: req.body.has_band_in_mind || null,
        music_preferences: req.body.music_preferences || null,
        band_count_preference: req.body.band_count_preference || null,
        rain_date_available: req.body.rain_date_available || null,
        comments: req.body.comments || null,
        status: "pending",
      });

      res.json({ success: true, id: porch.id });
    } catch (error) {
      logger.error({ err: error }, "Error submitting porch application");
      res.status(500).json({ error: "Failed to submit application" });
    }
  }
);
