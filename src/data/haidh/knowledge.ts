// Noor Cycle — Knowledge Library
// Pre-written fiqh Questions & Answers (NOT user-submitted) covering the fiqh
// of Ḥayḍ (menstruation), Nifās (postpartum bleeding) and Istiḥāḍah (irregular
// bleeding). Rulings summarise classical positions from the four Sunni schools
// as popularised by SeekersGuidance, IslamQA.org and IslamQA.info — always
// confirm personal cases with a qualified scholar.

export type KnowledgeCategoryId =
  | "basics"
  | "nifas"
  | "istihadha"
  | "prayer"
  | "quran"
  | "purification"
  | "fasting"
  | "marital"
  | "hajj"
  | "life-stages";

export interface KnowledgeQA {
  id: string;
  category: KnowledgeCategoryId;
  question: string;
  /** Answer paragraphs separated by a blank line (\n\n). */
  answer: string;
  /** Optional concise madhab-difference note shown in a highlight box. */
  madhabNotes?: string;
  /** Lineage of the answer (reference platforms whose fatwas it reflects). */
  source: string;
  /** Exact verified page this answer's rulings were checked against (SeekersGuidance / IslamQA.org / IslamQA.info). */
  sourceUrl: string;
  tags: string[];
}

export const KNOWLEDGE_CATEGORIES: { id: KnowledgeCategoryId; label: string }[] = [
  { id: "basics",       label: "Basics of Ḥayḍ" },
  { id: "nifas",        label: "Nifās (Postpartum)" },
  { id: "istihadha",    label: "Istiḥāḍah" },
  { id: "prayer",       label: "Prayer & Worship" },
  { id: "quran",        label: "Qurʾān & Masjid" },
  { id: "purification", label: "Purification" },
  { id: "fasting",      label: "Fasting" },
  { id: "marital",      label: "Marital Rulings" },
  { id: "hajj",         label: "Ḥajj & ʿUmrah" },
  { id: "life-stages",  label: "Life Stages" },
];

