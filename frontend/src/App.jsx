import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Toast from './components/Toast';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import ProfilePage from './pages/ProfilePage';
import FindWorkersPage from './pages/FindWorkersPage';
import InfoPage from './pages/InfoPage';
import { useScrollState } from './hooks/useScrollState';
import { useReveal } from './hooks/useReveal';
import { getCurrentUser, setCurrentUser } from './auth';

export default function App() {
  const { scrolled, showBackTop } = useScrollState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUserState] = useState(getCurrentUser);
  const location = useLocation();

  useReveal();
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = useCallback((icon, message) => setToast({ icon, message }), []);
  const updateCurrentUser = useCallback((user) => {
    setCurrentUser(user);
    setCurrentUserState(user);
  }, []);
  const clearSession = useCallback(() => setCurrentUserState(null), []);

  return <>
    <Navbar
      scrolled={scrolled}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      currentUser={currentUser}
      onLogout={clearSession}
      notify={notify}
    />
    <Routes>
      <Route path="/" element={<HomePage notify={notify} />} />
      <Route path="/:type" element={<RegistrationPage notify={notify} currentUser={currentUser} onLogin={updateCurrentUser} />} />
      <Route path="/about" element={<InfoPage />} />
      <Route path="/profile" element={<ProfilePage notify={notify} currentUser={currentUser} onProfileLoad={updateCurrentUser} onLogout={clearSession} />} />
      <Route path="/find-workers" element={<FindWorkersPage notify={notify} currentUser={currentUser} />} />
      <Route path="/support" element={<InfoPage />} />
      <Route path="/privacy" element={<InfoPage />} />
      <Route path="/terms" element={<InfoPage />} />
      <Route path="/cookies" element={<InfoPage />} />
    </Routes>
    <Footer />
    <button className={`back-top ${showBackTop ? 'visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">↑</button>
    <Toast toast={toast} />
  </>;
}
