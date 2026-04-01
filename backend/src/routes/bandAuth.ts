import { Router, type Router as ExpressRouter, Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { db } from "../data/db.js";
import { sendBandMagicLink } from "../services/email.js";
import { getPresignedUploadUrl, deleteObject } from "../services/s3.js";
import logger from "../lib/logger.js";

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
      logger.error({ err: error }, "Error sending magic link");
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
      logger.error({ err: error }, "Error verifying magic link");
      return res.status(500).json({ error: "Failed to verify link" });
    }
  }
);

// GET /upload-url — get a presigned S3 upload URL (requires band-edit JWT)
bandAuthRouter.get("/upload-url", async (req: Request, res: Response) => {
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
    if (decoded.type !== "band-edit") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const filename = req.query.filename as string;
    if (!filename) {
      return res.status(400).json({ error: "filename query parameter is required" });
    }

    const ext = filename.split(".").pop() || "jpg";
    const key = `bands/${crypto.randomUUID()}/${Date.now()}.${ext}`;
    const contentType = req.query.contentType as string || `image/${ext === "jpg" ? "jpeg" : ext}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    return res.json({ uploadUrl, key });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

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

    if (req.body.photo_key) {
      const existingBand = await db.bands.findById(bandId);
      if (existingBand?.photo_key && existingBand.photo_key !== req.body.photo_key) {
        deleteObject(existingBand.photo_key).catch((err) =>
          logger.error({ err }, "Failed to delete old photo from S3")
        );
      }
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
