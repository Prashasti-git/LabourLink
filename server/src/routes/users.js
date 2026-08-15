import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";

const router = Router();
const SALT_ROUNDS = 10;

// POST /api/users/register
router.post("/register", async (req, res) => {
  const {
    name, phone, email, password, role, city,
    skills, daily_rate, experience_years,
  } = req.body;

  if (!name || !phone || !password || !role) {
    return res.status(400).json({ error: "name, phone, password, and role are required" });
  }
  if (!["worker", "hirer"].includes(role)) {
    return res.status(400).json({ error: "role must be 'worker' or 'hirer'" });
  }

  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (name, phone, email, password_hash, role, city)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, phone, email, role, city`,
      [name, phone, email, password_hash, role, city]
    );

    const user = result.rows[0];

    if (role === "worker") {
      // skills arrives from the frontend as a comma-separated string,
      // e.g. "Electrician, Wiring" - split it into a real array here.
      const skillsArray = (skills || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await pool.query(
        `INSERT INTO worker_profiles (user_id, skills, daily_rate, experience_years)
         VALUES ($1, $2, $3, $4)`,
        [user.id, skillsArray, daily_rate || null, experience_years || 0]
      );
    } else {
      await pool.query("INSERT INTO hirer_profiles (user_id) VALUES ($1)", [user.id]);
    }

    res.status(201).json(user);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Phone or email already registered" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// GET /api/users/workers?skill=&city=
router.get("/workers", async (req, res) => {
  const { skill, city } = req.query;
  const conditions = ["u.role = 'worker'"];
  const values = [];

  if (skill) {
    values.push(skill);
    conditions.push(`$${values.length} = ANY(wp.skills)`);
  }
  if (city) {
    values.push(`%${city}%`);
    conditions.push(`u.city ILIKE $${values.length}`);
  }

  const query = `
    SELECT u.id, u.name, u.city, wp.skills, wp.experience_years, wp.daily_rate, wp.available
    FROM users u
    JOIN worker_profiles wp ON wp.user_id = u.id
    WHERE ${conditions.join(" AND ")}
  `;

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch workers" });
  }
});

// POST /api/users/login
router.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: "phone and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, phone, email, role, city, password_hash FROM users WHERE phone = $1",
      [phone]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid phone or password" });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: "Invalid phone or password" });
    }

    delete user.password_hash;
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to log in" });
  }
});
// GET /api/users/:id - basic profile lookup (no auth check yet - Phase 1 level)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.city, u.created_at,
              wp.skills, wp.experience_years, wp.daily_rate, wp.available,
              hp.organization_name
       FROM users u
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN hirer_profiles hp ON hp.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});
export default router;
