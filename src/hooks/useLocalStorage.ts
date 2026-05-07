import { useState, useEffect, Dispatch, SetStateAction } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const persistedValue = localStorage.getItem(key);
      return persistedValue ? JSON.parse(persistedValue) : defaultValue;
    } catch (error) {
      console.error(`Error loading state from localStorage for key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}
