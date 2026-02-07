import { Router } from "express";
import { body, validationResult } from "express-validator";
import { db } from "../data/db.js";

export const bandsRouter = Router();

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
    console.error("Error fetching public bands:", error);
    res.status(500).json({ error: "Failed to fetch bands" });
  }
});

// Public: Submit band application (no auth required)
bandsRouter.post(
  "/apply",
  [
    body("band_name").trim().notEmpty().withMessage("Band name is required"),
    body("contact_name")
      .trim()
      .notEmpty()
      .withMessage("Contact name is required"),
    body("contact_email").isEmail().withMessage("Valid email is required"),
    body("contact_phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required"),
    body("genre").trim().notEmpty().withMessage("Genre is required"),
    body("member_count")
      .trim()
      .notEmpty()
      .withMessage("Member count is required"),
    body("music_sample_link")
      .trim()
      .notEmpty()
      .withMessage("Music sample link is required"),
    body("bio").trim().notEmpty().withMessage("Bio is required"),
    body("set_length").trim().notEmpty().withMessage("Set length is required"),
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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const band = await db.bands.create({
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
        has_photo: req.body.has_photo || false,
        photo_filename: req.body.photo_filename || null,
        questions_comments: req.body.questions_comments || null,
        status: "pending",
      });

      console.log("New band application:", band.band_name);

      res.json({ success: true, id: band.id });
    } catch (error) {
      console.error("Error submitting band application:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  }
);
