'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';

interface ThemeCtx {
  theme: Theme;
  resolvedTheme: Resolved;
  setTheme(t: Theme): void;
}

const Ctx = createContext<ThemeCtx>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<Resolved>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = (t: Theme) => {
      const r: Resolved = t === 'system' ? (mq.matches ? 'dark' : 'light') : t;
      setResolved(r);
      document.documentElement.classList.toggle('dark', r === 'dark');
    };

    apply(theme);

    if (theme !== 'system') return;

    const listener = () => apply('system');
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem('theme', t);
    setThemeState(t);
  };

  return (
    <Ctx.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      {children}
    </Ctx.Provider>
  );
}
