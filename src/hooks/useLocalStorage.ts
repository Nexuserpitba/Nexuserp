import { useState, useCallback } from "react";

export interface BaseEntity {
  id: string;
}

function getStoredData<T>(key: string, defaultData: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    // Persist default data so other pages can read it
    if (defaultData.length > 0) {
      localStorage.setItem(key, JSON.stringify(defaultData));
    }
    return defaultData;
  } catch {
    return defaultData;
  }
}

function saveData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useLocalStorage<T extends BaseEntity>(key: string, defaultData: T[]) {
  const [items, setItems] = useState<T[]>(() => getStoredData(key, defaultData));

  const addItem = useCallback((item: Omit<T, "id">) => {
    const newItem = { ...item, id: crypto.randomUUID() } as T;
    setItems(prev => {
      const updated = [...prev, newItem];
      saveData(key, updated);
      return updated;
    });
  }, [key]);

  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    setItems(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      saveData(key, updated);
      return updated;
    });
  }, [key]);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveData(key, updated);
      return updated;
    });
  }, [key]);

  return { items, addItem, updateItem, deleteItem };
}
