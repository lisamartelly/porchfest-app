import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { adminOnly, AuthRequest } from "../middleware/auth.js";
import { db } from "../data/db.js";

export const tasksRouter: Router = Router();

tasksRouter.use(adminOnly);

// =========================================================================
// TASKS (organization-level templates)
// =========================================================================

tasksRouter.get(
  "/org/:orgId",
  async (req: AuthRequest, res: Response) => {
    try {
      const { orgId } = req.params;
      const tasks = await db.tasks.findByOrganizationId(orgId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }
);

tasksRouter.post(
  "/",
  [
    body("organization_id").notEmpty().withMessage("Organization is required"),
    body("name").trim().notEmpty().withMessage("Task name is required"),
    body("recurring").optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { organization_id, name, recurring } = req.body;

      const org = await db.organizations.findById(organization_id);
      if (!org) {
        return res.status(400).json({ error: "Organization not found" });
      }

      const task = await db.tasks.create({
        organization_id,
        name,
        recurring: recurring ?? false,
      });
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  }
);

tasksRouter.patch(
  "/:id",
  [
    body("name").optional().trim().notEmpty(),
    body("recurring").optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const task = await db.tasks.update(id, {
        name: req.body.name,
        recurring: req.body.recurring,
      });
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  }
);

tasksRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await db.tasks.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// =========================================================================
// EVENT TASKS (per-event instances)
// =========================================================================

tasksRouter.get(
  "/event/:eventId",
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const eventTasks = await db.eventTasks.findByEventId(eventId);

      const withContacts = await Promise.all(
        eventTasks.map(async (et) => {
          const contacts = await db.taskContacts.findByEventTaskId(et.id);
          return { ...et, contacts };
        })
      );

      res.json(withContacts);
    } catch (error) {
      console.error("Error fetching event tasks:", error);
      res.status(500).json({ error: "Failed to fetch event tasks" });
    }
  }
);

tasksRouter.post(
  "/event-tasks",
  [
    body("task_id").notEmpty(),
    body("event_id").notEmpty(),
    body("name").optional({ nullable: true }).trim(),
    body("notes").optional({ nullable: true }).isString(),
    body("assigned_user_id").optional({ nullable: true }),
    body("due_date").optional({ nullable: true }).isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { task_id, event_id, name, notes, assigned_user_id, due_date } =
        req.body;

      const existing = await db.eventTasks.findByTaskAndEvent(
        task_id,
        event_id
      );
      if (existing) {
        return res
          .status(400)
          .json({ error: "This task already exists for this event" });
      }

      const eventTask = await db.eventTasks.create({
        task_id,
        event_id,
        name,
        notes,
        assigned_user_id,
        due_date,
      });

      const detailed = await db.eventTasks.findById(eventTask.id);
      res.json({ ...detailed, contacts: [] });
    } catch (error) {
      console.error("Error creating event task:", error);
      res.status(500).json({ error: "Failed to create event task" });
    }
  }
);

tasksRouter.patch(
  "/event-tasks/:id",
  [
    body("name").optional({ nullable: true }).trim(),
    body("notes").optional({ nullable: true }).isString(),
    body("assigned_user_id").optional({ nullable: true }),
    body("due_date").optional({ nullable: true }).isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await db.eventTasks.update(id, {
        name: req.body.name,
        notes: req.body.notes,
        assigned_user_id: req.body.assigned_user_id,
        due_date: req.body.due_date,
      });
      if (!updated) {
        return res.status(404).json({ error: "Event task not found" });
      }

      const detailed = await db.eventTasks.findById(updated.id);
      const contacts = await db.taskContacts.findByEventTaskId(updated.id);
      res.json({ ...detailed, contacts });
    } catch (error) {
      console.error("Error updating event task:", error);
      res.status(500).json({ error: "Failed to update event task" });
    }
  }
);

