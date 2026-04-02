import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ColumnConfig = {
  key: string;
  label: string;
  visible: boolean;
};

const LS_PREFIX = "col-prefs-";

function loadFromLocalStorage(pageKey: string): ColumnConfig[] | null {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${pageKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveToLocalStorage(pageKey: string, cols: ColumnConfig[]) {
  try { localStorage.setItem(`${LS_PREFIX}${pageKey}`, JSON.stringify(cols)); } catch {}
}

export function useColumnPreferences(pageKey: string, defaultColumns: ColumnConfig[]) {
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [loading, setLoading] = useState(true);
  const [useLocalOnly, setUseLocalOnly] = useState(false);

  useEffect(() => {
    if (!user) {
      // No user — try localStorage
      const saved = loadFromLocalStorage(pageKey);
      if (saved) {
        const merged = defaultColumns.map((col) => {
          const s = saved.find((c) => c.key === col.key);
          return s ? { ...col, visible: s.visible } : col;
        });
        setColumns(merged);
      } else {
        setColumns(defaultColumns);
      }
      setUseLocalOnly(true);
      setLoading(false);
      return;
    }

    async function loadPreferences() {
      try {
        const { data, error } = await (supabase as any)
          .from("user_column_preferences")
          .select("columns")
          .eq("user_id", user.id)
          .eq("page_key", pageKey)
          .single();

        if (error && (error.code === "42P01" || error.message?.includes("does not exist") || error.message?.includes("schema cache"))) {
          // Table doesn't exist — fallback to localStorage
          console.warn("Tabela user_column_preferences não encontrada, usando localStorage.");
          setUseLocalOnly(true);
          const saved = loadFromLocalStorage(pageKey);
          if (saved) {
            const merged = defaultColumns.map((col) => {
              const s = saved.find((c) => c.key === col.key);
              return s ? { ...col, visible: s.visible } : col;
            });
            setColumns(merged);
          } else {
            setColumns(defaultColumns);
          }
        } else if (error && error.code !== "PGRST116") {
          console.warn("Erro Supabase, usando localStorage:", error.message);
          setUseLocalOnly(true);
          const saved = loadFromLocalStorage(pageKey);
          if (saved) {
            const merged = defaultColumns.map((col) => {
              const s = saved.find((c) => c.key === col.key);
              return s ? { ...col, visible: s.visible } : col;
            });
            setColumns(merged);
          } else {
            setColumns(defaultColumns);
          }
        } else if (data?.columns) {
          const savedColumns = data.columns as ColumnConfig[];
          const merged = defaultColumns.map((col) => {
            const saved = savedColumns.find((c) => c.key === col.key);
            return saved ? { ...col, visible: saved.visible } : col;
          });
          setColumns(merged);
        } else {
          setColumns(defaultColumns);
        }
      } catch (err) {
        console.warn("Erro ao carregar preferências, usando localStorage:", err);
        setUseLocalOnly(true);
        const saved = loadFromLocalStorage(pageKey);
        if (saved) {
          const merged = defaultColumns.map((col) => {
            const s = saved.find((c) => c.key === col.key);
            return s ? { ...col, visible: s.visible } : col;
          });
          setColumns(merged);
        } else {
          setColumns(defaultColumns);
        }
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [user, pageKey, JSON.stringify(defaultColumns)]);

  const updateColumnVisibility = useCallback(
    async (key: string, visible: boolean) => {
      const newColumns = columns.map((col) =>
        col.key === key ? { ...col, visible } : col
      );
      setColumns(newColumns);
      saveToLocalStorage(pageKey, newColumns);

      if (!user || useLocalOnly) return;

      try {
        await (supabase as any).from("user_column_preferences").upsert(
          {
            user_id: user.id,
            page_key: pageKey,
            columns: newColumns,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,page_key" }
        );
      } catch (err) {
        console.warn("Salvo apenas em localStorage:", err);
      }
    },
    [columns, user, pageKey, useLocalOnly]
  );

  const toggleColumn = useCallback(
    (key: string) => {
      const col = columns.find((c) => c.key === key);
      if (col) {
        updateColumnVisibility(key, !col.visible);
      }
    },
    [columns, updateColumnVisibility]
  );

  const resetToDefault = useCallback(async () => {
    setColumns(defaultColumns);
    saveToLocalStorage(pageKey, defaultColumns);

    if (!user || useLocalOnly) return;

    try {
      await (supabase as any)
        .from("user_column_preferences")
        .delete()
        .eq("user_id", user.id)
        .eq("page_key", pageKey);
    } catch (err) {
      console.warn("Reset apenas em localStorage:", err);
    }
  }, [defaultColumns, user, pageKey, useLocalOnly]);

  const visibleColumns = columns.filter((col) => col.visible);

  return {
    columns,
    visibleColumns,
    loading,
    toggleColumn,
    updateColumnVisibility,
    resetToDefault,
  };
}
