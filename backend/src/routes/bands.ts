import { Router, type Router as ExpressRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import { db } from "../data/db.js";
import { getPresignedUploadUrl } from "../services/s3.js";
import logger from "../lib/logger.js";

export const bandsRouter: ExpressRouter = Router();

// Public: Get all approved bands for public display
bandsRouter.get("/public", async (req, res) => {
  try {
    const approvedBands = await db.bands.findApproved();

    // Map to public-safe info
    const publicBands = await Promise.all(
      approvedBands.map(async (band) => {
        // Get porch address if assigned
        let porch_address = null;
        if (band.assigned_porch_id) {
          const porch = await db.porches.findById(band.assigned_porch_id);
          if (porch) {
            porch_address = porch.address;
          }
        }

        return {
          id: band.id,
          band_name: band.band_name,
          genre: band.genre,
          member_count: band.member_count,
          bio: band.bio,
          set_start_time: band.set_start_time || null,
          set_end_time: band.set_end_time || null,
          venmo_handle: band.venmo_handle || null,
          instagram: band.instagram || null,
          spotify: band.spotify || null,
          soundcloud: band.soundcloud || null,
          bandcamp: band.bandcamp || null,
          facebook: band.facebook || null,
          website: band.website || null,
          porch_address,
        };
      })
    );

    res.json(publicBands);
  } catch (error) {
    logger.error({ err: error }, "Error fetching public bands");
    res.status(500).json({ error: "Failed to fetch bands" });
  }
});

// Public: Get a presigned S3 upload URL (used during application)
bandsRouter.get("/upload-url", async (req: Request, res: Response) => {
  const filename = req.query.filename as string;
  if (!filename) {
    return res.status(400).json({ error: "filename query parameter is required" });
  }

  try {
    const ext = filename.split(".").pop() || "jpg";
    const key = `bands/${crypto.randomUUID()}/${Date.now()}.${ext}`;
    const contentType = req.query.contentType as string || `image/${ext === "jpg" ? "jpeg" : ext}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    logger.info({ key, contentType, filename }, "Presigned upload URL generated");
    return res.json({ uploadUrl, key });
  } catch (error) {
    logger.error({ err: error }, "Error generating upload URL");
    return res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// Public: Submit band application (no auth required)
bandsRouter.post(
  "/apply",
  [
    body("event_id").trim().notEmpty().withMessage("Event ID is required"),
    body("band_name").trim().notEmpty().withMessage("Band name is required").isLength({ max: 255 }).withMessage("Band name must be 255 characters or fewer"),
    body("contact_name").trim().notEmpty().withMessage("Contact name is required").isLength({ max: 255 }).withMessage("Contact name must be 255 characters or fewer"),
    body("contact_email").isEmail().withMessage("Valid email is required").isLength({ max: 255 }).withMessage("Email must be 255 characters or fewer"),
    body("contact_phone").trim().notEmpty().withMessage("Phone number is required").isLength({ max: 50 }).withMessage("Phone number must be 50 characters or fewer"),
    body("genre").trim().notEmpty().withMessage("Genre is required").isLength({ max: 100 }).withMessage("Genre must be 100 characters or fewer"),
    body("member_count").trim().notEmpty().withMessage("Member count is required").isLength({ max: 100 }).withMessage("Member count must be 100 characters or fewer"),
    body("music_sample_link").trim().notEmpty().withMessage("Music sample link is required"),
    body("bio").trim().notEmpty().withMessage("Bio is required"),
    body("set_length").trim().notEmpty().withMessage("Set length is required").isLength({ max: 100 }).withMessage("Set length must be 100 characters or fewer"),
    body("venmo_handle").optional().isLength({ max: 100 }).withMessage("Venmo handle must be 100 characters or fewer"),
    body("instagram").optional().isLength({ max: 100 }).withMessage("Instagram link must be 100 characters or fewer"),
    body("spotify").optional().isLength({ max: 100 }).withMessage("Spotify link must be 100 characters or fewer"),
    body("soundcloud").optional().isLength({ max: 100 }).withMessage("SoundCloud link must be 100 characters or fewer"),
    body("bandcamp").optional().isLength({ max: 100 }).withMessage("Bandcamp link must be 100 characters or fewer"),
    body("facebook").optional().isLength({ max: 100 }).withMessage("Facebook link must be 100 characters or fewer"),
    body("equipment_consent")
      .equals("agree")
      .withMessage("You must agree to bring your own equipment"),
    body("payment_consent")
      .equals("agree")
      .withMessage("You must agree to the payment terms"),
    body("timeline_consent")
      .equals("agree")
      .withMessage("You must agree to the timeline"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn({ errors: errors.array(), band_name: req.body.band_name }, "Band application validation failed");
      return res.status(400).json({ errors: errors.array() });
    }

    logger.info({ body: req.body }, "Band application received");

    try {
      const band = await db.bands.create({
        event_id: req.body.event_id,
        band_name: req.body.band_name,
        contact_name: req.body.contact_name,
        contact_email: req.body.contact_email,
        contact_phone: req.body.contact_phone,
        genre: req.body.genre,
        member_count: req.body.member_count,
        music_sample_link: req.body.music_sample_link,
        bio: req.body.bio,
        set_length: req.body.set_length,
        venmo_handle: req.body.venmo_handle || null,
        instagram: req.body.instagram || null,
        spotify: req.body.spotify || null,
        soundcloud: req.body.soundcloud || null,
        bandcamp: req.body.bandcamp || null,
        facebook: req.body.facebook || null,
        website: req.body.website || null,
        scheduling_notes: req.body.scheduling_notes || null,
        equipment_consent: req.body.equipment_consent,
        payment_consent: req.body.payment_consent,
        timeline_consent: req.body.timeline_consent,
        photo_key: req.body.photo_key || null,
        questions_comments: req.body.questions_comments || null,
        status: "pending",
      });

      res.json({ success: true, id: band.id });
    } catch (error) {
      logger.error({ err: error }, "Error submitting band application");
      res.status(500).json({ error: "Failed to submit application" });
    }
  }
);
