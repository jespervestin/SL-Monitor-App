import { useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'pendeltag-theme';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Default to light mode
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored || 'light';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
}
