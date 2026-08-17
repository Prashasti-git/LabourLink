-- LabourLink schema - Phase 1 (core marketplace, no AI yet)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('worker', 'hirer')),
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  daily_rate NUMERIC,
  bio TEXT,
  available BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS hirer_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  organization_name TEXT,
  verified BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  hirer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  skill_required TEXT NOT NULL,
  location TEXT,
  budget NUMERIC,
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')) DEFAULT 'open',
  final_wage NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (job_id, worker_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_user INTEGER NOT NULL REFERENCES users(id),
  to_user INTEGER NOT NULL REFERENCES users(id),
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_logs (
  id SERIAL PRIMARY KEY,
  searched_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  search_type TEXT CHECK (search_type IN ('jobs', 'workers')) NOT NULL,
  skill TEXT,
  city TEXT,
  results_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Safe to re-run: adds final_wage to an existing jobs table without error
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS final_wage NUMERIC;
