import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Rule-based match score (Phase 2 "AI-lite" - not real ML yet).
// Weighted: skill match 50%, location match 30%, budget attractiveness 20%.
// This is intentionally simple and transparent - it becomes a real ML
// recommendation model in Phase 4, once there's enough historical data
// (completed jobs, accepted applications) to actually train one.
function computeMatchScore(job, worker) {
  const reasons = [];

  const workerSkills = (worker.skills || []).map((s) => s.toLowerCase());
  const jobSkill = (job.skill_required || "").toLowerCase();
  let skillScore = 0;
  if (workerSkills.includes(jobSkill)) {
    skillScore = 100;
    reasons.push(`Matches your skill: ${job.skill_required}`);
  } else if (workerSkills.some((s) => jobSkill.includes(s) || s.includes(jobSkill))) {
    skillScore = 50;
    reasons.push("Related to your skills");
  }

  let locationScore = 20;
  if (worker.city && job.location && worker.city.toLowerCase() === job.location.toLowerCase()) {
    locationScore = 100;
    reasons.push(`In your city: ${job.location}`);
  }

  let budgetScore = 40;
  if (worker.daily_rate && job.budget) {
    const ratio = Number(job.budget) / Number(worker.daily_rate);
    if (ratio >= 1) {
      budgetScore = 100;
      reasons.push("Pays at or above your usual rate");
    } else if (ratio >= 0.8) {
      budgetScore = 70;
    }
  }

  const score = Math.round(skillScore * 0.5 + locationScore * 0.3 + budgetScore * 0.2);
  return { score, reasons };
}

// GET /api/jobs - list open jobs, optionally filtered by skill/city,
// optionally scored+sorted for a specific worker via ?worker_id=
router.get("/", async (req, res) => {
  const { skill, city, worker_id, hirer_id } = req.query;
  const conditions = ["status = 'open'"];
  const values = [];

  if (skill) {
    values.push(`%${skill}%`);
    conditions.push(`skill_required ILIKE $${values.length}`);
  }
  if (city) {
    values.push(`%${city}%`);
    conditions.push(`location ILIKE $${values.length}`);
  }
  if (hirer_id) {
    values.push(hirer_id);
    conditions.push(`hirer_id = $${values.length}`);
  }

  const query = `SELECT * FROM jobs WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;

  try {
    const result = await pool.query(query, values);
    let jobs = result.rows;

    if (worker_id) {
      const workerResult = await pool.query(
        `SELECT u.city, wp.skills, wp.daily_rate
         FROM users u JOIN worker_profiles wp ON wp.user_id = u.id
         WHERE u.id = $1 AND u.role = 'worker'`,
        [worker_id]
      );
      const worker = workerResult.rows[0];

      if (worker) {
        jobs = jobs
          .map((job) => {
            const { score, reasons } = computeMatchScore(job, worker);
            return { ...job, match_score: score, match_reasons: reasons };
          })
          .sort((a, b) => b.match_score - a.match_score);
      }
    }

    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// POST /api/jobs - create a new job (hirer only, in a real app this comes from auth)
router.post("/", async (req, res) => {
  const { hirer_id, title, description, skill_required, location, budget, urgency } = req.body;

  if (!hirer_id || !title || !skill_required) {
    return res.status(400).json({ error: "hirer_id, title, and skill_required are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO jobs (hirer_id, title, description, skill_required, location, budget, urgency)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [hirer_id, title, description, skill_required, location, budget, urgency || "medium"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create job" });
  }
});

// POST /api/jobs/:id/apply - a worker applies to a job
router.post("/:id/apply", async (req, res) => {
  const { id } = req.params;
  const { worker_id } = req.body;

  if (!worker_id) {
    return res.status(400).json({ error: "worker_id is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO applications (job_id, worker_id) VALUES ($1, $2)
       ON CONFLICT (job_id, worker_id) DO NOTHING RETURNING *`,
      [id, worker_id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: "Already applied to this job" });
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to apply" });
  }
});

export default router;
