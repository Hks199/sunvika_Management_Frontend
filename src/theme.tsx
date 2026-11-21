import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';
const key = 'sunvika-appearance';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Use the device setting if storage is unavailable. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(key, next); } catch { /* Keep the selection for this session. */ }
  }
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>;
}
