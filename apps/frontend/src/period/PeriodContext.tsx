import { createContext, ReactNode, useContext, useState } from 'react';
import { useCurrentClosureMonth } from '../hooks/useCurrentClosureMonth';

interface PeriodContextValue {
  month: number;
  year: number;
  isLoading: boolean;
  setPeriod: (month: number, year: number) => void;
}

const PeriodContext = createContext<PeriodContextValue | undefined>(undefined);

/**
 * App-wide selected month/year — set from the Checklist page's month selector, read by every
 * other page that shows monthly data (Atividades, Dashboard, Quadro, Gantt). Cronogramas and
 * Usuários are month-agnostic by design and never read this.
 * Before the user picks a month explicitly, falls back to the same "most recently generated
 * closure" default the pages used individually before this existed — no behavior change on
 * first load.
 */
export function PeriodProvider({ children }: { children: ReactNode }) {
  const defaultPeriod = useCurrentClosureMonth();
  const [override, setOverride] = useState<{ month: number; year: number } | null>(null);

  const value: PeriodContextValue = {
    month: override?.month ?? defaultPeriod.month,
    year: override?.year ?? defaultPeriod.year,
    isLoading: !override && defaultPeriod.isLoading,
    setPeriod: (month, year) => setOverride({ month, year }),
  };

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod must be used within PeriodProvider');
  return ctx;
}
