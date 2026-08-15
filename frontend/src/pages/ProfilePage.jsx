import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearCurrentUser } from '../auth';
import { fetchUserProfile } from '../api';

export default function ProfilePage({ notify, currentUser, onProfileLoad, onLogout }) {
  const navigate = useNavigate();
  const currentUserId = currentUser?.id;
  const [profile, setProfile] = useState(currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchUserProfile(currentUserId)
      .then((user) => {
        setProfile(user);
        onProfileLoad(user);
      })
      .catch(() => notify('Error', 'Could not load your profile.'))
      .finally(() => setLoading(false));
  }, [currentUserId, navigate, notify, onProfileLoad]);

  const logout = () => {
    clearCurrentUser();
    onLogout();
    notify('Logged out', 'You have been logged out.');
    navigate('/');
  };

  if (!currentUser) return null;

  const user = profile || currentUser;
  const initials = (user.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const roleLabel = user.role === 'worker' ? 'Worker' : 'Hirer';

  return (
    <main className="profile-page">
      <section className="profile-shell">
        <div className="profile-topbar">
          <Link className="logo" to="/">LabourLink</Link>
          <span className="profile-status"><i /> Account active</span>
        </div>

        <div className="profile-hero">
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <div className="profile-intro">
            <span className="section-label">My Profile</span>
            <h1>{user.name}</h1>
            <p>{roleLabel} account · {user.city || 'Location not added'}</p>
          </div>
          <div className="profile-role-badge">{roleLabel}</div>
        </div>

        {loading ? <div className="profile-loading">Loading your profile…</div> : (
          <div className="profile-content">
            <section className="profile-card profile-contact-card">
              <div className="profile-card-heading"><span className="profile-card-icon">⌁</span><div><h2>Contact details</h2><p>Your account information</p></div></div>
              <div className="profile-details">
                <div><span>Phone number</span><strong>{user.phone}</strong></div>
                <div><span>Email address</span><strong>{user.email || 'Not added yet'}</strong></div>
                <div><span>City</span><strong>{user.city || 'Not added yet'}</strong></div>
                <div><span>Account ID</span><strong>#{user.id}</strong></div>
              </div>
            </section>

            {user.role === 'worker' ? (
              <section className="profile-card profile-work-card">
                <div className="profile-card-heading"><span className="profile-card-icon">✦</span><div><h2>Work profile</h2><p>The details hirers use to find you</p></div></div>
                <div className="profile-stats">
                  <div><span>Experience</span><strong>{user.experience_years || 0}<small> years</small></strong></div>
                  <div><span>Daily rate</span><strong>{user.daily_rate ? `₹${user.daily_rate}` : '—'}</strong></div>
                </div>
                <div className="profile-skills"><span>Skills</span><div>{(user.skills || []).length ? user.skills.map((skill) => <em key={skill}>{skill}</em>) : <p>Add your skills to help hirers discover you.</p>}</div></div>
              </section>
            ) : (
              <section className="profile-card profile-work-card">
                <div className="profile-card-heading"><span className="profile-card-icon">✦</span><div><h2>Hiring profile</h2><p>Details for posting and managing jobs</p></div></div>
                <div className="profile-details profile-single-detail"><div><span>Organisation</span><strong>{user.organization_name || 'Not added yet'}</strong></div></div>
              </section>
            )}
          </div>
        )}

        <div className="profile-actions">
          <p>Your information is linked to the account currently signed in.</p>
          <button className="profile-logout" onClick={logout}>Log Out</button>
        </div>
      </section>
    </main>
  );
}
