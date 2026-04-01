import { Router } from "express";
import { db } from "../data/db.js";
import logger from "../lib/logger.js";

export const eventsRouter: Router = Router();

eventsRouter.get("/", async (req, res) => {
  try {
    const allEvents = await db.events.findAll();
    res.json(allEvents);
  } catch (error) {
    logger.error({ err: error }, "Error fetching events");
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

eventsRouter.get("/active", async (req, res) => {
  try {
    const activeEvent = await db.events.findActive();

    if (!activeEvent) {
      return res.json(null);
    }

    const eventSlots = await db.timeSlots.findByEventId(activeEvent.id);

    res.json({
      ...activeEvent,
      time_slots: eventSlots,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching active event");
    res.status(500).json({ error: "Failed to fetch active event" });
  }
});

eventsRouter.get("/:eventId/slots", async (req, res) => {
  try {
    const { eventId } = req.params;
    const slots = await db.timeSlots.findByEventId(eventId);
    res.json(slots);
  } catch (error) {
    logger.error({ err: error }, "Error fetching time slots");
    res.status(500).json({ error: "Failed to fetch time slots" });
  }
});
