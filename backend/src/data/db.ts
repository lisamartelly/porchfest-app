import pg from "pg";
const { Pool } = pg;

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// Connection pool - works with any Postgres (Docker, RDS, etc.)
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://porchfest:porchfest_dev@localhost:5432/porchfest",
  // Production-ready settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
  process.exit(-1);
});

// Export pool for direct queries if needed
export { pool };

// ============================================================================
// TYPE DEFINITIONS (matching mock-data.json structure)
// ============================================================================

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Band {
  id: number;
  event_id: number;
  band_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  genre: string | null;
  member_count: string | null;
  music_sample_link: string | null;
  bio: string | null;
  set_length: string | null;
  venmo_handle: string | null;
  instagram: string | null;
  spotify: string | null;
  soundcloud: string | null;
  bandcamp: string | null;
  facebook: string | null;
  website: string | null;
  scheduling_notes: string | null;
  equipment_consent: string | null;
  payment_consent: string | null;
  timeline_consent: string | null;
  photo_key: string | null;
  questions_comments: string | null;
  status: string;
  admin_notes: string | null;
  assigned_porch_id: number | null;
  set_start_time: string | null;
  set_end_time: string | null;
  assigned_reviewer_id: number | null;
  assigned_reviewer_email: string | null;
  reviewer_rating: number | null;
  reviewer_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Porch {
  id: number;
  event_id: number;
  owner_name: string;
  email: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
  has_power: boolean;
  parking_notes: string | null;
  accessibility_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Event {
  id: number;
  organization_id: number;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string | null;
  is_active: boolean;
  band_applications_open: string | null;
  band_applications_close: string | null;
  porch_applications_open: string | null;
  porch_applications_close: string | null;
  reviewer_emails: string[];
  reviewers_assigned: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationUser {
  id: number;
  user_id: number;
  organization_id: number;
  role: string;
  created_at: Date;
}

export interface TimeSlot {
  id: number;
  event_id: number;
  start_time: Date;
  end_time: Date;
  created_at: Date;
}

export interface Task {
  id: number;
  organization_id: number;
  name: string;
  recurring: boolean;
  created_at: Date;
  updated_at: Date;
}

export type EventTaskStatus = "to_do" | "in_progress" | "blocked" | "done";

export interface EventTask {
  id: number;
  task_id: number;
  event_id: number;
  name: string | null;
  notes: string | null;
  assigned_user_id: number | null;
  due_date: Date | null;
  status: EventTaskStatus;
  created_at: Date;
  updated_at: Date;
}

export interface EventTaskWithDetails extends EventTask {
  task_name: string;
  recurring: boolean;
  assigned_user_email?: string | null;
  assigned_user_first_name?: string | null;
  assigned_user_last_name?: string | null;
  contacts?: TaskContact[];
}

export interface TaskContact {
  id: number;
  event_task_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  business: string | null;
  notes: string | null;
  created_at: Date;
}

export interface BandMagicToken {
  id: number;
  band_id: number;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

// ============================================================================
// DATABASE QUERY HELPERS
// ============================================================================

export const db = {
  // ---------------------------------------------------------------------------
  // USERS
  // ---------------------------------------------------------------------------
  users: {
    async findAll(): Promise<User[]> {
      const result = await pool.query<User>(
        "SELECT * FROM users ORDER BY created_at DESC"
      );
      return result.rows;
    },

    async findByEmail(email: string): Promise<User | null> {
      const result = await pool.query<User>(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      return result.rows[0] || null;
    },

    async findById(id: number | string): Promise<User | null> {
      const result = await pool.query<User>(
        "SELECT * FROM users WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    },

    async create(data: {
      email: string;
      password_hash: string;
      role: string;
      first_name?: string | null;
      last_name?: string | null;
    }): Promise<User> {
      const result = await pool.query<User>(
        `INSERT INTO users (email, password_hash, role, first_name, last_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [data.email, data.password_hash, data.role, data.first_name ?? null, data.last_name ?? null]
      );
      return result.rows[0];
    },

    async update(id: number | string, data: {
      first_name?: string | null;
      last_name?: string | null;
      email?: string;
    }): Promise<User | null> {
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (data.email !== undefined) {
        fields.push(`email = $${idx++}`);
        values.push(data.email);
      }
      if (data.first_name !== undefined) {
        fields.push(`first_name = $${idx++}`);
        values.push(data.first_name);
      }
      if (data.last_name !== undefined) {
        fields.push(`last_name = $${idx++}`);
        values.push(data.last_name);
      }
      if (fields.length === 0) return this.findById(id);

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query<User>(
        `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
      );
      return result.rows[0] || null;
    },

    async updatePassword(id: number | string, passwordHash: string): Promise<User | null> {
      const result = await pool.query<User>(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [passwordHash, id]
      );
      return result.rows[0] || null;
    },
  },

  // ---------------------------------------------------------------------------
  // ORGANIZATIONS
  // ---------------------------------------------------------------------------
  organizations: {
    async findAll(): Promise<Organization[]> {
      const result = await pool.query<Organization>(
        "SELECT * FROM organizations ORDER BY name"
      );
      return result.rows;
    },

    async findById(id: number | string): Promise<Organization | null> {
      const result = await pool.query<Organization>(
        "SELECT * FROM organizations WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    },

    async findBySlug(slug: string): Promise<Organization | null> {
      const result = await pool.query<Organization>(
        "SELECT * FROM organizations WHERE slug = $1",
        [slug]
      );
      return result.rows[0] || null;
    },

    async create(data: Partial<Organization>): Promise<Organization> {
      const result = await pool.query<Organization>(
        `INSERT INTO organizations (name, slug, description, website, contact_email, city, state, logo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          data.name,
          data.slug,
          data.description || null,
          data.website || null,
          data.contact_email || null,
          data.city || null,
          data.state || null,
          data.logo_url || null,
        ]
      );
      return result.rows[0];
    },

    async update(
      id: number | string,
      data: Partial<Organization>
    ): Promise<Organization | null> {
      const setClauses: string[] = [];
      const values: (string | number | null)[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.slug !== undefined) {
        setClauses.push(`slug = $${paramIndex++}`);
        values.push(data.slug);
      }
      if (data.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.website !== undefined) {
        setClauses.push(`website = $${paramIndex++}`);
        values.push(data.website);
      }
      if (data.contact_email !== undefined) {
        setClauses.push(`contact_email = $${paramIndex++}`);
        values.push(data.contact_email);
      }
      if (data.city !== undefined) {
        setClauses.push(`city = $${paramIndex++}`);
        values.push(data.city);
      }
      if (data.state !== undefined) {
        setClauses.push(`state = $${paramIndex++}`);
        values.push(data.state);
      }
      if (data.logo_url !== undefined) {
        setClauses.push(`logo_url = $${paramIndex++}`);
        values.push(data.logo_url);
      }

      if (setClauses.length === 0) return this.findById(id);

      values.push(id);
      const result = await pool.query<Organization>(
        `UPDATE organizations SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      return result.rows[0] || null;
    },
  },

  // ---------------------------------------------------------------------------
  // USER_ORGANIZATIONS (many-to-many junction)
  // ---------------------------------------------------------------------------
  organizationUsers: {
    async findByUserId(userId: number): Promise<OrganizationUser[]> {
      const result = await pool.query<OrganizationUser>(
        "SELECT * FROM organization_users WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      return result.rows;
    },

    async findByOrganizationId(
      organizationId: number
    ): Promise<OrganizationUser[]> {
      const result = await pool.query<OrganizationUser>(
        "SELECT * FROM organization_users WHERE organization_id = $1 ORDER BY created_at DESC",
        [organizationId]
      );
      return result.rows;
    },

    async findByUserAndOrg(
      userId: number,
      organizationId: number
    ): Promise<OrganizationUser | null> {
      const result = await pool.query<OrganizationUser>(
        "SELECT * FROM organization_users WHERE user_id = $1 AND organization_id = $2",
        [userId, organizationId]
      );
      return result.rows[0] || null;
    },

    async getOrganizationsForUser(userId: number): Promise<Organization[]> {
      const result = await pool.query<Organization>(
        `SELECT o.* FROM organizations o
         INNER JOIN organization_users ou ON o.id = ou.organization_id
         WHERE ou.user_id = $1
         ORDER BY o.name`,
        [userId]
      );
      return result.rows;
    },

    async getUsersForOrganization(organizationId: number): Promise<User[]> {
      const result = await pool.query<User>(
        `SELECT u.* FROM users u
         INNER JOIN organization_users ou ON u.id = ou.user_id
         WHERE ou.organization_id = $1
         ORDER BY u.email`,
        [organizationId]
      );
      return result.rows;
    },

    async create(data: {
      user_id: number;
      organization_id: number;
      role?: string;
    }): Promise<OrganizationUser> {
      const result = await pool.query<OrganizationUser>(
        `INSERT INTO organization_users (user_id, organization_id, role)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.user_id, data.organization_id, data.role || "organizer"]
      );
      return result.rows[0];
    },

    async updateRole(
      userId: number,
      organizationId: number,
      role: string
    ): Promise<OrganizationUser | null> {
      const result = await pool.query<OrganizationUser>(
        `UPDATE organization_users SET role = $1 WHERE user_id = $2 AND organization_id = $3 RETURNING *`,
        [role, userId, organizationId]
      );
      return result.rows[0] || null;
    },

    async delete(userId: number, organizationId: number): Promise<boolean> {
      const result = await pool.query(
        "DELETE FROM organization_users WHERE user_id = $1 AND organization_id = $2",
        [userId, organizationId]
      );
      return (result.rowCount ?? 0) > 0;
    },
  },

  // ---------------------------------------------------------------------------
  // BANDS
  // ---------------------------------------------------------------------------
  bands: {
    async findAll(status?: string): Promise<Band[]> {
      let query = "SELECT * FROM bands";
      const params: string[] = [];

      if (status) {
        query += " WHERE status = $1";
        params.push(status);
      }

      query += " ORDER BY created_at DESC";

      const result = await pool.query<Band>(query, params);
      return result.rows;
    },

    async findById(id: number | string): Promise<Band | null> {
      const result = await pool.query<Band>(
        "SELECT * FROM bands WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    },

    async findByReviewerEmail(email: string): Promise<Band[]> {
      const result = await pool.query<Band>(
        "SELECT * FROM bands WHERE assigned_reviewer_email = $1 ORDER BY created_at DESC",
        [email]
      );
      return result.rows;
    },

    async findApproved(): Promise<Band[]> {
      const result = await pool.query<Band>(
        "SELECT * FROM bands WHERE status = 'approved' ORDER BY band_name"
      );
      return result.rows;
    },

    async findByEventId(eventId: number | string): Promise<Band[]> {
      const result = await pool.query<Band>(
        `SELECT * FROM bands WHERE event_id = $1 ORDER BY band_name`,
        [eventId]
      );
      return result.rows;
    },

    async findByEventIdAndEmail(eventId: number | string, email: string): Promise<Band | null> {
      const result = await pool.query<Band>(
        `SELECT * FROM bands WHERE event_id = $1 AND LOWER(contact_email) = LOWER($2)`,
        [eventId, email]
      );
      return result.rows[0] || null;
    },

    async update(id: number | string, data: Partial<Band>): Promise<Band | null> {
      const setClauses: string[] = [];
      const values: (string | number | boolean | null)[] = [];
      let paramIndex = 1;

      const fields: (keyof Band)[] = [
        "band_name", "contact_name", "contact_email", "contact_phone",
        "genre", "member_count", "music_sample_link", "bio", "set_length",
        "venmo_handle", "instagram", "spotify", "soundcloud", "bandcamp",
        "facebook", "website", "scheduling_notes", "equipment_consent",
        "payment_consent", "timeline_consent", "photo_key",
        "questions_comments",
      ];

      for (const field of fields) {
        if (data[field] !== undefined) {
          setClauses.push(`${field} = $${paramIndex++}`);
          values.push(data[field] as string | number | boolean | null);
        }
      }

      if (setClauses.length === 0) return this.findById(id);

      setClauses.push(`updated_at = NOW()`);
      values.push(id as number);
      const result = await pool.query<Band>(
        `UPDATE bands SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      return result.rows[0] || null;
    },

    async create(data: Partial<Band>): Promise<Band> {
      const result = await pool.query<Band>(
        `INSERT INTO bands (
          event_id, band_name, contact_name, contact_email, contact_phone,
          genre, member_count, music_sample_link, bio, set_length,
          venmo_handle, instagram, spotify, soundcloud, bandcamp, facebook, website,
          scheduling_notes, equipment_consent, payment_consent, timeline_consent,
          photo_key, questions_comments, status, admin_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        RETURNING *`,
        [
          data.event_id,
          data.band_name,
          data.contact_name,
          data.contact_email,
          data.contact_phone || null,
          data.genre || null,
          data.member_count || null,
          data.music_sample_link || null,
          data.bio || null,
          data.set_length || null,
          data.venmo_handle || null,
          data.instagram || null,
          data.spotify || null,
          data.soundcloud || null,
          data.bandcamp || null,
          data.facebook || null,
          data.website || null,
          data.scheduling_notes || null,
          data.equipment_consent || null,
          data.payment_consent || null,
          data.timeline_consent || null,
          data.photo_key || null,
          data.questions_comments || null,
          data.status || "pending",
          data.admin_notes || null,
        ]
      );
      return result.rows[0];
    },

    async updateStatus(
      id: number | string,
      status: string,
      adminNotes?: string | null
    ): Promise<Band | null> {
      const result = await pool.query<Band>(
        `UPDATE bands SET status = $1, admin_notes = $2 WHERE id = $3 RETURNING *`,
        [status, adminNotes || null, id]
      );
      return result.rows[0] || null;
    },

    async updateSchedule(
      id: number | string,
      data: {
        assigned_porch_id?: string | null;
        set_start_time?: string | null;
        set_end_time?: string | null;
      }
    ): Promise<Band | null> {
      const result = await pool.query<Band>(
        `UPDATE bands 
         SET assigned_porch_id = $1, set_start_time = $2, set_end_time = $3
         WHERE id = $4 RETURNING *`,
        [
          data.assigned_porch_id || null,
          data.set_start_time || null,
          data.set_end_time || null,
          id,
        ]
      );
      return result.rows[0] || null;
    },

    async updateReview(
      id: number | string,
      data: {
        reviewer_rating?: number | null;
        reviewer_notes?: string | null;
      }
    ): Promise<Band | null> {
      const result = await pool.query<Band>(
        `UPDATE bands 
         SET reviewer_rating = $1, reviewer_notes = $2
         WHERE id = $3 RETURNING *`,
        [data.reviewer_rating ?? null, data.reviewer_notes ?? null, id]
      );
      return result.rows[0] || null;
    },

    async assignReviewer(
      id: number | string,
      reviewerId: number | string,
      reviewerEmail: string
    ): Promise<Band | null> {
      const result = await pool.query<Band>(
        `UPDATE bands 
         SET assigned_reviewer_id = $1, assigned_reviewer_email = $2
         WHERE id = $3 RETURNING *`,
        [reviewerId, reviewerEmail, id]
      );
      return result.rows[0] || null;
    },

    async getReviewerEmails(): Promise<string[]> {
      const result = await pool.query<{ assigned_reviewer_email: string }>(
        "SELECT DISTINCT assigned_reviewer_email FROM bands WHERE assigned_reviewer_email IS NOT NULL"
      );
      return result.rows.map((r) => r.assigned_reviewer_email);
    },

    async findOverlappingAtPorch(
      porchId: number | string,
      startTime: string,
      endTime: string,
      excludeBandId?: number | string
    ): Promise<Band | null> {
      let query = `
        SELECT * FROM bands 
        WHERE assigned_porch_id = $1 
          AND set_start_time IS NOT NULL 
          AND set_end_time IS NOT NULL
          AND set_start_time::time < $3::time 
          AND set_end_time::time > $2::time
      `;
      const params: (string | number | undefined)[] = [porchId, startTime, endTime];

      if (excludeBandId) {
        query += " AND id != $4";
        params.push(excludeBandId);
      }

      const result = await pool.query<Band>(query, params);
      return result.rows[0] || null;
    },
  },

  // ---------------------------------------------------------------------------
  // PORCHES
  // ---------------------------------------------------------------------------
  porches: {
    async findAll(status?: string): Promise<Porch[]> {
      let query = "SELECT * FROM porches";
      const params: string[] = [];

      if (status) {
        query += " WHERE status = $1";
        params.push(status);
      }

      query += " ORDER BY created_at DESC";

      const result = await pool.query<Porch>(query, params);
      return result.rows;
    },

    async findById(id: number | string): Promise<Porch | null> {
      const result = await pool.query<Porch>(
        "SELECT * FROM porches WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    },

    async findApproved(): Promise<Porch[]> {
      const result = await pool.query<Porch>(
        "SELECT * FROM porches WHERE status = 'approved' ORDER BY address"
      );
      return result.rows;
    },

    async findByEventId(eventId: number | string): Promise<Porch[]> {
      const result = await pool.query<Porch>(
        `SELECT * FROM porches WHERE event_id = $1 ORDER BY address`,
        [eventId]
      );
      return result.rows;
    },

    async create(data: Partial<Porch>): Promise<Porch> {
      const result = await pool.query<Porch>(
        `INSERT INTO porches (
          event_id, owner_name, email, address, city, lat, lng,
          capacity, has_power, parking_notes, accessibility_notes,
          status, admin_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          data.event_id,
          data.owner_name,
          data.email,
          data.address,
          data.city,
          data.lat || null,
          data.lng || null,
          data.capacity || null,
          data.has_power || false,
          data.parking_notes || null,
          data.accessibility_notes || null,
          data.status || "pending",
          data.admin_notes || null,
        ]
      );
      return result.rows[0];
    },

    async updateStatus(
      id: number | string,
      status: string,
      adminNotes?: string | null
    ): Promise<Porch | null> {
      const result = await pool.query<Porch>(
        `UPDATE porches SET status = $1, admin_notes = $2 WHERE id = $3 RETURNING *`,
        [status, adminNotes || null, id]
      );
      return result.rows[0] || null;
    },
  },

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------
  events: {
    async findAll(): Promise<Event[]> {
      const result = await pool.query<Event>(
        "SELECT * FROM events ORDER BY date"
      );
      return result.rows;
    },

    async findActive(): Promise<Event | null> {
      const result = await pool.query<Event>(
        "SELECT * FROM events WHERE is_active = true LIMIT 1"
      );
      return result.rows[0] || null;
    },

    async findActiveByOrganizationId(organizationId: number | string): Promise<Event | null> {
      const result = await pool.query<Event>(
        "SELECT * FROM events WHERE organization_id = $1 AND is_active = true LIMIT 1",
        [organizationId]
      );
      return result.rows[0] || null;
    },

    async findById(id: number | string): Promise<Event | null> {
      const result = await pool.query<Event>(
        "SELECT * FROM events WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    },

    async findByOrganizationId(organizationId: number | string): Promise<Event[]> {
      const result = await pool.query<Event>(
        "SELECT * FROM events WHERE organization_id = $1 ORDER BY date DESC",
        [organizationId]
      );
      return result.rows;
    },

    async create(data: Partial<Event>): Promise<Event> {
      const isActive = data.is_active ?? true;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (isActive && data.organization_id) {
          await client.query(
            "UPDATE events SET is_active = false WHERE organization_id = $1 AND is_active = true",
            [data.organization_id]
          );
        }
        const result = await client.query<Event>(
          `INSERT INTO events (organization_id, name, date, start_time, end_time, description, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            data.organization_id,
            data.name,
            data.date,
            data.start_time || "12:00",
            data.end_time || "18:00",
            data.description || null,
            isActive,
          ]
        );
        await client.query("COMMIT");
        return result.rows[0];
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async update(id: number | string, data: Partial<Event>): Promise<Event | null> {
      const setClauses: string[] = [];
      const values: (string | number | boolean | string[] | null)[] = [];
      let paramIndex = 1;

      if (data.organization_id !== undefined) {
        setClauses.push(`organization_id = $${paramIndex++}`);
        values.push(data.organization_id);
      }
      if (data.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.date !== undefined) {
        setClauses.push(`date = $${paramIndex++}`);
        values.push(data.date);
      }
      if (data.start_time !== undefined) {
        setClauses.push(`start_time = $${paramIndex++}`);
        values.push(data.start_time);
      }
      if (data.end_time !== undefined) {
        setClauses.push(`end_time = $${paramIndex++}`);
        values.push(data.end_time);
      }
      if (data.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.band_applications_open !== undefined) {
        setClauses.push(`band_applications_open = $${paramIndex++}`);
        values.push(data.band_applications_open);
      }
      if (data.band_applications_close !== undefined) {
        setClauses.push(`band_applications_close = $${paramIndex++}`);
        values.push(data.band_applications_close);
      }
      if (data.porch_applications_open !== undefined) {
        setClauses.push(`porch_applications_open = $${paramIndex++}`);
        values.push(data.porch_applications_open);
      }
      if (data.porch_applications_close !== undefined) {
        setClauses.push(`porch_applications_close = $${paramIndex++}`);
        values.push(data.porch_applications_close);
      }
      if (data.reviewer_emails !== undefined) {
        setClauses.push(`reviewer_emails = $${paramIndex++}`);
        values.push(data.reviewer_emails);
      }
      if (data.reviewers_assigned !== undefined) {
        setClauses.push(`reviewers_assigned = $${paramIndex++}`);
        values.push(data.reviewers_assigned);
      }
      if (data.is_active !== undefined) {
        setClauses.push(`is_active = $${paramIndex++}`);
        values.push(data.is_active);
      }

      if (setClauses.length === 0) return this.findById(id);

      // When setting is_active = true, deactivate other events for the same org first
      if (data.is_active === true) {
        const event = await this.findById(id);
        if (event) {
          await pool.query(
            "UPDATE events SET is_active = false WHERE organization_id = $1 AND id != $2 AND is_active = true",
            [event.organization_id, id]
          );
        }
      }

      values.push(id);
      const result = await pool.query<Event>(
        `UPDATE events SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      return result.rows[0] || null;
    },
  },

  // ---------------------------------------------------------------------------
  // TIME SLOTS
  // ---------------------------------------------------------------------------
  timeSlots: {
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
  },

  // ---------------------------------------------------------------------------
  // TASKS
  // ---------------------------------------------------------------------------
  tasks: {
    async findByOrganizationId(organizationId: number | string): Promise<Task[]> {
      const result = await pool.query<Task>(
        "SELECT * FROM tasks WHERE organization_id = $1 ORDER BY name",
        [organizationId]
      );
      return result.rows;
    },

    async findById(id: number | string): Promise<Task | null> {
      const result = await pool.query<Task>(
        "SELECT * FROM tasks WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    },

    async create(data: {
      organization_id: number | string;
      name: string;
      recurring?: boolean;
    }): Promise<Task> {
      const result = await pool.query<Task>(
        `INSERT INTO tasks (organization_id, name, recurring)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.organization_id, data.name, data.recurring ?? false]
      );
      return result.rows[0];
    },

    async update(
      id: number | string,
      data: { name?: string; recurring?: boolean }
    ): Promise<Task | null> {
      const setClauses: string[] = [];
      const values: (string | boolean | number)[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.recurring !== undefined) {
        setClauses.push(`recurring = $${paramIndex++}`);
        values.push(data.recurring);
      }

      if (setClauses.length === 0) return this.findById(id);

      values.push(id as number);
      const result = await pool.query<Task>(
        `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      return result.rows[0] || null;
    },

    async delete(id: number | string): Promise<boolean> {
      const result = await pool.query(
        "DELETE FROM tasks WHERE id = $1",
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    },
  },

  // ---------------------------------------------------------------------------
  // EVENT TASKS
  // ---------------------------------------------------------------------------
  eventTasks: {
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
  },

  // ---------------------------------------------------------------------------
  // TASK CONTACTS
  // ---------------------------------------------------------------------------
  taskContacts: {
    async findByEventTaskId(eventTaskId: number | string): Promise<TaskContact[]> {
      const result = await pool.query<TaskContact>(
        "SELECT * FROM task_contacts WHERE event_task_id = $1 ORDER BY name",
        [eventTaskId]
      );
      return result.rows;
    },

    async create(data: {
      event_task_id: number | string;
      name: string;
      email?: string | null;
      phone?: string | null;
      business?: string | null;
      notes?: string | null;
    }): Promise<TaskContact> {
      const result = await pool.query<TaskContact>(
        `INSERT INTO task_contacts (event_task_id, name, email, phone, business, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.event_task_id,
          data.name,
          data.email || null,
          data.phone || null,
          data.business || null,
          data.notes || null,
        ]
      );
      return result.rows[0];
    },

    async update(
      id: number | string,
      data: {
        name?: string;
        email?: string | null;
        phone?: string | null;
        business?: string | null;
        notes?: string | null;
      }
    ): Promise<TaskContact | null> {
      const setClauses: string[] = [];
      const values: (string | null | number)[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.email !== undefined) {
        setClauses.push(`email = $${paramIndex++}`);
        values.push(data.email ?? null);
      }
      if (data.phone !== undefined) {
        setClauses.push(`phone = $${paramIndex++}`);
        values.push(data.phone ?? null);
      }
      if (data.business !== undefined) {
        setClauses.push(`business = $${paramIndex++}`);
        values.push(data.business ?? null);
      }
      if (data.notes !== undefined) {
        setClauses.push(`notes = $${paramIndex++}`);
        values.push(data.notes ?? null);
      }

      if (setClauses.length === 0) return null;

      values.push(id as number);
      const result = await pool.query<TaskContact>(
        `UPDATE task_contacts SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      return result.rows[0] || null;
    },

    async delete(id: number | string): Promise<boolean> {
      const result = await pool.query(
        "DELETE FROM task_contacts WHERE id = $1",
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    },
  },

  // ---------------------------------------------------------------------------
  // BAND MAGIC TOKENS
  // ---------------------------------------------------------------------------
  bandMagicTokens: {
    async create(bandId: number, token: string, expiresAt: Date): Promise<BandMagicToken> {
      const result = await pool.query<BandMagicToken>(
        `INSERT INTO band_magic_tokens (band_id, token, expires_at)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [bandId, token, expiresAt]
      );
      return result.rows[0];
    },

    async findByToken(token: string): Promise<BandMagicToken | null> {
      const result = await pool.query<BandMagicToken>(
        "SELECT * FROM band_magic_tokens WHERE token = $1",
        [token]
      );
      return result.rows[0] || null;
    },

    async markUsed(token: string): Promise<void> {
      await pool.query(
        "UPDATE band_magic_tokens SET used_at = NOW() WHERE token = $1",
        [token]
      );
    },
  },
};

// Initialize database connection test
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Database connection test successful:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    return false;
  }
}
