import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAll: vi.fn(),
  findActive: vi.fn(),
  findByEventId: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("../data/db.js", () => ({
  db: {
    events: {
      findAll: mocks.findAll,
      findActive: mocks.findActive,
    },
    timeSlots: {
      findByEventId: mocks.findByEventId,
    },
  },
}));

vi.mock("../lib/logger.js", () => ({
  default: {
    error: mocks.loggerError,
  },
}));

import { eventsRouter } from "./events.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/events", eventsRouter);
  return app;
}

describe("eventsRouter", () => {
  it("returns all events", async () => {
    const events = [{ id: 1, name: "Uptown" }];
    mocks.findAll.mockResolvedValue(events);

    const app = buildApp();
    const response = await request(app).get("/api/events");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(events);
    expect(mocks.findAll).toHaveBeenCalledOnce();
  });

  it("returns active event with slots", async () => {
    mocks.findActive.mockResolvedValue({ id: 12, name: "Active" });
    mocks.findByEventId.mockResolvedValue([{ id: 9, starts_at: "12:00" }]);

    const app = buildApp();
    const response = await request(app).get("/api/events/active");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 12,
      name: "Active",
      time_slots: [{ id: 9, starts_at: "12:00" }],
    });
  });

  it("returns null when no active event exists", async () => {
    mocks.findActive.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app).get("/api/events/active");

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
    expect(mocks.findByEventId).not.toHaveBeenCalled();
  });

  it("returns event slots by event id", async () => {
    mocks.findByEventId.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const app = buildApp();
    const response = await request(app).get("/api/events/33/slots");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1 }, { id: 2 }]);
    expect(mocks.findByEventId).toHaveBeenCalledWith("33");
  });

  it("handles db errors with 500", async () => {
    mocks.findAll.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app).get("/api/events");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch events" });
    expect(mocks.loggerError).toHaveBeenCalledOnce();
  });

  it("handles errors when fetching active event", async () => {
    mocks.findActive.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app).get("/api/events/active");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch active event" });
  });

  it("handles errors when fetching event slots", async () => {
    mocks.findByEventId.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app).get("/api/events/99/slots");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch time slots" });
  });
});
