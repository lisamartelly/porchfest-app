import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findByUserAndOrg: vi.fn(),
  getOrganizationsForUser: vi.fn(),
  findActiveByOrganizationId: vi.fn(),
  findActive: vi.fn(),
  eventsFindById: vi.fn(),
  eventsFindByOrganizationId: vi.fn(),
  eventTasksFindByEventId: vi.fn(),
  eventTasksFindByTaskAndEvent: vi.fn(),
  eventTasksGetHistory: vi.fn(),
  eventTasksUpdate: vi.fn(),
  eventTasksDelete: vi.fn(),
  taskContactsFindByEventTaskId: vi.fn(),
  taskContactsCreate: vi.fn(),
  taskContactsUpdate: vi.fn(),
  taskContactsDelete: vi.fn(),
  organizationsFindById: vi.fn(),
  tasksCreate: vi.fn(),
  tasksUpdate: vi.fn(),
  tasksDelete: vi.fn(),
  eventTasksCreate: vi.fn(),
  eventTasksFindById: vi.fn(),
  tasksFindByOrganizationId: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("../middleware/auth.js", async () => {
  const { createMockAdminOnly } = await import("../test/helpers.js");
  return {
    adminOnly: createMockAdminOnly("route-test@example.com"),
  };
});

vi.mock("../data/db.js", () => ({
  db: {
    organizationUsers: {
      findByUserAndOrg: mocks.findByUserAndOrg,
      getOrganizationsForUser: mocks.getOrganizationsForUser,
    },
    events: {
      findActiveByOrganizationId: mocks.findActiveByOrganizationId,
      findActive: mocks.findActive,
      findById: mocks.eventsFindById,
      findByOrganizationId: mocks.eventsFindByOrganizationId,
    },
    eventTasks: {
      findByEventId: mocks.eventTasksFindByEventId,
      create: mocks.eventTasksCreate,
      findById: mocks.eventTasksFindById,
      findByTaskAndEvent: mocks.eventTasksFindByTaskAndEvent,
      getHistory: mocks.eventTasksGetHistory,
      update: mocks.eventTasksUpdate,
      delete: mocks.eventTasksDelete,
    },
    taskContacts: {
      findByEventTaskId: mocks.taskContactsFindByEventTaskId,
      create: mocks.taskContactsCreate,
      update: mocks.taskContactsUpdate,
      delete: mocks.taskContactsDelete,
    },
    tasks: {
      create: mocks.tasksCreate,
      findByOrganizationId: mocks.tasksFindByOrganizationId,
      update: mocks.tasksUpdate,
      delete: mocks.tasksDelete,
    },
    organizations: {
      findById: mocks.organizationsFindById,
    },
  },
}));

vi.mock("../lib/logger.js", () => ({
  default: {
    error: mocks.loggerError,
  },
}));

import { tasksRouter } from "./tasks.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin/tasks", tasksRouter);
  return app;
}

