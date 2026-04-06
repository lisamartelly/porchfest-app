import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPresignedUploadUrl: vi.fn(),
  porchesCreate: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
}));

vi.mock("../services/s3.js", () => ({
  getPresignedUploadUrl: mocks.getPresignedUploadUrl,
}));

vi.mock("../data/db.js", () => ({
  db: {
    porches: {
      create: mocks.porchesCreate,
    },
  },
}));

vi.mock("../lib/logger.js", () => ({
  default: {
    error: mocks.loggerError,
    info: mocks.loggerInfo,
  },
}));

import { porchesRouter } from "./porches.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/porches", porchesRouter);
  return app;
}

describe("porchesRouter", () => {
  it("returns 400 for upload-url without filename", async () => {
    const app = buildApp();
    const response = await request(app).get("/api/porches/upload-url");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "filename query parameter is required" });
  });

  it("returns presigned upload-url payload", async () => {
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");

    const app = buildApp();
    const response = await request(app)
      .get("/api/porches/upload-url")
      .query({ filename: "porch.jpg", contentType: "image/jpeg" });

    expect(response.status).toBe(200);
    expect(response.body.uploadUrl).toBe("https://signed.example/upload");
    expect(response.body.key).toMatch(/^porches\//);
  });

  it("defaults porch upload-url content type from filename extension", async () => {
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");

    const app = buildApp();
    const response = await request(app)
      .get("/api/porches/upload-url")
      .query({ filename: "porch.png" });

    expect(response.status).toBe(200);
    expect(mocks.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^porches\//),
      "image/png"
    );
  });

  it("defaults porch upload-url to jpg/jpeg when filename ends with dot", async () => {
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");

    const app = buildApp();
    const response = await request(app)
      .get("/api/porches/upload-url")
      .query({ filename: "porch." });

    expect(response.status).toBe(200);
    expect(mocks.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^porches\//),
      "image/jpeg"
    );
  });

  it("validates porch application payload", async () => {
    const app = buildApp();
    const response = await request(app).post("/api/porches/apply").send({
      owner_name: "Only Name",
    });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("creates porch application", async () => {
    mocks.porchesCreate.mockResolvedValue({ id: 900 });

    const app = buildApp();
    const response = await request(app).post("/api/porches/apply").send({
      event_id: "12",
      owner_name: "Riley",
      email: "riley@example.com",
      phone: "555-1212",
      address: "123 Main St",
      city: "Cleveland",
      has_power: true,
      comments: "Close to park",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, id: 900 });
    expect(mocks.porchesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "12",
        owner_name: "Riley",
        email: "riley@example.com",
        status: "pending",
      })
    );
  });

  it("handles upload-url generation errors", async () => {
    mocks.getPresignedUploadUrl.mockRejectedValue(new Error("s3 down"));

    const app = buildApp();
    const response = await request(app)
      .get("/api/porches/upload-url")
      .query({ filename: "porch.jpg" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to generate upload URL" });
  });

  it("handles porch apply errors", async () => {
    mocks.porchesCreate.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app).post("/api/porches/apply").send({
      event_id: "12",
      owner_name: "Riley",
      email: "riley@example.com",
      phone: "555-1212",
      address: "123 Main St",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to submit application" });
  });
});
