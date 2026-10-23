import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Search, ChevronDown, BookOpen, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HAIDH_KNOWLEDGE,
  KNOWLEDGE_CATEGORIES,
  type KnowledgeCategoryId,
} from "@/data/haidh/knowledge";

interface Props {
  /** Current madhab from tracker settings (shaded on the header chip). */
  madhab: string;
}

const MADHAB_LABEL: Record<string, string> = {
  hanafi: "Ḥanafī", maliki: "Mālikī", shafii: "Shāfiʿī", hanbali: "Ḥanbalī",
};

/**
 * Knowledge — a curated library of pre-written fiqh Questions & Answers
 * (ḥayḍ / nifās / istiḥāḍah and the worship around them). Searchable,
 * filterable by category, expandable cards. Content ships with the app —
 * nothing is user-generated.
 */
export function HaidhKnowledgeTab({ madhab }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<KnowledgeCategoryId | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HAIDH_KNOWLEDGE.filter((qa) => {
      if (category !== "all" && qa.category !== category) return false;
      if (!q) return true;
      return (
        qa.question.toLowerCase().includes(q) ||
        qa.answer.toLowerCase().includes(q) ||
        qa.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  const countsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const qa of HAIDH_KNOWLEDGE) {
      map.set(qa.category, (map.get(qa.category) ?? 0) + 1);
    }
    return map;
  }, []);

  return (
    <div className="space-y-5 pb-24">
      {/* Hero header */}
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-primary">Knowledge</h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-[280px] mx-auto">
          Clear answers on ḥayḍ, nifās and istiḥāḍah — written in advance from classical fiqh, not user questions.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/20 text-primary">
            {HAIDH_KNOWLEDGE.length} Questions
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted/60 border border-border text-muted-foreground">
            {MADHAB_LABEL[madhab] ?? madhab} view
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions… (e.g. wudu, fasting, mosque)"
          aria-label="Search knowledge questions"
          className="w-full h-12 pl-11 pr-11 rounded-2xl bg-card border border-border text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ChipButton
          active={category === "all"}
          label="All"
          count={HAIDH_KNOWLEDGE.length}
          onClick={() => setCategory("all")}
        />
        {KNOWLEDGE_CATEGORIES.map((c) => (
          <ChipButton
            key={c.id}
            active={category === c.id}
            label={c.label}
            count={countsByCategory.get(c.id) ?? 0}
            onClick={() => setCategory(c.id)}
          />
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-[32px] p-8 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-bold text-foreground">No matching questions</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a shorter word — or ask your local scholar for a case-specific ruling.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((qa) => {
            const open = openId === qa.id;
            const cat = KNOWLEDGE_CATEGORIES.find((c) => c.id === qa.category);
            return (
              <div
                key={qa.id}
                className={cn(
                  "bg-card border rounded-3xl overflow-hidden transition-colors",
                  open ? "border-primary/40 shadow-lg" : "border-border"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : qa.id)}
                  aria-expanded={open}
                  className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-primary/70 mb-1">
                      {cat?.label}
                    </span>
                    <span className="block text-sm font-bold text-foreground leading-snug">
                      {qa.question}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 shrink-0 mt-1 text-muted-foreground transition-transform",
                      open && "rotate-180 text-primary"
                    )}
                  />
                </button>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {qa.answer.split("\n\n").map((para, i) => (
                        <p key={i} className="text-sm text-foreground/80 leading-relaxed">
                          {para}
                        </p>
                      ))}
                      {qa.madhabNotes && (
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                            Madhab differences
                          </p>
                          <p className="text-xs text-foreground/70 leading-relaxed">
                            {qa.madhabNotes}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <p className="text-[11px] text-muted-foreground italic">
                          Reflects fatwas on {qa.source} — confirm your personal case with a local scholar.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer + verified resources */}
      <div className="bg-card border border-border rounded-[32px] p-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> How to use this section
        </h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          These answers summarise classical fiqh manuals as explained by the fatwa platforms below.
          They are educational — rulings on your exact situation (habit days, borderline discharge,
          medical conditions) deserve a conversation with a qualified scholar.
        </p>
        <div className="space-y-3">
          <a href="https://seekersguidance.org/answers/" target="_blank" rel="noopener noreferrer" className="block p-4 rounded-2xl border border-border hover:border-primary/50 transition-colors bg-muted/20 group">
            <h4 className="font-bold text-primary mb-1 group-hover:underline">SeekersGuidance</h4>
            <p className="text-xs text-muted-foreground">Reliable answers based on the 4 Madhabs</p>
          </a>
          <a href="https://islamqa.org/" target="_blank" rel="noopener noreferrer" className="block p-4 rounded-2xl border border-border hover:border-primary/50 transition-colors bg-muted/20 group">
            <h4 className="font-bold text-primary mb-1 group-hover:underline">IslamQA.org</h4>
            <p className="text-xs text-muted-foreground">Hanafi, Shafi'i, Maliki & Hanbali fatwas</p>
          </a>
          <a href="https://islamqa.info/en" target="_blank" rel="noopener noreferrer" className="block p-4 rounded-2xl border border-border hover:border-primary/50 transition-colors bg-muted/20 group">
            <h4 className="font-bold text-primary mb-1 group-hover:underline">IslamQA.info</h4>
            <p className="text-xs text-muted-foreground">Comprehensive fatwa database</p>
          </a>
        </div>
      </div>
    </div>
  );
}

function ChipButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border transition-all active:scale-95 whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-md"
          : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
      )}
    >
      {label} <span className={cn("ml-1 tabular-nums", active ? "opacity-80" : "opacity-50")}>{count}</span>
    </button>
  );
}
