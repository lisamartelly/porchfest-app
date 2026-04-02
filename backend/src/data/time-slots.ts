import { pool } from "./pool.js";
import type { TimeSlot } from "./types.js";

export const timeSlots = {
  async findByEventId(eventId: number | string): Promise<TimeSlot[]> {
    const result = await pool.query<TimeSlot>(
      "SELECT * FROM time_slots WHERE event_id = $1 ORDER BY start_time",
      [eventId]
    );
    return result.rows;
  },

  async findAll(): Promise<TimeSlot[]> {
    const result = await pool.query<TimeSlot>(
      "SELECT * FROM time_slots ORDER BY start_time"
    );
    return result.rows;
  },

  async create(data: {
    event_id: number | string;
    start_time: string;
    end_time: string;
  }): Promise<TimeSlot> {
    const result = await pool.query<TimeSlot>(
      `INSERT INTO time_slots (event_id, start_time, end_time)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.event_id, data.start_time, data.end_time]
    );
    return result.rows[0];
  },
};
