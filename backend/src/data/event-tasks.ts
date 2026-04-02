import { pool } from "./pool.js";
import type { EventTask, EventTaskStatus, EventTaskWithDetails } from "./types.js";

export const eventTasks = {
  async findByEventId(eventId: number | string): Promise<EventTaskWithDetails[]> {
    const result = await pool.query<EventTaskWithDetails>(
      `SELECT et.*, t.name AS task_name, t.recurring,
              u.email AS assigned_user_email,
              u.first_name AS assigned_user_first_name,
              u.last_name AS assigned_user_last_name
       FROM event_tasks et
       JOIN tasks t ON et.task_id = t.id
       LEFT JOIN users u ON et.assigned_user_id = u.id
       WHERE et.event_id = $1
       ORDER BY et.due_date ASC NULLS LAST, t.name`,
      [eventId]
    );
    return result.rows;
  },

  async findById(id: number | string): Promise<EventTaskWithDetails | null> {
    const result = await pool.query<EventTaskWithDetails>(
      `SELECT et.*, t.name AS task_name, t.recurring,
              u.email AS assigned_user_email,
              u.first_name AS assigned_user_first_name,
              u.last_name AS assigned_user_last_name
       FROM event_tasks et
       JOIN tasks t ON et.task_id = t.id
       LEFT JOIN users u ON et.assigned_user_id = u.id
       WHERE et.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByTaskAndEvent(
    taskId: number | string,
    eventId: number | string
  ): Promise<EventTask | null> {
    const result = await pool.query<EventTask>(
      "SELECT * FROM event_tasks WHERE task_id = $1 AND event_id = $2",
      [taskId, eventId]
    );
    return result.rows[0] || null;
  },

  async create(data: {
    task_id: number | string;
    event_id: number | string;
    name?: string | null;
    notes?: string | null;
    assigned_user_id?: number | string | null;
    due_date?: string | null;
    status?: EventTaskStatus | null;
  }): Promise<EventTask> {
    const result = await pool.query<EventTask>(
      `INSERT INTO event_tasks (task_id, event_id, name, notes, assigned_user_id, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.task_id,
        data.event_id,
        data.name || null,
        data.notes || null,
        data.assigned_user_id || null,
        data.due_date || null,
        data.status || "to_do",
      ]
    );
    return result.rows[0];
  },

  async update(
    id: number | string,
    data: {
      name?: string | null;
      notes?: string | null;
      assigned_user_id?: number | string | null;
      due_date?: string | null;
      status?: EventTaskStatus | null;
    }
  ): Promise<EventTask | null> {
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(data.name ?? null);
    }
    if (data.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      values.push(data.notes ?? null);
    }
    if (data.assigned_user_id !== undefined) {
      setClauses.push(`assigned_user_id = $${paramIndex++}`);
      values.push(data.assigned_user_id as number | null);
    }
    if (data.due_date !== undefined) {
      setClauses.push(`due_date = $${paramIndex++}`);
      values.push(data.due_date ?? null);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(data.status ?? "to_do");
    }

    if (setClauses.length === 0) return null;

    values.push(id as number);
    const result = await pool.query<EventTask>(
      `UPDATE event_tasks SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: number | string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM event_tasks WHERE id = $1",
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async getHistory(taskId: number | string): Promise<EventTaskWithDetails[]> {
    const result = await pool.query<EventTaskWithDetails & { event_name: string; event_date: string }>(
      `SELECT et.*, t.name AS task_name, t.recurring,
              u.email AS assigned_user_email,
              u.first_name AS assigned_user_first_name,
              u.last_name AS assigned_user_last_name,
              e.name AS event_name, e.date AS event_date
       FROM event_tasks et
       JOIN tasks t ON et.task_id = t.id
       JOIN events e ON et.event_id = e.id
       LEFT JOIN users u ON et.assigned_user_id = u.id
       WHERE et.task_id = $1
       ORDER BY e.date DESC`,
      [taskId]
    );
    return result.rows;
  },
};
