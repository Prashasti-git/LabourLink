import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db/pool.js";
import jobsRouter from "./routes/jobs.js";
import usersRouter from "./routes/users.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check - hits the DB so you know both the server AND Postgres are alive
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", database: "disconnected", details: err.message });
  }
});

app.use("/api/jobs", jobsRouter);
app.use("/api/users", usersRouter);

app.listen(PORT, () => {
  console.log(`LabourLink server running on http://localhost:${PORT}`);
});
