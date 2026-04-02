import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BaseEntity {
  id: string;
}

type FieldMapper<T> = {
  toDb: (item: Partial<T>) => Record<string, any>;
  fromDb: (row: Record<string, any>) => T;
};

interface UseSupabaseTableOptions<T> {
  table: string;
  mapper: FieldMapper<T>;
  defaultData?: T[];
  orderBy?: string;
}

export function useSupabaseTable<T extends BaseEntity>({
  table,
  mapper,
  defaultData = [],
  orderBy = "created_at",
}: UseSupabaseTableOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from(table as any) as any)
        .select("*")
        .order(orderBy, { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setItems(data.map((row: any) => mapper.fromDb(row)));
      } else {
        setItems(defaultData);
      }
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(table);
        if (stored) setItems(JSON.parse(stored));
        else setItems(defaultData);
      } catch {
        setItems(defaultData);
      }
    } finally {
      setLoading(false);
    }
  }, [table, orderBy]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (item: Omit<T, "id">) => {
    const dbRow = mapper.toDb(item as Partial<T>);
    try {
      const { data, error } = await (supabase.from(table as any) as any)
        .insert(dbRow)
        .select()
        .single();

      if (error) throw error;
      const newItem = mapper.fromDb(data);
      setItems(prev => [...prev, newItem]);
      return newItem;
    } catch (err: any) {
      console.error(`Error adding to ${table}:`, err);
      toast.error("Erro ao salvar", { description: err.message });
      // Fallback: add locally
      const localItem = { ...item, id: crypto.randomUUID() } as T;
      setItems(prev => [...prev, localItem]);
      return localItem;
    }
  }, [table, mapper]);

  const updateItem = useCallback(async (id: string, updates: Partial<T>) => {
    const dbUpdates = mapper.toDb(updates);
    try {
      const { error } = await (supabase.from(table as any) as any)
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    } catch (err: any) {
      console.error(`Error updating ${table}:`, err);
      toast.error("Erro ao atualizar", { description: err.message });
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    }
  }, [table, mapper]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error } = await (supabase.from(table as any) as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      console.error(`Error deleting from ${table}:`, err);
      toast.error("Erro ao excluir", { description: err.message });
      setItems(prev => prev.filter(item => item.id !== id));
    }
  }, [table]);

  return { items, loading, addItem, updateItem, deleteItem, refetch: fetchItems };
}
