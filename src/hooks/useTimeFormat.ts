/**
 * Reactive time-format preference hook.
 * Returns the current '12' | '24' format and a setter that persists the choice
 * and notifies all listening components. Re-renders on every format change.
 */
import { useCallback, useEffect, useState } from 'react';
import { getTimeFormat, setTimeFormat } from '@/lib/time-formatter';

export function useTimeFormat(): readonly ['12' | '24', (format: '12' | '24') => void] {
  const [format, setFormat] = useState<'12' | '24'>(() => getTimeFormat());

  useEffect(() => {
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent).detail as { format?: string } | undefined;
      if (detail?.format === '12' || detail?.format === '24') {
        setFormat(detail.format);
      } else {
        setFormat(getTimeFormat());
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'time-format' && event.newValue) {
        setFormat(event.newValue === '12' ? '12' : '24');
      }
    };

    window.addEventListener('time-format-changed', handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('time-format-changed', handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const update = useCallback((next: '12' | '24') => {
    setTimeFormat(next);
    setFormat(next);
  }, []);

  return [format, update] as const;
}
