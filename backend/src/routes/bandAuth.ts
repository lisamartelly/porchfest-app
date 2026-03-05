import { Router, type Router as ExpressRouter, Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { db } from "../data/db.js";
import { sendBandMagicLink } from "../services/email.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const BAND_JWT_EXPIRY = "2h";

export const bandAuthRouter: ExpressRouter = Router();

// POST /magic-link — request a magic link email
bandAuthRouter.post(
  "/magic-link",
  [
    body("slug").isString().trim().notEmpty(),
    body("email").isEmail(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { slug, email } = req.body;

    // Always return success to avoid email enumeration
    const genericResponse = {
      message:
        "If a band with that email exists for this event, a magic link has been sent.",
    };

    try {
      const org = await db.organizations.findBySlug(slug);
      if (!org) return res.json(genericResponse);

      const activeEvent = await db.events.findActiveByOrganizationId(org.id);
      if (!activeEvent) return res.json(genericResponse);

      const band = await db.bands.findByEventIdAndEmail(
        activeEvent.id,
        email
      );
      if (!band) return res.json(genericResponse);

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

      await db.bandMagicTokens.create(band.id, token, expiresAt);

      const magicLinkUrl = `${FRONTEND_URL}/band-edit?token=${token}`;

      await sendBandMagicLink(
        band.contact_email,
        magicLinkUrl,
        band.band_name,
        activeEvent.name
      );

      return res.json(genericResponse);
    } catch (error) {
      console.error("Error sending magic link:", error);
      return res.json(genericResponse);
    }
  }
);

// GET /magic-link/verify — verify token and return band data + JWT
bandAuthRouter.get(
  "/magic-link/verify",
  async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token is required" });
    }

    try {
      const magicToken = await db.bandMagicTokens.findByToken(token);

      if (!magicToken) {
        return res.status(400).json({ error: "Invalid or expired link" });
      }

      if (new Date() > new Date(magicToken.expires_at)) {
        return res.status(400).json({ error: "This link has expired" });
      }

      const band = await db.bands.findById(magicToken.band_id);
      if (!band) {
        return res.status(404).json({ error: "Band not found" });
      }

      const bandJwt = jwt.sign(
        { bandId: band.id, type: "band-edit" },
        JWT_SECRET,
        { expiresIn: BAND_JWT_EXPIRY }
      );

      return res.json({ band, token: bandJwt });
    } catch (error) {
      console.error("Error verifying magic link:", error);
      return res.status(500).json({ error: "Failed to verify link" });
    }
  }
);

// PATCH /:id — update band info (requires band-edit JWT)
bandAuthRouter.patch("/:id", async (req: Request, res: Response) => {
  const bandId = parseInt(req.params.id, 10);
  if (isNaN(bandId)) {
    return res.status(400).json({ error: "Invalid band ID" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      bandId: number;
      type: string;
    };

    if (decoded.type !== "band-edit" || decoded.bandId !== bandId) {
      return res.status(403).json({ error: "Not authorized to edit this band" });
    }

    const updatedBand = await db.bands.update(bandId, req.body);
    if (!updatedBand) {
      return res.status(404).json({ error: "Band not found" });
    }

    return res.json(updatedBand);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});
