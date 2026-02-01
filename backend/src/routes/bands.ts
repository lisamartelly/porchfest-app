import { Router } from "express";
import { body, validationResult } from "express-validator";
import { bands } from "../data/db.js";

export const bandsRouter = Router();

// Public: Submit band application (no auth required)
bandsRouter.post(
  "/apply",
  [
    body("band_name").trim().notEmpty().withMessage("Band name is required"),
    body("contact_name").trim().notEmpty().withMessage("Contact name is required"),
    body("contact_email").isEmail().withMessage("Valid email is required"),
    body("contact_phone").trim().notEmpty().withMessage("Phone number is required"),
    body("genre").trim().notEmpty().withMessage("Genre is required"),
    body("member_count").trim().notEmpty().withMessage("Member count is required"),
    body("music_sample_link").trim().notEmpty().withMessage("Music sample link is required"),
    body("bio").trim().notEmpty().withMessage("Bio is required"),
    body("set_length").trim().notEmpty().withMessage("Set length is required"),
    body("equipment_consent").equals("agree").withMessage("You must agree to bring your own equipment"),
    body("payment_consent").equals("agree").withMessage("You must agree to the payment terms"),
    body("timeline_consent").equals("agree").withMessage("You must agree to the timeline"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        band_name,
        contact_name,
        contact_email,
        contact_phone,
        genre,
        member_count,
        music_sample_link,
        bio,
        set_length,
        venmo_handle,
        instagram,
        spotify,
        soundcloud,
        bandcamp,
        facebook,
        website,
        scheduling_notes,
        equipment_consent,
        payment_consent,
        timeline_consent,
        has_photo,
        photo_filename,
        questions_comments,
      } = req.body;

      const bandData = {
        id: crypto.randomUUID(),
        band_name,
        contact_name,
        contact_email,
        contact_phone,
        genre,
        member_count,
        music_sample_link,
        bio,
        set_length,
        venmo_handle: venmo_handle || null,
        instagram: instagram || null,
        spotify: spotify || null,
        soundcloud: soundcloud || null,
        bandcamp: bandcamp || null,
        facebook: facebook || null,
        website: website || null,
        scheduling_notes: scheduling_notes || null,
        equipment_consent,
        payment_consent,
        timeline_consent,
        has_photo: has_photo || false,
        photo_filename: photo_filename || null,
        questions_comments: questions_comments || null,
        status: "pending",
        admin_notes: null,
        created_at: new Date().toISOString(),
      };

      bands.set(bandData.id, bandData);

      console.log("New band application:", bandData.band_name);

      res.json({ success: true, id: bandData.id });
    } catch (error) {
      console.error("Error submitting band application:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  }
);

// bands is exported from ../data/db.js
