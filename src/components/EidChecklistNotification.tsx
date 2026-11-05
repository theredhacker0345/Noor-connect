import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { Moon, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function EidChecklistNotification() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { islamicInfo, isLoading } = useIslamicCalendar();
  const [dismissed, setDismissed] = useState(false);

  // Check if tonight is the eve of either Eid: the last night of Ramadan
  // (29th or 30th) before Eid al-Fitr, or Dhul Hijjah 8–9 (incl. the Day of
  // Arafah) before Eid al-Adha. Previously only Eid al-Fitr had a prep
  // notification — the Eid al-Adha checklist was never surfaced anywhere.
  const eidEve = (() => {
    if (isLoading || !islamicInfo) return null;

    const hijriMonth = islamicInfo.hijriMonth;
    const hijriDay = islamicInfo.hijriDay;

    if (hijriMonth === 9 && (hijriDay === 29 || hijriDay === 30)) return 'fitr';
    if (hijriMonth === 12 && (hijriDay === 8 || hijriDay === 9)) return 'adha';
    return null;
  })();

  const shouldShow = eidEve !== null && !dismissed;

  // Check if notification was already shown today
  useEffect(() => {
    if (shouldShow && eidEve) {
      const today = new Date().toDateString();
      const lastShown = localStorage.getItem('eid-checklist-notification-shown');

      if (lastShown !== today) {
        // Show toast notification
        toast({
          title: t('eidPrepToastTitle'),
          description: eidEve === 'fitr'
            ? t('eidPrepFitrBody')
            : t('eidPrepAdhaBody'),
          duration: 8000,
        });

        // Mark as shown for today
        localStorage.setItem('eid-checklist-notification-shown', today);
      }
    }
  }, [shouldShow, eidEve, toast]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('eid-checklist-notification-dismissed', 'true');
  };

  const handleNavigate = () => {
    // The toast says "prepare with our Eid checklist" — land on it directly
    // (was '/services', which made users hunt for the checklist themselves).
    window.location.href = '/eid-checklist';
  };

  if (!shouldShow || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3 }}
        className="fixed top-20 left-4 right-4 z-50 max-w-sm mx-auto"
      >
        <Card className="bg-gradient-to-r from-amber-500 to-yellow-500 border-0 shadow-lg">
          <CardContent className="p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-white/20 rounded-full">
                  <Moon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <Sparkles className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">Eid Tomorrow!</h3>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed">
                    Eid al-Fitr is tomorrow! Get ready with our special Eid checklist.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
                    onClick={handleNavigate}
                  >
                    View Checklist
                  </Button>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10 p-1"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
