import { useEffect } from 'react';
import { useLocalStorage } from './use-local-storage';

type Theme = 'light' | 'dark' | 'system';

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'system');

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return [theme, setTheme];
}