export const HAIDH_KNOWLEDGE: KnowledgeQA[] = [
  // ───────────────────────────── Basics of Ḥayḍ ─────────────────────────────
  {
    id: "what-is-hayd",
    category: "basics",
    question: "What exactly is ḥayḍ (menstruation) in Islamic law?",
    answer:
      "Ḥayḍ is the natural, cyclical discharge of menstrual blood from the womb of a healthy woman. In fiqh it is identified by well-known signs: the blood is typically dark red or black, warm, flows with a degree of pressure, and does not clot from a wound — it is distinguished from ordinary vaginal discharge and from injury blood.\n\nWhen a woman is in ḥayḍ she is ritually excused from ṣalāh and fasting, and certain acts (like tawāf and touching the muṣḥaf) are paused until she is pure and performs ghusl. This is a divine concession, described in the Qurʾān as an illness ('adhā), never a punishment — worship simply shifts to duʿā, dhikr and patience.",
    source: "SeekersGuidance · IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/222030",
    tags: ["definition", "signs of menses", "concession"],
  },
  {
    id: "min-max-duration",
    category: "basics",
    question: "How many days can a period last according to each madhab?",
    answer:
      "The schools set different outer limits used mainly to classify stubborn, continuous bleeding. The Ḥanafī school: minimum 3 days, maximum 10 days. The Shāfiʿī and Ḥanbalī schools commonly work with a maximum of 15 days for a beginner whose bleeding never stops. The Mālikī school fixes no number: bleeding is judged by each woman's habit ('urf) and the recognised signs of menstrual blood.\n\nThese numbers are not targets — a normal period of 4–7 days is fine. The limits only matter when bleeding becomes abnormal and must be split into ḥayḍ and istiḥāḍah.",
    madhabNotes:
      "Ḥanafī: 3–10 days · Shāfiʿī/Ḥanbalī: up to 15 days for continuous flow · Mālikī: judged by habit and blood signs, not a fixed maximum.",
    source: "IslamQA.org · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/247317",
    tags: ["duration", "10 days", "15 days", "madhab comparison"],
  },
  {
    id: "min-pure-interval",
    category: "basics",
    question: "How long must the gap between two periods be?",
    answer:
      "A period of purity (ṭuhr) between two menstruations must be real purity. The Ḥanafī school requires at least 15 days of purity between two periods; anything less is treated as one continuing flow. The Shāfiʿī school sets no minimum interval. The Mālikī and Ḥanbalī schools look primarily at the woman's established habit.\n\nIf your cycle is genuinely shorter than the classical minimums — some healthy women bleed every 21–24 days — a scholar can work out your specific pattern rather than forcing your body into a textbook number.",
    madhabNotes:
      "Ḥanafī: minimum 15 pure days between periods · Shāfiʿī: no minimum · Mālikī/Ḥanbalī: follow the woman's habit.",
    source: "IslamQA.org",
    sourceUrl: "https://islamqa.info/en/answers/20898",
    tags: ["tuhr", "purity interval", "short cycle"],
  },
  {
    id: "brown-yellow-discharge",
    category: "basics",
    question: "Does brown or yellow discharge count as menses?",
    answer:
      "This is one of the most asked fiqh questions. The Ḥanafī school counts brownish or yellowish discharge as ḥayḍ during your habitual days, but not outside them. The Shāfiʿī school says ḥayḍ is only red blood; yellow and brown are treated as irregular discharge. The Mālikī school is generally more inclusive within the habitual days.\n\nA practical marker many scholars highlight: the clear white discharge signals that purity has fully arrived. If you see it, ghusl and prayer resume. Because these rules interact with your personal habit, borderline colours are best discussed with a scholar rather than guessed.",
    madhabNotes:
      "Ḥanafī: counts within habitual days · Shāfiʿī: only red blood is ḥayḍ · Mālikī: generally counts within habit.",
    source: "SeekersGuidance · IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/13948",
    tags: ["brown discharge", "yellow discharge", "purity marker"],
  },
  {
    id: "period-ends-when",
    category: "basics",
    question: "When exactly does my period end so I can pray again?",
    answer:
      "The default across the schools: ḥayḍ ends when bleeding stops. The moment you are confident bleeding has ceased — especially with the classic white/clear discharge — perform ghusl and resume praying, even if that happens mid-day or mid-night. If bleeding returns within your habitual days, treat it as one continuous period.\n\nThe Ḥanafī school adds one caution: if bleeding stops before your habitual minimum (e.g. on day 2 when your habit is 4–5 days), wait out the rest of the habitual days before counting purity. And if purity appears near sunset or the final minutes of a prayer, hasten — one valid prayer performed after ghusl is worth far more than doubt.",
    madhabNotes:
      "Ḥanafī: stopping before the habitual minimum is not yet purity · Jumhur: ends when bleeding actually stops.",
    source: "IslamQA.org · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/317771",
    tags: ["end of period", "ghusl", "resuming prayer"],
  },
  {
    id: "hayd-is-excuse",
    category: "basics",
    question: "Is menstruation a punishment or an illness in the Qurʾān?",
    answer:
      "The Qurʾān calls it 'adhā (2:222) — a hurt or ailment — and the Prophet ﷺ told ʿĀʾishah (RA) that it is what Allah decreed for the daughters of Ādam. Fiqh treats menstruating women under the category of legal excuse: obligations she cannot physically perform are lifted, without sin and without any need to compensate.\n\nThe Prophet ﷺ described women as 'deficient in ṣalāh and ṣawm' only in the technical sense that prayer and fasting are suspended — and he immediately explained that missed fasts (unlike prayers) are made up. Scholars are unanimous that the exemption is a mercy designed around a woman's body, not a statement of lesser worth.",
    source: "IslamQA.info · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/181598",
    tags: ["Quran 2:222", "mercy", "exemption"],
  },

  // ─────────────────────────── Nifās (Postpartum) ───────────────────────────
  {
    id: "what-is-nifas",
    category: "nifas",
    question: "What is nifās and how long can it last?",
    answer:
      "Nifās is the bleeding that follows childbirth (including most of a delivery by caesarean). It follows the same exemptions as ḥayḍ: prayer and fasting pause, and worship shifts to dhikr and duʿā while the body recovers.\n\nDuration is capped by the schools: the Ḥanafī, Mālikī and Ḥanbalī positions commonly cite 40 days, while the Shāfiʿī school allows up to 60 days. If bleeding stops earlier, ghusl and prayer resume immediately — there is no obligation to wait out the maximum. If bleeding continues beyond the cap, the overflow is treated as istiḥāḍah and prayer resumes with the irregular-bleeding rules.",
    madhabNotes:
      "Ḥanafī/Mālikī/Ḥanbalī: up to 40 days · Shāfiʿī: up to 60 days · earlier stop = resume immediately.",
    source: "IslamQA.org · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/50308",
    tags: ["nifas", "40 days", "60 days", "postpartum"],
  },
  {
    id: "nifas-stops-early",
    category: "nifas",
    question: "Bleeding stopped after two weeks — can I pray and fast now?",
    answer:
      "Yes. All four schools agree that when postpartum bleeding stops, purity begins without waiting for day 40. Perform ghusl and resume ṣalāh; if it is Ramadan, fast. The remaining 'nifās days' are simply cancelled — they are not reserved for you.\n\nIf spotting returns within the maximum nifās window (e.g. day 30 after stopping at day 14), the majority position treats it as a resumption of nifās. Some Shāfiʿī jurists treat the return after 15+ pure days as ḥayḍ-if-habitual. Track your days in Noor Cycle and take the pattern to a scholar if it stays irregular.",
    source: "IslamQA.org",
    sourceUrl: "https://islamqa.info/en/answers/284753",
    tags: ["nifas stopped", "resume prayer", "returning bleeding"],
  },
  {
    id: "no-nifas-bleeding",
    category: "nifas",
    question: "I gave birth but saw almost no bleeding — is nifās still counted?",
    answer:
      "Nifās exists only when there is actual post-birth bleeding. If a woman delivers and bleeds for just an hour or a day, that hour or day is nifās and the rest is purity. If she sees no blood at all — which is rare but recorded — she is simply pure and prays normally; there is no symbolic nifās period.\n\nPractical rule: ghusl and prayer resume as soon as bleeding stops or, in the no-bleeding case, immediately after the birth itself once she is physically able.",
    source: "IslamQA.org",
    sourceUrl: "https://islamqa.info/en/answers/140621",
    tags: ["no bleeding", "caesarean", "immediate purity"],
  },
  {
    id: "pregnancy-bleeding",
    category: "nifas",
    question: "How is bleeding during pregnancy classified?",
    answer:
      "The jumhur (Ḥanafī, Mālikī, Shāfiʿī) treat bleeding during a healthy pregnancy as istiḥāḍah — irregular bleeding, not menstruation. A pregnant woman prays and fasts normally, performing wuḍū for each prayer time (the Ḥanafī detail) because the persistent discharge nullifies wuḍū.\n\nAfter a miscarriage the classification depends on how much of the baby had formed: if human features were visible, the bleeding is nifās; before that point, most jurists treat it as irregular bleeding. This is a sensitive case — combine your doctor's guidance with a scholar's ruling rather than deciding alone.",
    madhabNotes:
      "Jumhur: pregnancy bleeding = istiḥāḍah (keep praying) · after miscarriage with formed features = nifās.",
    source: "SeekersGuidance · IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/23400",
    tags: ["pregnancy", "miscarriage", "istihaadah"],
  },

  // ────────────────────────────── Istiḥāḍah ────────────────────────────────
  {
    id: "what-is-istihadha",
    category: "istihadha",
    question: "What is istiḥāḍah and what must I do about worship?",
    answer:
      "Istiḥāḍah is bleeding that falls outside the pattern of true menses: flow beyond your school's maximum, blood between habitual periods, bleeding during pregnancy, or bleeding caused by illness (a common example is a hormonal condition or fibroids).\n\nIts key ruling: it never pauses worship. You pray every prayer and you fast, taking practical measures — absorbent protection, frequent changes, and a fresh wuḍū at the rhythm your madhab requires. The Prophet ﷺ told Fāṭimah bint Abī Ḥubaysh, whose bleeding was istiḥāḍah: 'Leave the prayer the days your menses used to come, then bathe and pray' — establishing that abnormal flow is excused, not prohibitive.",
    source: "IslamQA.info · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/68818",
    tags: ["istihadha", "keep praying", "fatimah bint hubaysh"],
  },
  {
    id: "istihadha-wudu",
    category: "istihadha",
    question: "How often do I make wuḍū with continuous spotting?",
    answer:
      "The schools differ on rhythm. The Ḥanafī position: the persistent flow nullifies wuḍū at the start of each prayer's time, so make a fresh wuḍū for every fard prayer (and its tarāwīḥ/witr attached to it). The Shāfiʿī and Ḥanbalī positions: one wuḍū suffices for a fard prayer provided it was made after the time entered; the Mālikī position similarly excuses the continuous flow.\n\nAll schools agree you may pray sunnah and read dhikr between prayers with that wuḍū. None of this requires perfection — Islam excused the woman in the ḥadīth who tied a cloth and carried on.",
    madhabNotes:
      "Ḥanafī: fresh wuḍū each prayer time · Shāfiʿī/Ḥanbalī: one wuḍū after time enters · Mālikī: flow is excused.",
    source: "IslamQA.org",
    sourceUrl: "https://islamqa.info/en/answers/68810",
    tags: ["wudu", "continuous bleeding", "prayer rhythm"],
  },
  {
    id: "constant-flow-habit",
    category: "istihadha",
    question: "I bleed almost every day — how do I know which days are my menses?",
    answer:
      "When flow never stops, fiqh uses your habit (ādah) as the splitter. If you previously had a habitual period — say 6 days monthly — those 6 days (from the start of your habitual time) are still counted as ḥayḍ even while blood continues, and the remaining days are istiḥāḍah during which you pray and fast.\n\nIf you never established a habit, or medical treatment changes everything, a scholar helps you fix a working habit from your history. The goal of the whole exercise is worship with a calm heart, not anxiety over every spot — the sharīʿah classifies bleeding so that life stays livable.",
    source: "SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/366116",
    tags: ["habit", "aadah", "constant bleeding"],
  },
  {
    id: "istihadha-fast",
    category: "istihadha",
    question: "Can I fast with istiḥāḍah and is my fast valid?",
    answer:
      "Yes — fasting with istiḥāḍah is fully valid in all four schools. The bleeding does not break the fast and there is no obligation to make anything up afterwards. Ghusl is not required for fasting (though cleanliness is always encouraged).\n\nCombine it with the wuḍū rhythm of your madhab for the pre-dawn and evening prayer times, and you are complete. Many women with persistent bleeding fast entire Ramadans this way — it is precisely the scenario the concession was designed for.",
    source: "IslamQA.org",
    sourceUrl: "https://islamqa.info/en/answers/130021",
    tags: ["fasting valid", "ramadan", "no makeup"],
  },

  // ────────────────────────── Prayer & Worship ──────────────────────────────
  {
    id: "makeup-prayers",
    category: "prayer",
    question: "Do I have to make up the prayers I missed during my period?",
    answer:
      "No — and this is the position of all four Sunni schools. Prayers missed while menstruating are excused completely; there is no qaḍāʾ, no expiation and no sin. The Prophet ﷺ told ʿĀʾishah (RA): 'That which befalls her — the menses — is that she leaves the prayer,' and when she asked whether the prayers would be made up, this exemption was established as final.\n\nSo when your period ends, you simply continue from the current prayer. Many new Muslims and reverts assume a mountain of qaḍāʾ awaits them — it does not. Allah lifted the burden entirely.",
    source: "IslamQA.info · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/111522",
    tags: ["qada", "no makeup", "all schools agree"],
  },
  {
    id: "dhikr-dua-during-hayd",
    category: "prayer",
    question: "Can I make duʿā, dhikr and salawāt while menstruating?",
    answer:
      "Yes — dhikr, duʿā, salawāt, istighfār and every form of remembrance remain fully open. The prohibition debate concerns the muṣḥaf and formal recitation, not the tongue remembering Allah. ʿĀʾishah (RA) reported that the Prophet ﷺ would rest in her lap during her menses and recite the Qurʾān — while she listened.\n\nUse this time deliberately: the tasbīḥ counter in Noor Cycle's Fiqh tab, duʿā books read with the intention of duʿā, listening to recitation, and whispered personal duʿā are all recommended. Women often describe these weeks as their most spiritually intimate — lean into it.",
    source: "SeekersGuidance · IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/5048",
    tags: ["dhikr", "dua", "listening to quran"],
  },
  {
    id: "mosque-entry",
    category: "prayer",
    question: "May I enter or sit in the mosque during my period?",
    answer:
      "The schools distinguish passing from staying. The Ḥanafī school permits passing through for a need but discourages lingering inside. The Shāfiʿī and Ḥanbalī schools discourage both entry and staying, while the Mālikī school is the most lenient about entering. No school forbids entering for study circles held outside the prayer hall, Islamic events in separate halls, or the courtyards of large masjids.\n\nFor Eid prayer at an open musallā (prayer ground), women attend regardless of state — the Sunnah explicitly includes menstruating women at the Eid grounds, though they skip the prayer itself. When in doubt at a new mosque, ask the administration for the women's arrangement.",
    madhabNotes:
      "Ḥanafī: pass through ok, lingering discouraged · Shāfiʿī/Ḥanbalī: avoid · Mālikī: entry permitted · Eid ground: open to all women.",
    source: "SeekersGuidance · IslamQA.org",
    sourceUrl: "https://islamqa.info/en/answers/60213",
    tags: ["mosque", "eid prayer", "musalla"],
  },
  {
    id: "tawaf-itikaf",
    category: "prayer",
    question: "What about tawāf and iʿtikāf while menstruating?",
    answer:
      "Tawāf is a prayer by the Prophet's ﷺ wording, so it is invalid in a state of ḥayḍ by consensus. A pilgrim whose menses begin before tawāf waits until purity; if menses begin after tawāf, the remaining rites continue (saʿī and other acts do not require the same state per many scholars, though tawāf al-wadāʿ is waived for menstruating women as a hardship concession).\n\nIʿtikāf requires staying in the mosque, which ties it to the mosque-entry rules above — most jurists therefore do not allow menstruating women to observe iʿtikāf in the masjid, while home-based spiritual retreat during the last ten nights is recommended for everyone.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/112271",
    tags: ["tawaf", "itikaf", "hajj rites"],
  },

  // ────────────────────────── Qurʾān & Masjid ───────────────────────────────
  {
    id: "touch-mushaf",
    category: "quran",
    question: "Can I touch the muṣḥaf (Qurʾān) during my period?",
    answer:
      "The majority position — Ḥanafī, Shāfiʿī and Ḥanbalī — is that a menstruating woman does not touch the Arabic muṣḥaf directly, based on the letter to the people of Yemen: 'None touches it except the pure.' Practical allowances are widely given: reading with gloves, using a cloth or tray, or reading from a tafsīr/translation in which Qurʾānic text is a minority. The Mālikī school is comparatively lenient and permits touching with clean hands.\n\nAlmost all contemporary fatwa bodies (including those on IslamQA platforms) allow touching phones and tablets running Qurʾān apps, since a screen is not a muṣḥaf.",
    madhabNotes:
      "Ḥanafī/Shāfiʿī/Ḥanbalī: avoid direct touching; intermediaries allowed · Mālikī: permitted with clean hands.",
    source: "SeekersGuidance · IslamQA.org",
    sourceUrl: "https://islamqa.info/en/answers/152742",
    tags: ["mushaf", "touching quran", "apps"],
  },
  {
    id: "recite-quran-hayd",
    category: "quran",
    question: "May I recite the Qurʾān from memory while menstruating?",
    answer:
      "This is a genuine madhab difference. The Ḥanafī school restricts recitation even from memory during ḥayḍ. The Mālikī and Ḥanbalī schools dislike it but within a spectrum that many their own jurists relax for teachers, exam students and memorisation retention. The Shāfiʿī school's classical texts prohibit formal recitation while permitting dhikr and saying isolated āyāt for protection (like Āyat al-Kursī before sleep).\n\nThe unifying logic: protect the Qurʾān's sanctity, not block a woman's relationship with it. Ḥifẓ (memorisation) students worldwide follow their teachers' madhab rulings with revision via listening during menses. Pick your madhab's position — or the fatwa of a scholar you trust — and keep your connection to the Book alive.",
    madhabNotes:
      "Ḥanafī: recitation paused · Shāfiʿī: formal recitation paused, protective āyāt fine · Mālikī/Ḥanbalī: disliked but widely permitted for necessity.",
    source: "SeekersGuidance · IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/2564",
    tags: ["recitation", "hifz", "madhab difference"],
  },
  {
    id: "listen-quran-hayd",
    category: "quran",
    question: "Can I listen to Qurʾān recitation and read translations?",
    answer:
      "Yes, by agreement. Listening to recitation is permitted for a menstruating woman in every school — the ḥadīth of ʿĀʾishah (RA) listening beside the Prophet ﷺ is explicit. Translations, tafsīr and commentary books are also open to her in all schools since they are not the Arabic muṣḥaf itself (per the majority's definition).\n\nThis makes the period ideal for tape-and-translation study: play a sūrah, follow the translation, absorb the tafsīr. Many scholars specifically recommend building this habit so that worship never feels suspended — only redirected.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/36829",
    tags: ["listening", "translation", "tafsir"],
  },

  // ────────────────────────────── Purification ──────────────────────────────
  {
    id: "ghusl-after-hayd",
    category: "purification",
    question: "How do I perform the ghusl after my period?",
    answer:
      "The Prophet's ﷺ own description to ʿĀʾishah (RA): make the intention, wash your hands, wash the private area with your left hand, then perform wuḍū like for prayer, and finally pour water over the whole body starting with the head, finishing with a final rinse. Water must reach the roots of the hair — undoing elaborate braids is not required (the Prophet ﷺ told Umm Salamah's questioner to pour three handfuls over her head); the Ḥanafī school asks that the roots get wet, which loose pouring achieves.\n\nAfter ghusl you are fully pure: pray, fast, touch the muṣḥaf, enter the mosque. If you are unsure whether bleeding stopped, ghusl is still valid once purity is reasonably established — Allah does not burden a soul beyond its perception.",
    source: "IslamQA.info · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/83172",
    tags: ["ghusl", "steps", "braids"],
  },
  {
    id: "purity-while-sleeping",
    category: "purification",
    question: "I found myself pure overnight — do I pray Fajr?",
    answer:
      "Yes. Whenever purity becomes established — even in the last minutes of a prayer's time — ghusl and the prayer are owed immediately. If a menstruating woman sees the discharge of purity before Fajr, she performs ghusl and prays Fajr; if she sees it after Fajr exits, she prays it as qaḍāʾ immediately (and it counts as being performed on time per many jurists, since purity arrived within the window's tail).\n\nThe classical example is the woman who finds purity at the very end of ʿAṣr: she prays ʿAṣr and Maghrib together after ghusl. The system is built so that not a single prayer is needlessly lost.",
    source: "IslamQA.org",
    sourceUrl: "https://islamqa.info/en/answers/37926",
    tags: ["fajr", "purity at night", "qada on time"],
  },
  {
    id: "checks-and-certainty",
    category: "purification",
    question: "How do I verify bleeding has truly stopped (cotton test etc.)?",
    answer:
      "The method used by the Prophet's ﷺ household and transmitted as practical guidance: place cotton or a soft cloth at the opening and check. If it comes out white/clean, purity is established; if stained red or yellow, bleeding continues. The classical jurists also treat a dry day with no discharge after habitual days as purity.\n\nModern pads and liners serve the same purpose. What matters legally is reasonable certainty, not microscopic inspection — and where genuine doubt persists, one prays on the safer assumption for that day and moves on without guilt.",
    source: "SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/296313",
    tags: ["cotton test", "certainty", "doubt"],
  },

  // ─────────────────────────────── Fasting ──────────────────────────────────
  {
    id: "fasting-ramadan-hayd",
    category: "fasting",
    question: "Can I fast while menstruating?",
    answer:
      "No — fasting during ḥayḍ is invalid in all four schools, and deliberately fasting while menstruating is not permitted. When menses begin mid-day in Ramadan, that day's fast breaks and is made up later; the remainder of her Ramadan continues once she is pure.\n\nThis is not a loss but a fiqh category: the fasts convert into qaḍāʾ with zero sin attached, while the prayers of the same days are fully excused with no qaḍāʾ at all. The Prophet ﷺ explained precisely this asymmetry — it is part of the religion's design, not an oversight.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/7852",
    tags: ["invalid fast", "breaks fast", "converts to qada"],
  },
  {
    id: "makeup-fasts",
    category: "fasting",
    question: "How and when do I make up the missed Ramadan fasts?",
    answer:
      "All schools require making up fasts missed due to ḥayḍ or nifās. The Ḥanafī school asks that they be completed before the next Ramadan arrives. The jumhur also urge promptness, though most jurists allow reasonable deferral for genuine weakness, pregnancy or nursing — with several fatwa councils permitting sequential deferral while the excuse persists.\n\nNo expiation (kaffārah) applies to missed fasts from menstruation in the majority position; kaffārah is the category of deliberately broken fasts like intercourse in Ramadan. Track your tally in Noor Cycle's Fiqh tab and chip away at it in Shawwāl and winter's short days — a fast made up is beloved worship on its own terms.",
    madhabNotes:
      "Ḥanafī: before next Ramadan · Jumhur: prompt but flexible with valid excuse · No kaffārah in the majority view.",
    source: "IslamQA.org · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/112102",
    tags: ["qada fasts", "deadline", "kaffarah"],
  },
  {
    id: "fasting-decision-night",
    category: "fasting",
    question: "Menses started after Fajr — what happens to my fast and that day's prayers?",
    answer:
      "If bleeding begins after Fajr enters, that day's fast is broken and becomes qaḍāʾ; the day's prayers are excused from the moment bleeding began. If bleeding begins before Fajr while she was fasting with intention, the fast still breaks (the whole day counts as ḥayḍ).\n\nThe mirror case: purity returns during the fasting day — she continues that day's fast if she had been fasting from the start; most jurists excuse her from completing it as a Ramadan fast but she still owes the qaḍāʾ if it broke. Ramadan's rules are mechanical enough that a single phone call to a scholar usually settles a whole month of anxiety.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/314110",
    tags: ["bleeding after fajr", "mid-day", "ramadan mechanics"],
  },

  // ──────────────────────────── Marital Rulings ─────────────────────────────
  {
    id: "intimacy-hayd",
    category: "marital",
    question: "What is permitted between spouses during menstruation?",
    answer:
      "Intercourse during ḥayḍ is prohibited by the Qurʾān itself (2:222) in all schools — no jurist disagrees. Everything short of it remains permissible: affection, kissing, embracing, and enjoying closeness. The Prophet ﷺ modelled a warm marriage during these days, and the verse that forbids intercourse immediately frames the same women as beloved companions: 'They are a pollution… so go in unto them as Allah commanded you' is followed by 'they are your garments and you are their garments.'\n\nAfter bleeding ends and ghusl is performed, full marital relations resume — the majority do not require waiting for an additional interval. Couples navigating medical conditions (like persistent spotting) should take the specific case to a scholar.",
    source: "IslamQA.info · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/36722",
    tags: ["intercourse", "2:222", "affection allowed"],
  },
  {
    id: "intimacy-nifas",
    category: "marital",
    question: "When may relations resume after childbirth?",
    answer:
      "The same rule as ḥayḍ: intercourse is prohibited while nifās bleeding continues, and permitted once bleeding stops and she performs ghusl — even if that is day 12 of a possible 40. The nifās maximum exists to classify prolonged bleeding, not to delay the reunion.\n\nPractical health note widely given by fatwa bodies: many physicians advise a postnatal check before resuming, and couples are free to wait for medical clearance without any fiqh objection — the sharīʿah's timeline is a maximum boundary, not a minimum schedule.",
    source: "IslamQA.org",
    sourceUrl: "https://islamqa.info/en/answers/128877",
    tags: ["postpartum", "ghusl", "resume relations"],
  },

  // ───────────────────────────── Ḥajj & ʿUmrah ──────────────────────────────
  {
    id: "umrah-hayd",
    category: "hajj",
    question: "Can I perform ʿUmrah or Ḥajj while menstruating?",
    answer:
      "A menstruating woman enters iḥrām, arrives in Makkah, makes ṭalbiyah and duʿā — everything except tawāf (and the saʿī tied to it) waits until she is pure, since tawāf is the pillar requiring purity. Women commonly plan ʿUmrah around predictable cycles, or take physician-approved pills to delay menses for the trip — permitted by the majority of fatwa councils provided the medication is safe for her.\n\nIf menses arrive mid-ʿUmrah, she does not cancel the iḥrām or leave Makkah in the Ḥanafī/Ḥanbalī frameworks (leaving the ḥaram boundary in iḥrām has its own rules) — she rests, worships by duʿā, and completes tawāf after ghusl. Hotels near the ḥaram exist precisely because of this ruling.",
    madhabNotes:
      "Tawāf requires purity in all schools · delaying menses by pills: permitted with medical safety · iḥrām itself: valid in ḥayḍ.",
    source: "IslamQA.info · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/49992",
    tags: ["umrah", "tawaf delay", "pills to delay"],
  },
  {
    id: "hajj-tawaf-ifadah",
    category: "hajj",
    question: "My menses started during Ḥajj — do I go home without completing?",
    answer:
      "No — the pilgrimage continues. Menses delay only the tawāf al-ifāḍah (and saʿī if not yet done): she stays with the group, performs stoning, sacrifice and the rest, and completes tawāf al-ifāḍah when pure, even if that extends her stay in Makkah. The Prophet ﷺ told ʿĀʾishah (RA), whose menses came before the ifāḍah: 'Do what the pilgrims do, but do not tawāf the House until you are pure.'\n\nThe one built-in concession: tawāf al-wadāʿ (the farewell tawāf) is waived for menstruating women per the majority, based on the instruction to ʿĀʾishah and the hardship principle — she may leave for the airport without it.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/40608",
    tags: ["tawaf al-ifadah", "farewell tawaf", "aisha"],
  },

  // ───────────────────────────── Life Stages ────────────────────────────────
  {
    id: "first-period",
    category: "life-stages",
    question: "My daughter just had her first period — what applies to her now?",
    answer:
      "Every rule of ḥayḍ applies from the very first period: prayer pauses, fasting pauses, ghusl and muṣḥaf rules engage. There is no minimum age in fiqh — biological onset is the trigger, and the young woman becomes legally responsible (mukallafah) gradually, exactly as a boy does at his threshold.\n\nPastoral wisdom from the fatwa platforms: pair the rulings with warmth. Teach her the ghusl, the 'my prayers pause but my duʿā doesn't' mindset, and the tracker habit (this is why Noor Cycle exists). A girl who learns her fiqh calmly at 12 approaches a lifetime of worship with confidence instead of shame.",
    source: "SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/623674",
    tags: ["first period", "mukallafah", "teaching"],
  },
  {
    id: "menopause-bleeding",
    category: "life-stages",
    question: "I'm past menopause and suddenly bleeding — is this menses?",
    answer:
      "Bleeding that returns long after a full year without periods is treated with caution: jurists across the schools lean towards classifying it as istiḥāḍah (irregular bleeding) — meaning prayer and fasting continue with the wuḍū rhythm — once a physician confirms the bleeding is abnormal rather than a genuine late period.\n\nThe Ḥanafī school's classical texts treat 55 as the outer age at which bleeding is presumed non-menstrual. Get the medical cause checked first (post-menopausal bleeding always merits a doctor), then take the fiqh label from a scholar so your worship is neither over-restricted nor neglected.",
    madhabNotes:
      "Ḥanafī: beyond ~55 bleeding is presumed istiḥāḍah · all schools: medical check + scholar's ruling.",
    source: "IslamQA.org · SeekersGuidance",
    sourceUrl: "https://islamqa.info/en/answers/459184",
    tags: ["menopause", "late bleeding", "istihaadah"],
  },
  {
    id: "contraception-cycle",
    category: "life-stages",
    question: "Is using contraception to regulate or delay my period allowed?",
    answer:
      "Most contemporary fatwa bodies (including answers on the three referenced platforms) permit hormonal contraception used to regulate debilitating cycles or to delay menses for Ḥajj, ʿUmrah or Ramadan — provided the method is medically safe for her and it does not cause permanent harm. It is a matter of well-being, not sin, and consulting a doctor is part of the ruling's conditions.\n\nWhat fiqh does not bless is any method chosen to permanently remove fertility without necessity. For cycle regulation specifically, note that the pill can also produce constant breakthrough bleeding — which pushes worship into istiḥāḍah complexity — so the decision is best made with both a physician and a scholar at the table.",
    source: "IslamQA.org · IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/36600",
    tags: ["contraception", "delay period", "medical"],
  },
  {
    id: "bleeding-months",
    category: "life-stages",
    question: "I've been bleeding for months — what do I do about worship?",
    answer:
      "First: see a doctor. Months of continuous flow is a medical condition (and treatable), and seeking cure is itself encouraged in the Sunnah. Fiqh then steps in with the istiḥāḍah toolkit: your old habitual days continue as ḥayḍ; everything else is irregular bleeding during which you pray and fast with the wuḍū rhythm of your madhab.\n\nIf you never had a stable habit, a scholar works one out with you from your history — the classical manuals contain entire chapters on exactly this. The verdict of the sharīʿah is always the same in spirit: your worship continues, adapted and honoured, and no amount of abnormal bleeding makes you spiritually disqualified.",
    source: "SeekersGuidance · IslamQA.org",
    sourceUrl: "https://islamqa.info/en/answers/153109",
    tags: ["continuous bleeding", "habit", "worship continues"],
  },

  // ─────────────────── Extended library (36–50) ───────────────────

  {
    id: "istihadha-renew-wudu",
    category: "istihadha",
    question: "Does istiḥāḍah break wudu for every prayer?",
    answer:
      "Yes — the majority position is that istiḥāḍah (irregular bleeding) does not stop prayer, and it is treated like ongoing nullifiers such as continuous wind: wudu is made fresh for the entrance of each prayer time, and that single wudu is enough for all the prayers of that particular time, fard and nāfilah alike.\n\nSo if the time of ẓuhr enters, she performs wudu and prays ẓuhr and any optional prayers with it; when ʿaṣr enters she renews wudu — even if the bleeding never stops. She may also delay ghusl-free prayer to the end of the time if renewing wudu at the start of every time feels burdensome, but delaying out of laziness is not permitted. It is recommended (mustaḥabb) for her to also make a small wudu for every prayer beyond the first, following the stronger view.",
    madhabNotes:
      "Ḥanafī: one wudu per prayer-time entrance; some Ḥanafī scholars recommend a fresh wudu per fard prayer · Shāfiʿī/Ḥanbalī: one wudu at each time's entrance is sufficient · Mālikī: similar, with detail on confused vs established bleeding.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/113460",
    tags: ["istihadha", "wudu", "prayer times", "renewing ablution"],
  },
  {
    id: "delay-period-medication",
    category: "basics",
    question: "May I take medication to delay my period for Ramadan or Hajj?",
    answer:
      "Yes, delaying menstruation with hormonal pills (such as norethisterone) is permissible when there is no medical harm, because there is no Islamic text forbidding it and the purpose — standing for the full fast or performing Ḥajj in purity — is honourable. It must be started a few days before the period is due and continued without interruption until the desired day, following a doctor's guidance on dose and duration.\n\nThree cautions matter. First, take a doctor's advice, especially with health conditions or other medication. Second, if the medication fails and bleeding comes anyway, that bleeding is ḥayḍ and its rulings apply — the attempt does not change reality. Third, the choice is optional, not an obligation: using one's natural cycle and making up the fasts later is equally acceptable, and no one should feel forced into medication.",
    madhabNotes:
      "All schools permit it in principle · scholars add: no proven harm, doctor consultation, and bleeding that comes despite the pills counts as ḥayḍ.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/20467",
    tags: ["delaying period", "pills", "ramadan", "hajj", "norethisterone"],
  },
  {
    id: "bleeding-stops-midday",
    category: "prayer",
    question: "My bleeding stopped in the middle of the day — must I pray that prayer?",
    answer:
      "When bleeding stops — whether at dawn, mid-day or any moment — the state of ḥayḍ ends at that instant, and the normal duties return immediately after ghusl. If the bleeding stops within the time of a particular prayer and there is enough of that prayer's time left to perform ghusl and pray, even the minimum, she must perform that prayer; scholars describe the standard as enough time for ghusl plus one rakʿah of the fard.\n\nFor example, if bleeding stops during the ẓuhr window, she makes ghusl and prays ẓuhr. If it stops near the very end of the window with no time left even for ghusl and one rakʿah, ẓuhr is not owed and ʿaṣr is not made up for it — ḥayḍ excuses what was inside it. But a prayer whose entire time overlapped her pure state must be performed.",
    madhabNotes:
      "All schools: ghusl on purification and prayer of whatever time remains · difference only in edge cases of niyabah (substitution) between prayers.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/117671",
    tags: ["bleeding stops", "ghusl", "prayer time", "making up"],
  },
  {
    id: "beginner-no-habit",
    category: "basics",
    question: "I have no established cycle habit — how is my bleeding classified?",
    answer:
      "A beginner (mubtadiʾah) — a girl at her first periods, or a woman whose habit was lost — is classified by combining duration, blood signs and purity gaps rather than by habit. The schools give practical formulas: for the Ḥanafīs, bleeding up to 10 days with real menstrual signs is ḥayḍ and the rest of any continuous flow is istiḥāḍah; Shāfiʿīs extend the beginner's maximum to 15 days and split beyond it; Ḥanbalīs work with a 15-day framework as well.\n\nThe Mālikī approach looks first at the blood itself: genuine menstrual blood (dark, warm, flowing) is ḥayḍ regardless of length, with protective outer limits applied in continuous-flow cases. In every school the goal is the same — to give the beginner a workable estimate so she can pray and fast without anxiety, and edge cases are settled with a knowledgeable scholar rather than guesswork.",
    madhabNotes:
      "Ḥanafī: max 10 days for a beginner · Shāfiʿī/Ḥanbalī: up to 15 days · Mālikī: judged by blood signs, with limits only for stubborn flow.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/148451",
    tags: ["beginner", "mubtadia", "first classification", "no habit"],
  },
  {
    id: "nifas-before-birth",
    category: "nifas",
    question: "If bleeding starts before the baby is born, is it nifās?",
    answer:
      "No. Nifās is, by definition, the bleeding that follows childbirth — its cause is the delivery itself. Blood that appears before the birth is not nifās even if it comes days before, together with early labour signs; it takes the ruling of ḥayḍ if it carries menstrual characteristics and falls within menstrual bounds, or istiḥāḍah otherwise.\n\nPractically this means a woman who sees such blood before delivery continues praying and fasting if the blood is istiḥāḍah, performing wudu for each prayer time; after the baby arrives she stops prayers for the nifās period. The moment of birth — when the greater part of the baby emerges — is the switching point between the two states.",
    madhabNotes:
      "Ḥanafī: bleeding before birth is istiḥāḍah unless it is true ḥayḍ · jumhur agree the dividing line is the delivery itself.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/6944",
    tags: ["nifas", "before birth", "bleeding", "istihadha"],
  },
  {
    id: "nifas-40-days",
    category: "nifas",
    question: "Is it true that nifās lasts exactly 40 days?",
    answer:
      "Forty days is a well-known maximum in the Ḥanafī school — bleeding that continues beyond it is divided into nifās (the first 40 days) and istiḥāḍah. But it is not a fixed duration that every woman must complete: the majority of scholars (Shāfiʿīs, Mālikīs, Ḥanbalīs) hold that nifās has no set maximum and lasts only as long as the postnatal blood flows, commonly a few weeks.\n\nIn every school, the moment the bleeding fully stops — even on day 12 or day 25 — the woman is pure: she makes ghusl and returns to prayer and fasting, without waiting for day 40. And if bleeding stops and returns within her school's window, the days combine into one nifās period. The '40' is a ceiling used for classification, not a countdown to follow.",
    madhabNotes:
      "Ḥanafī: 40 days as the outer limit · Shāfiʿī/Ḥanbalī: 60 days as outer limit · Mālikī: no numeric limit — judged by bleeding itself.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/319",
    tags: ["nifas", "40 days", "postpartum", "maximum"],
  },
  {
    id: "hajj-hayd-order",
    category: "hajj",
    question: "My menses came during Hajj — which rites do I still perform?",
    answer:
      "A menstruating pilgrim performs every rite that involves no prayer: she continues the tawāf qudūm if not yet done on arrival, stands at ʿArafah, spends the nights of Muzdalifah and Minā, stones the pillars, and performs the saʿī — none of these require purity. What she postpones is only ritual-prayer acts: tawāf al-ifāḍah (which also blocks the saʿī of ifāḍah until purified) and the two rakʿahs behind Maqām Ibrāhīm.\n\nShe keeps delaying tawāf al-ifāḍah until she is pure and makes ghusl; if her departure flight arrives before she can complete it, she performs it at the last possible moment, and if leaving without it is unavoidable she offers a fidyah (sacrifice) in Minā — the tawāf itself does not fall away. Menstruation never excuses the standing at ʿArafah, so travel plans must always be built around completing the tawāf.",
    madhabNotes:
      "All schools: rites other than tawāf and prayer continue during menses · fidyah on forced departure without ifāḍah tawāf (Ḥanafī: always fidyah; jumhur: fidyah when she departs before purifying).",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/49027",
    tags: ["hajj", "menses", "tawaf order", "fidyah"],
  },
  {
    id: "quran-phone-menses",
    category: "quran",
    question: "May I read the Qur'an from my phone while menstruating?",
    answer:
      "The majority of contemporary scholars permit a menstruating woman to read the Qur'an from a phone or tablet, because the digital text is not a muṣḥaf — the strict prohibition attaches to touching the written codex itself, and what is displayed on a screen is not the physical muṣḥaf. Reciting from memory is permitted by all schools except the strictest Ḥanafī and Ḥanbalī positions that dislike ritual recitation during menses.\n\nA widely-followed middle path — suited to Ramadan and Qur'an classes — allows her to read for fear of forgetting, for study, or for dhikr-rich selections, without considering it sinful. Women who prefer the stricter view can listen to recitation instead, which no school forbids. Each position is respectable; none makes her a sinner for turning the screen of a tafsīr app during her period.",
    madhabNotes:
      "Mālikī/Shāfiʿī (commonly cited): permitted to read, even from muḥaf, fearing forgetfulness · Ḥanafī/Ḥanbalī: dislike reciting from memory, stricter on the muṣḥaf · phone text: permitted by the majority of contemporary fatwa bodies.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/4643",
    tags: ["quran", "phone", "menses", "digital mushaf"],
  },
  {
    id: "tayammum-harm",
    category: "purification",
    question: "Water harms me — how does tayammum work?",
    answer:
      "When using water would worsen an illness, delay healing, or cause unbearable chill, using water is excused and tayammum replaces wudu and ghusl alike: strike clean earth (or anything with fine dust — stone, wall, packed soil) once for the face and once for the hands up to the elbows, after intending purification. The Qur'ān names the excuse directly: 'do not kill yourselves; Allah is merciful to you' (an-Nisāʾ 4:29) and 'Allah does not intend hardship for you' (al-Māʾidah 5:6).\n\nThe tayammum lasts like normal purity — it is broken by the usual nullifiers, and in the jumhur view one tayammum covers one fard prayer like one wudu. It ends the moment the excuse ends: if a wound heals or warm water becomes available, water must be used for the next purification. If a trusted doctor says water will harm her, ignoring that advice and washing is itself disliked and potentially sinful.",
    madhabNotes:
      "Ḥanafī: tayammum per fard prayer while the excuse lasts · jumhur: tayammum stands like wudu until nullified · all: excuse must be real or reliably diagnosed.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/20935",
    tags: ["tayammum", "illness", "water harm", "purification"],
  },
  {
    id: "wet-dream-women",
    category: "life-stages",
    question: "Do women have wet dreams, and when is ghusl required?",
    answer:
      "Yes — women experience sexual dreams and orgasm just as men do, and the fiqh of ghusl applies to them equally: ghusl becomes obligatory when she wakes and finds the physical signs — fluid that is clearly manī (with its known thickness and smell) or the sensation of climax she remembers upon waking. The Prophet ﷺ addressed this directly when a woman asked Umm Sulaym's famous question; he answered that a woman performs ghusl when she sees such discharge, phrased by him as: 'when she finds the fluid.'\n\nOrdinary arousal without emission, or thin moisture (madhī) alone, requires only wudu, not ghusl, in the stronger position. If she is unsure what she felt, the default is purity until the sign of full emission is established. None of this is shameful — the companions asked these questions openly, and the Prophet ﷺ answered them plainly, telling Umm Sulaym's questioner to wash.",
    madhabNotes:
      "All schools: ghusl obligatory on experienced emission/orgasm · Ḥanafī: any liquid felt on waking with satisfaction implies ghusl · jumhur: require clear manī signs or remembered climax.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/405054",
    tags: ["wet dream", "ghusl", "mani", "women"],
  },
  {
    id: "withdrawal-bleeding",
    category: "basics",
    question: "How is bleeding from hormonal pills or implants classified?",
    answer:
      "Breakthrough bleeding caused by hormonal contraceptives, injections or implants is not natural ḥayḍ, because its cause is the medication disturbing the cycle rather than the womb's natural timing. Scholars therefore treat it like other abnormal bleeding: if it carries no clear menstrual character and interrupts a previously regular cycle, it is judged as istiḥāḍah — she prays and fasts, performing wudu for each prayer time — while her original habit, if still identifiable, is used to mark when a true period would have been.\n\nWhere the medication restarts predictable, recognisable monthly bleeding (as with some combined pills taken with a break week), many scholars accept that new pattern as the effective ḥayḍ. Because every product behaves differently, the practical rule is: watch whether bleeding settles into a monthly rhythm with menstrual signs — if yes, treat it as ḥayḍ; if it is scattered, spotting-like or continuous, treat it as istiḥāḍah and keep worshipping.",
    madhabNotes:
      "Contemporary fatwa consensus: device/pill-induced irregular bleeding is classified as istiḥāḍah unless it regains a regular monthly pattern.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/296742",
    tags: ["hormonal bleeding", "pills", "implant", "classification"],
  },
  {
    id: "joining-prayers-bleeding",
    category: "prayer",
    question: "Heavy bleeding makes each wudu painful — may I join my prayers?",
    answer:
      "Combining ẓuhr with ʿaṣr, or maghrib with ʿishāʾ, at the time of the earlier one is a concession some schools grant for genuine hardship, and a woman who loses her wudu to continuous bleeding prayer-by-prayer is among the cases discussed for it. The Ḥanafī school does not permit joining for this reason at all; the Mālikīs allow it for hard, persistent excuses; Shāfiʿīs and Ḥanbalīs permit it for travelling and for illness of a comparable weight — with some scholars explicitly including stubborn istiḥāḍah that nullifies wudu repeatedly.\n\nBefore reaching for this concession, the standard solution is simpler: one wudu at each prayer-time entrance remains valid for the whole window, so a typical day needs only five wudus. If even that is unbearable — continual flow immediately cancelling purity — joining prayers according to her school's conditions, or the slightly later view of combining within the shrine of hardship, saves her prayers without abandoning them. A local scholar should set the exact practice for her case.",
    madhabNotes:
      "Ḥanafī: no joining for bleeding · Mālikī: allowed for persistent hardship · Shāfiʿī/Ḥanbalī: allowed for travel and grave excuse; heavy istiḥāḍah is treated as such by many scholars.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/151034",
    tags: ["joining prayers", "jam bayn", "hardship", "istihadha"],
  },
  {
    id: "intimacy-pure-days",
    category: "marital",
    question: "Which days are best — and which are hardest — for intimacy in the cycle?",
    answer:
      "Intimacy is fully permitted throughout the entire period of purity (ṭuhr) between two menstruations, from the moment the bleeding stops and ghusl is done until the next period begins — there is no day of the pure window that is forbidden. The Sunnah etiquette remains as it was revealed: complete ghusl before resuming, gentleness and mutual pleasure, and the Prophetic guidance against withdrawing to harm conception when a couple has not agreed to it.\n\nTwo cycle-related points are worth knowing. Immediately after the bleeding ends, some scholars recommend waiting until a discharge of purity is seen (Mālikī practice), while the majority are satisfied with certainty that bleeding has finished and ghusl. And during the final days when bleeding has reduced to brownish spotting, the schools split between treating it as ongoing ḥayḍ (Ḥanafī caution) or as purity (Mālikī reliance on signs) — the safe practice each couple settles with knowledge of their school.",
    madhabNotes:
      "Majority: purity resumes once bleeding certainly stops and ghusl is done · Mālikī: wait for a clear sign of purity · Ḥanafī: brown discharge within the habit is still ḥayḍ.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/5560",
    tags: ["intimacy", "pure days", "tuhr", "etiquette"],
  },
  {
    id: "feed-poor-instead",
    category: "fasting",
    question: "Can a menstruating woman feed the poor instead of making up her fasts?",
    answer:
      "No — for ordinary menstruation, feeding the poor does not replace the fasts. Every school agrees that a menstruating woman who missed Ramadan days owes qaḍāʾ (making up the fasts) later, and that is the only substitute; the Prophet ﷺ said plainly, in the narration of ʿĀʾishah: 'when we menstruate we are commanded to make up the fasts and not commanded to make up the prayers.'\n\nFeeding (fidyah) instead of fasting belongs to a different group entirely: the elderly who can never fast, and the permanently ill with no hope of recovery — and even some of them are advised by Ḥanafīs to keep trying when strength returns. A temporary condition like ḥayḍ always waits for its days to come. So the plan for missed days is simple and hopeful: recover them one by one through the year before the next Ramadan, at whatever pace her body allows.",
    madhabNotes:
      "All four schools: qaḍāʾ only for hayd days · fidyah-for-fasting is reserved for permanent incapacity (elderly/chronic illness).",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/49768",
    tags: ["fidyah", "making up fasts", "menses", "ramadan"],
  },
  {
    id: "ghusl-mistakes",
    category: "purification",
    question: "What are the common mistakes in the ghusl after a period?",
    answer:
      "The ghusl of ḥayḍ is a full ghusl, and most mistakes are simple omissions. The classical order is: wash the hands, wash the private parts, form the intention, wash the whole body beginning with the right side, then the left, ensuring water reaches the roots of the hair everywhere — plaited hair may stay plaited while water is poured over it three times (Sunnah detail), but loose hair must be soaked through. Missing a patch — behind the ears, the back of the neck, between the toes, inside the navel, or the hairline under braids — is the most frequent error.\n\nOther common slips: rushing the ghusl immediately after bleeding stops before being certain the bleeding has truly ended (the Ḥanafīs advise delaying to the last of the habitual time and then washing); assuming wudu is included automatically (it is included by the majority when done in sequence, but making a separate wudu is safer); and praying before removing a pad or checking that spotting has fully ceased. If in doubt afterwards, completing the body once more removes the doubt.",
    madhabNotes:
      "Ḥanafī: Sunnah order with niyyah, right side first, three pours over plaited hair · jumhur: intention + full covering of every hair and skin is the essential core.",
    source: "IslamQA.info",
    sourceUrl: "https://islamqa.info/en/answers/50320",
    tags: ["ghusl", "mistakes", "order", "purification"],
  },
];
// __MORE_QAS__
