import { pool } from "./pool.js";
import type { Organization } from "./types.js";

export const organizations = {
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
};