tasksRouter.delete(
  "/event-tasks/:id",
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await db.eventTasks.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: "Event task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting event task:", error);
      res.status(500).json({ error: "Failed to delete event task" });
    }
  }
);

// Task history across events
tasksRouter.get(
  "/:id/history",
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const history = await db.eventTasks.getHistory(id);

      const withContacts = await Promise.all(
        history.map(async (et) => {
          const contacts = await db.taskContacts.findByEventTaskId(et.id);
          return { ...et, contacts };
        })
      );

      res.json(withContacts);
    } catch (error) {
      console.error("Error fetching task history:", error);
      res.status(500).json({ error: "Failed to fetch task history" });
    }
  }
);

// =========================================================================
// TASK CONTACTS
// =========================================================================

tasksRouter.post(
  "/event-tasks/:eventTaskId/contacts",
  [
    body("name").trim().notEmpty().withMessage("Contact name is required"),
    body("email").optional({ nullable: true }).trim(),
    body("phone").optional({ nullable: true }).trim(),
    body("business").optional({ nullable: true }).trim(),
    body("notes").optional({ nullable: true }).trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { eventTaskId } = req.params;
      const eventTask = await db.eventTasks.findById(eventTaskId);
      if (!eventTask) {
        return res.status(404).json({ error: "Event task not found" });
      }

      const contact = await db.taskContacts.create({
        event_task_id: eventTaskId,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        business: req.body.business,
        notes: req.body.notes,
      });
      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  }
);

tasksRouter.patch(
  "/contacts/:id",
  [
    body("name").optional().trim().notEmpty(),
    body("email").optional({ nullable: true }).trim(),
    body("phone").optional({ nullable: true }).trim(),
    body("business").optional({ nullable: true }).trim(),
    body("notes").optional({ nullable: true }).trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await db.taskContacts.update(id, {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        business: req.body.business,
        notes: req.body.notes,
      });
      if (!updated) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ error: "Failed to update contact" });
    }
  }
);

tasksRouter.delete(
  "/contacts/:id",
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await db.taskContacts.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  }
);

// =========================================================================
// GENERATE TASKS FROM PREVIOUS EVENT
// =========================================================================

tasksRouter.post(
  "/generate/:eventId",
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const event = await db.events.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const orgEvents = await db.events.findByOrganizationId(
        event.organization_id
      );

      // Find the most recent previous event (by date, before this one)
      const previousEvents = orgEvents
        .filter((e) => e.id !== event.id && new Date(e.date) < new Date(event.date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (previousEvents.length === 0) {
        return res
          .status(400)
          .json({ error: "No previous event found to copy tasks from" });
      }

      const previousEvent = previousEvents[0];
      const previousEventTasks = await db.eventTasks.findByEventId(
        previousEvent.id
      );

      // Only copy tasks marked as recurring
      const recurringTasks = previousEventTasks.filter((et) => et.recurring);

      if (recurringTasks.length === 0) {
        return res
          .status(400)
          .json({ error: "No recurring tasks found in the previous event" });
      }

      let created = 0;
      let skipped = 0;

      for (const prevTask of recurringTasks) {
        const existing = await db.eventTasks.findByTaskAndEvent(
          prevTask.task_id,
          eventId
        );
        if (existing) {
          skipped++;
          continue;
        }

        await db.eventTasks.create({
          task_id: prevTask.task_id,
          event_id: eventId,
        });
        created++;
      }

      const eventTasks = await db.eventTasks.findByEventId(eventId);
      const withContacts = await Promise.all(
        eventTasks.map(async (et) => {
          const contacts = await db.taskContacts.findByEventTaskId(et.id);
          return { ...et, contacts };
        })
      );

      res.json({
        message: `Generated ${created} task(s) from previous event "${previousEvent.name}"${skipped > 0 ? ` (${skipped} already existed)` : ""}`,
        event_tasks: withContacts,
      });
    } catch (error) {
      console.error("Error generating tasks:", error);
      res.status(500).json({ error: "Failed to generate tasks" });
    }
  }
);
