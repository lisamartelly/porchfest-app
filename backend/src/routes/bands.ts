import { Router } from "express";
import { body, validationResult } from "express-validator";

export const bandsRouter = Router();

// In-memory store for development - replace with real database
const bands: Map<
  string,
  {
    id: string;
    // Basic Info
    band_name: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    genre: string;
    member_count: string;
    music_sample_link: string;
    // Bio
    bio: string;
    // Performance Details
    set_length: string;
    venmo_handle: string | null;
    // Social Media
    instagram: string | null;
    spotify: string | null;
    soundcloud: string | null;
    bandcamp: string | null;
    facebook: string | null;
    website: string | null;
    // Scheduling
    scheduling_notes: string | null;
    // Consent
    equipment_consent: string;
    payment_consent: string;
    timeline_consent: string;
    // Photo
    has_photo: boolean;
    photo_filename: string | null;
    // Questions
    questions_comments: string | null;
    // Status
    status: string;
    admin_notes: string | null;
    created_at: string;
  }
> = new Map();

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

// Export bands map for admin routes
export { bands };
