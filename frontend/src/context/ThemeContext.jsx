import { createContext, useContext, useState, useEffect } from 'react';
import { getPref, setPref } from '../utils/storage';

const ThemeContext = createContext();

const STORAGE_KEY = 'theme';

function getInitialTheme() {
  const stored = getPref(STORAGE_KEY, null);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    setPref(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
