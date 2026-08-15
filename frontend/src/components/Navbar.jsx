import { Link, useNavigate } from 'react-router-dom';
import { clearCurrentUser } from '../auth';

export default function Navbar({ scrolled, menuOpen, setMenuOpen, currentUser, onLogout, notify }) {
  const navigate = useNavigate();
  const go = (path) => { navigate(path); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const items = currentUser
    ? [{ label: 'For Workers', path: '/workers' }, { label: 'For Hirers', path: '/hirers' }, { label: 'My Profile', path: '/profile' }]
    : [{ label: 'For Workers', path: '/workers' }, { label: 'For Hirers', path: '/hirers' }, { label: 'Login', path: '/login' }];
  const logout = () => {
    clearCurrentUser();
    onLogout();
    notify('Logged out', 'You have been logged out.');
    go('/');
  };
  return <>
    <header className={scrolled ? 'scrolled' : ''}><Link className="logo" to="/">LabourLink</Link><nav>{items.map((item) => <button key={item.path} onClick={() => go(item.path)}>{item.label}</button>)}{currentUser ? <button className="nav-cta" onClick={logout}>Log Out</button> : <button className="nav-cta" onClick={() => go('/register')}>Get Started</button>}</nav>
      <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}><span /><span /><span /></button>
    </header>
    <div className={`mobile-nav ${menuOpen ? 'open' : ''}`} onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}><div className="mobile-nav-inner">{items.map((item) => <button key={item.path} onClick={() => go(item.path)}>{item.label}</button>)}{currentUser ? <button className="mob-cta" onClick={logout}>Log Out</button> : <button className="mob-cta" onClick={() => go('/register')}>Get Started</button>}</div></div>
  </>;
}
