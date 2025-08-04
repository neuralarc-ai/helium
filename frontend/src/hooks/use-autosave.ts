import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions<T> {
  data: T;
  originalData: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  isEqual?: (a: T, b: T) => boolean;
}

export function useAutosave<T>({
  data,
  originalData,
  onSave,
  delay = 2000, // 2 seconds default delay
  enabled = true,
  isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isInitialMount = useRef(true);

  // Check if there are unsaved changes
  const hasUnsavedChanges = !isEqual(data, originalData);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const saveData = useCallback(async () => {
    if (!hasUnsavedChanges || !enabled) return;

    setStatus('saving');
    try {
      await onSave(data);
      setStatus('saved');
      setLastSaveTime(new Date());
      
      // Reset to idle after showing "saved" for a moment
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (error) {
      setStatus('error');
      console.error('Autosave error:', error);
      
      // Reset to idle after showing error
      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    }
  }, [data, hasUnsavedChanges, enabled, onSave]);

  // Debounced autosave effect
  useEffect(() => {
    // Skip autosave on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Skip if no changes or autosave is disabled
    if (!hasUnsavedChanges || !enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autosave
    timeoutRef.current = setTimeout(() => {
      saveData();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, hasUnsavedChanges, enabled, delay, saveData]);

  // Manual save function (in case user wants to save immediately)
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await saveData();
  }, [saveData]);

  return {
    status,
    hasUnsavedChanges,
    lastSaveTime,
    saveNow
  };
} 