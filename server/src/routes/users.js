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

// Same rule-based approach as job match scoring, mirrored for the
// hirer's side: given a job, score how well each worker fits it.
function computeWorkerMatchScore(worker, job) {
  const reasons = [];

  const workerSkills = (worker.skills || []).map((s) => s.toLowerCase());
  const jobSkill = (job.skill_required || "").toLowerCase();
  let skillScore = 0;
  if (workerSkills.includes(jobSkill)) {
    skillScore = 100;
    reasons.push(`Has the skill: ${job.skill_required}`);
  } else if (workerSkills.some((s) => jobSkill.includes(s) || s.includes(jobSkill))) {
    skillScore = 50;
    reasons.push("Related skill match");
  }

  let locationScore = 20;
  if (worker.city && job.location && worker.city.toLowerCase() === job.location.toLowerCase()) {
    locationScore = 100;
    reasons.push(`Based in ${job.location}`);
  }

  let rateScore = 40;
  if (worker.daily_rate && job.budget) {
    const ratio = Number(worker.daily_rate) / Number(job.budget);
    if (ratio <= 1) {
      rateScore = 100;
      reasons.push("Within your budget");
    } else if (ratio <= 1.2) {
      rateScore = 60;
    }
  }

  let experienceScore = 50;
  if (worker.experience_years >= 5) {
    experienceScore = 100;
    reasons.push(`${worker.experience_years}+ years experience`);
  } else if (worker.experience_years >= 2) {
    experienceScore = 75;
  }

  const score = Math.round(
    skillScore * 0.4 + locationScore * 0.25 + rateScore * 0.2 + experienceScore * 0.15
  );
  return { score, reasons };
}

// GET /api/users/workers?skill=&city=&job_id=
// job_id is optional - when present, results are scored+sorted against
// that specific job instead of just filtered.
router.get("/workers", async (req, res) => {
  const { skill, city, job_id } = req.query;
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
    let workers = result.rows;

    if (job_id) {
      const jobResult = await pool.query("SELECT * FROM jobs WHERE id = $1", [job_id]);
      const job = jobResult.rows[0];

      if (job) {
        workers = workers
          .map((worker) => {
            const { score, reasons } = computeWorkerMatchScore(worker, job);
            return { ...worker, match_score: score, match_reasons: reasons };
          })
          .sort((a, b) => b.match_score - a.match_score);
      }
    }

    res.json(workers);
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

    // Profile completeness score - simple weighted checklist, not ML.
    // Encourages workers/hirers to fill out their profile fully, which
    // also happens to be exactly the data the match-score features need.
    const suggestions = [];
    let completeness = 0;

    if (user.role === "worker") {
      if (user.skills && user.skills.length > 0) completeness += 30; else suggestions.push("Add your skills");
      if (user.experience_years > 0) completeness += 20; else suggestions.push("Add years of experience");
      if (user.daily_rate) completeness += 20; else suggestions.push("Add your daily rate");
      if (user.city) completeness += 15; else suggestions.push("Add your city");
      if (user.email) completeness += 15; else suggestions.push("Add an email address");
    } else {
      if (user.organization_name) completeness += 50; else suggestions.push("Add your organization name");
      if (user.city) completeness += 30; else suggestions.push("Add your city");
      if (user.email) completeness += 20; else suggestions.push("Add an email address");
    }

    user.profile_completeness = completeness;
    user.profile_suggestions = suggestions;

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});
export default router;
