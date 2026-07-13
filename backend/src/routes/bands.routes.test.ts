import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bandsFindApproved: vi.fn(),
  porchesFindById: vi.fn(),
  bandsCreate: vi.fn(),
  eventsFindById: vi.fn(),
  getPresignedUploadUrl: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
  loggerInfo: vi.fn(),
}));

vi.mock("../data/db.js", () => ({
  db: {
    bands: {
      findApproved: mocks.bandsFindApproved,
      create: mocks.bandsCreate,
    },
    porches: {
      findById: mocks.porchesFindById,
    },
    events: {
      findById: mocks.eventsFindById,
    },
  },
}));

vi.mock("../services/s3.js", () => ({
  getPresignedUploadUrl: mocks.getPresignedUploadUrl,
}));

vi.mock("../lib/logger.js", () => ({
  default: {
    error: mocks.loggerError,
    warn: mocks.loggerWarn,
    info: mocks.loggerInfo,
  },
}));

import { bandsRouter } from "./bands.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/bands", bandsRouter);
  return app;
}

describe("bandsRouter", () => {
  it("returns public bands with porch address lookup", async () => {
    mocks.bandsFindApproved.mockResolvedValue([
      {
        id: 1,
        band_name: "The Porchers",
        genre: "Indie",
        member_count: "4",
        bio: "A neighborhood band",
        assigned_porch_id: 10,
        set_start_time: "13:00",
        set_end_time: "14:00",
      },
    ]);
    mocks.porchesFindById.mockResolvedValue({ id: 10, address: "123 Elm St" });

    const app = buildApp();
    const response = await request(app).get("/api/bands/public");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 1,
        band_name: "The Porchers",
        genre: "Indie",
        member_count: "4",
        bio: "A neighborhood band",
        set_start_time: "13:00",
        set_end_time: "14:00",
        venmo_handle: null,
        instagram: null,
        spotify: null,
        soundcloud: null,
        bandcamp: null,
        facebook: null,
        website: null,
        porch_address: "123 Elm St",
      },
    ]);
  });

  it("returns public bands without porch lookup when no porch is assigned", async () => {
    mocks.bandsFindApproved.mockResolvedValue([
      {
        id: 2,
        band_name: "No Porch Band",
        genre: "Folk",
        member_count: "2",
        bio: "Acoustic duo",
        assigned_porch_id: null,
      },
    ]);

    const app = buildApp();
    const response = await request(app).get("/api/bands/public");

    expect(response.status).toBe(200);
    expect(response.body[0].porch_address).toBeNull();
    expect(mocks.porchesFindById).not.toHaveBeenCalled();
  });

  it("returns public bands with null porch address when assigned porch is missing", async () => {
    mocks.bandsFindApproved.mockResolvedValue([
      {
        id: 3,
        band_name: "Missing Porch",
        genre: "Rock",
        member_count: "3",
        bio: "Loud trio",
        assigned_porch_id: 88,
      },
    ]);
    mocks.porchesFindById.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app).get("/api/bands/public");

    expect(response.status).toBe(200);
    expect(response.body[0].porch_address).toBeNull();
  });

  it("returns 400 when /upload-url is missing filename", async () => {
    const app = buildApp();
    const response = await request(app).get("/api/bands/upload-url");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "filename query parameter is required" });
  });

  it("returns presigned upload URL payload", async () => {
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");

    const app = buildApp();
    const response = await request(app)
      .get("/api/bands/upload-url")
      .query({ filename: "photo.jpg", contentType: "image/jpeg" });

    expect(response.status).toBe(200);
    expect(response.body.uploadUrl).toBe("https://signed.example/upload");
    expect(response.body.key).toMatch(/^bands\//);
    expect(mocks.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^bands\//),
      "image/jpeg"
    );
  });

  it("defaults upload-url content type from filename extension", async () => {
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");

    const app = buildApp();
    const response = await request(app)
      .get("/api/bands/upload-url")
      .query({ filename: "photo.png" });

    expect(response.status).toBe(200);
    expect(mocks.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^bands\//),
      "image/png"
    );
  });

  it("defaults upload-url to jpg/jpeg when filename ends with dot", async () => {
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");

    const app = buildApp();
    const response = await request(app)
      .get("/api/bands/upload-url")
      .query({ filename: "photo." });

    expect(response.status).toBe(200);
    expect(mocks.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^bands\//),
      "image/jpeg"
    );
  });

  it("validates /apply payload", async () => {
    const app = buildApp();
    const response = await request(app).post("/api/bands/apply").send({
      band_name: "Only Name",
    });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("creates a band application", async () => {
    mocks.eventsFindById.mockResolvedValue({
      id: 12,
      band_applications_open: "2020-01-01",
      band_applications_close: "2099-12-31",
    });
    mocks.bandsCreate.mockResolvedValue({ id: 300 });

    const app = buildApp();
    const response = await request(app).post("/api/bands/apply").send({
      event_id: "12",
      band_name: "Sunset Riders",
      contact_name: "Alex",
      contact_email: "alex@example.com",
      contact_phone: "555-1111",
      genre: "Rock",
      member_count: "4",
      music_sample_link: "https://example.com/sample",
      bio: "We play upbeat songs",
      set_length: "45",
      equipment_consent: "agree",
      payment_consent: "agree",
      timeline_consent: "agree",
      instagram: "https://instagram.com/sunsetriders",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, id: 300 });
    expect(mocks.bandsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "12",
        band_name: "Sunset Riders",
        contact_email: "alex@example.com",
        instagram: "https://instagram.com/sunsetriders",
        status: "pending",
      })
    );
  });

  it("handles errors for public bands endpoint", async () => {
    mocks.bandsFindApproved.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app).get("/api/bands/public");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch bands" });
  });

  it("handles errors for upload-url endpoint", async () => {
    mocks.getPresignedUploadUrl.mockRejectedValue(new Error("s3 down"));

    const app = buildApp();
    const response = await request(app)
      .get("/api/bands/upload-url")
      .query({ filename: "photo.jpg" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to generate upload URL" });
  });

  it("handles errors for apply endpoint", async () => {
    mocks.eventsFindById.mockResolvedValue({
      id: 12,
      band_applications_open: "2020-01-01",
      band_applications_close: "2099-12-31",
    });
    mocks.bandsCreate.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app).post("/api/bands/apply").send({
      event_id: "12",
      band_name: "Sunset Riders",
      contact_name: "Alex",
      contact_email: "alex@example.com",
      contact_phone: "555-1111",
      genre: "Rock",
      member_count: "4",
      music_sample_link: "https://example.com/sample",
      bio: "We play upbeat songs",
      set_length: "45",
      equipment_consent: "agree",
      payment_consent: "agree",
      timeline_consent: "agree",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to submit application" });
  });
});
