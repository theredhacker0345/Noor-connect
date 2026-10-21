import { useNavigate } from "react-router-dom";
import { Clock, BookOpen, RotateCcw, BookHeart, BookMarked, Moon, Sun, Settings as SettingsIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useI18n } from "@/hooks/useI18n";
import { getTheme, setTheme } from "@/lib/storage";
import { GeolocationService } from "@/lib/geolocation-service";
import { unifiedNotifications } from '@/lib/unified-notifications';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [nextPrayer, setNextPrayer] = useState(() => ({ name: t("fajr"), time: "05:30" }));

  useEffect(() => {
    setIsDarkMode(getTheme() === "dark");
    
    // Fetch prayer times
    const fetchPrayerTimes = async () => {
      try {
        if (!GeolocationService.isSupported()) {
                    return;
        }

        // Try to get location without prompting for permissions
        // This will only work if permissions are already granted
        const permissions = await GeolocationService.checkPermissions();
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
                    return;
        }

        const pos = await GeolocationService.getCurrentPosition({
          enableHighAccuracy: false, // Use less accuracy for quick fetch
          timeout: 5000,
          maximumAge: 300000 // 5 minutes cache
        });

        const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${pos.latitude}&longitude=${pos.longitude}&method=2`);
        const data = await res.json();
        const timings = data.data.timings;
        const prayers = [
          { name: t("fajr"), time: timings.Fajr },
          { name: t("dhuhr"), time: timings.Dhuhr },
          { name: t("asr"), time: timings.Asr },
          { name: t("maghrib"), time: timings.Maghrib },
          { name: t("isha"), time: timings.Isha },
        ];
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        for (const p of prayers) {
          const [h, m] = p.time.split(":").map(Number);
          if (h * 60 + m > currentMins) { setNextPrayer(p); break; }
        }
      } catch (error) {
        console.error('Failed to load prayer times:', error);
      }
    };

    fetchPrayerTimes();

    // Prompt for notification permission on first open (not just location)
    const checkNotificationPermission = async () => {
      if (!unifiedNotifications.isNotificationSupported()) return;
      const status = await unifiedNotifications.getPermissionStatus();
      if (status === 'granted' || status === 'denied') return;
      // Only prompt on first visit (tracked via localStorage)
      const notifiedKey = 'notif-permission-prompted';
      if (localStorage.getItem(notifiedKey)) return;
      localStorage.setItem(notifiedKey, 'true');
      // Delay slightly so the page loads first
      setTimeout(() => {
        unifiedNotifications.requestPermission();
      }, 3000);
    };
    checkNotificationPermission();
  }, []);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    setIsDarkMode(!isDarkMode);
    setTheme(newTheme);
  };

  const menuItems = [
    { icon: Clock, label: t("prayerTimes"), path: "/prayer-times" },
    { icon: BookOpen, label: t("quran"), path: "/quran" },
    { icon: RotateCcw, label: t("tasbeeh"), path: "/tasbeeh" },
    { icon: BookHeart, label: t("duas"), path: "/duas" },
    { icon: BookMarked, label: t("hadith"), path: "/hadith" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-arabic">نُور كونيكت</h1>
            <p className="text-xs text-muted-foreground">{t("privacyOfflineTagline")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="rounded-full">
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Next Prayer */}
        <Card className="p-5 bg-primary text-primary-foreground border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">{t("nextPrayer")}</p>
              <h2 className="text-2xl font-bold">{nextPrayer.name}</h2>
            </div>
            <div className="text-3xl font-bold font-mono">{nextPrayer.time}</div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item, i) => (
            <Card key={i} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(item.path)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground pt-2">
          "وَاذْكُرْ رَبَّكَ كَثِيرًا" {t("rememberYourLordMuch")}
        </p>
      </div>
    </div>
  );
};

export default Index;
