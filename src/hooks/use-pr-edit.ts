import { useState } from "react";
import { format } from "date-fns";
import type { PersonalRecord } from "@/lib/types";

type EditState = {
  recordId: string | null;
  weight: number;
  date: string;
};

const DEFAULT_EDIT_STATE: EditState = {
  recordId: null,
  weight: 0,
  date: "",
};

/**
 * Consolidates PR edit state and actions.
 */
export function usePrEdit() {
  const [editState, setEditState] = useState<EditState>(DEFAULT_EDIT_STATE);

  const isEditing = (id: string) => editState.recordId === id;

  const startEdit = (record: PersonalRecord) => {
    setEditState({
      recordId: record.id,
      weight: record.weight,
      date: format(record.date, "yyyy-MM-dd"),
    });
  };

  const cancelEdit = () => {
    setEditState(DEFAULT_EDIT_STATE);
  };

  const updateWeight = (weight: number) => {
    setEditState(prev => ({ ...prev, weight }));
  };

  const updateDate = (date: string) => {
    setEditState(prev => ({ ...prev, date }));
  };

  return {
    editState,
    isEditing,
    startEdit,
    cancelEdit,
    updateWeight,
    updateDate,
  };
}
