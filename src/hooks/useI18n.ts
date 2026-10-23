import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n-new';

/**
 * Stable i18n helpers.
 *
 * IMPORTANT: every value returned here is referentially stable between
 * renders (useMemo/useCallback). An earlier version returned a fresh object
 * literal with brand-new function identities on every render, which broke
 * any consumer doing `useCallback(..., [formatDate])` or
 * `useEffect(..., [refreshData])`: each setState re-render produced a new
 * formatDate → new callback → effect re-ran → setState again → an infinite
 * render loop (~50 refreshes/sec in WeeklySalahChart's console).
 */
export const useI18n = () => {
    const { t } = useTranslation(undefined, { i18n });
    const locale = i18n.language || 'en';

    const tp = useCallback(
        (key: string, count: number, options?: any) => t(key, { count, ...options }),
        [t]
    );

    const formatNumber = useCallback(
        (num: number) => new Intl.NumberFormat(locale).format(num),
        [locale]
    );

    const formatDate = useCallback(
        (date: Date, options?: Intl.DateTimeFormatOptions) =>
            new Intl.DateTimeFormat(locale, options).format(date),
        [locale]
    );

    return useMemo(
        () => ({ t, tp, formatNumber, formatDate }),
        [t, tp, formatNumber, formatDate]
    );
};
