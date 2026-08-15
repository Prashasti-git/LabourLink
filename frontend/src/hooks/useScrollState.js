import { useEffect, useState } from 'react';

export function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  useEffect(() => {
    const update = () => { setScrolled(window.scrollY > 10); setShowBackTop(window.scrollY > 400); };
    update(); window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return { scrolled, showBackTop };
}
