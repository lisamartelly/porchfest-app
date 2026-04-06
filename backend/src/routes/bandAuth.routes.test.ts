import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orgFindBySlug: vi.fn(),
  eventsFindActiveByOrganizationId: vi.fn(),
  bandsFindByEventIdAndEmail: vi.fn(),
  bandMagicCreate: vi.fn(),
  sendBandMagicLink: vi.fn(),
  bandMagicFindByToken: vi.fn(),
  bandsFindById: vi.fn(),
  bandsUpdate: vi.fn(),
  jwtSign: vi.fn(),
  jwtVerify: vi.fn(),
  getPresignedUploadUrl: vi.fn(),
  deleteObject: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: mocks.jwtSign,
    verify: mocks.jwtVerify,
  },
}));

vi.mock("../data/db.js", () => ({
  db: {
    organizations: {
      findBySlug: mocks.orgFindBySlug,
    },
    events: {
      findActiveByOrganizationId: mocks.eventsFindActiveByOrganizationId,
    },
    bands: {
      findByEventIdAndEmail: mocks.bandsFindByEventIdAndEmail,
      findById: mocks.bandsFindById,
      update: mocks.bandsUpdate,
    },
    bandMagicTokens: {
      create: mocks.bandMagicCreate,
      findByToken: mocks.bandMagicFindByToken,
    },
  },
}));

vi.mock("../services/email.js", () => ({
  sendBandMagicLink: mocks.sendBandMagicLink,
}));

vi.mock("../services/s3.js", () => ({
  getPresignedUploadUrl: mocks.getPresignedUploadUrl,
  deleteObject: mocks.deleteObject,
}));

vi.mock("../lib/logger.js", () => ({
  default: {
    error: mocks.loggerError,
  },
}));

import { bandAuthRouter } from "./bandAuth.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/bands/auth", bandAuthRouter);
  return app;
}