describe("tasksRouter", () => {
  it("returns empty payload when non-super user lacks org membership", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/active-event-tasks?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ event: null, event_tasks: [] });
    expect(mocks.findByUserAndOrg).toHaveBeenCalledWith(1, 9);
  });

  it("returns active event tasks for non-super user with org membership", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.findActiveByOrganizationId.mockResolvedValue({ id: 5, organization_id: 9, name: "Fest" });
    mocks.eventTasksFindByEventId.mockResolvedValue([{ id: 77, name: "Task" }]);
    mocks.taskContactsFindByEventTaskId.mockResolvedValue([]);

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/active-event-tasks?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body.event).toEqual({ id: 5, organization_id: 9, name: "Fest" });
  });

  it("returns active event tasks and contacts for super admin", async () => {
    mocks.findActive.mockResolvedValue({ id: 2, organization_id: 99, name: "Fest" });
    mocks.eventTasksFindByEventId.mockResolvedValue([
      { id: 10, task_id: 1, name: "Stage" },
      { id: 11, task_id: 2, name: "Power" },
    ]);
    mocks.taskContactsFindByEventTaskId.mockImplementation((id: number) =>
      Promise.resolve(id === 10 ? [{ id: 101, name: "Alex" }] : [])
    );

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/active-event-tasks")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      event: { id: 2, organization_id: 99, name: "Fest" },
      event_tasks: [
        { id: 10, task_id: 1, name: "Stage", contacts: [{ id: 101, name: "Alex" }] },
        { id: 11, task_id: 2, name: "Power", contacts: [] },
      ],
    });
  });

  it("uses org_id directly for super admin without membership check", async () => {
    mocks.findActiveByOrganizationId.mockResolvedValue({ id: 2, organization_id: 99, name: "Fest" });
    mocks.eventTasksFindByEventId.mockResolvedValue([{ id: 10, task_id: 1, name: "Stage" }]);
    mocks.taskContactsFindByEventTaskId.mockResolvedValue([]);

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/active-event-tasks?org_id=99")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body.event).toEqual({ id: 2, organization_id: 99, name: "Fest" });
    expect(mocks.findByUserAndOrg).not.toHaveBeenCalled();
  });

  it("resolves active event from user organizations when org_id query is omitted", async () => {
    mocks.getOrganizationsForUser.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    mocks.findActiveByOrganizationId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 22, organization_id: 11, name: "Fest" });
    mocks.eventTasksFindByEventId.mockResolvedValue([{ id: 99, name: "Task" }]);
    mocks.taskContactsFindByEventTaskId.mockResolvedValue([]);

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/active-event-tasks")
      .set("x-role", "user")
      .set("x-user-id", "3");

    expect(response.status).toBe(200);
    expect(response.body.event).toEqual({ id: 22, organization_id: 11, name: "Fest" });
    expect(mocks.findActiveByOrganizationId).toHaveBeenCalledTimes(2);
  });

  it("returns empty active-event payload when user has no active events across organizations", async () => {
    mocks.getOrganizationsForUser.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    mocks.findActiveByOrganizationId.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/active-event-tasks")
      .set("x-role", "user")
      .set("x-user-id", "3");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ event: null, event_tasks: [] });
  });

  it("handles active-event-tasks fetch errors", async () => {
    mocks.findActive.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/active-event-tasks")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch active event tasks" });
  });

  it("rejects creating active-event task when validation fails", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/active-event-tasks")
      .set("x-role", "super-duper-admin")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns 400 when no active event is found on create", async () => {
    mocks.findActive.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/active-event-tasks")
      .set("x-role", "super-duper-admin")
      .send({ name: "Confirm permits" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "No active event found" });
  });

  it("creates active-event task and returns detailed task with empty contacts", async () => {
    mocks.findActive.mockResolvedValue({ id: 7, organization_id: 55 });
    mocks.tasksCreate.mockResolvedValue({ id: 41 });
    mocks.eventTasksCreate.mockResolvedValue({ id: 88 });
    mocks.eventTasksFindById.mockResolvedValue({
      id: 88,
      task_id: 41,
      event_id: 7,
      name: "Coordinate volunteers",
      status: "to_do",
    });

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/active-event-tasks")
      .set("x-role", "super-duper-admin")
      .send({
        name: "Coordinate volunteers",
        due_date: "2026-05-01",
        notes: "Contact team leads",
        status: "to_do",
      });

    expect(response.status).toBe(200);
    expect(mocks.tasksCreate).toHaveBeenCalledWith({
      organization_id: 55,
      name: "Coordinate volunteers",
      recurring: false,
    });
    expect(mocks.eventTasksCreate).toHaveBeenCalledWith({
      task_id: 41,
      event_id: 7,
      name: "Coordinate volunteers",
      notes: "Contact team leads",
      due_date: "2026-05-01",
      status: "to_do",
      assigned_user_id: undefined,
      category: undefined,
    });
    expect(response.body).toEqual({
      id: 88,
      task_id: 41,
      event_id: 7,
      name: "Coordinate volunteers",
      status: "to_do",
      contacts: [],
    });
  });

  it("creates active-event task with assigned_user_id and category", async () => {
    mocks.findActive.mockResolvedValue({ id: 7, organization_id: 55 });
    mocks.tasksCreate.mockResolvedValue({ id: 42 });
    mocks.eventTasksCreate.mockResolvedValue({ id: 89 });
    mocks.eventTasksFindById.mockResolvedValue({
      id: 89,
      task_id: 42,
      event_id: 7,
      name: "Book sound equipment",
      status: "to_do",
      category: "vendors",
      assigned_user_id: 3,
    });

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/active-event-tasks")
      .set("x-role", "super-duper-admin")
      .send({
        name: "Book sound equipment",
        due_date: "2026-04-15",
        assigned_user_id: 3,
        category: "vendors",
      });

    expect(response.status).toBe(200);
    expect(mocks.eventTasksCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        assigned_user_id: 3,
        category: "vendors",
      })
    );
    expect(response.body).toEqual({
      id: 89,
      task_id: 42,
      event_id: 7,
      name: "Book sound equipment",
      status: "to_do",
      category: "vendors",
      assigned_user_id: 3,
      contacts: [],
    });
  });

  it("rejects active-event task with invalid category", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/active-event-tasks")
      .set("x-role", "super-duper-admin")
      .send({ name: "Some task", category: "invalid_category" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("handles active-event task create errors", async () => {
    mocks.findActive.mockResolvedValue({ id: 7, organization_id: 55 });
    mocks.tasksCreate.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/active-event-tasks")
      .set("x-role", "super-duper-admin")
      .send({ name: "Coordinate volunteers" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create task" });
  });

  it("returns organization tasks", async () => {
    mocks.tasksFindByOrganizationId.mockResolvedValue([{ id: 1, name: "Post flyers" }]);

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/org/12")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, name: "Post flyers" }]);
    expect(mocks.tasksFindByOrganizationId).toHaveBeenCalledWith("12");
  });

  it("handles organization tasks fetch errors", async () => {
    mocks.tasksFindByOrganizationId.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/org/12")
      .set("x-role", "user");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch tasks" });
  });

  it("returns validation errors when creating task template", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks")
      .set("x-role", "user")
      .send({ organization_id: "", name: "" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("creates an organization-level task template", async () => {
    mocks.organizationsFindById.mockResolvedValue({ id: 12, name: "Org" });
    mocks.tasksCreate.mockResolvedValue({ id: 77, name: "Template" });

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks")
      .set("x-role", "user")
      .send({ organization_id: 12, name: "Template", recurring: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 77, name: "Template" });
    expect(mocks.tasksCreate).toHaveBeenCalledWith({
      organization_id: 12,
      name: "Template",
      recurring: true,
    });
  });

  it("returns 400 when creating task template for unknown org", async () => {
    mocks.organizationsFindById.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks")
      .set("x-role", "user")
      .send({ organization_id: 999, name: "Template" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Organization not found" });
  });

  it("handles task template create errors", async () => {
    mocks.organizationsFindById.mockResolvedValue({ id: 12, name: "Org" });
    mocks.tasksCreate.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks")
      .set("x-role", "user")
      .send({ organization_id: 12, name: "Template" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create task" });
  });

  it("updates task template", async () => {
    mocks.tasksUpdate.mockResolvedValue({ id: 44, name: "Updated template" });

    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/44")
      .set("x-role", "user")
      .send({ name: "Updated template", recurring: false });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 44, name: "Updated template" });
    expect(mocks.tasksUpdate).toHaveBeenCalledWith("44", {
      name: "Updated template",
      recurring: false,
    });
  });

  it("returns 404 when task template update target is missing", async () => {
    mocks.tasksUpdate.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/404")
      .set("x-role", "user")
      .send({ name: "No template" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Task not found" });
  });

  it("returns validation errors when updating task template", async () => {
    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/44")
      .set("x-role", "user")
      .send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("handles task template update errors", async () => {
    mocks.tasksUpdate.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/44")
      .set("x-role", "user")
      .send({ name: "Updated template" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to update task" });
  });

  it("deletes task template", async () => {
    mocks.tasksDelete.mockResolvedValue(true);

    const app = buildApp();
    const response = await request(app)
      .delete("/api/admin/tasks/44")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it("returns 404 when deleting missing task template", async () => {
    mocks.tasksDelete.mockResolvedValue(false);

    const app = buildApp();
    const response = await request(app)
      .delete("/api/admin/tasks/404")
      .set("x-role", "user");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Task not found" });
  });

  it("handles task template delete errors", async () => {
    mocks.tasksDelete.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .delete("/api/admin/tasks/44")
      .set("x-role", "user");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to delete task" });
  });

  it("returns task history with contact lists", async () => {
    mocks.eventTasksGetHistory.mockResolvedValue([
      { id: 1, name: "Old task" },
      { id: 2, name: "New task" },
    ]);
    mocks.taskContactsFindByEventTaskId.mockImplementation((id: number | string) =>
      Promise.resolve(String(id) === "1" ? [{ id: 501, name: "Taylor" }] : [])
    );

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/77/history")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 1, name: "Old task", contacts: [{ id: 501, name: "Taylor" }] },
      { id: 2, name: "New task", contacts: [] },
    ]);
    expect(mocks.eventTasksGetHistory).toHaveBeenCalledWith("77");
  });

  it("handles task history fetch errors", async () => {
    mocks.eventTasksGetHistory.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/77/history")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch task history" });
  });

  it("returns validation errors when creating task contact", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/event-tasks/12/contacts")
      .set("x-role", "user")
      .send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns 404 when creating contact for unknown event task", async () => {
    mocks.eventTasksFindById.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/event-tasks/12/contacts")
      .set("x-role", "user")
      .send({ name: "Sam" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event task not found" });
  });

  it("creates a contact for an event task", async () => {
    mocks.eventTasksFindById.mockResolvedValue({ id: 12, task_id: 1 });
    mocks.taskContactsCreate.mockResolvedValue({ id: 901, event_task_id: "12", name: "Sam" });

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/event-tasks/12/contacts")
      .set("x-role", "user")
      .send({ name: "Sam", email: "sam@example.com", notes: "PM preferred" });

    expect(response.status).toBe(200);
    expect(mocks.taskContactsCreate).toHaveBeenCalledWith({
      event_task_id: "12",
      name: "Sam",
      email: "sam@example.com",
      phone: undefined,
      business: undefined,
      notes: "PM preferred",
    });
    expect(response.body).toEqual({ id: 901, event_task_id: "12", name: "Sam" });
  });

  it("handles contact create errors", async () => {
    mocks.eventTasksFindById.mockResolvedValue({ id: 12, task_id: 1 });
    mocks.taskContactsCreate.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/event-tasks/12/contacts")
      .set("x-role", "user")
      .send({ name: "Sam" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create contact" });
  });

  it("updates a task contact", async () => {
    mocks.taskContactsUpdate.mockResolvedValue({ id: 44, name: "Updated" });

    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/contacts/44")
      .set("x-role", "user")
      .send({ name: "Updated" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 44, name: "Updated" });
    expect(mocks.taskContactsUpdate).toHaveBeenCalledWith("44", {
      name: "Updated",
      email: undefined,
      phone: undefined,
      business: undefined,
      notes: undefined,
    });
  });

  it("deletes a task contact", async () => {
    mocks.taskContactsDelete.mockResolvedValue(true);

    const app = buildApp();
    const response = await request(app)
      .delete("/api/admin/tasks/contacts/44")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(mocks.taskContactsDelete).toHaveBeenCalledWith("44");
  });

  it("returns 404 when generating tasks for unknown event", async () => {
    mocks.eventsFindById.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/generate/4")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });

  it("generates recurring tasks from previous event and reports skipped", async () => {
    mocks.eventsFindById.mockResolvedValue({
      id: 4,
      organization_id: 12,
      date: "2026-07-01",
      name: "Summer Fest",
    });
    mocks.eventsFindByOrganizationId.mockResolvedValue([
      { id: 4, date: "2026-07-01", name: "Summer Fest" },
      { id: 3, date: "2025-07-01", name: "Last Year Fest" },
    ]);
    mocks.eventTasksFindByEventId.mockImplementation((eventId: number | string) => {
      if (String(eventId) === "3") {
        return Promise.resolve([
          { id: 301, task_id: 10, recurring: true },
          { id: 302, task_id: 11, recurring: true },
        ]);
      }

      return Promise.resolve([
        { id: 401, task_id: 10, name: "Permits" },
        { id: 402, task_id: 11, name: "Power" },
      ]);
    });
    mocks.eventTasksFindByTaskAndEvent
      .mockResolvedValueOnce({ id: 999 })
      .mockResolvedValueOnce(null);
    mocks.eventTasksCreate.mockResolvedValue({ id: 402 });
    mocks.taskContactsFindByEventTaskId.mockResolvedValue([]);

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/generate/4")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(mocks.eventTasksCreate).toHaveBeenCalledWith({
      task_id: 11,
      event_id: "4",
    });
    expect(response.body).toEqual({
      message: 'Generated 1 task(s) from previous event "Last Year Fest" (1 already existed)',
      event_tasks: [
        { id: 401, task_id: 10, name: "Permits", contacts: [] },
        { id: 402, task_id: 11, name: "Power", contacts: [] },
      ],
    });
  });

  it("generates recurring tasks without skipped suffix when all tasks are created", async () => {
    mocks.eventsFindById.mockResolvedValue({
      id: 4,
      organization_id: 12,
      date: "2026-07-01",
      name: "Summer Fest",
    });
    mocks.eventsFindByOrganizationId.mockResolvedValue([
      { id: 4, date: "2026-07-01", name: "Summer Fest" },
      { id: 3, date: "2025-07-01", name: "Last Year Fest" },
    ]);
    mocks.eventTasksFindByEventId.mockImplementation((eventId: number | string) => {
      if (String(eventId) === "3") {
        return Promise.resolve([{ id: 301, task_id: 10, recurring: true }]);
      }
      return Promise.resolve([{ id: 401, task_id: 10, name: "Permits" }]);
    });
    mocks.eventTasksFindByTaskAndEvent.mockResolvedValue(null);
    mocks.eventTasksCreate.mockResolvedValue({ id: 401 });
    mocks.taskContactsFindByEventTaskId.mockResolvedValue([]);

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/generate/4")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Generated 1 task(s) from previous event "Last Year Fest"');
  });

  it("selects the most recent previous event when multiple candidates exist", async () => {
    mocks.eventsFindById.mockResolvedValue({
      id: 4,
      organization_id: 12,
      date: "2026-07-01",
      name: "Summer Fest",
    });
    mocks.eventsFindByOrganizationId.mockResolvedValue([
      { id: 4, date: "2026-07-01", name: "Summer Fest" },
      { id: 2, date: "2024-07-01", name: "Two Years Ago" },
      { id: 3, date: "2025-07-01", name: "Last Year Fest" },
    ]);
    mocks.eventTasksFindByEventId.mockImplementation((eventId: number | string) => {
      if (String(eventId) === "3") {
        return Promise.resolve([{ id: 301, task_id: 10, recurring: true }]);
      }

      return Promise.resolve([{ id: 401, task_id: 10, name: "Permits" }]);
    });
    mocks.eventTasksFindByTaskAndEvent.mockResolvedValue(null);
    mocks.eventTasksCreate.mockResolvedValue({ id: 401 });
    mocks.taskContactsFindByEventTaskId.mockResolvedValue([]);

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/generate/4")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('"Last Year Fest"');
  });

  it("returns event task list with contacts", async () => {
    mocks.eventTasksFindByEventId.mockResolvedValue([
      { id: 501, name: "A" },
      { id: 502, name: "B" },
    ]);
    mocks.taskContactsFindByEventTaskId.mockImplementation((id: number | string) =>
      Promise.resolve(String(id) === "501" ? [{ id: 1, name: "Chris" }] : [])
    );

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/event/20")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 501, name: "A", contacts: [{ id: 1, name: "Chris" }] },
      { id: 502, name: "B", contacts: [] },
    ]);
  });

  it("handles event task list fetch errors", async () => {
    mocks.eventTasksFindByEventId.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/event/20")
      .set("x-role", "user");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch event tasks" });
  });

  it("returns duplicate error when creating existing event task", async () => {
    mocks.eventTasksFindByTaskAndEvent.mockResolvedValue({ id: 700 });

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/event-tasks")
      .set("x-role", "super-duper-admin")
      .send({ task_id: 10, event_id: 20, status: "to_do" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "This task already exists for this event" });
  });

  it("returns validation errors when creating event task", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/event-tasks")
      .set("x-role", "super-duper-admin")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("handles event task create errors", async () => {
    mocks.eventTasksFindByTaskAndEvent.mockResolvedValue(null);
    mocks.eventTasksCreate.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/event-tasks")
      .set("x-role", "super-duper-admin")
      .send({ task_id: 10, event_id: 20, status: "to_do" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create event task" });
  });

  it("updates event task and includes refreshed contacts", async () => {
    mocks.eventTasksUpdate.mockResolvedValue({ id: 811 });
    mocks.eventTasksFindById.mockResolvedValue({ id: 811, name: "Updated" });
    mocks.taskContactsFindByEventTaskId.mockResolvedValue([{ id: 9, name: "Morgan" }]);

    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/event-tasks/811")
      .set("x-role", "user")
      .send({ name: "Updated", status: "done" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 811,
      name: "Updated",
      contacts: [{ id: 9, name: "Morgan" }],
    });
  });

  it("updates event task with category", async () => {
    mocks.eventTasksUpdate.mockResolvedValue({ id: 811 });
    mocks.eventTasksFindById.mockResolvedValue({ id: 811, name: "Updated", category: "permits" });
    mocks.taskContactsFindByEventTaskId.mockResolvedValue([]);

    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/event-tasks/811")
      .set("x-role", "user")
      .send({ category: "permits" });

    expect(response.status).toBe(200);
    expect(mocks.eventTasksUpdate).toHaveBeenCalledWith("811", expect.objectContaining({ category: "permits" }));
    expect(response.body.category).toBe("permits");
  });

  it("rejects event task update with invalid category", async () => {
    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/event-tasks/811")
      .set("x-role", "user")
      .send({ category: "not_a_category" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("handles event task update errors", async () => {
    mocks.eventTasksUpdate.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/event-tasks/811")
      .set("x-role", "user")
      .send({ name: "Updated" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to update event task" });
  });

  it("returns 404 when event task update target is missing", async () => {
    mocks.eventTasksUpdate.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/event-tasks/900")
      .set("x-role", "user")
      .send({ name: "Nope" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event task not found" });
  });

  it("returns event task details with history and contacts", async () => {
    mocks.eventTasksFindById.mockResolvedValue({ id: 91, task_id: 7, name: "Current" });
    mocks.taskContactsFindByEventTaskId.mockImplementation((id: number | string) =>
      Promise.resolve(String(id) === "91" ? [{ id: 21, name: "Current Contact" }] : [{ id: 22, name: "History Contact" }])
    );
    mocks.eventTasksGetHistory.mockResolvedValue([{ id: 92, task_id: 7, name: "Old" }]);

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/event-tasks/91")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 91,
      task_id: 7,
      name: "Current",
      contacts: [{ id: 21, name: "Current Contact" }],
      history: [
        {
          id: 92,
          task_id: 7,
          name: "Old",
          contacts: [{ id: 22, name: "History Contact" }],
        },
      ],
    });
  });

  it("handles event task detail errors", async () => {
    mocks.eventTasksFindById.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/event-tasks/91")
      .set("x-role", "user");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch event task" });
  });

  it("returns 404 when deleting missing event task", async () => {
    mocks.eventTasksDelete.mockResolvedValue(false);

    const app = buildApp();
    const response = await request(app)
      .delete("/api/admin/tasks/event-tasks/999")
      .set("x-role", "user");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event task not found" });
  });

  it("creates event task when no duplicate exists", async () => {
    mocks.eventTasksFindByTaskAndEvent.mockResolvedValue(null);
    mocks.eventTasksCreate.mockResolvedValue({ id: 5001 });
    mocks.eventTasksFindById.mockResolvedValue({ id: 5001, name: "Created" });

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/event-tasks")
      .set("x-role", "super-duper-admin")
      .send({ task_id: 10, event_id: 20, name: "Created", status: "to_do" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 5001, name: "Created", contacts: [] });
  });

  it("returns 404 when event task detail is missing", async () => {
    mocks.eventTasksFindById.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .get("/api/admin/tasks/event-tasks/404")
      .set("x-role", "user");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event task not found" });
  });

  it("deletes event task successfully", async () => {
    mocks.eventTasksDelete.mockResolvedValue(true);

    const app = buildApp();
    const response = await request(app)
      .delete("/api/admin/tasks/event-tasks/77")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it("handles event task delete errors", async () => {
    mocks.eventTasksDelete.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .delete("/api/admin/tasks/event-tasks/77")
      .set("x-role", "user");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to delete event task" });
  });

  it("returns 404 when contact update target is missing", async () => {
    mocks.taskContactsUpdate.mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/contacts/123")
      .set("x-role", "user")
      .send({ name: "No contact" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Contact not found" });
  });

  it("returns 404 when contact delete target is missing", async () => {
    mocks.taskContactsDelete.mockResolvedValue(false);

    const app = buildApp();
    const response = await request(app)
      .delete("/api/admin/tasks/contacts/123")
      .set("x-role", "user");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Contact not found" });
  });

  it("returns 400 when generate has no previous event", async () => {
    mocks.eventsFindById.mockResolvedValue({
      id: 4,
      organization_id: 12,
      date: "2026-07-01",
      name: "Summer Fest",
    });
    mocks.eventsFindByOrganizationId.mockResolvedValue([
      { id: 4, date: "2026-07-01", name: "Summer Fest" },
    ]);

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/generate/4")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "No previous event found to copy tasks from" });
  });

  it("returns 400 when previous event has no recurring tasks", async () => {
    mocks.eventsFindById.mockResolvedValue({
      id: 4,
      organization_id: 12,
      date: "2026-07-01",
      name: "Summer Fest",
    });
    mocks.eventsFindByOrganizationId.mockResolvedValue([
      { id: 4, date: "2026-07-01", name: "Summer Fest" },
      { id: 3, date: "2025-07-01", name: "Last Year Fest" },
    ]);
    mocks.eventTasksFindByEventId.mockResolvedValue([
      { id: 301, task_id: 10, recurring: false },
    ]);

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/generate/4")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "No recurring tasks found in the previous event" });
  });

  it("handles contact update errors", async () => {
    mocks.taskContactsUpdate.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/tasks/contacts/123")
      .set("x-role", "user")
      .send({ name: "Boom" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to update contact" });
  });

  it("handles contact delete errors", async () => {
    mocks.taskContactsDelete.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .delete("/api/admin/tasks/contacts/123")
      .set("x-role", "user");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to delete contact" });
  });

  it("handles generate task errors", async () => {
    mocks.eventsFindById.mockRejectedValue(new Error("db down"));

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/tasks/generate/4")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to generate tasks" });
  });
});
