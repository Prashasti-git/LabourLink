import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { registerUser } from '../api';
import { loginUser } from '../api';

export default function RegistrationPage({ notify, currentUser, onLogin }) {
  const { type } = useParams();
  const navigate = useNavigate();
  const isWorker = type !== 'hirers' && type !== 'login';
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', city: '',
    role: type === 'hirers' ? 'hirer' : 'worker',
    skills: '', daily_rate: '', experience_years: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) navigate('/profile', { replace: true });
  }, [currentUser, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    if (type === 'login') {
      if (!form.phone || !form.password) {
        return notify('Notice', 'Enter phone and password.');
      }
      setSubmitting(true);
      try {
        const user = await loginUser({ phone: form.phone, password: form.password });
        onLogin(user);
        notify('Success', `Welcome back, ${user.name}!`);
        navigate('/profile');
      } catch (err) {
        notify('Error', err.message || 'Login failed.');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!form.name || !form.phone || !form.password) {
      return notify('Notice', 'Please complete all required fields.');
    }
    setSubmitting(true);
    try {
      const user = await registerUser(form);
      onLogin(user);
      notify('Success', 'Your account has been created!');
      navigate('/profile');
    } catch (err) {
      notify('Error', err.message || 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (currentUser) return null;

  const title = type === 'login' ? 'Welcome back'
    : type === 'hirers' ? 'Hire trusted workers'
    : type === 'workers' ? 'Find work that fits you'
    : 'Create your account';

  return (
    <main className="form-page">
      <section className="form-card">
        <Link className="logo" to="/">LabourLink</Link>
        <span className="section-label">{type === 'login' ? 'Login' : 'Get Started'}</span>
        <h1>{title}</h1>
        <p>Join India's trusted workforce platform in just a few minutes.</p>
        <form onSubmit={submit}>
          <label>Full name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>Email address
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>Phone number
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </label>
          <label>Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <label>City
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          {type !== 'login' && (
            <label>I want to join as
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="worker">Worker</option>
                <option value="hirer">Hirer</option>
              </select>
            </label>
          )}
          {form.role === 'worker' && type !== 'login' && (
            <>
              <label>Skills (comma-separated, e.g. Electrician, Wiring)
                <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Electrician, Wiring" />
              </label>
              <label>Daily rate (₹)
                <input type="number" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} placeholder="1200" />
              </label>
              <label>Years of experience
                <input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} placeholder="5" />
              </label>
            </>
          )}
          <button className="btn-worker" disabled={submitting}>
            {submitting ? 'Please wait\u2026' : type === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </section>
    </main>
  );
}
