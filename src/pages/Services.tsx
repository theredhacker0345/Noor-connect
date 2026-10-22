import { useNavigate } from "react-router-dom";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { useI18n } from "@/hooks/useI18n";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useSettings } from "@/contexts/SettingsContext";
import { shouldShowMenstrualFeatures } from "@/lib/gender-settings";
import {
    Radio, Target, Heart, Calculator,
    Star, Trophy, Coins, Calendar, Library, Tv, Sparkles, HeartHandshake, BookOpen, BookText, Moon, Headphones,
    CheckCircle, AlertTriangle, Users, HeartPulse, Music, type LucideIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/** One launchable service card. */
interface ServiceItem {
    title: string;
    path: string;
    icon: LucideIcon;
    gradient: string;
}

/** A visual section of the services grid. */
interface ServiceSection {
    headingKey: string;
    items: ServiceItem[];
}

export default function Services() {
    const { t } = useI18n();
    const navigate = useNavigate();
    const { isEidAlFitr, isEidAlAdha, islamicInfo, isLoading } = useIslamicCalendar();
    const { animationEnabled } = useSettings();

    // Seasonal gating logic — intentionally unchanged (date windows verified in NC-3/NC-4 rounds).
    const shouldShowFitranaCalculator = (() => {
        if (isLoading || !islamicInfo) return false;
        const hijriMonth = islamicInfo.hijriMonth;
        const hijriDay = islamicInfo.hijriDay;
        if (hijriMonth === 9 && hijriDay >= 23) return true;
        return false;
    })();

    const shouldShowEidChecklist = (() => {
        if (isLoading || !islamicInfo) return false;
        const hijriMonth = islamicInfo.hijriMonth;
        const hijriDay = islamicInfo.hijriDay;
        if (hijriMonth === 9 && hijriDay >= 23) return true;
        if (isEidAlFitr && hijriMonth === 10 && hijriDay <= 3) return true;
        if (hijriMonth === 10 && hijriDay >= 4 && hijriDay <= 10) return true;
        if (hijriMonth === 12 && hijriDay >= 3 && hijriDay <= 9) return true;
        if (isEidAlAdha && hijriMonth === 12 && hijriDay >= 10 && hijriDay <= 12) return true;
        if (hijriMonth === 12 && hijriDay >= 13 && hijriDay <= 19) return true;
        return false;
    })();

    const showNoorCycle = shouldShowMenstrualFeatures();

    // Loading shimmer for the seasonal section is only worth showing when a
    // seasonal card can actually appear. useIslamicCalendar resolves from cache
    // synchronously on warm starts, so a bare `isLoading` shimmer would flash
    // pointlessly for most of the year. This cheap Intl-based probe (±5 days,
    // wider than any known Aladhan↔Umm al-Qura drift) narrows the shimmer to
    // plausible seasonal windows; the REAL gating below still uses the hook's
    // dates, so this never shows or hides a card by itself.
    const seasonalWindowPlausible = (() => {
        try {
            const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' });
            const inSeasonalWindow = (date: Date): boolean => {
                const parts = fmt.formatToParts(date);
                const m = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
                const d = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
                if (m === 9 && d >= 23) return true;               // Fitrana + Eid checklist
                if (m === 10 && d <= 10) return true;              // Eid al-Fitr window
                if (m === 12 && d >= 3 && d <= 19) return true;    // Eid al-Adha window
                return false;
            };
            const DAY = 86_400_000;
            const now = Date.now();
            return [-5, 0, 5].some(off => inSeasonalWindow(new Date(now + off * DAY)));
        } catch {
            return true; // Intl islamic calendar unavailable → keep the old always-shimmer behaviour
        }
    })();

    const salahTracker: ServiceItem = { title: t('salahTracker'), path: "/prayer-stats", icon: CheckCircle, gradient: 'from-[#C9860A] to-[#E8A020]' };
    const qazaTracker: ServiceItem = { title: t('qazaTracker'), path: "/qaza", icon: AlertTriangle, gradient: 'from-[#3B82F6] to-[#1D4ED8]' };
    const tasbih: ServiceItem = { title: t('tasbih') || "Tasbih", path: "/tasbeeh", icon: Calculator, gradient: 'from-[#3B82F6] to-[#1D4ED8]' };
    const noorCycle: ServiceItem = { title: t('noorCycle'), path: "/noor-cycle", icon: HeartPulse, gradient: 'from-[#e11d48] to-[#be123c]' };

    // Services grouped into scannable sections instead of one flat 20-card wall.
    const sections: ServiceSection[] = [
        {
            headingKey: 'servicesSectionWorship',
            items: [
                salahTracker,
                qazaTracker,
                tasbih,
                ...(showNoorCycle ? [noorCycle] : []),
            ],
        },
        {
            headingKey: 'servicesSectionQuran',
            items: [
                { title: t('quranAudio'), path: "/quran-audio", icon: Headphones, gradient: 'from-[#C9860A] to-[#E8A020]' },
                { title: t('hadith'), path: "/hadith/collections", icon: BookText, gradient: 'from-[#C9860A] to-[#E8A020]' },
                { title: t('tafsir'), path: "/tafsir", icon: BookOpen, gradient: 'from-[#3B82F6] to-[#1D4ED8]' },
                { title: t('qisas'), path: "/qisas", icon: Users, gradient: 'from-[#C9860A] to-[#E8A020]' },
                { title: t('seerah'), path: "/seerah", icon: BookOpen, gradient: 'from-[#3B82F6] to-[#1D4ED8]' },
                { title: t('ebooks'), path: "/ebooks", icon: Library, gradient: 'from-[#C9860A] to-[#E8A020]' },
                { title: t('namesOfAllahShort'), path: "/names-of-allah", icon: Star, gradient: 'from-[#C9860A] to-[#E8A020]' },
            ],
        },
        {
            headingKey: 'servicesSectionMedia',
            items: [
                { title: t('liveMecca'), path: "/live", icon: Tv, gradient: 'from-[#3B82F6] to-[#1D4ED8]' },
                { title: t('radio'), path: "/quran-radio", icon: Radio, gradient: 'from-[#3B82F6] to-[#1D4ED8]' },
                { title: t('nasheeds'), path: "/nasheeds", icon: Music, gradient: 'from-[#10b981] to-[#047857]' },
            ],
        },
        {
            headingKey: 'servicesSectionDuas',
            items: [
                { title: t('duas'), path: "/duas", icon: Heart, gradient: 'from-[#3B82F6] to-[#1D4ED8]' },
                { title: t('remedies'), path: "/islamic-remedies", icon: HeartHandshake, gradient: 'from-[#C9860A] to-[#E8A020]' },
            ],
        },
        {
            headingKey: 'servicesSectionTools',
            items: [
                { title: t('habits'), path: "/habit-tracker", icon: Target, gradient: 'from-[#C9860A] to-[#E8A020]' },
                { title: t('zakat'), path: "/zakat", icon: Coins, gradient: 'from-[#C9860A] to-[#E8A020]' },
                { title: t('calendar'), path: "/calendar", icon: Calendar, gradient: 'from-[#3B82F6] to-[#1D4ED8]' },
                { title: t('quiz'), path: "/quiz", icon: Trophy, gradient: 'from-[#3B82F6] to-[#1D4ED8]' },
            ],
        },
    ];

    // Seasonal cards keep their dedicated, date-gated section.
    const seasonalItems: ServiceItem[] = [];
    if (shouldShowFitranaCalculator) {
        seasonalItems.push({ title: t('fitranaCalc'), path: "/fitrana-calculator", icon: Calculator, gradient: 'from-[#C9860A] to-[#E8A020]' });
    }
    if (shouldShowEidChecklist) {
        seasonalItems.push({ title: t('eidChecklist'), path: "/eid-checklist", icon: Moon, gradient: 'from-[#3B82F6] to-[#1D4ED8]' });
    }

    const motionProps = (props: any) => animationEnabled ? props : {};

    return (
        <PageTransition>
            <div className="min-h-screen bg-background pb-32 transition-colors duration-300">
                <AppBar title={t("services") || "Services"} showBack={true} />

                {/* Premium Featured Header Card */}
                <div className="px-5 pt-4 mb-8">
                    <motion.div
                        {...motionProps({
                            initial: { opacity: 0, scale: 0.95 },
                            animate: { opacity: 1, scale: 1 },
                            transition: { duration: 0.5 }
                        })}
                        className="relative overflow-hidden rounded-[24px] bg-gradient-to-br p-8 shadow-2xl"
                        style={{ background: 'linear-gradient(145deg, #1A1E2E, #1E2438)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
                    >
                        {/* Elegant Light Gradients */}
                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[20px] pointer-events-none" style={{ background: 'rgba(201,134,10,0.15)' }} />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[20px] pointer-events-none" style={{ background: 'rgba(59,130,246,0.15)' }} />

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-4">
                                <Sparkles className="w-4 h-4" style={{ color: '#C9860A' }} />
                                <span className="text-white/90 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#C9860A' }}>{t('islamicHub')}</span>
                            </div>
                            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight mb-2" style={{ fontFamily: 'inherit', fontStyle: 'italic' }}>
                                {t('discover')}<br/>{t('resources')}
                            </h2>
                            <p className="text-white/60 text-sm font-medium max-w-[85%] leading-relaxed">
                                {t('essentialToolsSpiritualJourney')}
                            </p>
                        </div>
                    </motion.div>
                </div>

                <div className="px-5 relative">
                    {/* While the Hijri date resolves, seasonal slots shimmer subtly
                        so late-arriving cards never feel like a layout jump. */}
                    {isLoading && seasonalWindowPlausible && (
                        <div className="mb-8" aria-hidden="true">
                            <div className="h-3 w-28 rounded-full bg-muted animate-pulse mb-3" />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-[104px] rounded-[20px] bg-muted/50 animate-pulse border border-border/40" />
                                <div className="h-[104px] rounded-[20px] bg-muted/50 animate-pulse border border-border/40" />
                            </div>
                        </div>
                    )}

                    {seasonalItems.length > 0 && (
                        <section className="mb-8" aria-labelledby="services-seasonal-heading">
                            <h2
                                id="services-seasonal-heading"
                                className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3"
                            >
                                {t('servicesSectionSeasonal')}
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <AnimatePresence>
                                    {seasonalItems.map((item, idx) => (
                                        <motion.button
                                            key={item.path}
                                            {...motionProps({
                                                initial: { opacity: 0, y: 20 },
                                                animate: { opacity: 1, y: 0 },
                                                transition: { delay: idx * 0.05, duration: 0.4 },
                                                whileTap: { scale: 0.95 }
                                            })}
                                            onClick={() => navigate(item.path)}
                                            aria-label={item.title}
                                            className="group relative flex flex-col items-start p-5 bg-card border border-border rounded-[20px] overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                        >
                                            <div className={`flex items-center justify-center w-12 h-12 rounded-[14px] bg-gradient-to-br ${item.gradient} shadow-sm mb-3 opacity-90 group-hover:opacity-100 transition-opacity`}>
                                                <item.icon className="w-5 h-5 text-white" strokeWidth={2} />
                                            </div>
                                            <h3 className="font-semibold text-sm text-foreground leading-tight">
                                                {item.title}
                                            </h3>
                                            <div className={`absolute -inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${item.gradient} transition-opacity duration-500 pointer-events-none`} />
                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </section>
                    )}

                    {/* Grouped services grid */}
                    {sections.map((section, sectionIdx) => (
                        <section
                            key={section.headingKey}
                            className={sectionIdx < sections.length - 1 ? "mb-8" : ""}
                            aria-labelledby={`services-${section.headingKey}-heading`}
                        >
                            <h2
                                id={`services-${section.headingKey}-heading`}
                                className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3"
                            >
                                {t(section.headingKey)}
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <AnimatePresence>
                                    {section.items.map((item, idx) => (
                                        <motion.button
                                            key={item.path}
                                            {...motionProps({
                                                initial: { opacity: 0, y: 20 },
                                                animate: { opacity: 1, y: 0 },
                                                transition: { delay: idx * 0.05, duration: 0.4 },
                                                whileTap: { scale: 0.95 }
                                            })}
                                            onClick={() => navigate(item.path)}
                                            aria-label={item.title}
                                            className="group relative flex flex-col items-start p-5 bg-card border border-border rounded-[20px] overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                        >
                                            {/* Icon Box with Vibrant Gradient */}
                                            <div className={`flex items-center justify-center w-12 h-12 rounded-[14px] bg-gradient-to-br ${item.gradient} shadow-sm mb-3 opacity-90 group-hover:opacity-100 transition-opacity`}>
                                                <item.icon className="w-5 h-5 text-white" strokeWidth={2} />
                                            </div>

                                            {/* Title */}
                                            <h3 className="font-semibold text-sm text-foreground leading-tight">
                                                {item.title}
                                            </h3>

                                            {/* Dynamic Glow Effect */}
                                            <div className={`absolute -inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${item.gradient} transition-opacity duration-500 pointer-events-none`} />
                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </section>
                    ))}
                </div>

                <div className="px-8 mt-12 text-center opacity-40 pb-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                        Noor Connect
                    </p>
                </div>
            </div>
        </PageTransition>
    );
}
