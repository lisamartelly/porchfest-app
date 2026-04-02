export { pool, testConnection } from "./pool.js";

export type {
  User,
  Organization,
  Band,
  Porch,
  Event,
  OrganizationUser,
  TimeSlot,
  Task,
  EventTaskStatus,
  EventTask,
  EventTaskWithDetails,
  TaskContact,
  BandMagicToken,
} from "./types.js";

import { users } from "./users.js";
import { organizations } from "./organizations.js";
import { organizationUsers } from "./organization-users.js";
import { bands } from "./bands.js";
import { porches } from "./porches.js";
import { events } from "./events.js";
import { timeSlots } from "./time-slots.js";
import { tasks } from "./tasks.js";
import { eventTasks } from "./event-tasks.js";
import { taskContacts } from "./task-contacts.js";
import { bandMagicTokens } from "./band-magic-tokens.js";

export const db = {
  users,
  organizations,
  organizationUsers,
  bands,
  porches,
  events,
  timeSlots,
  tasks,
  eventTasks,
  taskContacts,
  bandMagicTokens,
};
