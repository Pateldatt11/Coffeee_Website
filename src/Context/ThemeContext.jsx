import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

// Reads any previously saved preference; defaults to 'dark' so existing
// visitors see exactly the same site they always have until they
// deliberately switch — nothing changes for them on first load.
const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('brewhaven-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  // Sets data-theme="light" | "dark" on <html>, which every CSS file's
  // [data-theme="light"] override block below keys off of. Also persists
  // the choice so a refresh (or a later visit) remembers it.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('brewhaven-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};