import { useState } from "react";
import {
  Mail, MessageCircle, ExternalLink, ChevronDown,
  Clock, HelpCircle, HeartHandshake,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

/**
 * /settings/contact — Card + FAQ redesign.
 * Greeting header, five fact-checked FAQ accordions (every answer verified
 * against the app's actual behaviour), the developer's real contact channels,
 * and an honest response-time badge.
 */

const FAQS = [
  { id: "backups", qKey: "contactFaq.faqBackupsQ", aKey: "contactFaq.faqBackupsA" },
  { id: "method", qKey: "contactFaq.faqMethodQ", aKey: "contactFaq.faqMethodA" },
  { id: "notifications", qKey: "contactFaq.faqNotificationsQ", aKey: "contactFaq.faqNotificationsA" },
  { id: "privacy", qKey: "contactFaq.faqPrivacyQ", aKey: "contactFaq.faqPrivacyA" },
  { id: "downloads", qKey: "contactFaq.faqDownloadsQ", aKey: "contactFaq.faqDownloadsA" },
] as const;

export function ContactPage() {
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Greeting header */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <HeartHandshake className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{t("contactFaq.greeting")}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("contactSubtitle")}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400" dir="auto">
          <Clock className="w-3 h-3" />
          {t("contactFaq.responseTime")}
        </span>
      </div>

      {/* FAQ */}
      <div className="p-5 bg-card border border-border rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <div>
            <h4 className="font-bold text-sm text-foreground">{t("contactFaq.faqTitle")}</h4>
            <p className="text-[11px] text-muted-foreground">{t("contactFaq.faqSubtitle")}</p>
          </div>
        </div>
        <div className="space-y-2">
          {FAQS.map((f) => {
            const open = openId === f.id;
            return (
              <div key={f.id} className="border border-border/70 rounded-xl overflow-hidden bg-muted/20">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : f.id)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="text-[13px] font-bold text-foreground leading-snug" dir="auto">{t(f.qKey)}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180 text-primary" : ""}`} />
                </button>
                {open && (
                  <div className="px-3.5 pb-3.5">
                    <p className="text-xs text-foreground/75 leading-relaxed" dir="auto">{t(f.aKey)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Real contact channels */}
      <div className="p-5 bg-card border border-border rounded-2xl space-y-3">
        <h4 className="font-bold text-sm text-foreground">{t("contactFaq.reachTitle")}</h4>
        <p className="text-xs text-muted-foreground -mt-1">{t("contactFaq.reachSubtitle")}</p>

        <button
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
          onClick={() => window.open("https://wa.me/923352706540", "_blank")}
        >
          <MessageCircle className="w-4 h-4" />
          {t("letsTalkWhatsapp")}
        </button>

        <button
          className="w-full min-h-11 flex items-center gap-2.5 text-left text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors p-2.5 rounded-xl border border-slate-200 dark:border-slate-800"
          onClick={() => { window.location.href = "mailto:arifubaid0345@gmail.com"; }}
        >
          <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Gmail</span> — arifubaid0345@gmail.com
          </span>
        </button>

        <button
          className="w-full min-h-11 flex items-center gap-2.5 text-left text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors p-2.5 rounded-xl border border-slate-200 dark:border-slate-800"
          onClick={() => { window.location.href = "mailto:ubaid0345@proton.me"; }}
        >
          <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {t("otherEmail")} <span className="font-semibold text-slate-800 dark:text-slate-200">Proton</span> — ubaid0345@proton.me
          </span>
        </button>

        <button
          className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-700 transition-all active:scale-[0.98]"
          onClick={() => window.open("https://ubaid-ur-rehmanportfolio.vercel.app/", "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
          {t("viewMyWork")}
        </button>
      </div>
    </div>
  );
}
