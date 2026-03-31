import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { authRouter } from "./routes/auth.js";
import { bandsRouter } from "./routes/bands.js";
import { porchesRouter } from "./routes/porches.js";
import { eventsRouter } from "./routes/events.js";
import { adminRouter } from "./routes/admin.js";
import { tasksRouter } from "./routes/tasks.js";
import { bandAuthRouter } from "./routes/bandAuth.js";
import { authMiddleware } from "./middleware/auth.js";
import { testConnection, db } from "./data/db.js";
import logger from "./lib/logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: Date.now() - start,
    }, "request");
  });
  next();
});
app.use(express.json());

// Health check
app.get("/health", async (req, res) => {
  try {
    // Quick database health check
    const dbHealthy = await testConnection();
    res.json({
      status: dbHealthy ? "ok" : "degraded",
      database: dbHealthy ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// Auth routes (for admin login)
app.use("/api/auth", authRouter);

// Public application routes (no auth required)
app.use("/api/bands", bandsRouter);
app.use("/api/bands/auth", bandAuthRouter);
app.use("/api/porches", porchesRouter);

// Public schedule/venues
app.get("/api/schedule", async (req, res) => {
  try {
    const approvedBands = await db.bands.findApproved();
    const timeSlots = await db.timeSlots.findAll();

    // Build schedule from approved bands with assignments
    const performances = approvedBands
      .filter((b) => b.assigned_porch_id && b.set_start_time && b.set_end_time)
      .map((band) => ({
        band_id: band.id,
        band_name: band.band_name,
        genre: band.genre,
        porch_id: band.assigned_porch_id,
        start_time: band.set_start_time,
        end_time: band.set_end_time,
      }));

    res.json({ performances, timeSlots });
  } catch (error) {
    logger.error({ err: error }, "Error fetching schedule");
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

app.get("/api/venues", async (req, res) => {
  try {
    const approvedPorches = await db.porches.findApproved();
    res.json(
      approvedPorches.map((p) => ({
        id: p.id,
        address: p.address,
        city: p.city,
        lat: p.lat,
        lng: p.lng,
        capacity: p.capacity,
        has_power: p.has_power,
        accessibility_notes: p.accessibility_notes,
      }))
    );
  } catch (error) {
    logger.error({ err: error }, "Error fetching venues");
    res.status(500).json({ error: "Failed to fetch venues" });
  }
});

// Public: Look up an organization's active event and application status
app.get("/api/events/org/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const org = await db.organizations.findBySlug(slug);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const orgEvents = await db.events.findByOrganizationId(org.id);
    const activeEvent = orgEvents.find((e) => e.is_active);

    if (!activeEvent) {
      return res.json({
        organization: { id: org.id, name: org.name, slug: org.slug },
        event: null,
        band_applications_open: false,
        porch_applications_open: false,
        band_applications_open_date: null,
        band_applications_close_date: null,
        porch_applications_open_date: null,
        porch_applications_close_date: null,
      });
    }

    const now = new Date();
    const bandOpenDate = activeEvent.band_applications_open;
    const bandCloseDate = activeEvent.band_applications_close;
    const porchOpenDate = activeEvent.porch_applications_open;
    const porchCloseDate = activeEvent.porch_applications_close;

    const bandOpen = bandOpenDate
      ? new Date(bandOpenDate) <= now
      : false;
    const bandClose = bandCloseDate
      ? new Date(bandCloseDate) >= now
      : false;
    const porchOpen = porchOpenDate
      ? new Date(porchOpenDate) <= now
      : false;
    const porchClose = porchCloseDate
      ? new Date(porchCloseDate) >= now
      : false;

    res.json({
      organization: { id: org.id, name: org.name, slug: org.slug },
      event: {
        id: activeEvent.id,
        name: activeEvent.name,
        date: activeEvent.date,
        start_time: activeEvent.start_time,
        end_time: activeEvent.end_time,
        description: activeEvent.description,
      },
      band_applications_open: bandOpen && bandClose,
      porch_applications_open: porchOpen && porchClose,
      band_applications_open_date: bandOpenDate,
      band_applications_close_date: bandCloseDate,
      porch_applications_open_date: porchOpenDate,
      porch_applications_close_date: porchCloseDate,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching org event");
    res.status(500).json({ error: "Failed to fetch event info" });
  }
});

// Protected admin routes
app.use("/api/events", authMiddleware, eventsRouter);
app.use("/api/admin", authMiddleware, adminRouter);
app.use("/api/admin/tasks", authMiddleware, tasksRouter);

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error({ err }, "Unhandled error");
    res.status(500).json({ error: "Something went wrong!" });
  }
);

// Start server with database connection test
async function start() {
  // Test database connection before starting
  const dbConnected = await testConnection();
  if (!dbConnected) {
    logger.fatal("Failed to connect to database — exiting");
    process.exit(1);
  }

  app.listen(PORT, () => {
    logger.info({ port: PORT, frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173" }, "Porchfest API started");
  });
}

start();
