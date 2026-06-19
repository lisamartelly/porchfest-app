import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orgFindAll: vi.fn(),
  orgFindById: vi.fn(),
  orgFindBySlug: vi.fn(),
  orgCreate: vi.fn(),
  findByUserAndOrg: vi.fn(),
  orgUsersGetUsersForOrganization: vi.fn(),
  orgUsersFindByOrganizationId: vi.fn(),
  orgUsersCreate: vi.fn(),
  orgUsersUpdateRole: vi.fn(),
  eventsFindActiveByOrganizationId: vi.fn(),
  eventsFindActive: vi.fn(),
  eventsUpdate: vi.fn(),
  eventsFindAll: vi.fn(),
  eventsFindByOrganizationId: vi.fn(),
  eventsCreate: vi.fn(),
  eventsFindById: vi.fn(),
  bandsFindByEventId: vi.fn(),
  bandsFindApproved: vi.fn(),
  bandsFindAll: vi.fn(),
  bandsUpdateStatus: vi.fn(),
  bandsUpdateAdminNotes: vi.fn(),
  bandsUpdateReview: vi.fn(),
  bandsAssignReviewer: vi.fn(),
  bandsGetReviewerUserIds: vi.fn(),
  bandsFindByReviewerId: vi.fn(),
  bandsFindById: vi.fn(),
  bandsFindOverlappingAtPorch: vi.fn(),
  bandsUpdateSchedule: vi.fn(),
  porchesFindByEventId: vi.fn(),
  porchesFindApproved: vi.fn(),
  porchesFindById: vi.fn(),
  porchesUpdateStatus: vi.fn(),
  porchesUpdateAdminNotes: vi.fn(),
  porchesFindAll: vi.fn(),
  timeSlotsFindByEventId: vi.fn(),
  timeSlotsFindAll: vi.fn(),
  timeSlotsCreate: vi.fn(),
  getPresignedUploadUrl: vi.fn(),
  sendReviewerAssignmentEmail: vi.fn(),
  organizationUsersFindByUserId: vi.fn(),
  getOrganizationsForUser: vi.fn(),
  usersFindAll: vi.fn(),
  usersFindByEmail: vi.fn(),
  usersCreate: vi.fn(),
  usersUpdate: vi.fn(),
  usersUpdatePassword: vi.fn(),
  usersFindById: vi.fn(),
  tasksFindByOrganizationId: vi.fn(),
  eventTasksCreate: vi.fn(),
  bcryptHash: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.bcryptHash,
  },
}));

vi.mock("../middleware/auth.js", async () => {
  const { createMockAdminOnly, createMockSuperDuperAdminOnly } = await import("../test/helpers.js");
  return {
    adminOnly: createMockAdminOnly("admin-route-test@example.com"),
    superDuperAdminOnly: createMockSuperDuperAdminOnly(),
  };
});

vi.mock("../data/db.js", () => ({
  db: {
    organizations: {
      findAll: mocks.orgFindAll,
      findById: mocks.orgFindById,
      findBySlug: mocks.orgFindBySlug,
      create: mocks.orgCreate,
    },
    organizationUsers: {
      findByUserAndOrg: mocks.findByUserAndOrg,
      findByUserId: mocks.organizationUsersFindByUserId,
      getOrganizationsForUser: mocks.getOrganizationsForUser,
      getUsersForOrganization: mocks.orgUsersGetUsersForOrganization,
      findByOrganizationId: mocks.orgUsersFindByOrganizationId,
      create: mocks.orgUsersCreate,
      updateRole: mocks.orgUsersUpdateRole,
    },
    events: {
      findActiveByOrganizationId: mocks.eventsFindActiveByOrganizationId,
      findActive: mocks.eventsFindActive,
      update: mocks.eventsUpdate,
      findAll: mocks.eventsFindAll,
      findByOrganizationId: mocks.eventsFindByOrganizationId,
      create: mocks.eventsCreate,
      findById: mocks.eventsFindById,
    },
    bands: {
      findByEventId: mocks.bandsFindByEventId,
      findApproved: mocks.bandsFindApproved,
      findByReviewerId: mocks.bandsFindByReviewerId,
      findAll: mocks.bandsFindAll,
      updateStatus: mocks.bandsUpdateStatus,
      updateAdminNotes: mocks.bandsUpdateAdminNotes,
      assignReviewer: mocks.bandsAssignReviewer,
      getReviewerUserIds: mocks.bandsGetReviewerUserIds,
      updateReview: mocks.bandsUpdateReview,
      findById: mocks.bandsFindById,
      findOverlappingAtPorch: mocks.bandsFindOverlappingAtPorch,
      updateSchedule: mocks.bandsUpdateSchedule,
    },
    porches: {
      findByEventId: mocks.porchesFindByEventId,
      findApproved: mocks.porchesFindApproved,
      findAll: mocks.porchesFindAll,
      updateStatus: mocks.porchesUpdateStatus,
      updateAdminNotes: mocks.porchesUpdateAdminNotes,
      findById: mocks.porchesFindById,
    },
    users: {
      findAll: mocks.usersFindAll,
      findByEmail: mocks.usersFindByEmail,
      create: mocks.usersCreate,
      update: mocks.usersUpdate,
      updatePassword: mocks.usersUpdatePassword,
      findById: mocks.usersFindById,
    },
    tasks: {
      findByOrganizationId: mocks.tasksFindByOrganizationId,
    },
    eventTasks: {
      create: mocks.eventTasksCreate,
    },
    timeSlots: {
      create: mocks.timeSlotsCreate,
      findByEventId: mocks.timeSlotsFindByEventId,
      findAll: mocks.timeSlotsFindAll,
    },
  },
}));

vi.mock("../services/s3.js", () => ({
  getPresignedUploadUrl: mocks.getPresignedUploadUrl,
}));

vi.mock("../services/email.js", () => ({
  sendReviewerAssignmentEmail: mocks.sendReviewerAssignmentEmail,
}));

