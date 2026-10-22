import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Apple,
  BookOpen,
  ChevronDown,
  Coffee,
  Footprints,
  GlassWater,
  Heart,
  Leaf,
  Moon,
  Sprout,
  StickyNote,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SELF_CARE_BY_PHASE, type CyclePhase } from "@/lib/haidh-tracker";

/**
 * Phase-aware self-care card for the Today tab.
 * Tips are gentle wellness suggestions — never medical advice (footnoted).
 * Icon keys come from SELF_CARE_BY_PHASE data and resolve here, keeping the
 * lib layer free of component imports.
 */

const ICONS: Record<string, LucideIcon> = {
  water: GlassWater,
  leaf: Leaf,
  footprints: Footprints,
  moon: Moon,
  coffee: Coffee,
  sprout: Sprout,
  apple: Apple,
  book: BookOpen,
  heart: Heart,
  thermometer: Thermometer,
  note: StickyNote,
};

const ACCENT: Record<string, { text: string; chip: string; dot: string }> = {
  haidh: { text: "text-rose-500", chip: "bg-rose-500/15", dot: "bg-rose-500" },
  tuhr: { text: "text-emerald-500", chip: "bg-emerald-500/15", dot: "bg-emerald-500" },
  premenstrual: { text: "text-violet-500", chip: "bg-violet-500/15", dot: "bg-violet-500" },
  fertile: { text: "text-amber-500", chip: "bg-amber-500/15", dot: "bg-amber-500" },
  pregnant: { text: "text-sky-500", chip: "bg-sky-500/15", dot: "bg-sky-500" },
  unknown: { text: "text-primary", chip: "bg-primary/10", dot: "bg-primary" },
};

interface Props {
  phase: CyclePhase | "pregnant";
}

export function HaidhSelfCareCard({ phase }: Props) {
  const content = SELF_CARE_BY_PHASE[phase] ?? SELF_CARE_BY_PHASE.unknown;
  const accent = ACCENT[phase] ?? ACCENT.unknown;
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="bg-card border border-border rounded-[28px] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Heart className={cn("w-4 h-4", accent.text)} />
        <span className={cn("text-xs font-black uppercase tracking-widest", accent.text)}>
          Self-care
        </span>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          {phase === "haidh" ? "Days 1+" : phase === "premenstrual" ? "Before cycle" : phase === "fertile" ? "Mid-cycle" : phase === "pregnant" ? "Pregnancy" : "Ṭuhr"}
        </span>
      </div>
      <p className="text-sm font-bold text-foreground mb-3">{content.title}</p>

      <div className="space-y-1.5">
        {content.tips.map((tip) => {
          const Icon = ICONS[tip.icon] ?? Heart;
          const open = openKey === tip.key;
          return (
            <div key={tip.key} className="rounded-2xl border border-border overflow-hidden bg-background/50">
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : tip.key)}
                aria-expanded={open}
                aria-label={`${tip.label} — ${open ? "hide" : "show"} details`}
                className="w-full min-h-[48px] flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
              >
                <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", accent.chip)}>
                  <Icon className={cn("w-4 h-4", accent.text)} />
                </span>
                <span className="flex-1 font-bold text-sm text-foreground">{tip.label}</span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="px-3 pb-3 pl-14 text-xs text-muted-foreground leading-relaxed">
                      {tip.detail}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/60 mt-3 text-center">
        General wellness tips, not medical advice.
      </p>
    </div>
  );
}
