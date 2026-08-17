import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyJobs, fetchWorkers } from '../api';

export default function FindWorkersPage({ notify, currentUser }) {
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [skill, setSkill] = useState('');
  const [city, setCity] = useState('');
  const [workers, setWorkers] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'hirer') {
      fetchMyJobs(currentUser.id).then(setMyJobs).catch(() => {});
    }
  }, [currentUser]);

  const search = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const results = await fetchWorkers({ skill, city, jobId: selectedJobId || undefined });
      setWorkers(results);
      notify('Search', results.length ? `Found ${results.length} worker(s).` : 'No matching workers found yet.');
    } catch (err) {
      notify('Error', err.message || 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.role !== 'hirer') {
    return (
      <main className="form-page">
        <section className="form-card">
          <Link className="logo" to="/">LabourLink</Link>
          <h1>Find Workers</h1>
          <p>This page is for hirer accounts. Log in as a hirer to see matched workers for your jobs.</p>
        </section>
      </main>
    );
  }

  return (
    <section className="search-section">
      <div className="section-inner">
        <div className="reveal section-head centered">
          <span className="section-label">For Hirers</span>
          <h2 className="section-title">Find Matched Workers</h2>
          <p className="section-sub">Pick one of your posted jobs to see workers ranked by fit, or search freely by skill and city.</p>
        </div>

        <form className="search-box reveal" onSubmit={search}>
          <div className="search-bar">
            <label className="search-input-wrap">
              <span className="search-input-label">Match against your job (optional)</span>
              <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                <option value="">— No specific job, just filter —</option>
                {myJobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title} ({job.skill_required})</option>
                ))}
              </select>
            </label>
            <button className="search-btn" disabled={loading}>{loading ? 'Searching…' : 'Find Workers'}</button>
          </div>
          <div className="search-bar">
            <label className="search-input-wrap">
              <span className="search-input-label">Skill</span>
              <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. Electrician" />
            </label>
            <label className="search-input-wrap">
              <span className="search-input-label">City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Delhi" />
            </label>
          </div>
        </form>

        {workers && (
          <ul className="job-results">
            {workers.length === 0 && <li>No workers matched yet — check back as more register.</li>}
            {workers.map((worker) => (
              <li key={worker.id}>
                {worker.match_score !== undefined && (
                  <span className="match-badge">{worker.match_score}% Match</span>
                )}
                <strong>{worker.name}</strong> — {(worker.skills || []).join(', ') || 'No skills listed'} in {worker.city || 'unknown city'}
                {worker.daily_rate && <> · ₹{worker.daily_rate}/day</>}
                {worker.match_reasons && worker.match_reasons.length > 0 && (
                  <ul className="match-reasons">
                    {worker.match_reasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
