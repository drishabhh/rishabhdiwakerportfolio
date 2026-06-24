"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_HISTORY = 60;

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

function snapshotsEqual<T>(a: T, b: T) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useUndoRedo<T>(initial: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T | null>(null);

  const commit = useCallback((next: T) => {
    setHistory((h) => {
      if (snapshotsEqual(h.present, next)) return h;
      return {
        past: [...h.past, h.present].slice(-MAX_HISTORY),
        present: next,
        future: [],
      };
    });
  }, []);

  const replace = useCallback((next: T) => {
    setHistory((h) => ({ ...h, present: next }));
  }, []);

  const commitDebounced = useCallback(
    (next: T, delayMs = 700) => {
      pendingRef.current = next;
      replace(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (pendingRef.current) commit(pendingRef.current);
        pendingRef.current = null;
      }, delayMs);
    },
    [commit, replace],
  );

  const flushDebounced = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingRef.current) {
      commit(pendingRef.current);
      pendingRef.current = null;
    }
  }, [commit]);

  const undo = useCallback(() => {
    flushDebounced();
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1]!;
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      };
    });
  }, [flushDebounced]);

  const redo = useCallback(() => {
    flushDebounced();
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0]!;
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(1),
      };
    });
  }, [flushDebounced]);

  const reset = useCallback((next: T) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pendingRef.current = null;
    setHistory({ past: [], present: next, future: [] });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return {
    state: history.present,
    commit,
    replace,
    commitDebounced,
    flushDebounced,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