describe("bandAuthRouter", () => {
  it("returns 400 when magic-link payload fails validation", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/bands/auth/magic-link")
      .send({ slug: "", email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns generic response for unknown org to avoid enumeration", async () => {
    mocks.orgFindBySlug.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .post("/api/bands/auth/magic-link")
      .send({ slug: "unknown", email: "band@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message:
        "If a band with that email exists for this event, a magic link has been sent.",
    });
    expect(mocks.sendBandMagicLink).not.toHaveBeenCalled();
  });

  it("creates and emails magic link for known band", async () => {
    mocks.orgFindBySlug.mockResolvedValue({ id: 5, slug: "uptown" });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 12, name: "Fest" });
    mocks.bandsFindByEventIdAndEmail.mockResolvedValue({
      id: 77,
      contact_email: "band@example.com",
      band_name: "The Porchers",
    });
    mocks.bandMagicCreate.mockResolvedValue(undefined);
    mocks.sendBandMagicLink.mockResolvedValue(undefined);

    const app = buildApp();
    const response = await request(app)
      .post("/api/bands/auth/magic-link")
      .send({ slug: "uptown", email: "band@example.com" });

    expect(response.status).toBe(200);
    expect(mocks.bandMagicCreate).toHaveBeenCalledOnce();
    expect(mocks.sendBandMagicLink).toHaveBeenCalledWith(
      "band@example.com",
      expect.stringContaining("/band-edit?token="),
      "The Porchers",
      "Fest"
    );
  });

  it("returns generic response when active event is missing", async () => {
    mocks.orgFindBySlug.mockResolvedValue({ id: 5, slug: "uptown" });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .post("/api/bands/auth/magic-link")
      .send({ slug: "uptown", email: "band@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("If a band with that email exists");
    expect(mocks.sendBandMagicLink).not.toHaveBeenCalled();
  });

  it("returns generic response when band is missing", async () => {
    mocks.orgFindBySlug.mockResolvedValue({ id: 5, slug: "uptown" });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 12, name: "Fest" });
    mocks.bandsFindByEventIdAndEmail.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .post("/api/bands/auth/magic-link")
      .send({ slug: "uptown", email: "band@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("If a band with that email exists");
  });

  it("returns generic response when sending magic-link throws", async () => {
    mocks.orgFindBySlug.mockResolvedValue({ id: 5, slug: "uptown" });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 12, name: "Fest" });
    mocks.bandsFindByEventIdAndEmail.mockResolvedValue({
      id: 77,
      contact_email: "band@example.com",
      band_name: "The Porchers",
    });
    mocks.sendBandMagicLink.mockRejectedValue(new Error("smtp down"));

    const app = buildApp();
    const response = await request(app)
      .post("/api/bands/auth/magic-link")
      .send({ slug: "uptown", email: "band@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("If a band with that email exists");
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it("verifies magic token and returns band edit jwt", async () => {
    mocks.bandMagicFindByToken.mockResolvedValue({
      band_id: 77,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    mocks.bandsFindById.mockResolvedValue({ id: 77, band_name: "The Porchers" });
    mocks.jwtSign.mockReturnValue("band-edit-jwt");

    const app = buildApp();
    const response = await request(app).get("/api/bands/auth/magic-link/verify?token=abc");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      band: { id: 77, band_name: "The Porchers" },
      token: "band-edit-jwt",
    });
  });

  it("returns 400 when verify token query is missing", async () => {
    const app = buildApp();
    const response = await request(app).get("/api/bands/auth/magic-link/verify");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Token is required" });
  });

  it("returns 400 when verify token lookup fails", async () => {
    mocks.bandMagicFindByToken.mockResolvedValue(null);
    const app = buildApp();
    const response = await request(app).get("/api/bands/auth/magic-link/verify?token=bad");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid or expired link" });
  });

  it("returns 400 when verify token is expired", async () => {
    mocks.bandMagicFindByToken.mockResolvedValue({
      band_id: 77,
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    const app = buildApp();
    const response = await request(app).get("/api/bands/auth/magic-link/verify?token=expired");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "This link has expired" });
  });

  it("returns 404 when verify token references missing band", async () => {
    mocks.bandMagicFindByToken.mockResolvedValue({
      band_id: 77,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    mocks.bandsFindById.mockResolvedValue(null);
    const app = buildApp();
    const response = await request(app).get("/api/bands/auth/magic-link/verify?token=ok");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Band not found" });
  });

  it("returns 500 when verify magic-link throws", async () => {
    mocks.bandMagicFindByToken.mockRejectedValue(new Error("db down"));
    const app = buildApp();
    const response = await request(app).get("/api/bands/auth/magic-link/verify?token=oops");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to verify link" });
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it("returns 401 for upload-url when auth header is missing", async () => {
    const app = buildApp();
    const response = await request(app).get("/api/bands/auth/upload-url");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "No token provided" });
  });

  it("returns upload-url payload for valid band-edit jwt", async () => {
    mocks.jwtVerify.mockReturnValue({ bandId: 77, type: "band-edit" });
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");

    const app = buildApp();
    const response = await request(app)
      .get("/api/bands/auth/upload-url")
      .set("authorization", "Bearer token-123")
      .query({ filename: "photo.jpg", contentType: "image/jpeg" });

    expect(response.status).toBe(200);
    expect(response.body.uploadUrl).toBe("https://signed.example/upload");
    expect(response.body.key).toMatch(/^bands\//);
  });

  it("defaults upload-url extension and contentType when filename ends with dot", async () => {
    mocks.jwtVerify.mockReturnValue({ bandId: 77, type: "band-edit" });
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");

    const app = buildApp();
    const response = await request(app)
      .get("/api/bands/auth/upload-url")
      .set("authorization", "Bearer token-123")
      .query({ filename: "photo." });

    expect(response.status).toBe(200);
    expect(mocks.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^bands\//),
      "image/jpeg"
    );
  });

  it("defaults upload-url contentType to image/<ext> for non-jpg extensions", async () => {
    mocks.jwtVerify.mockReturnValue({ bandId: 77, type: "band-edit" });
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");

    const app = buildApp();
    const response = await request(app)
      .get("/api/bands/auth/upload-url")
      .set("authorization", "Bearer token-123")
      .query({ filename: "photo.png" });

    expect(response.status).toBe(200);
    expect(mocks.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^bands\//),
      "image/png"
    );
  });

  it("returns 403 for upload-url when token type is not band-edit", async () => {
    mocks.jwtVerify.mockReturnValue({ bandId: 77, type: "admin" });
    const app = buildApp();
    const response = await request(app)
      .get("/api/bands/auth/upload-url")
      .set("authorization", "Bearer token-123")
      .query({ filename: "photo.jpg" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not authorized" });
  });

  it("returns 400 for upload-url when filename is missing", async () => {
    mocks.jwtVerify.mockReturnValue({ bandId: 77, type: "band-edit" });
    const app = buildApp();
    const response = await request(app)
      .get("/api/bands/auth/upload-url")
      .set("authorization", "Bearer token-123");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "filename query parameter is required" });
  });

  it("returns 401 for upload-url when jwt verification fails", async () => {
    mocks.jwtVerify.mockImplementation(() => {
      throw new Error("bad token");
    });
    const app = buildApp();
    const response = await request(app)
      .get("/api/bands/auth/upload-url")
      .set("authorization", "Bearer token-123")
      .query({ filename: "photo.jpg" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid or expired token" });
  });

  it("patches band when token matches band id", async () => {
    mocks.jwtVerify.mockReturnValue({ bandId: 77, type: "band-edit" });
    mocks.bandsFindById.mockResolvedValue({ id: 77, photo_key: "old-key.jpg" });
    mocks.deleteObject.mockResolvedValue(undefined);
    mocks.bandsUpdate.mockResolvedValue({ id: 77, band_name: "Updated" });

    const app = buildApp();
    const response = await request(app)
      .patch("/api/bands/auth/77")
      .set("authorization", "Bearer token-123")
      .send({ band_name: "Updated", photo_key: "new-key.jpg" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 77, band_name: "Updated" });
    expect(mocks.deleteObject).toHaveBeenCalledWith("old-key.jpg");
    expect(mocks.bandsUpdate).toHaveBeenCalledWith(77, {
      band_name: "Updated",
      photo_key: "new-key.jpg",
    });
  });

  it("does not delete old photo when incoming photo key is unchanged", async () => {
    mocks.jwtVerify.mockReturnValue({ bandId: 77, type: "band-edit" });
    mocks.bandsFindById.mockResolvedValue({ id: 77, photo_key: "same-key.jpg" });
    mocks.bandsUpdate.mockResolvedValue({ id: 77, band_name: "Updated" });

    const app = buildApp();
    const response = await request(app)
      .patch("/api/bands/auth/77")
      .set("authorization", "Bearer token-123")
      .send({ band_name: "Updated", photo_key: "same-key.jpg" });

    expect(response.status).toBe(200);
    expect(mocks.deleteObject).not.toHaveBeenCalled();
  });

  it("logs error when old photo deletion fails during patch", async () => {
    mocks.jwtVerify.mockReturnValue({ bandId: 77, type: "band-edit" });
    mocks.bandsFindById.mockResolvedValue({ id: 77, photo_key: "old-key.jpg" });
    mocks.deleteObject.mockRejectedValue(new Error("s3 down"));
    mocks.bandsUpdate.mockResolvedValue({ id: 77, band_name: "Updated" });

    const app = buildApp();
    const response = await request(app)
      .patch("/api/bands/auth/77")
      .set("authorization", "Bearer token-123")
      .send({ band_name: "Updated", photo_key: "new-key.jpg" });

    await Promise.resolve();
    await Promise.resolve();

    expect(response.status).toBe(200);
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it("returns 400 for patch when band id is invalid", async () => {
    const app = buildApp();
    const response = await request(app)
      .patch("/api/bands/auth/not-a-number")
      .set("authorization", "Bearer token-123")
      .send({ band_name: "Updated" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid band ID" });
  });

  it("returns 401 for patch when auth header is missing", async () => {
    const app = buildApp();
    const response = await request(app)
      .patch("/api/bands/auth/77")
      .send({ band_name: "Updated" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "No token provided" });
  });

  it("returns 403 for patch when token does not match band", async () => {
    mocks.jwtVerify.mockReturnValue({ bandId: 1, type: "band-edit" });
    const app = buildApp();
    const response = await request(app)
      .patch("/api/bands/auth/77")
      .set("authorization", "Bearer token-123")
      .send({ band_name: "Updated" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not authorized to edit this band" });
  });

  it("returns 404 for patch when band update target is missing", async () => {
    mocks.jwtVerify.mockReturnValue({ bandId: 77, type: "band-edit" });
    mocks.bandsFindById.mockResolvedValue({ id: 77, photo_key: null });
    mocks.bandsUpdate.mockResolvedValue(null);
    const app = buildApp();
    const response = await request(app)
      .patch("/api/bands/auth/77")
      .set("authorization", "Bearer token-123")
      .send({ band_name: "Updated" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Band not found" });
  });

  it("returns 401 for patch when jwt verification fails", async () => {
    mocks.jwtVerify.mockImplementation(() => {
      throw new Error("bad token");
    });

    const app = buildApp();
    const response = await request(app)
      .patch("/api/bands/auth/77")
      .set("authorization", "Bearer token-123")
      .send({ band_name: "Updated" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid or expired token" });
  });
});
