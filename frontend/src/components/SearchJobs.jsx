import { useState } from 'react';
import { fetchJobs } from '../api';

const skills = [['Electrician', ''], ['Plumber', ''], ['Carpenter', ''], ['Welder', 'teal'], ['Driver', 'teal'], ['Mason', 'teal'], ['Painter', ''], ['Security Guard', '']];

export default function SearchJobs({ notify }) {
  const [skill, setSkill] = useState('');
  const [location, setLocation] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (event) => {
    event.preventDefault();
    if (!skill.trim() && !location.trim()) return notify('Notice', 'Enter a skill or location to search.');
    setLoading(true);
    try {
      const jobs = await fetchJobs({ skill, city: location, workerId });
      setResults(jobs);
      notify('Search', jobs.length ? `Found ${jobs.length} job(s).` : 'No matching jobs found yet.');
    } catch (err) {
      notify('Error', err.message || 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="search-section">
      <div className="section-inner">
        <SectionHead label="Find Work" title="Search Jobs Near You" text="Thousands of verified job opportunities across India. Search by skill, location, or category." centered />
        <form className="search-box reveal" onSubmit={search}>
          <div className="search-bar">
            <label className="search-input-wrap">
              <span className="search-input-label">Skill</span>
              <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Job title or skill (e.g. Electrician)" />
            </label>
            <label className="search-input-wrap">
              <span className="search-input-label">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or area (e.g. Delhi)" />
            </label>
            <button className="search-btn" disabled={loading}>{loading ? 'Searching…' : 'Search Jobs'}</button>
          </div>

          {/* Temporary until real login/sessions exist - lets a worker see
              personalized match scores by entering their own user id. */}
          <label className="search-input-wrap worker-id-field">
            <span className="search-input-label">Your Worker ID (optional, for match scores)</span>
            <input value={workerId} onChange={(e) => setWorkerId(e.target.value)} placeholder="e.g. 2" style={{ maxWidth: 200 }} />
          </label>

          <div className="job-tags">
            {skills.map(([name, tone]) => (
              <button type="button" className={`job-tag ${tone}`} onClick={() => { setSkill(name); notify('Search', `Set to: ${name}. Add a city and search!`); }} key={name}>{name}</button>
            ))}
          </div>
        </form>

        {results && (
          <ul className="job-results">
            {results.length === 0 && <li>No open jobs matched your search yet — check back soon.</li>}
            {results.map((job) => (
              <li key={job.id}>
                {job.match_score !== undefined && (
                  <span className="match-badge">{job.match_score}% Match</span>
                )}
                <strong>{job.title}</strong> — {job.skill_required} in {job.location} (₹{job.budget}/day)
                {job.match_reasons && job.match_reasons.length > 0 && (
                  <ul className="match-reasons">
                    {job.match_reasons.map((r) => <li key={r}>{r}</li>)}
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

export function SectionHead({ label, title, text, centered = false }) {
  return (
    <div className={`reveal section-head ${centered ? 'centered' : ''}`}>
      <span className="section-label">{label}</span>
      <h2 className="section-title">{title}</h2>
      <p className="section-sub">{text}</p>
    </div>
  );
}
