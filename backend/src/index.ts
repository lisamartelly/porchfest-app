import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import { authRouter } from "./routes/auth.js";
import { bandsRouter } from "./routes/bands.js";
import { porchesRouter } from "./routes/porches.js";
import { eventsRouter } from "./routes/events.js";
import { adminRouter } from "./routes/admin.js";
import { authMiddleware } from "./middleware/auth.js";
import { testConnection, db } from "./data/db.js";

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
app.use(morgan("combined"));
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
    console.error("Error fetching schedule:", error);
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
    console.error("Error fetching venues:", error);
    res.status(500).json({ error: "Failed to fetch venues" });
  }
});

// Protected admin routes
app.use("/api/events", authMiddleware, eventsRouter);
app.use("/api/admin", authMiddleware, adminRouter);

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  }
);

// Start server with database connection test
async function start() {
  // Test database connection before starting
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error("❌ Failed to connect to database. Exiting...");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Porchfest API running on port ${PORT}`);
    console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
  });
}

start();
