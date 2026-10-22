import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Settings as SettingsIcon, Compass, LayoutGrid, Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { memo, useEffect, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { preloadQuranList } from "@/lib/preload";

const AMBER = '#C9860A';
const AMBER_DARK = '#E8A020';

const BottomNav = memo(function BottomNav() {
  const { t } = useLanguage();
  const { animationEnabled, effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';
  const activeColor = isDark ? AMBER_DARK : AMBER;
  const location = useLocation();

  const [noBlur, setNoBlur] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    const tier = document.documentElement.dataset.animationTier;
    return tier === 'minimal' || tier === 'low' || document.documentElement.classList.contains('reduce-blur');
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const tier = (e as CustomEvent<{ shouldDisableBackdropBlur: boolean }>).detail;
      setNoBlur(!!tier.shouldDisableBackdropBlur);
    };
    window.addEventListener('animation-tier-changed', handler);
    return () => window.removeEventListener('animation-tier-changed', handler);
  }, []);

  // Hide global nav on routes that have their own bottom navigation
  if (location.pathname.startsWith('/noor-cycle')) {
    return null;
  }

  const navItems = [
    { title: (t('qibla') || 'Qibla'), path: '/qibla', icon: Compass },
    { title: (t('quran') || 'Quran'), path: '/quran', icon: BookOpen },
    { title: (t('home') || 'Home'), path: '/', icon: Home, exact: true },
    { title: (t('services') || 'Services'), path: '/services', icon: LayoutGrid },
    { title: (t('settings') || 'Settings'), path: '/profile', icon: SettingsIcon },
  ];

  return (
    <nav
      className="w-full fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex justify-center"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      <div
        className="w-full max-w-sm pointer-events-auto flex flex-row items-center justify-between h-[62px] px-3 rounded-[36px]"
        style={{
          background: noBlur
            ? (isDark ? 'rgb(28,32,48)' : 'rgb(255,255,255)')
            : (isDark ? 'rgba(28,32,48,0.95)' : 'rgba(255,255,255,0.97)'),
          backdropFilter: noBlur ? 'none' : 'blur(28px)',
          WebkitBackdropFilter: noBlur ? 'none' : 'blur(28px)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.05)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)'
            : '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className="flex-1 flex flex-col items-center justify-center h-full relative min-w-0"
            style={{ touchAction: 'manipulation' }}
            // Warm the lazy /quran chunk the moment the finger lands (pointerdown
            // fires ~100ms before click) or the tab is focused — fire-and-forget.
            onPointerDown={item.path === '/quran' ? preloadQuranList : undefined}
            onFocus={item.path === '/quran' ? preloadQuranList : undefined}
          >
            {({ isActive }) => (
              <div
                className={`flex flex-col items-center justify-center gap-[3px] ${animationEnabled ? 'active:scale-[0.86]' : ''}`}
                style={{ transition: animationEnabled ? 'transform 0.1s ease' : 'none' }}
              >
                <div className="relative flex items-center justify-center w-10 h-8">
                  <div
                    className="absolute inset-0 rounded-xl transition-opacity duration-200"
                    style={{ background: `${activeColor}18`, opacity: isActive ? 1 : 0 }}
                  />
                  <item.icon
                    className="w-[22px] h-[22px]"
                    style={{
                      color: isActive ? activeColor : (isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)'),
                      strokeWidth: isActive ? 2.5 : 1.8,
                      transition: 'color 0.2s, stroke-width 0.2s',
                    }}
                  />
                </div>
                <span
                  className="text-xs font-semibold leading-none"
                  style={{
                    color: isActive ? activeColor : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.38)'),
                    transition: 'color 0.2s',
                    letterSpacing: '0.01em',
                  }}
                >
                  {item.title}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
});

export default BottomNav;
