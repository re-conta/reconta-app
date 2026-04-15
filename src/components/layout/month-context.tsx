import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentMonth } from "@/lib/utils";

const STORAGE_KEY = "reconta-selected-month";

interface MonthContextValue {
  month: number;
  year: number;
  setPeriod: (month: number, year: number) => void;
}

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const current = getCurrentMonth();
  const [month, setMonthState] = useState(current.month);
  const [year, setYearState] = useState(current.year);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { month: unknown; year: unknown };
        if (
          typeof parsed.month === "number" &&
          typeof parsed.year === "number"
        ) {
          setMonthState(parsed.month);
          setYearState(parsed.year);
        }
      }
    } catch {}
  }, []);

  const setPeriod = (m: number, y: number) => {
    setMonthState(m);
    setYearState(y);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ month: m, year: y }));
    } catch {}
  };

  return (
    <MonthContext.Provider value={{ month, year, setPeriod }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonthContext() {
  const ctx = useContext(MonthContext);
  if (!ctx)
    throw new Error("useMonthContext must be used within MonthProvider");
  return ctx;
}