vi.mock("../lib/logger.js", () => ({
  default: {
    error: mocks.loggerError,
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { adminRouter } from "./admin.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);
  return app;
}

describe("adminRouter", () => {
  it("blocks /organizations for non-super users", async () => {
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/organizations")
      .set("x-role", "user");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Super-duper-admin access required" });
  });

  it("returns organizations for super users", async () => {
    mocks.orgFindAll.mockResolvedValue([{ id: 1, name: "Uptown" }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/organizations")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, name: "Uptown" }]);
  });

  it("handles organization list fetch failures", async () => {
    mocks.orgFindAll.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/organizations")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch organizations" });
  });

  it("creates organization", async () => {
    mocks.orgFindBySlug.mockResolvedValue(null);
    mocks.orgCreate.mockResolvedValue({ id: 9, slug: "new-org" });
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/organizations")
      .set("x-role", "super-duper-admin")
      .send({ name: "New Org", slug: "new-org" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 9, slug: "new-org" });
  });

  it("returns validation errors when creating organization with invalid payload", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/organizations")
      .set("x-role", "super-duper-admin")
      .send({ name: "", slug: "BAD SLUG" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns duplicate slug error when creating organization", async () => {
    mocks.orgFindBySlug.mockResolvedValue({ id: 1, slug: "taken" });
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/organizations")
      .set("x-role", "super-duper-admin")
      .send({ name: "Taken", slug: "taken" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "An organization with that slug already exists" });
  });

  it("handles organization creation failures", async () => {
    mocks.orgFindBySlug.mockResolvedValue(null);
    mocks.orgCreate.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/organizations")
      .set("x-role", "super-duper-admin")
      .send({ name: "New Org", slug: "new-org" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create organization" });
  });

  it("returns super admin my-events with embedded organization", async () => {
    mocks.eventsFindAll.mockResolvedValue([{ id: 7, organization_id: 2 }]);
    mocks.orgFindAll.mockResolvedValue([{ id: 2, name: "Org" }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/my-events")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body[0].organization).toEqual({ id: 2, name: "Org" });
  });

  it("returns member my-events across organizations", async () => {
    mocks.getOrganizationsForUser.mockResolvedValue([{ id: 2, name: "Org" }]);
    mocks.eventsFindByOrganizationId.mockResolvedValue([{ id: 9, name: "Event" }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/my-events")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body[0].organization).toEqual({ id: 2, name: "Org" });
  });

  it("handles my-events fetch failures", async () => {
    mocks.getOrganizationsForUser.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/my-events")
      .set("x-role", "user");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch events" });
  });

  it("returns super admin my-organizations", async () => {
    mocks.orgFindAll.mockResolvedValue([{ id: 1, name: "Org" }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/my-organizations")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, name: "Org", org_role: "owner" }]);
  });

  it("returns 403 for /bands scoped org when user is not a member", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands?org_id=9")
      .set("x-role", "user")
      .set("x-user-id", "5");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
    expect(mocks.findByUserAndOrg).toHaveBeenCalledWith(5, 9);
  });

  it("returns empty list for scoped /bands when no active event", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("filters scoped /bands by status", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 77 });
    mocks.bandsFindByEventId.mockResolvedValue([
      { id: 1, status: "approved" },
      { id: 2, status: "pending" },
    ]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands?org_id=9&status=approved")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, status: "approved" }]);
  });

  it("returns scoped /bands without status filter", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 77 });
    mocks.bandsFindByEventId.mockResolvedValue([
      { id: 1, status: "approved" },
      { id: 2, status: "pending" },
    ]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 1, status: "approved" },
      { id: 2, status: "pending" },
    ]);
  });

  it("returns global /bands payload", async () => {
    mocks.bandsFindAll.mockResolvedValue([{ id: 10, status: "approved" }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 10, status: "approved" }]);
    expect(mocks.bandsFindAll).toHaveBeenCalledWith(undefined);
  });

  it("allows super-duper-admin to access scoped /bands without org membership", async () => {
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 77 });
    mocks.bandsFindByEventId.mockResolvedValue([{ id: 1, status: "approved" }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands?org_id=9")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, status: "approved" }]);
    expect(mocks.findByUserAndOrg).not.toHaveBeenCalled();
  });

  it("handles /bands fetch failures", async () => {
    mocks.bandsFindAll.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch bands" });
  });

  it("returns user organizations with org_role", async () => {
    mocks.organizationUsersFindByUserId.mockResolvedValue([
      { organization_id: 2, role: "owner" },
    ]);
    mocks.getOrganizationsForUser.mockResolvedValue([
      { id: 2, name: "Downtown" },
    ]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/my-organizations")
      .set("x-role", "user")
      .set("x-user-id", "8");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 2, name: "Downtown", org_role: "owner" },
    ]);
  });

  it("falls back to organizer role when membership role is missing", async () => {
    mocks.organizationUsersFindByUserId.mockResolvedValue([]);
    mocks.getOrganizationsForUser.mockResolvedValue([{ id: 2, name: "Downtown" }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/my-organizations")
      .set("x-role", "user")
      .set("x-user-id", "8");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 2, name: "Downtown", org_role: "organizer" }]);
  });

  it("handles my-organizations fetch failures", async () => {
    mocks.organizationUsersFindByUserId.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/my-organizations")
      .set("x-role", "user")
      .set("x-user-id", "8");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch organizations" });
  });

  it("updates band status", async () => {
    mocks.bandsUpdateStatus.mockResolvedValue({ id: 33, status: "approved" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/33/status")
      .set("x-role", "super-duper-admin")
      .send({ status: "approved" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 33, status: "approved" });
    expect(mocks.bandsUpdateStatus).toHaveBeenCalledWith("33", "approved");
  });

  it("returns validation errors for invalid band status payload", async () => {
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/33/status")
      .set("x-role", "super-duper-admin")
      .send({ status: "not-valid" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns 404 when band status target is missing", async () => {
    mocks.bandsUpdateStatus.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/404/status")
      .set("x-role", "super-duper-admin")
      .send({ status: "approved" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Band not found" });
  });

  it("handles band status update failures", async () => {
    mocks.bandsUpdateStatus.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/33/status")
      .set("x-role", "super-duper-admin")
      .send({ status: "approved", admin_notes: "Looks good" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to update band status" });
  });

  it("updates band admin notes as super-duper-admin", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 33, event_id: 5 });
    mocks.bandsUpdateAdminNotes.mockResolvedValue({ id: 33, admin_notes: "Heads up" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/33/notes")
      .set("x-role", "super-duper-admin")
      .send({ admin_notes: "Heads up" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 33, admin_notes: "Heads up" });
    expect(mocks.bandsUpdateAdminNotes).toHaveBeenCalledWith("33", "Heads up");
  });

  it("updates band admin notes for an organizer", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 33, event_id: 5 });
    mocks.eventsFindById.mockResolvedValue({ id: 5, organization_id: 9 });
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 7, organization_id: 9, role: "organizer" });
    mocks.bandsUpdateAdminNotes.mockResolvedValue({ id: 33, admin_notes: "ok" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/33/notes")
      .set("x-role", "user")
      .set("x-user-id", "7")
      .send({ admin_notes: "ok" });

    expect(response.status).toBe(200);
    expect(mocks.bandsUpdateAdminNotes).toHaveBeenCalledWith("33", "ok");
  });

  it("forbids band admin notes for a reviewer", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 33, event_id: 5 });
    mocks.eventsFindById.mockResolvedValue({ id: 5, organization_id: 9 });
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 7, organization_id: 9, role: "reviewer" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/33/notes")
      .set("x-role", "user")
      .set("x-user-id", "7")
      .send({ admin_notes: "nope" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Organizer access required" });
    expect(mocks.bandsUpdateAdminNotes).not.toHaveBeenCalled();
  });

  it("returns 404 when band notes target is missing", async () => {
    mocks.bandsFindById.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/404/notes")
      .set("x-role", "super-duper-admin")
      .send({ admin_notes: "x" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Band not found" });
  });

  it("returns forbidden for scoped /porches when user lacks membership", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches?org_id=9")
      .set("x-role", "user")
      .set("x-user-id", "5");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("returns scoped /porches when status filter is not provided", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 44 });
    mocks.porchesFindByEventId.mockResolvedValue([
      { id: 7, status: "approved" },
      { id: 8, status: "pending" },
    ]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 7, status: "approved" },
      { id: 8, status: "pending" },
    ]);
  });

  it("returns empty scoped /porches when there is no active event", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns global /porches payload", async () => {
    mocks.porchesFindAll.mockResolvedValue([{ id: 77, status: "approved" }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 77, status: "approved" }]);
    expect(mocks.porchesFindAll).toHaveBeenCalledWith(undefined);
  });

  it("handles /porches fetch failures", async () => {
    mocks.porchesFindAll.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch porches" });
  });

  it("returns 404 when active event is missing for scoped /event", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/event?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "No active event found" });
  });

  it("returns active event for global /event", async () => {
    mocks.eventsFindActive.mockResolvedValue({ id: 42, name: "Fest" });
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/event")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 42, name: "Fest" });
  });

  it("handles get active event failures", async () => {
    mocks.eventsFindActive.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/event")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch event" });
  });

  it("returns forbidden when updating scoped active event without membership", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/event?org_id=9")
      .set("x-role", "user")
      .send({ name: "Updated" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("returns 404 when updating active event and none exists", async () => {
    mocks.eventsFindActive.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/event")
      .set("x-role", "super-duper-admin")
      .send({ name: "Updated" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "No active event found" });
  });

  it("updates active event settings", async () => {
    mocks.eventsFindActive.mockResolvedValue({ id: 55, name: "Old" });
    mocks.eventsUpdate.mockResolvedValue({ id: 55, name: "Updated" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/event")
      .set("x-role", "super-duper-admin")
      .send({ name: "Updated" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 55, name: "Updated" });
    expect(mocks.eventsUpdate).toHaveBeenCalledWith(55, expect.objectContaining({
      name: "Updated",
    }));
  });

  it("updates scoped active event settings", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 56, name: "Scoped Event" });
    mocks.eventsUpdate.mockResolvedValue({ id: 56, name: "Scoped Updated" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/event?org_id=9")
      .set("x-role", "user")
      .send({ name: "Scoped Updated" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 56, name: "Scoped Updated" });
    expect(mocks.eventsUpdate).toHaveBeenCalledWith(56, expect.objectContaining({
      name: "Scoped Updated",
    }));
  });

  it("handles active event settings update failures", async () => {
    mocks.eventsFindActive.mockResolvedValue({ id: 55, name: "Old" });
    mocks.eventsUpdate.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/event")
      .set("x-role", "super-duper-admin")
      .send({ name: "Updated" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to update event" });
  });

  it("returns 400 for porch app photo upload-url without filename", async () => {
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porch-app-photo/upload-url")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "filename query parameter is required" });
  });

  it("returns porch app photo upload-url payload", async () => {
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porch-app-photo/upload-url")
      .set("x-role", "super-duper-admin")
      .query({ filename: "photo.png", contentType: "image/png" });

    expect(response.status).toBe(200);
    expect(response.body.uploadUrl).toBe("https://signed.example/upload");
    expect(response.body.key).toMatch(/^porch-app-config\//);
    expect(mocks.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^porch-app-config\//),
      "image/png"
    );
  });

  it("infers jpeg content type when porch app upload filename extension is empty", async () => {
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porch-app-photo/upload-url")
      .set("x-role", "super-duper-admin")
      .query({ filename: "photo." });

    expect(response.status).toBe(200);
    expect(mocks.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpg$/),
      "image/jpeg"
    );
  });

  it("infers content type from non-jpg extension when contentType is omitted", async () => {
    mocks.getPresignedUploadUrl.mockResolvedValue("https://signed.example/upload");
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porch-app-photo/upload-url")
      .set("x-role", "super-duper-admin")
      .query({ filename: "photo.webp" });

    expect(response.status).toBe(200);
    expect(mocks.getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/\.webp$/),
      "image/webp"
    );
  });

  it("returns 500 when porch app photo upload-url generation fails", async () => {
    mocks.getPresignedUploadUrl.mockRejectedValue(new Error("s3 down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porch-app-photo/upload-url")
      .set("x-role", "super-duper-admin")
      .query({ filename: "photo.png", contentType: "image/png" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to generate upload URL" });
  });

  it("returns scoped scheduling data with only approved bands and porches", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 44 });
    mocks.bandsFindByEventId.mockResolvedValue([
      { id: 1, status: "approved" },
      { id: 2, status: "pending" },
    ]);
    mocks.porchesFindByEventId.mockResolvedValue([
      { id: 7, status: "approved" },
      { id: 8, status: "pending" },
    ]);
    mocks.timeSlotsFindByEventId.mockResolvedValue([{ id: 101 }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/scheduling?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      bands: [{ id: 1, status: "approved" }],
      porches: [{ id: 7, status: "approved" }],
      time_slots: [{ id: 101 }],
    });
  });

  it("returns forbidden for scoped scheduling when user lacks org membership", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/scheduling?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("returns empty scoped scheduling payload when there is no active event", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/scheduling?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ bands: [], porches: [], time_slots: [] });
  });

  it("handles scheduling fetch failures", async () => {
    mocks.bandsFindApproved.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/scheduling")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch scheduling data" });
  });

  it("returns my-review assignments", async () => {
    mocks.bandsFindByReviewerId.mockResolvedValue([
      { id: 1, event_id: 44 },
      { id: 2, event_id: 45 },
    ]);
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 44 });
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands/my-reviews?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, event_id: 44 }]);
  });

  it("returns global my-review assignments", async () => {
    mocks.bandsFindByReviewerId.mockResolvedValue([{ id: 1, event_id: 44 }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands/my-reviews")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, event_id: 44 }]);
  });

  it("returns forbidden for scoped my-reviews when user lacks org membership", async () => {
    mocks.bandsFindByReviewerId.mockResolvedValue([{ id: 1, event_id: 44 }]);
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands/my-reviews?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("returns empty scoped my-reviews when scoped org has no active event", async () => {
    mocks.bandsFindByReviewerId.mockResolvedValue([{ id: 1, event_id: 44 }]);
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands/my-reviews?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns 401 for my-reviews when user id is missing", async () => {
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands/my-reviews")
      .set("x-role", "user")
      .set("x-user-id", "0");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Not authenticated" });
  });

  it("handles my-reviews fetch failures", async () => {
    mocks.bandsFindByReviewerId.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/bands/my-reviews")
      .set("x-role", "user");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch assigned bands" });
  });

  it("returns global scheduling payload", async () => {
    mocks.bandsFindApproved.mockResolvedValue([{ id: 1, status: "approved" }]);
    mocks.porchesFindApproved.mockResolvedValue([{ id: 2, status: "approved" }]);
    mocks.timeSlotsFindAll.mockResolvedValue([{ id: 3 }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/scheduling")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      bands: [{ id: 1, status: "approved" }],
      porches: [{ id: 2, status: "approved" }],
      time_slots: [{ id: 3 }],
    });
  });

  it("returns approved porches for scoped org", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 44 });
    mocks.porchesFindByEventId.mockResolvedValue([
      { id: 7, status: "approved" },
      { id: 8, status: "pending" },
    ]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches/approved?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 7, status: "approved" }]);
  });

  it("returns empty approved porches for scoped org when there is no active event", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches/approved?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns 400 when assigning reviewers with empty userIds", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/bands/assign-reviewers")
      .set("x-role", "super-duper-admin")
      .send({ userIds: [] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "userIds must be a non-empty array" });
  });

  it("returns 400 when assigning reviewers without userIds", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/bands/assign-reviewers")
      .set("x-role", "super-duper-admin")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "userIds must be a non-empty array" });
  });

  it("returns 404 when assigning reviewers without active event", async () => {
    mocks.eventsFindActive.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/bands/assign-reviewers")
      .set("x-role", "super-duper-admin")
      .send({ userIds: [10] });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "No active event found" });
  });

  it("returns forbidden for scoped assign-reviewers when user lacks membership", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/bands/assign-reviewers?org_id=9")
      .set("x-role", "user")
      .send({ userIds: [10] });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("returns 400 when assigning reviewers with non-org-member userIds", async () => {
    mocks.findByUserAndOrg
      .mockResolvedValueOnce({ user_id: 1, organization_id: 9 })
      .mockResolvedValueOnce(null);
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 55, name: "Fest" });
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/bands/assign-reviewers?org_id=9")
      .set("x-role", "user")
      .send({ userIds: [999] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "User 999 is not a member of this organization" });
  });

  it("returns 400 when assigning reviewers with no unassigned bands", async () => {
    mocks.eventsFindActive.mockResolvedValue({ id: 55, name: "Fest" });
    mocks.bandsFindByEventId.mockResolvedValue([
      { id: 1, assigned_reviewer_id: 10 },
    ]);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/bands/assign-reviewers")
      .set("x-role", "super-duper-admin")
      .send({ userIds: [10] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "No unassigned bands to assign" });
  });

  it("handles assign-reviewers failures", async () => {
    mocks.eventsFindActive.mockResolvedValue({ id: 55, name: "Fest" });
    mocks.bandsFindByEventId.mockResolvedValue([
      { id: 1, assigned_reviewer_id: null },
    ]);
    mocks.bandsAssignReviewer.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/bands/assign-reviewers")
      .set("x-role", "super-duper-admin")
      .send({ userIds: [10] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to assign reviewers" });
  });

  it("assigns reviewers for scoped organization", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 55, name: "Fest" });
    mocks.bandsFindByEventId
      .mockResolvedValueOnce([
        { id: 1, assigned_reviewer_id: null },
        { id: 2, assigned_reviewer_id: null },
      ])
      .mockResolvedValueOnce([
        { id: 1, assigned_reviewer_id: 10 },
        { id: 2, assigned_reviewer_id: 11 },
      ]);
    mocks.bandsAssignReviewer.mockResolvedValue(undefined);

    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/bands/assign-reviewers?org_id=9")
      .set("x-role", "user")
      .send({ userIds: [10, 11] });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("Successfully assigned 2 bands");
  });

  it("succeeds even when sending reviewer email fails", async () => {
    mocks.eventsFindActive.mockResolvedValue({ id: 55, name: "Fest 2026" });
    mocks.bandsFindByEventId
      .mockResolvedValueOnce([{ id: 1, assigned_reviewer_id: null }])
      .mockResolvedValueOnce([{ id: 1, assigned_reviewer_id: 10 }]);
    mocks.bandsAssignReviewer.mockResolvedValue(undefined);
    mocks.usersFindById.mockResolvedValue({ id: 10, email: "rev@example.com", first_name: "Rev" });
    mocks.sendReviewerAssignmentEmail.mockRejectedValue(new Error("smtp down"));
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/bands/assign-reviewers")
      .set("x-role", "super-duper-admin")
      .send({ userIds: [10], sendEmail: true });

    expect(response.status).toBe(200);
    expect(mocks.loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error), userId: 10 }),
      "Failed to send reviewer assignment email"
    );
  });

  it("updates band review when user is the assigned reviewer", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 8, assigned_reviewer_id: 1 });
    mocks.bandsUpdateReview.mockResolvedValue({ id: 8, reviewer_rating: 5 });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/8/review")
      .set("x-role", "user")
      .set("x-user-id", "1")
      .send({ reviewer_rating: 5, reviewer_notes: "Strong fit" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 8, reviewer_rating: 5 });
    expect(mocks.bandsUpdateReview).toHaveBeenCalledWith("8", {
      reviewer_rating: 5,
      reviewer_notes: "Strong fit",
    });
  });

  it("returns 403 when user is not the assigned reviewer", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 8, assigned_reviewer_id: 99 });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/8/review")
      .set("x-role", "user")
      .set("x-user-id", "1")
      .send({ reviewer_rating: 5, reviewer_notes: "Strong fit" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "You are not the assigned reviewer for this band" });
  });

  it("allows super-duper-admin to update any band review", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 8, assigned_reviewer_id: 99 });
    mocks.bandsUpdateReview.mockResolvedValue({ id: 8, reviewer_rating: 5 });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/8/review")
      .set("x-role", "super-duper-admin")
      .send({ reviewer_rating: 5, reviewer_notes: "Admin override" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 8, reviewer_rating: 5 });
  });

  it("returns validation errors for invalid band review payload", async () => {
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/8/review")
      .set("x-role", "user")
      .send({ reviewer_rating: 10 });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns 404 when updating missing band review", async () => {
    mocks.bandsFindById.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/404/review")
      .set("x-role", "user")
      .send({ reviewer_rating: 4 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Band not found" });
  });

  it("handles band review update failures", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 404, assigned_reviewer_id: 1 });
    mocks.bandsUpdateReview.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/404/review")
      .set("x-role", "user")
      .set("x-user-id", "1")
      .send({ reviewer_rating: 4 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to update band review" });
  });

  it("returns 403 for scoped /event when user is not org member", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/event?org_id=55")
      .set("x-role", "user")
      .set("x-user-id", "2");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("returns 404 for global /event when no active event exists", async () => {
    mocks.eventsFindActive.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/event")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "No active event found" });
  });

  it("returns global approved porches", async () => {
    mocks.porchesFindApproved.mockResolvedValue([{ id: 8, status: "approved" }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches/approved")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 8, status: "approved" }]);
  });

  it("returns global reviewer users", async () => {
    mocks.bandsGetReviewerUserIds.mockResolvedValue([10, 11]);
    mocks.usersFindById
      .mockResolvedValueOnce({ id: 10, email: "reviewer-a@example.com", first_name: "A", last_name: "Rev" })
      .mockResolvedValueOnce({ id: 11, email: "reviewer-b@example.com", first_name: "B", last_name: "Rev" });
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/reviewers")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 10, email: "reviewer-a@example.com", first_name: "A", last_name: "Rev" },
      { id: 11, email: "reviewer-b@example.com", first_name: "B", last_name: "Rev" },
    ]);
  });

  it("returns scoped unique reviewer users", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 55 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 501 });
    mocks.bandsFindByEventId.mockResolvedValue([
      { assigned_reviewer_id: 10 },
      { assigned_reviewer_id: 10 },
      { assigned_reviewer_id: 11 },
    ]);
    mocks.usersFindById
      .mockResolvedValueOnce({ id: 10, email: "r1@example.com", first_name: "R", last_name: "One" })
      .mockResolvedValueOnce({ id: 11, email: "r2@example.com", first_name: "R", last_name: "Two" });
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/reviewers?org_id=55")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 10, email: "r1@example.com", first_name: "R", last_name: "One" },
      { id: 11, email: "r2@example.com", first_name: "R", last_name: "Two" },
    ]);
  });

  it("returns 403 for scoped reviewers when user lacks org membership", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/reviewers?org_id=55")
      .set("x-role", "user");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("returns empty reviewers list when scoped org has no active event", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 55 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/reviewers?org_id=55")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("handles reviewers fetch failures", async () => {
    mocks.bandsGetReviewerUserIds.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/reviewers")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch reviewers" });
  });

  it("assigns reviewers and sends emails when requested", async () => {
    mocks.eventsFindActive.mockResolvedValue({ id: 55, name: "Fest 2026" });
    mocks.bandsFindByEventId
      .mockResolvedValueOnce([
        { id: 1, assigned_reviewer_id: null },
        { id: 2, assigned_reviewer_id: null },
      ])
      .mockResolvedValueOnce([
        { id: 1, assigned_reviewer_id: 10 },
        { id: 2, assigned_reviewer_id: 11 },
      ]);
    mocks.bandsAssignReviewer.mockResolvedValue(undefined);
    mocks.usersFindById
      .mockResolvedValueOnce({ id: 10, email: "rev1@example.com", first_name: "Rev" })
      .mockResolvedValueOnce({ id: 11, email: "rev2@example.com", first_name: "Rev2" });
    mocks.sendReviewerAssignmentEmail.mockResolvedValue(undefined);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/bands/assign-reviewers")
      .set("x-role", "super-duper-admin")
      .send({ userIds: [10, 11], sendEmail: true });

    expect(response.status).toBe(200);
    expect(mocks.bandsAssignReviewer).toHaveBeenCalledTimes(2);
    expect(mocks.sendReviewerAssignmentEmail).toHaveBeenCalledTimes(2);
    expect(response.body.message).toContain("Successfully assigned 2 bands to 2 reviewers");
  });

  it("returns forbidden on /users without org for non-super users", async () => {
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/users")
      .set("x-role", "user");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Forbidden" });
  });

  it("returns scoped users with org roles", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 22 });
    mocks.orgUsersGetUsersForOrganization.mockResolvedValue([
      { id: 2, email: "member@example.com", first_name: "M", last_name: "One", created_at: "2026-01-01" },
    ]);
    mocks.orgUsersFindByOrganizationId.mockResolvedValue([
      { user_id: 2, role: "reviewer" },
    ]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/users?org_id=22")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 2,
        email: "member@example.com",
        first_name: "M",
        last_name: "One",
        org_role: "reviewer",
        created_at: "2026-01-01",
      },
    ]);
  });

  it("returns scoped users for super admin and defaults missing role to organizer", async () => {
    mocks.orgUsersGetUsersForOrganization.mockResolvedValue([
      { id: 2, email: "member@example.com", first_name: "M", last_name: "One", created_at: "2026-01-01" },
    ]);
    mocks.orgUsersFindByOrganizationId.mockResolvedValue([]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/users?org_id=22")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 2,
        email: "member@example.com",
        first_name: "M",
        last_name: "One",
        org_role: "organizer",
        created_at: "2026-01-01",
      },
    ]);
    expect(mocks.findByUserAndOrg).not.toHaveBeenCalled();
  });

  it("returns 400 when creating org user for unknown organization", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 77 });
    mocks.orgFindById.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/users")
      .set("x-role", "user")
      .send({
        email: "new@example.com",
        password: "password123",
        organization_id: 77,
        org_role: "reviewer",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Organization not found" });
  });

  it("returns 400 when adding existing org member user", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 77 });
    mocks.orgFindById.mockResolvedValue({ id: 77, name: "Org" });
    mocks.usersFindByEmail.mockResolvedValue({ id: 5, email: "existing@example.com" });
    mocks.findByUserAndOrg.mockResolvedValueOnce({ user_id: 1, organization_id: 77 }).mockResolvedValueOnce({ user_id: 5, organization_id: 77 });
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/users")
      .set("x-role", "user")
      .send({
        email: "existing@example.com",
        password: "password123",
        organization_id: 77,
        org_role: "reviewer",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "User is already a member of this organization" });
  });

  it("adds existing user to organization when not already a member", async () => {
    mocks.orgFindById.mockResolvedValue({ id: 77, name: "Org" });
    mocks.usersFindByEmail.mockResolvedValue({
      id: 5,
      email: "existing@example.com",
      first_name: "Existing",
      last_name: "User",
      created_at: "2026-01-01",
    });
    mocks.findByUserAndOrg.mockResolvedValue(null);
    mocks.orgUsersCreate.mockResolvedValue(undefined);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/users")
      .set("x-role", "super-duper-admin")
      .send({
        email: "existing@example.com",
        password: "password123",
        organization_id: 77,
        org_role: "reviewer",
      });

    expect(response.status).toBe(200);
    expect(mocks.orgUsersCreate).toHaveBeenCalledWith({
      user_id: 5,
      organization_id: 77,
      role: "reviewer",
    });
  });

  it("returns 400 when patching user without org_id", async () => {
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/users/5")
      .set("x-role", "super-duper-admin")
      .send({ first_name: "NoOrg" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "org_id query parameter is required" });
  });

  it("returns 400 when patching user with invalid payload", async () => {
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/users/5?org_id=22")
      .set("x-role", "super-duper-admin")
      .send({ new_password: "123" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns 403 when non-super user patches user outside organization", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/users/5?org_id=22")
      .set("x-role", "user")
      .send({ first_name: "Nope" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("returns 404 when patch target user is not org member", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/users/5?org_id=22")
      .set("x-role", "super-duper-admin")
      .send({ first_name: "NoMember" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "User is not a member of this organization" });
  });

  it("returns 400 when patching user to an email already taken by another user", async () => {
    mocks.findByUserAndOrg
      .mockResolvedValueOnce({ user_id: 1, organization_id: 22, role: "owner" })
      .mockResolvedValueOnce({ user_id: 5, organization_id: 22, role: "organizer" });
    mocks.usersFindByEmail.mockResolvedValue({ id: 99, email: "taken@example.com" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/users/5?org_id=22")
      .set("x-role", "user")
      .send({ email: "taken@example.com" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Another user already has that email" });
  });

  it("handles patch user failures", async () => {
    mocks.findByUserAndOrg
      .mockResolvedValueOnce({ user_id: 1, organization_id: 22, role: "owner" })
      .mockResolvedValueOnce({ user_id: 5, organization_id: 22, role: "organizer" });
    mocks.usersFindByEmail.mockResolvedValue(null);
    mocks.usersUpdate.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/users/5?org_id=22")
      .set("x-role", "user")
      .send({ first_name: "Boom" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to update user" });
  });

  it("returns 400 when creating event for unknown organization", async () => {
    mocks.orgFindById.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/events")
      .set("x-role", "super-duper-admin")
      .send({ name: "Event", date: "2026-09-01", organization_id: 99 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Organization not found" });
  });

  it("returns 400 when creating event with invalid payload", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/events")
      .set("x-role", "super-duper-admin")
      .send({ name: "", date: "", organization_id: "" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns 403 when non-super user creates event outside organization", async () => {
    mocks.orgFindById.mockResolvedValue({ id: 99, name: "Org" });
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/events")
      .set("x-role", "user")
      .send({ name: "Event", date: "2026-09-01", organization_id: 99 });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "You are not a member of this organization" });
  });

  it("creates event and copies recurring templates", async () => {
    mocks.orgFindById.mockResolvedValue({ id: 99, name: "Org" });
    mocks.eventsCreate.mockResolvedValue({ id: 123, organization_id: 99, name: "Event" });
    mocks.tasksFindByOrganizationId.mockResolvedValue([
      { id: 1, recurring: true },
      { id: 2, recurring: false },
    ]);
    mocks.eventTasksCreate.mockResolvedValue(undefined);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/events")
      .set("x-role", "super-duper-admin")
      .send({ name: "Event", date: "2026-09-01", organization_id: 99 });

    expect(response.status).toBe(200);
    expect(mocks.eventTasksCreate).toHaveBeenCalledWith({ task_id: 1, event_id: 123 });
  });

  it("creates event for non-super user when they belong to organization", async () => {
    mocks.orgFindById.mockResolvedValue({ id: 99, name: "Org" });
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 99, role: "organizer" });
    mocks.eventsCreate.mockResolvedValue({ id: 125, organization_id: 99, name: "Event" });
    mocks.tasksFindByOrganizationId.mockResolvedValue([]);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/events")
      .set("x-role", "user")
      .send({ name: "Event", date: "2026-09-01", organization_id: 99 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 125, organization_id: 99, name: "Event" });
  });

  it("creates event even when recurring template copy fails", async () => {
    mocks.orgFindById.mockResolvedValue({ id: 99, name: "Org" });
    mocks.eventsCreate.mockResolvedValue({ id: 124, organization_id: 99, name: "Event" });
    mocks.tasksFindByOrganizationId.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/events")
      .set("x-role", "super-duper-admin")
      .send({ name: "Event", date: "2026-09-01", organization_id: 99 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 124, organization_id: 99, name: "Event" });
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it("returns 500 when creating event throws", async () => {
    mocks.orgFindById.mockResolvedValue({ id: 99, name: "Org" });
    mocks.eventsCreate.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/events")
      .set("x-role", "super-duper-admin")
      .send({ name: "Event", date: "2026-09-01", organization_id: 99 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create event" });
  });

  it("returns 404 when patching missing event", async () => {
    mocks.eventsFindById.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/events/404")
      .set("x-role", "super-duper-admin")
      .send({ name: "X" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });

  it("returns 404 when scheduling missing band", async () => {
    mocks.bandsFindById.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/909/schedule")
      .set("x-role", "super-duper-admin")
      .send({ assigned_porch_id: 1, set_start_time: "13:00", set_end_time: "14:00" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Band not found" });
  });

  it("returns validation errors for invalid scheduling payload", async () => {
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/3/schedule")
      .set("x-role", "super-duper-admin")
      .send({ assigned_porch_id: "bad-id" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns 400 when scheduling at non-approved porch", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 3, band_name: "Band" });
    mocks.porchesFindById.mockResolvedValue({ id: 1, status: "pending" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/3/schedule")
      .set("x-role", "super-duper-admin")
      .send({ assigned_porch_id: 1, set_start_time: "13:00", set_end_time: "14:00" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Porch must be approved to schedule bands" });
  });

  it("returns 400 when scheduling with unknown porch", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 3, band_name: "Band" });
    mocks.porchesFindById.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/3/schedule")
      .set("x-role", "super-duper-admin")
      .send({ assigned_porch_id: 999, set_start_time: "13:00", set_end_time: "14:00" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Porch not found" });
  });

  it("returns scheduling time conflict message", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 3, band_name: "Band" });
    mocks.porchesFindById.mockResolvedValue({ id: 1, status: "approved", address: "123 Main" });
    mocks.bandsFindOverlappingAtPorch.mockResolvedValue({
      band_name: "Other Band",
      set_start_time: "13:00",
      set_end_time: "14:00",
    });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/3/schedule")
      .set("x-role", "super-duper-admin")
      .send({ assigned_porch_id: 1, set_start_time: "13:15", set_end_time: "14:15" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Time conflict");
  });

  it("formats midnight and noon correctly in scheduling conflict message", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 3, band_name: "Band" });
    mocks.porchesFindById.mockResolvedValue({ id: 1, status: "approved", address: "123 Main" });
    mocks.bandsFindOverlappingAtPorch.mockResolvedValue({
      band_name: "Other Band",
      set_start_time: "00:00",
      set_end_time: "12:00",
    });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/3/schedule")
      .set("x-role", "super-duper-admin")
      .send({ assigned_porch_id: 1, set_start_time: "00:30", set_end_time: "12:30" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("12:00 AM");
    expect(response.body.error).toContain("12:00 PM");
  });

  it("updates band scheduling", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 3, band_name: "Band" });
    mocks.porchesFindById.mockResolvedValue({ id: 1, status: "approved" });
    mocks.bandsFindOverlappingAtPorch.mockResolvedValue(null);
    mocks.bandsUpdateSchedule.mockResolvedValue({ id: 3, assigned_porch_id: 1 });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/3/schedule")
      .set("x-role", "super-duper-admin")
      .send({ assigned_porch_id: 1, set_start_time: "13:00", set_end_time: "14:00" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 3, assigned_porch_id: 1 });
  });

  it("clears band scheduling fields when null/empty values are sent", async () => {
    mocks.bandsFindById.mockResolvedValue({ id: 3, band_name: "Band" });
    mocks.bandsUpdateSchedule.mockResolvedValue({ id: 3, assigned_porch_id: null });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/3/schedule")
      .set("x-role", "super-duper-admin")
      .send({ assigned_porch_id: null, set_start_time: "", set_end_time: "" });

    expect(response.status).toBe(200);
    expect(mocks.bandsUpdateSchedule).toHaveBeenCalledWith("3", {
      assigned_porch_id: null,
      set_start_time: null,
      set_end_time: null,
    });
  });

  it("handles scheduling failures", async () => {
    mocks.bandsFindById.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/bands/3/schedule")
      .set("x-role", "super-duper-admin")
      .send({ assigned_porch_id: 1, set_start_time: "13:00", set_end_time: "14:00" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to schedule band" });
  });

  it("returns scoped /users forbidden when user lacks org membership", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/users?org_id=88")
      .set("x-role", "user")
      .set("x-user-id", "9");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("returns global users with organizations for super admin", async () => {
    mocks.usersFindAll.mockResolvedValue([
      {
        id: 11,
        email: "u@example.com",
        role: "user",
        first_name: "U",
        last_name: "One",
        created_at: "2026-01-01",
      },
    ]);
    mocks.getOrganizationsForUser.mockResolvedValue([{ id: 1, name: "Org 1" }]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/users")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(200);
    expect(response.body[0].organizations).toEqual([{ id: 1, name: "Org 1" }]);
  });

  it("handles global users fetch failures", async () => {
    mocks.usersFindAll.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/users")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch users" });
  });

  it("returns validation errors when creating user payload is invalid", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/users")
      .set("x-role", "super-duper-admin")
      .send({ email: "bad-email", password: "123", organization_id: "", org_role: "bad-role" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("returns forbidden when non-super user creates user outside organization", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/users")
      .set("x-role", "user")
      .send({
        email: "new@example.com",
        password: "password123",
        organization_id: 77,
        org_role: "reviewer",
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("creates org user by creating account and membership", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 77 });
    mocks.orgFindById.mockResolvedValue({ id: 77, name: "Org" });
    mocks.usersFindByEmail.mockResolvedValue(null);
    mocks.bcryptHash.mockResolvedValue("hashed-pass");
    mocks.usersCreate.mockResolvedValue({
      id: 66,
      email: "brandnew@example.com",
      first_name: "Brand",
      last_name: "New",
      created_at: "2026-01-01",
    });
    mocks.orgUsersCreate.mockResolvedValue(undefined);
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/users")
      .set("x-role", "user")
      .send({
        email: "brandnew@example.com",
        password: "password123",
        organization_id: 77,
        org_role: "reviewer",
        first_name: "Brand",
        last_name: "New",
      });

    expect(response.status).toBe(200);
    expect(mocks.usersCreate).toHaveBeenCalledWith({
      email: "brandnew@example.com",
      password_hash: "hashed-pass",
      role: "user",
      first_name: "Brand",
      last_name: "New",
    });
    expect(mocks.orgUsersCreate).toHaveBeenCalledWith({
      user_id: 66,
      organization_id: 77,
      role: "reviewer",
    });
  });

  it("handles create user failures", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 77 });
    mocks.orgFindById.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/users")
      .set("x-role", "user")
      .send({
        email: "brandnew@example.com",
        password: "password123",
        organization_id: 77,
        org_role: "reviewer",
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create user" });
  });

  it("updates org user profile/role/password", async () => {
    mocks.findByUserAndOrg
      .mockResolvedValueOnce({ user_id: 1, organization_id: 22, role: "owner" })
      .mockResolvedValueOnce({ user_id: 5, organization_id: 22, role: "organizer" })
      .mockResolvedValueOnce({ user_id: 5, organization_id: 22, role: "reviewer" });
    mocks.usersFindByEmail.mockResolvedValue(null);
    mocks.usersUpdate.mockResolvedValue(undefined);
    mocks.orgUsersUpdateRole.mockResolvedValue(undefined);
    mocks.bcryptHash.mockResolvedValue("new-hash");
    mocks.usersUpdatePassword.mockResolvedValue(undefined);
    mocks.usersFindById.mockResolvedValue({
      id: 5,
      email: "edited@example.com",
      first_name: "Edit",
      last_name: "Me",
      created_at: "2026-01-01",
    });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/users/5?org_id=22")
      .set("x-role", "user")
      .send({
        email: "edited@example.com",
        first_name: "Edit",
        last_name: "Me",
        org_role: "reviewer",
        new_password: "password123",
      });

    expect(response.status).toBe(200);
    expect(mocks.orgUsersUpdateRole).toHaveBeenCalledWith(5, 22, "reviewer");
    expect(mocks.usersUpdatePassword).toHaveBeenCalledWith(5, "new-hash");
  });

  it("updates org user profile without role or password changes", async () => {
    mocks.findByUserAndOrg
      .mockResolvedValueOnce({ user_id: 1, organization_id: 22, role: "owner" })
      .mockResolvedValueOnce({ user_id: 5, organization_id: 22, role: "organizer" })
      .mockResolvedValueOnce({ user_id: 5, organization_id: 22, role: "organizer" });
    mocks.usersFindByEmail.mockResolvedValue(null);
    mocks.usersUpdate.mockResolvedValue(undefined);
    mocks.usersFindById.mockResolvedValue({
      id: 5,
      email: "edited@example.com",
      first_name: "Edited",
      last_name: "User",
      created_at: "2026-01-01",
    });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/users/5?org_id=22")
      .set("x-role", "user")
      .send({ first_name: "Edited" });

    expect(response.status).toBe(200);
    expect(mocks.orgUsersUpdateRole).not.toHaveBeenCalled();
    expect(mocks.usersUpdatePassword).not.toHaveBeenCalled();
  });

  it("blocks removing the last owner from organization", async () => {
    mocks.findByUserAndOrg
      .mockResolvedValueOnce({ user_id: 1, organization_id: 22, role: "owner" })
      .mockResolvedValueOnce({ user_id: 5, organization_id: 22, role: "owner" });
    mocks.orgUsersFindByOrganizationId.mockResolvedValue([
      { user_id: 5, role: "owner" },
    ]);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/users/5?org_id=22")
      .set("x-role", "user")
      .send({ org_role: "reviewer" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Cannot remove the last owner. Assign another owner first." });
  });

  it("allows owner role change when organization still has another owner", async () => {
    mocks.findByUserAndOrg
      .mockResolvedValueOnce({ user_id: 1, organization_id: 22, role: "owner" })
      .mockResolvedValueOnce({ user_id: 5, organization_id: 22, role: "owner" })
      .mockResolvedValueOnce({ user_id: 5, organization_id: 22, role: "organizer" });
    mocks.orgUsersFindByOrganizationId.mockResolvedValue([
      { user_id: 5, role: "owner" },
      { user_id: 6, role: "owner" },
    ]);
    mocks.usersFindById.mockResolvedValue({
      id: 5,
      email: "edited@example.com",
      first_name: "Edit",
      last_name: "Me",
      created_at: "2026-01-01",
    });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/users/5?org_id=22")
      .set("x-role", "user")
      .send({ org_role: "organizer" });

    expect(response.status).toBe(200);
    expect(mocks.orgUsersUpdateRole).toHaveBeenCalledWith(5, 22, "organizer");
  });

  it("returns forbidden when patching event outside user's org", async () => {
    mocks.eventsFindById.mockResolvedValue({ id: 10, organization_id: 22 });
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/events/10")
      .set("x-role", "user")
      .send({ name: "Nope" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "You are not a member of this event's organization" });
  });

  it("returns validation errors for porch status patch", async () => {
    const app = buildApp();
    const response = await request(app)
      .patch("/api/admin/porches/1/status")
      .set("x-role", "super-duper-admin")
      .send({ status: "bad-status" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("patches event successfully", async () => {
    mocks.eventsFindById.mockResolvedValue({ id: 10, organization_id: 22 });
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 22 });
    mocks.eventsUpdate.mockResolvedValue({ id: 10, name: "Updated Event" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/events/10")
      .set("x-role", "user")
      .send({ name: "Updated Event" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 10, name: "Updated Event" });
  });

  it("allows super-duper-admin to patch event without org membership check", async () => {
    mocks.eventsFindById.mockResolvedValue({ id: 10, organization_id: 22 });
    mocks.eventsUpdate.mockResolvedValue({ id: 10, name: "Updated Event" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/events/10")
      .set("x-role", "super-duper-admin")
      .send({ name: "Updated Event" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 10, name: "Updated Event" });
    expect(mocks.findByUserAndOrg).not.toHaveBeenCalled();
  });

  it("returns 500 when patching event throws", async () => {
    mocks.eventsFindById.mockResolvedValue({ id: 10, organization_id: 22 });
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 22 });
    mocks.eventsUpdate.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/events/10")
      .set("x-role", "user")
      .send({ name: "Updated Event" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to update event" });
  });

  it("returns 400 for invalid time-slot payload", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/events/10/slots")
      .set("x-role", "super-duper-admin")
      .send({ start_time: "not-a-date", end_time: "also-bad" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it("creates a time slot", async () => {
    mocks.timeSlotsCreate.mockResolvedValue({ id: 222 });
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/events/10/slots")
      .set("x-role", "super-duper-admin")
      .send({ start_time: "2026-09-01T12:00:00.000Z", end_time: "2026-09-01T13:00:00.000Z" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 222 });
    expect(mocks.timeSlotsCreate).toHaveBeenCalledWith({
      event_id: "10",
      start_time: "2026-09-01T12:00:00.000Z",
      end_time: "2026-09-01T13:00:00.000Z",
    });
  });

  it("handles time-slot creation failures", async () => {
    mocks.timeSlotsCreate.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .post("/api/admin/events/10/slots")
      .set("x-role", "super-duper-admin")
      .send({ start_time: "2026-09-01T12:00:00.000Z", end_time: "2026-09-01T13:00:00.000Z" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create time slot" });
  });

  it("updates porch status", async () => {
    mocks.porchesUpdateStatus.mockResolvedValue({ id: 8, status: "approved" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/porches/8/status")
      .set("x-role", "super-duper-admin")
      .send({ status: "approved", admin_notes: "OK" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 8, status: "approved" });
  });

  it("handles porch status update failures", async () => {
    mocks.porchesUpdateStatus.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/porches/8/status")
      .set("x-role", "super-duper-admin")
      .send({ status: "approved", admin_notes: "OK" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to update porch status" });
  });

  it("returns 404 when porch status target is missing", async () => {
    mocks.porchesUpdateStatus.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/porches/404/status")
      .set("x-role", "super-duper-admin")
      .send({ status: "approved" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Porch not found" });
  });

  it("updates porch admin notes for an organizer", async () => {
    mocks.porchesFindById.mockResolvedValue({ id: 8, event_id: 44 });
    mocks.eventsFindById.mockResolvedValue({ id: 44, organization_id: 9 });
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 7, organization_id: 9, role: "owner" });
    mocks.porchesUpdateAdminNotes.mockResolvedValue({ id: 8, admin_notes: "loud" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/porches/8/notes")
      .set("x-role", "user")
      .set("x-user-id", "7")
      .send({ admin_notes: "loud" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 8, admin_notes: "loud" });
    expect(mocks.porchesUpdateAdminNotes).toHaveBeenCalledWith("8", "loud");
  });

  it("forbids porch admin notes for a reviewer", async () => {
    mocks.porchesFindById.mockResolvedValue({ id: 8, event_id: 44 });
    mocks.eventsFindById.mockResolvedValue({ id: 44, organization_id: 9 });
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 7, organization_id: 9, role: "reviewer" });
    const app = buildApp();

    const response = await request(app)
      .patch("/api/admin/porches/8/notes")
      .set("x-role", "user")
      .set("x-user-id", "7")
      .send({ admin_notes: "nope" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Organizer access required" });
    expect(mocks.porchesUpdateAdminNotes).not.toHaveBeenCalled();
  });

  it("filters scoped porches by status", async () => {
    mocks.findByUserAndOrg.mockResolvedValue({ user_id: 1, organization_id: 9 });
    mocks.eventsFindActiveByOrganizationId.mockResolvedValue({ id: 44 });
    mocks.porchesFindByEventId.mockResolvedValue([
      { id: 7, status: "approved" },
      { id: 8, status: "pending" },
    ]);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches?org_id=9&status=approved")
      .set("x-role", "user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 7, status: "approved" }]);
  });

  it("returns forbidden for scoped approved porches when user lacks membership", async () => {
    mocks.findByUserAndOrg.mockResolvedValue(null);
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches/approved?org_id=9")
      .set("x-role", "user");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a member of this organization" });
  });

  it("handles approved porches fetch failures", async () => {
    mocks.porchesFindApproved.mockRejectedValue(new Error("db down"));
    const app = buildApp();

    const response = await request(app)
      .get("/api/admin/porches/approved")
      .set("x-role", "super-duper-admin");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch approved porches" });
  });
});
