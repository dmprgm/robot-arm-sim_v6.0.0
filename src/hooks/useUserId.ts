// src/hooks/useUserId.ts
import { useState, useEffect } from 'react';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useUserId(): string {
  const [userId, setUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem('userId');
    return stored || '';
  });

  useEffect(() => {
    if (!userId) {
      const newId = generateUUID();
      localStorage.setItem('userId', newId);
      setUserId(newId);
    }
  }, [userId]);

  return userId;
}
