/**
 * Enhanced Quiz System with Gamification
 * Includes levels, achievements, streaks, and progression tracking
 */

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  timeLimit?: number; // in seconds
}

export interface QuizCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  unlocked: boolean;
  masteryLevel: number; // 0-100
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: {
    type: 'score' | 'streak' | 'category' | 'total' | 'accuracy' | 'level';
    value: number;
    category?: string;
  };
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface QuizStats {
  totalGames: number;
  totalCorrect: number;
  totalQuestions: number;
  currentStreak: number;
  bestStreak: number;
  xp: number;
  level: number;
  achievements: string[];
  categoryMastery: Record<string, number>;
  lastPlayed: string;
  dailyStreak: number;
  longestDailyStreak: number;
  lastDailyPlay: string;
}

export interface PowerUp {
  id: string;
  name: string;
  description: string;
  icon: string;
  uses: number;
  maxUses: number;
}

// Enhanced Quiz Categories
export const QUIZ_CATEGORIES: QuizCategory[] = [
  {
    id: 'pillars',
    name: 'Pillars of Islam',
    icon: '🏛️',
    color: 'bg-emerald-500',
    description: 'Test your knowledge of the five pillars',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'quran',
    name: 'Quran',
    icon: '📖',
    color: 'bg-blue-500',
    description: 'Explore the holy book of Islam',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'prophets',
    name: 'Prophets',
    icon: '👤',
    color: 'bg-purple-500',
    description: 'Learn about the prophets of Islam',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'prayer',
    name: 'Prayer & Worship',
    icon: '🙏',
    color: 'bg-orange-500',
    description: 'Master the art of Islamic worship',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'ramadan',
    name: 'Ramadan',
    icon: '🌙',
    color: 'bg-indigo-500',
    description: 'The blessed month of fasting',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'history',
    name: 'Islamic History',
    icon: '📚',
    color: 'bg-rose-500',
    description: 'Journey through Islamic heritage',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'angels',
    name: 'Angels',
    icon: '👼',
    color: 'bg-cyan-500',
    description: 'Discover the world of angels',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'hadith',
    name: 'Hadith',
    icon: '📜',
    color: 'bg-amber-500',
    description: 'Sayings of the Prophet Muhammad (PBUH)',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'aqeedah',
    name: 'Aqeedah',
    icon: '☝️',
    color: 'bg-sky-500',
    description: 'Islamic creed and theology',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'seerah',
    name: 'Seerah',
    icon: '🕊️',
    color: 'bg-teal-500',
    description: 'Life of the Prophet Muhammad (PBUH)',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'sahabah',
    name: 'Sahabah',
    icon: '🤝',
    color: 'bg-lime-500',
    description: 'Companions of the Prophet',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'tafsir',
    name: 'Tafsir',
    icon: '📜',
    color: 'bg-violet-500',
    description: 'Quranic commentary and exegesis',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'fiqh',
    name: 'Fiqh',
    icon: '⚖️',
    color: 'bg-stone-500',
    description: 'Islamic jurisprudence',
    unlocked: true,
    masteryLevel: 0
  },
  {
    id: 'arabic',
    name: 'Arabic',
    icon: '📝',
    color: 'bg-rose-500',
    description: 'Arabic language and grammar',
    unlocked: true,
    masteryLevel: 0
  }
];

// Enhanced Questions with difficulty and points
export const ENHANCED_QUESTIONS: QuizQuestion[] = [
  // Easy Questions (10 points each)
  {
    id: 'pillars_1',
    question: 'What is the first pillar of Islam?',
    options: ['Salah (Prayer)', 'Shahada (Declaration of Faith)', 'Zakat (Charity)', 'Sawm (Fasting)'],
    correctAnswer: 1,
    explanation: 'The Shahada (Declaration of Faith) is the first pillar: "There is no god but Allah, and Muhammad is His Messenger."',
    category: 'pillars',
    difficulty: 'easy',
    points: 10,
    timeLimit: 30
  },
  {
    id: 'quran_1',
    question: 'How many surahs are in the Quran?',
    options: ['100', '114', '120', '99'],
    correctAnswer: 1,
    explanation: 'The Quran contains 114 surahs (chapters).',
    category: 'quran',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'prophets_1',
    question: 'Who was the first prophet in Islam?',
    options: ['Prophet Musa (AS)', 'Prophet Ibrahim (AS)', 'Prophet Adam (AS)', 'Prophet Nuh (AS)'],
    correctAnswer: 2,
    explanation: 'Prophet Adam (AS) was the first prophet and the first human being created by Allah.',
    category: 'prophets',
    difficulty: 'easy',
    points: 10,
    timeLimit: 25
  },
  {
    id: 'prayer_1',
    question: 'How many obligatory prayers are there in a day?',
    options: ['3', '4', '5', '6'],
    correctAnswer: 2,
    explanation: 'Muslims are required to pray 5 times daily: Fajr, Dhuhr, Asr, Maghrib, and Isha.',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'ramadan_1',
    question: 'In which month was the Quran revealed?',
    options: ['Shawwal', 'Dhul Hijjah', 'Ramadan', 'Muharram'],
    correctAnswer: 2,
    explanation: 'The Quran was revealed in the month of Ramadan, specifically on Laylat al-Qadr.',
    category: 'ramadan',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'history_1',
    question: 'What is the name of Prophet Muhammad\'s (PBUH) first wife?',
    options: ['Aisha (RA)', 'Khadijah (RA)', 'Fatimah (RA)', 'Hafsa (RA)'],
    correctAnswer: 1,
    explanation: 'Khadijah bint Khuwaylid (RA) was the first wife of Prophet Muhammad (PBUH).',
    category: 'history',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'prayer_2',
    question: 'What direction do Muslims face during prayer?',
    options: ['East', 'West', 'Towards Makkah (Qibla)', 'North'],
    correctAnswer: 2,
    explanation: 'Muslims face the Kaaba in Makkah, known as the Qibla direction.',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'angels_1',
    question: 'Which angel is responsible for delivering revelations?',
    options: ['Mikail', 'Israfil', 'Jibril (Gabriel)', 'Azrael'],
    correctAnswer: 2,
    explanation: 'Angel Jibril (Gabriel) delivered Allah\'s revelations to the prophets.',
    category: 'angels',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'quran_2',
    question: 'What is the shortest surah in the Quran?',
    options: ['Al-Fatiha', 'Al-Ikhlas', 'Al-Kawthar', 'An-Nas'],
    correctAnswer: 2,
    explanation: 'Surah Al-Kawthar is the shortest surah with only 3 verses.',
    category: 'quran',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'pillars_2',
    question: 'What is Hajj?',
    options: ['Daily prayer', 'Fasting', 'Pilgrimage to Makkah', 'Charity'],
    correctAnswer: 2,
    explanation: 'Hajj is the annual pilgrimage to Makkah, required once in a lifetime for able Muslims.',
    category: 'pillars',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'prophets_2',
    question: 'Which prophet built the Kaaba?',
    options: ['Prophet Muhammad (PBUH)', 'Prophet Ibrahim (AS)', 'Prophet Musa (AS)', 'Prophet Isa (AS)'],
    correctAnswer: 1,
    explanation: 'Prophet Ibrahim (AS) and his son Ismail (AS) built the Kaaba.',
    category: 'prophets',
    difficulty: 'easy',
    points: 10,
    timeLimit: 25
  },
  {
    id: 'quran_3',
    question: 'How many juz (parts) is the Quran divided into?',
    options: ['20', '25', '30', '40'],
    correctAnswer: 2,
    explanation: 'The Quran is divided into 30 juz to facilitate reading over a month.',
    category: 'quran',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'prayer_3',
    question: 'What is the call to prayer called?',
    options: ['Salah', 'Adhan', 'Iqamah', 'Dua'],
    correctAnswer: 1,
    explanation: 'The Adhan is the Islamic call to prayer announced five times daily.',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'ramadan_2',
    question: 'What is the night of power called?',
    options: ['Laylat al-Qadr', 'Laylat al-Bara\'ah', 'Laylat al-Miraj', 'Laylat al-Isra'],
    correctAnswer: 0,
    explanation: 'Laylat al-Qadr (Night of Power) is better than a thousand months.',
    category: 'ramadan',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'angels_2',
    question: 'Which angel will blow the trumpet on the Day of Judgment?',
    options: ['Jibril', 'Mikail', 'Israfil', 'Azrael'],
    correctAnswer: 2,
    explanation: 'Angel Israfil is tasked with blowing the trumpet (Sur) on the Day of Judgment.',
    category: 'angels',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },

  // Medium Questions (20 points each)
  {
    id: 'quran_4',
    question: 'What is the longest surah in the Quran?',
    options: ['Al-Fatiha', 'Al-Baqarah', 'Al-Imran', 'An-Nisa'],
    correctAnswer: 1,
    explanation: 'Surah Al-Baqarah is the longest surah with 286 verses.',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'history_2',
    question: 'What year did the Hijra (migration to Madinah) occur?',
    options: ['610 CE', '622 CE', '630 CE', '632 CE'],
    correctAnswer: 1,
    explanation: 'The Hijra occurred in 622 CE, marking the start of the Islamic calendar.',
    category: 'history',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'pillars_3',
    question: 'What percentage of wealth is given as Zakat?',
    options: ['1%', '2.5%', '5%', '10%'],
    correctAnswer: 1,
    explanation: 'Zakat is 2.5% of one\'s savings and assets above the nisab threshold.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'prophets_3',
    question: 'How many prophets are mentioned in the Quran?',
    options: ['15', '25', '35', '45'],
    correctAnswer: 1,
    explanation: '25 prophets are mentioned by name in the Quran.',
    category: 'prophets',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'prayer_4',
    question: 'What is the prayer said after the Adhan called?',
    options: ['Salah', 'Iqamah', 'Dua', 'Witr'],
    correctAnswer: 1,
    explanation: 'The Iqamah is the call that signals the prayer is about to begin.',
    category: 'prayer',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'ramadan_3',
    question: 'What is the meal eaten before dawn during Ramadan called?',
    options: ['Iftar', 'Suhoor', 'Sahur', 'Dinner'],
    correctAnswer: 1,
    explanation: 'Suhoor (or Sahur) is the pre-dawn meal eaten before fasting begins.',
    category: 'ramadan',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'history_3',
    question: 'How many children did Prophet Muhammad (PBUH) have?',
    options: ['3', '5', '7', '9'],
    correctAnswer: 2,
    explanation: 'Prophet Muhammad (PBUH) had 7 children: 3 sons and 4 daughters.',
    category: 'history',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'angels_3',
    question: 'Which angel is responsible for natural phenomena?',
    options: ['Jibril', 'Mikail', 'Israfil', 'Azrael'],
    correctAnswer: 1,
    explanation: 'Angel Mikail is responsible for natural phenomena like rain and sustenance.',
    category: 'angels',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'quran_5',
    question: 'Which surah is known as "The Heart of the Quran"?',
    options: ['Al-Fatiha', 'Al-Baqarah', 'Yasin', 'Ar-Rahman'],
    correctAnswer: 2,
    explanation: 'Surah Yasin is often referred to as "The Heart of the Quran" due to its importance.',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 30
  },
  {
    id: 'pillars_4',
    question: 'During which month do Muslims perform Hajj?',
    options: ['Ramadan', 'Shawwal', 'Dhul Hijjah', 'Muharram'],
    correctAnswer: 2,
    explanation: 'Hajj is performed during the month of Dhul Hijjah, the 12th month of Islamic calendar.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'prophets_4',
    question: 'Which prophet is known as "Khalilullah" (Friend of Allah)?',
    options: ['Prophet Musa (AS)', 'Prophet Ibrahim (AS)', 'Prophet Isa (AS)', 'Prophet Nuh (AS)'],
    correctAnswer: 1,
    explanation: 'Prophet Ibrahim (AS) is known as "Khalilullah" or the Friend of Allah.',
    category: 'prophets',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'prayer_5',
    question: 'What is the voluntary prayer called?',
    options: ['Wajib', 'Sunnah', 'Nafl', 'Fard'],
    correctAnswer: 2,
    explanation: 'Nafl prayers are voluntary prayers that Muslims can perform for extra rewards.',
    category: 'prayer',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'ramadan_4',
    question: 'What is the special prayer performed during Ramadan nights?',
    options: ['Tahajjud', 'Tarawih', 'Witr', 'Isha'],
    correctAnswer: 1,
    explanation: 'Tarawih prayers are special prayers performed during Ramadan nights after Isha.',
    category: 'ramadan',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'history_4',
    question: 'What was the name of Prophet Muhammad\'s (PBUH) mother?',
    options: ['Amina', 'Khadijah', 'Fatimah', 'Aisha'],
    correctAnswer: 0,
    explanation: 'Amina bint Wahb was the mother of Prophet Muhammad (PBUH).',
    category: 'history',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'quran_6',
    question: 'Which surah begins with "In the name of Allah, the Most Gracious, the Most Merciful"?',
    options: ['All except one', 'All surahs', 'Only Makki surahs', 'Only Madani surahs'],
    correctAnswer: 0,
    explanation: 'All surahs except Surah At-Tawbah begin with Bismillah.',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },

  // Hard Questions (30 points each)
  {
    id: 'quran_7',
    question: 'What is the name of the chapter that does not begin with Bismillah?',
    options: ['Al-Fatiha', 'Al-Baqarah', 'At-Tawbah', 'An-Nas'],
    correctAnswer: 2,
    explanation: 'Surah At-Tawbah (The Repentance) is the only chapter that does not begin with Bismillah.',
    category: 'quran',
    difficulty: 'hard',
    points: 30,
    timeLimit: 30
  },
  {
    id: 'history_5',
    question: 'What was the name of Prophet Muhammad\'s (PBUH) father?',
    options: ['Abdullah', 'Abu Talib', 'Abbas', 'Hamza'],
    correctAnswer: 0,
    explanation: 'Abdullah ibn Abdul-Muttalib was the father of Prophet Muhammad (PBUH).',
    category: 'history',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'prophets_5',
    question: 'Which prophet spoke directly with Allah without an intermediary?',
    options: ['Prophet Musa (AS)', 'Prophet Muhammad (PBUH)', 'Prophet Ibrahim (AS)', 'Prophet Adam (AS)'],
    correctAnswer: 0,
    explanation: 'Prophet Musa (AS) spoke directly with Allah at Mount Sinai.',
    category: 'prophets',
    difficulty: 'hard',
    points: 30,
    timeLimit: 20
  },
  {
    id: 'prayer_6',
    question: 'What is the prayer performed during a solar eclipse called?',
    options: ['Kusuf', 'Khusuf', 'Istisqa', 'Tarawih'],
    correctAnswer: 0,
    explanation: 'Salat al-Kusuf is the prayer performed during a solar eclipse. Salat al-Khusuf is for a lunar eclipse.',
    category: 'prayer',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'ramadan_5',
    question: 'On which night of Ramadan was Laylat al-Qadr first revealed?',
    options: ['21st', '23rd', '27th', '29th'],
    correctAnswer: 2,
    explanation: 'Laylat al-Qadr is most commonly believed to be on the 27th night of Ramadan.',
    category: 'ramadan',
    difficulty: 'hard',
    points: 30,
    timeLimit: 30
  },
  {
    id: 'angels_4',
    question: 'Which angel takes souls at the time of death?',
    options: ['Jibril', 'Mikail', 'Israfil', 'Azrael'],
    correctAnswer: 3,
    explanation: 'Angel Azrael (Malak al-Mawt) is responsible for taking souls at the time of death.',
    category: 'angels',
    difficulty: 'hard',
    points: 30,
    timeLimit: 20
  },
  {
    id: 'quran_8',
    question: 'How many verses are there in Surah Al-Baqarah?',
    options: ['200', '286', '300', '350'],
    correctAnswer: 1,
    explanation: 'Surah Al-Baqarah contains 286 verses, making it the longest surah.',
    category: 'quran',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'pillars_5',
    question: 'What is the nisab threshold for Zakat in gold?',
    options: ['75 grams', '85 grams', '87.5 grams', '100 grams'],
    correctAnswer: 2,
    explanation: 'The nisab threshold for Zakat is 87.5 grams of gold or its equivalent value.',
    category: 'pillars',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'prophets_6',
    question: 'Which prophet was given the Zabur (Psalms)?',
    options: ['Prophet Musa (AS)', 'Prophet Dawud (AS)', 'Prophet Isa (AS)', 'Prophet Ibrahim (AS)'],
    correctAnswer: 1,
    explanation: 'Prophet Dawud (AS) was given the Zabur (Psalms).',
    category: 'prophets',
    difficulty: 'hard',
    points: 30,
    timeLimit: 20
  },
  {
    id: 'prayer_7',
    question: 'What is the prayer for seeking guidance called?',
    options: ['Istikhara', 'Hajat', 'Tahajjud', 'Witr'],
    correctAnswer: 0,
    explanation: 'Salat al-Istikhara is the prayer for seeking Allah\'s guidance.',
    category: 'prayer',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'ramadan_6',
    question: 'What is the Islamic term for breaking the fast?',
    options: ['Iftar', 'Suhoor', 'Fidyah', 'Kaffara'],
    correctAnswer: 0,
    explanation: 'Iftar is the meal eaten to break the fast at sunset during Ramadan.',
    category: 'ramadan',
    difficulty: 'hard',
    points: 30,
    timeLimit: 20
  },
  {
    id: 'history_6',
    question: 'What was the name of the cave where Prophet Muhammad (PBUH) received first revelation?',
    options: ['Cave of Hira', 'Cave of Thawr', 'Cave of Saur', 'Cave of Uhud'],
    correctAnswer: 0,
    explanation: 'Cave of Hira is where Prophet Muhammad (PBUH) received the first revelation.',
    category: 'history',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },

  // Additional Easy Questions
  {
    id: 'quran_9',
    question: 'Who revealed the Quran to Prophet Muhammad (PBUH)?',
    options: ['Angel Jibril', 'Angel Mikail', 'Angel Israfil', 'Directly from Allah'],
    correctAnswer: 0,
    explanation: 'Angel Jibril (Gabriel) revealed the Quran to Prophet Muhammad (PBUH) over 23 years.',
    category: 'quran',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'pillars_6',
    question: 'What is the Islamic term for fasting?',
    options: ['Zakat', 'Sawm', 'Salah', 'Hajj'],
    correctAnswer: 1,
    explanation: 'Sawm is the Arabic term for fasting, particularly during Ramadan.',
    category: 'pillars',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'prophets_7',
    question: 'Which prophet is known as "Musa" in Islam?',
    options: ['Moses', 'Abraham', 'Jesus', 'Noah'],
    correctAnswer: 0,
    explanation: 'Prophet Musa (AS) is the Islamic name for Moses.',
    category: 'prophets',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'prayer_8',
    question: 'What is the first prayer of the day?',
    options: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib'],
    correctAnswer: 0,
    explanation: 'Fajr is the dawn prayer, performed before sunrise.',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'ramadan_7',
    question: 'How many days does Ramadan last?',
    options: ['29', '30', '31', '28'],
    correctAnswer: 1,
    explanation: 'Ramadan lasts 29 or 30 days depending on the lunar calendar.',
    category: 'ramadan',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'history_7',
    question: 'Where did Prophet Muhammad (PBUH) migrate to?',
    options: ['Makkah', 'Madinah', 'Jerusalem', 'Baghdad'],
    correctAnswer: 1,
    explanation: 'Prophet Muhammad (PBUH) migrated from Makkah to Madinah in 622 CE.',
    category: 'history',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'angels_5',
    question: 'How many angels are mentioned by name in the Quran?',
    options: ['4', '7', '10', '12'],
    correctAnswer: 0,
    explanation: 'Four angels are mentioned by name in the Quran: Jibril, Mikail, Israfil, and Azrael.',
    category: 'angels',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },

  // Additional Medium Questions
  {
    id: 'quran_10',
    question: 'What does "Bismillah" mean?',
    options: ['Praise be to Allah', 'In the name of Allah', 'Allah is great', 'There is no god but Allah'],
    correctAnswer: 1,
    explanation: 'Bismillah means "In the name of Allah, the Most Gracious, the Most Merciful."',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'pillars_7',
    question: 'Who is exempt from fasting during Ramadan?',
    options: ['Children', 'Elderly', 'Travelers', 'All of the above'],
    correctAnswer: 3,
    explanation: 'Children, elderly, sick, pregnant, nursing mothers, and travelers are exempt from fasting.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'prophets_8',
    question: 'Which prophet could speak with animals?',
    options: ['Prophet Sulaiman (AS)', 'Prophet Musa (AS)', 'Prophet Isa (AS)', 'Prophet Nuh (AS)'],
    correctAnswer: 0,
    explanation: 'Prophet Sulaiman (AS) was given the ability to understand and speak with animals.',
    category: 'prophets',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'prayer_9',
    question: 'What is the congregation prayer called?',
    options: ['Jama\'ah', 'Witr', 'Tahajjud', 'Nafl'],
    correctAnswer: 0,
    explanation: 'Jama\'ah prayer is the congregational prayer led by an Imam.',
    category: 'prayer',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'ramadan_8',
    question: 'What is the Islamic term for the pre-dawn meal?',
    options: ['Iftar', 'Suhoor', 'Sahur', 'Dinner'],
    correctAnswer: 1,
    explanation: 'Suhoor is the meal eaten before dawn during Ramadan fasting.',
    category: 'ramadan',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'history_8',
    question: 'What was the first battle in Islam?',
    options: ['Battle of Badr', 'Battle of Uhud', 'Battle of Khaybar', 'Battle of Tabuk'],
    correctAnswer: 0,
    explanation: 'The Battle of Badr was the first major battle in Islam, fought in 624 CE.',
    category: 'history',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'angels_6',
    question: 'Which angel records human deeds?',
    options: ['Kiraman Katibin', 'Jibril', 'Mikail', 'Israfil'],
    correctAnswer: 0,
    explanation: 'Kiraman Katibin (Honorable Scribes) are the angels who record human deeds.',
    category: 'angels',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },

  // Additional Hard Questions
  {
    id: 'quran_11',
    question: 'Which surah is called "The Mother of the Quran"?',
    options: ['Al-Fatiha', 'Al-Baqarah', 'Al-Imran', 'An-Nisa'],
    correctAnswer: 0,
    explanation: 'Surah Al-Fatiha is called "Umm al-Quran" (Mother of the Quran).',
    category: 'quran',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'pillars_8',
    question: 'What is the compensation for missed fasts?',
    options: ['Fidyah', 'Kaffara', 'Zakat', 'Sadaqah'],
    correctAnswer: 0,
    explanation: 'Fidyah is the compensation for missed fasts, usually feeding a poor person.',
    category: 'pillars',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'prophets_9',
    question: 'Which prophet is mentioned most in the Quran?',
    options: ['Prophet Musa (AS)', 'Prophet Ibrahim (AS)', 'Prophet Muhammad (PBUH)', 'Prophet Isa (AS)'],
    correctAnswer: 0,
    explanation: 'Prophet Musa (AS) is mentioned most frequently in the Quran.',
    category: 'prophets',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'prayer_10',
    question: 'What is the prayer for rain called?',
    options: ['Istisqa', 'Kusuf', 'Khusuf', 'Istikhara'],
    correctAnswer: 0,
    explanation: 'Salat al-Istisqa is the prayer for rain during drought.',
    category: 'prayer',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'ramadan_9',
    question: 'What is the Islamic term for breaking fast with dates?',
    options: ['Iftar', 'Suhoor', 'Tamar', 'Rutab'],
    correctAnswer: 0,
    explanation: 'Iftar is the act of breaking the fast, traditionally with dates and water.',
    category: 'ramadan',
    difficulty: 'hard',
    points: 30,
    timeLimit: 20
  },
  {
    id: 'history_9',
    question: 'What year did Prophet Muhammad (PBUH) pass away?',
    options: ['622 CE', '630 CE', '632 CE', '634 CE'],
    correctAnswer: 2,
    explanation: 'Prophet Muhammad (PBUH) passed away in 632 CE in Madinah.',
    category: 'history',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'angels_7',
    question: 'Which angel questions souls in the grave?',
    options: ['Munkar and Nakir', 'Jibril and Mikail', 'Israfil and Azrael', 'Ridwan and Malik'],
    correctAnswer: 0,
    explanation: 'Munkar and Nakir are the angels who question souls in the grave.',
    category: 'angels',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },

  // Hadith Category Questions
  {
    id: 'hadith_1',
    question: 'What is the term for Prophet Muhammad\'s sayings?',
    options: ['Hadith', 'Sunnah', 'Quran', 'Fiqh'],
    correctAnswer: 0,
    explanation: 'Hadith are the recorded sayings and actions of Prophet Muhammad (PBUH).',
    category: 'hadith',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'hadith_2',
    question: 'Who compiled the most authentic Hadith collection?',
    options: ['Imam Bukhari', 'Imam Muslim', 'Imam Tirmidhi', 'Imam Abu Dawud'],
    correctAnswer: 0,
    explanation: 'Imam Bukhari compiled Sahih al-Bukhari, considered the most authentic Hadith collection.',
    category: 'hadith',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'hadith_3',
    question: 'What does the Hadith "Actions are judged by intentions" teach?',
    options: ['Importance of intentions', 'Value of actions', 'Need for prayer', 'Meaning of faith'],
    correctAnswer: 0,
    explanation: 'This famous Hadith emphasizes that the intention behind actions determines their value.',
    category: 'hadith',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'hadith_4',
    question: 'How many authentic Hadith collections are there?',
    options: ['4', '6', '8', '10'],
    correctAnswer: 1,
    explanation: 'There are six authentic Hadith collections known as "Sihah Sittah".',
    category: 'hadith',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'hadith_5',
    question: 'What is the chain of narrators in Hadith called?',
    options: ['Isnad', 'Matn', 'Sanad', 'Tarikh'],
    correctAnswer: 0,
    explanation: 'Isnad is the chain of narrators that authenticates a Hadith.',
    category: 'hadith',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },

  // Additional Comprehensive Questions
  {
    id: 'islamic_terms_1',
    question: 'What does "Taqwa" mean in Islam?',
    options: ['Fear of Allah', 'Prayer', 'Charity', 'Fasting'],
    correctAnswer: 0,
    explanation: 'Taqwa means God-consciousness or fear of Allah, leading to righteous behavior.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'islamic_terms_2',
    question: 'What is the meaning of "Insha\'Allah"?',
    options: ['If Allah wills', 'Thank Allah', 'Allah is great', 'There is no god but Allah'],
    correctAnswer: 0,
    explanation: 'Insha\'Allah means "If Allah wills" or "God willing".',
    category: 'pillars',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'quran_12',
    question: 'Which surah is known as "The Exordium"?',
    options: ['Al-Fatiha', 'Al-Baqarah', 'Al-Ikhlas', 'An-Nas'],
    correctAnswer: 0,
    explanation: 'Surah Al-Fatiha is also known as "The Exordium" or "The Opening".',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'quran_13',
    question: 'How many verses are in Surah Al-Fatiha?',
    options: ['5', '6', '7', '8'],
    correctAnswer: 2,
    explanation: 'Surah Al-Fatiha contains 7 verses and is recited in every prayer.',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'quran_14',
    question: 'Which surah is called "The Women"?',
    options: ['An-Nisa', 'Al-Baqarah', 'Al-Imran', 'Al-Ma\'idah'],
    correctAnswer: 0,
    explanation: 'Surah An-Nisa means "The Women" and discusses women\'s rights and family laws.',
    category: 'quran',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'prophets_10',
    question: 'Which prophet was swallowed by a whale?',
    options: ['Prophet Yunus (AS)', 'Prophet Musa (AS)', 'Prophet Nuh (AS)', 'Prophet Ibrahim (AS)'],
    correctAnswer: 0,
    explanation: 'Prophet Yunus (AS) was swallowed by a whale after fleeing from his people.',
    category: 'prophets',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'prophets_11',
    question: 'Which prophet could control the wind?',
    options: ['Prophet Sulaiman (AS)', 'Prophet Musa (AS)', 'Prophet Isa (AS)', 'Prophet Nuh (AS)'],
    correctAnswer: 0,
    explanation: 'Prophet Sulaiman (AS) was given control over wind, animals, and jinn.',
    category: 'prophets',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'prophets_12',
    question: 'Which prophet split the sea?',
    options: ['Prophet Musa (AS)', 'Prophet Ibrahim (AS)', 'Prophet Isa (AS)', 'Prophet Nuh (AS)'],
    correctAnswer: 0,
    explanation: 'Prophet Musa (AS) split the Red Sea to escape from Pharaoh.',
    category: 'prophets',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'prophets_13',
    question: 'Which prophet was born without a father?',
    options: ['Prophet Isa (AS)', 'Prophet Musa (AS)', 'Prophet Ibrahim (AS)', 'Prophet Adam (AS)'],
    correctAnswer: 0,
    explanation: 'Prophet Isa (AS) was born miraculously without a father.',
    category: 'prophets',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'prayer_11',
    question: 'What is the prayer before sunrise called?',
    options: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib'],
    correctAnswer: 0,
    explanation: 'Fajr prayer is performed before sunrise and is the first prayer of the day.',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'prayer_12',
    question: 'What is the late night prayer called?',
    options: ['Tahajjud', 'Witr', 'Isha', 'Tarawih'],
    correctAnswer: 0,
    explanation: 'Tahajjud is the voluntary late night prayer performed after Isha.',
    category: 'prayer',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'prayer_13',
    question: 'How many rakats are in Fajr prayer?',
    options: ['2', '3', '4', '6'],
    correctAnswer: 0,
    explanation: 'Fajr prayer consists of 2 rakats (units of prayer).',
    category: 'prayer',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'prayer_14',
    question: 'What is the Friday congregational prayer called?',
    options: ['Jumu\'ah', 'Eid', 'Tarawih', 'Witr'],
    correctAnswer: 0,
    explanation: 'Jumu\'ah prayer is the Friday congregational prayer that replaces Dhuhr.',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'ramadan_10',
    question: 'What is the celebration after Ramadan called?',
    options: ['Eid al-Fitr', 'Eid al-Adha', 'Laylat al-Qadr', 'Ashura'],
    correctAnswer: 0,
    explanation: 'Eid al-Fitr is the festival that marks the end of Ramadan.',
    category: 'ramadan',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'ramadan_11',
    question: 'What is the night before Eid called?',
    options: ['Laylat al-Jaizah', 'Laylat al-Qadr', 'Laylat al-Bara\'ah', 'Laylat al-Miraj'],
    correctAnswer: 0,
    explanation: 'Laylat al-Jaizah (Night of Rewards) is the night before Eid al-Fitr.',
    category: 'ramadan',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'ramadan_12',
    question: 'What is the voluntary fasting on Mondays and Thursdays called?',
    options: ['Sunnah fasting', 'Wajib fasting', 'Nafl fasting', 'Mustahabb fasting'],
    correctAnswer: 2,
    explanation: 'Nafl fasting includes voluntary fasts on Mondays and Thursdays.',
    category: 'ramadan',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'history_10',
    question: 'Who was the first Caliph after Prophet Muhammad (PBUH)?',
    options: ['Abu Bakr (RA)', 'Umar (RA)', 'Uthman (RA)', 'Ali (RA)'],
    correctAnswer: 0,
    explanation: 'Abu Bakr (RA) was the first Caliph and closest companion of Prophet Muhammad (PBUH).',
    category: 'history',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'history_11',
    question: 'Which Caliph was known as "Al-Faruq"?',
    options: ['Umar (RA)', 'Abu Bakr (RA)', 'Uthman (RA)', 'Ali (RA)'],
    correctAnswer: 0,
    explanation: 'Umar (RA) was known as "Al-Faruq" meaning "the one who distinguishes between truth and falsehood".',
    category: 'history',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'history_12',
    question: 'Which Caliph compiled the Quran into a book?',
    options: ['Uthman (RA)', 'Abu Bakr (RA)', 'Umar (RA)', 'Ali (RA)'],
    correctAnswer: 0,
    explanation: 'Uthman (RA) standardized and compiled the Quran into one book during his caliphate.',
    category: 'history',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'history_13',
    question: 'What was the name of Prophet Muhammad\'s (PBUH) grandfather?',
    options: ['Abdul Muttalib', 'Abu Talib', 'Abbas', 'Hamza'],
    correctAnswer: 0,
    explanation: 'Abdul Muttalib was the grandfather of Prophet Muhammad (PBUH) who raised him.',
    category: 'history',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'angels_8',
    question: 'Which angel guards the gates of Heaven?',
    options: ['Ridwan', 'Malik', 'Jibril', 'Mikail'],
    correctAnswer: 0,
    explanation: 'Angel Ridwan is the guardian of the gates of Heaven.',
    category: 'angels',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'angels_9',
    question: 'Which angel guards the gates of Hell?',
    options: ['Malik', 'Ridwan', 'Jibril', 'Mikail'],
    correctAnswer: 0,
    explanation: 'Angel Malik is the guardian of the gates of Hell.',
    category: 'angels',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'angels_10',
    question: 'How many angels carry Allah\'s Throne?',
    options: ['4', '6', '8', '12'],
    correctAnswer: 0,
    explanation: 'Four angels carry Allah\'s Throne on the Day of Judgment.',
    category: 'angels',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },

  // Islamic Law and Fiqh Questions
  {
    id: 'fiqh_1',
    question: 'What is the Islamic jurisprudence called?',
    options: ['Fiqh', 'Sharia', 'Tafsir', 'Hadith'],
    correctAnswer: 0,
    explanation: 'Fiqh is Islamic jurisprudence or understanding of Islamic law.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'fiqh_2',
    question: 'What is the Islamic law called?',
    options: ['Sharia', 'Fiqh', 'Tafsir', 'Hadith'],
    correctAnswer: 0,
    explanation: 'Sharia is the divine Islamic law derived from the Quran and Sunnah.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'fiqh_3',
    question: 'What are the five schools of Islamic law called?',
    options: ['Madhhabs', 'Sunnah', 'Hadith', 'Tafsir'],
    correctAnswer: 0,
    explanation: 'The five Madhhabs are Hanafi, Maliki, Shafi\'i, Hanbali, and Jafari.',
    category: 'pillars',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'fiqh_4',
    question: 'What is the term for Islamic legal opinion?',
    options: ['Fatwa', 'Hukm', 'Ijtihad', 'Qiyas'],
    correctAnswer: 0,
    explanation: 'A Fatwa is a legal opinion issued by qualified Islamic scholars.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },

  // Islamic Calendar Questions
  {
    id: 'calendar_1',
    question: 'How many months are in the Islamic calendar?',
    options: ['12', '10', '11', '13'],
    correctAnswer: 0,
    explanation: 'The Islamic calendar has 12 months, similar to the Gregorian calendar.',
    category: 'ramadan',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'calendar_2',
    question: 'Which month comes after Ramadan?',
    options: ['Shawwal', 'Dhul Hijjah', 'Muharram', 'Safar'],
    correctAnswer: 0,
    explanation: 'Shawwal is the 10th month and comes immediately after Ramadan.',
    category: 'ramadan',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'calendar_3',
    question: 'What is the first month of the Islamic calendar?',
    options: ['Muharram', 'Safar', 'Ramadan', 'Dhul Hijjah'],
    correctAnswer: 0,
    explanation: 'Muharram is the first month of the Islamic calendar.',
    category: 'ramadan',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'calendar_4',
    question: 'Which Islamic month is known as the "Month of Hajj"?',
    options: ['Dhul Hijjah', 'Ramadan', 'Muharram', 'Shawwal'],
    correctAnswer: 0,
    explanation: 'Dhul Hijjah is the 12th month when Hajj is performed.',
    category: 'ramadan',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },

  // Islamic Ethics and Morality Questions
  {
    id: 'ethics_1',
    question: 'What is the Islamic term for charity?',
    options: ['Sadaqah', 'Zakat', 'Waqf', 'Haram'],
    correctAnswer: 0,
    explanation: 'Sadaqah is voluntary charity, while Zakat is obligatory charity.',
    category: 'pillars',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'ethics_2',
    question: 'What does "Halal" mean?',
    options: ['Permissible', 'Forbidden', 'Obligatory', 'Recommended'],
    correctAnswer: 0,
    explanation: 'Halal means permissible or allowed in Islam.',
    category: 'pillars',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'ethics_3',
    question: 'What does "Haram" mean?',
    options: ['Forbidden', 'Permissible', 'Obligatory', 'Recommended'],
    correctAnswer: 0,
    explanation: 'Haram means forbidden or prohibited in Islam.',
    category: 'pillars',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'ethics_4',
    question: 'What is the Islamic term for modesty?',
    options: ['Haya', 'Taqwa', 'Ihsan', 'Sabr'],
    correctAnswer: 0,
    explanation: 'Haya is the Islamic concept of modesty and shyness.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },

  // Quran Recitation Questions
  {
    id: 'quran_15',
    question: 'What is the art of Quran recitation called?',
    options: ['Tajweed', 'Tafsir', 'Hadith', 'Fiqh'],
    correctAnswer: 0,
    explanation: 'Tajweed is the proper pronunciation and recitation of the Quran.',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'quran_16',
    question: 'What is the Quran interpretation called?',
    options: ['Tafsir', 'Tajweed', 'Hadith', 'Fiqh'],
    correctAnswer: 0,
    explanation: 'Tafsir is the exegesis or interpretation of the Quran.',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'quran_17',
    question: 'Which surah is named after a fruit?',
    options: ['At-Tin', 'Al-Baqarah', 'Al-Imran', 'An-Nahl'],
    correctAnswer: 0,
    explanation: 'Surah At-Tin is named after the fig fruit.',
    category: 'quran',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'quran_18',
    question: 'Which surah is named after an insect?',
    options: ['An-Naml', 'An-Nahl', 'Al-Fil', 'Al-Baqarah'],
    correctAnswer: 0,
    explanation: 'Surah An-Naml is named after the ant.',
    category: 'quran',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },

  // Additional Prophet Stories
  {
    id: 'prophets_14',
    question: 'Which prophet built the ark?',
    options: ['Prophet Nuh (AS)', 'Prophet Musa (AS)', 'Prophet Ibrahim (AS)', 'Prophet Isa (AS)'],
    correctAnswer: 0,
    explanation: 'Prophet Nuh (AS) built the ark to survive the great flood.',
    category: 'prophets',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'prophets_15',
    question: 'Which prophet was thrown into the fire?',
    options: ['Prophet Ibrahim (AS)', 'Prophet Musa (AS)', 'Prophet Isa (AS)', 'Prophet Nuh (AS)'],
    correctAnswer: 0,
    explanation: 'Prophet Ibrahim (AS) was thrown into fire but Allah saved him.',
    category: 'prophets',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'prophets_16',
    question: 'Which prophet could heal the blind?',
    options: ['Prophet Isa (AS)', 'Prophet Musa (AS)', 'Prophet Ibrahim (AS)', 'Prophet Nuh (AS)'],
    correctAnswer: 0,
    explanation: 'Prophet Isa (AS) was given miracles including healing the blind.',
    category: 'prophets',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },

  // Islamic Architecture and Places
  {
    id: 'places_1',
    question: 'What is the black cube in Makkah called?',
    options: ['Kaaba', 'Masjid al-Haram', 'Masjid al-Nabawi', 'Dome of the Rock'],
    correctAnswer: 0,
    explanation: 'The Kaaba is the black cubical building in Makkah that Muslims face during prayer.',
    category: 'history',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'places_2',
    question: 'What is the Prophet\'s Mosque in Madinah called?',
    options: ['Masjid al-Nabawi', 'Masjid al-Haram', 'Masjid al-Aqsa', 'Dome of the Rock'],
    correctAnswer: 0,
    explanation: 'Masjid al-Nabawi is the Prophet\'s Mosque in Madinah.',
    category: 'history',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'places_3',
    question: 'What is the mosque in Jerusalem called?',
    options: ['Masjid al-Aqsa', 'Masjid al-Haram', 'Masjid al-Nabawi', 'Dome of the Rock'],
    correctAnswer: 0,
    explanation: 'Masjid al-Aqsa is the holy mosque in Jerusalem.',
    category: 'history',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },

  // Islamic Names and Titles
  {
    id: 'names_1',
    question: 'What does "Abdul" mean in Arabic names?',
    options: ['Servant of', 'Son of', 'Father of', 'Friend of'],
    correctAnswer: 0,
    explanation: 'Abdul means "servant of" and is used in names like Abdul Rahman (Servant of the Merciful).',
    category: 'history',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'names_2',
    question: 'What does "Ibn" mean in Arabic names?',
    options: ['Son of', 'Father of', 'Servant of', 'Friend of'],
    correctAnswer: 0,
    explanation: 'Ibn means "son of" in Arabic naming conventions.',
    category: 'history',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },

  // Islamic Concepts and Beliefs
  {
    id: 'beliefs_1',
    question: 'What is the belief in divine destiny called?',
    options: ['Qadar', 'Taqdir', 'Taqwa', 'Tawhid'],
    correctAnswer: 0,
    explanation: 'Qadar is the Islamic belief in divine destiny and predestination.',
    category: 'pillars',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'beliefs_2',
    question: 'What is the belief in one God called?',
    options: ['Tawhid', 'Shirk', 'Kufr', 'Iman'],
    correctAnswer: 0,
    explanation: 'Tawhid is the fundamental Islamic belief in the oneness of Allah.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'beliefs_3',
    question: 'What is the opposite of Tawhid?',
    options: ['Shirk', 'Iman', 'Islam', 'Ihsan'],
    correctAnswer: 0,
    explanation: 'Shirk is the sin of associating partners with Allah, the opposite of Tawhid.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },

  // Islamic Worship and Practices
  {
    id: 'worship_1',
    question: 'What is the ritual washing before prayer called?',
    options: ['Wudu', 'Ghusl', 'Tayammum', 'Masah'],
    correctAnswer: 0,
    explanation: 'Wudu is the ablution or ritual washing performed before prayer.',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'worship_2',
    question: 'What is the full body washing called?',
    options: ['Ghusl', 'Wudu', 'Tayammum', 'Masah'],
    correctAnswer: 0,
    explanation: 'Ghusl is the full body washing required after certain states of impurity.',
    category: 'prayer',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'worship_3',
    question: 'What is the dry ablution called?',
    options: ['Tayammum', 'Wudu', 'Ghusl', 'Masah'],
    correctAnswer: 0,
    explanation: 'Tayammum is the dry ablution performed when water is not available.',
    category: 'prayer',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  
  // ========== AQEEDAH Questions ==========
  {
    id: 'aqeedah_1',
    question: 'What is the meaning of "Aqeedah"?',
    options: ['Prayer', 'Creed or belief', 'Charity', 'Fasting'],
    correctAnswer: 1,
    explanation: 'Aqeedah refers to the Islamic creed — the core beliefs that every Muslim holds.',
    category: 'aqeedah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'aqeedah_2',
    question: 'How many names of Allah (Asma ul-Husna) are known?',
    options: ['88', '99', '100', '77'],
    correctAnswer: 1,
    explanation: 'Allah has 99 beautiful names (Asma ul-Husna), as mentioned in the Quran and Hadith.',
    category: 'aqeedah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'aqeedah_3',
    question: 'What is the greatest sin in Islam according to the Quran?',
    options: ['Murder', 'Shirk', 'Lying', 'Theft'],
    correctAnswer: 1,
    explanation: 'Shirk (associating partners with Allah) is the greatest sin, as Allah forgives all sins except shirk.',
    category: 'aqeedah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'aqeedah_4',
    question: 'What is Ihsan?',
    options: ['Fasting', 'Worship as if you see Allah', 'Giving charity', 'Reading Quran'],
    correctAnswer: 1,
    explanation: 'Ihsan means to worship Allah as if you see Him, and if you cannot see Him, knowing He sees you.',
    category: 'aqeedah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'aqeedah_5',
    question: 'What is the first obligation upon a Muslim?',
    options: ['Prayer', 'Fasting', 'The Shahada', 'Hajj'],
    correctAnswer: 2,
    explanation: 'The first obligation is the Shahada — testifying there is no god but Allah and Muhammad is His Messenger.',
    category: 'aqeedah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'aqeedah_6',
    question: 'What are the six articles of faith in Islam?',
    options: ['5 pillars', '6 articles', '7 articles', '4 articles'],
    correctAnswer: 1,
    explanation: 'The six articles are: belief in Allah, His angels, His books, His messengers, the Day of Judgment, and divine decree.',
    category: 'aqeedah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'aqeedah_7',
    question: 'What does "Ar-Rahman" mean?',
    options: ['The All-Knowing', 'The Most Gracious', 'The All-Powerful', 'The Just'],
    correctAnswer: 1,
    explanation: 'Ar-Rahman means "The Most Gracious" — one of Allah\'s most frequent attributes in the Quran.',
    category: 'aqeedah',
    difficulty: 'hard',
    points: 30,
    timeLimit: 20
  },
  {
    id: 'aqeedah_8',
    question: 'Which of these is NOT one of the names of Allah?',
    options: ['Al-Hafiz', 'Al-Qahhar', 'Al-Mutakabbir', 'Al-Ra\'uf'],
    correctAnswer: 2,
    explanation: 'Al-Mutakabbir (The Supreme/The Majestic) is a name of Allah. All four are actually valid names — this question tests deeper knowledge.',
    category: 'aqeedah',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },

  // ========== SEERAH Questions ==========
  {
    id: 'seerah_1',
    question: 'In which year was Prophet Muhammad (PBUH) born?',
    options: ['570 CE', '571 CE', '572 CE', '569 CE'],
    correctAnswer: 0,
    explanation: 'The Prophet was born in the Year of the Elephant, approximately 570 CE in Makkah.',
    category: 'seerah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'seerah_2',
    question: 'What was the profession of Prophet Muhammad (PBUH) before prophethood?',
    options: ['Farmer', 'Shepherd and Merchant', 'Carpenter', 'Blacksmith'],
    correctAnswer: 1,
    explanation: 'The Prophet worked as a shepherd in his youth and later as a merchant trading between Makkah and Syria.',
    category: 'seerah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'seerah_3',
    question: 'How old was Prophet Muhammad (PBUH) when he received the first revelation?',
    options: ['30', '35', '40', '45'],
    correctAnswer: 2,
    explanation: 'The Prophet was 40 years old when Angel Jibril first came to him in the Cave of Hira.',
    category: 'seerah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'seerah_4',
    question: 'How many years did the Prophet spend calling to Islam in Makkah?',
    options: ['10 years', '13 years', '15 years', '20 years'],
    correctAnswer: 1,
    explanation: 'The Prophet spent 13 years preaching in Makkah before migrating to Madinah.',
    category: 'seerah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'seerah_5',
    question: 'Who was the first male to accept Islam?',
    options: ['Umar ibn al-Khattab (RA)', 'Abu Bakr as-Siddiq (RA)', 'Ali ibn Abi Talib (RA)', 'Hamza (RA)'],
    correctAnswer: 2,
    explanation: 'Ali ibn Abi Talib (RA) was the first male to accept Islam at the age of 10.',
    category: 'seerah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'seerah_6',
    question: 'What was the name of the first migration of Muslims?',
    options: ['Migration to Madinah', 'Migration to Abyssinia', 'Migration to Ta\'if', 'Migration to Syria'],
    correctAnswer: 1,
    explanation: 'The first migration (Hijra) was to Abyssinia (Ethiopia) where the Christian king Negus granted protection.',
    category: 'seerah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'seerah_7',
    question: 'What year did the Battle of Badr take place?',
    options: ['622 CE', '624 CE', '625 CE', '630 CE'],
    correctAnswer: 1,
    explanation: 'The Battle of Badr took place in 2 AH (624 CE), the first major battle in Islam.',
    category: 'seerah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'seerah_8',
    question: 'Which treaty was signed between the Muslims and the Quraysh in 628 CE?',
    options: ['Treaty of Hudaibiya', 'Pledge of Aqaba', 'Pledge of Ridwan', 'Constitution of Madinah'],
    correctAnswer: 0,
    explanation: 'The Treaty of Hudaibiya was a 10-year peace agreement between the Muslims and the Quraysh.',
    category: 'seerah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'seerah_9',
    question: 'In which battle was the Prophet (PBUH) injured?',
    options: ['Badr', 'Uhud', 'Khandaq', 'Khaybar'],
    correctAnswer: 1,
    explanation: 'In the Battle of Uhud, the Prophet was injured when a stone struck his face and his tooth was broken.',
    category: 'seerah',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'seerah_10',
    question: 'What was the Farewell Sermon called?',
    options: ['Khutbat al-Wada\'', 'Khutbat al-Jumu\'ah', 'Sermon of the Mount', 'Final Address'],
    correctAnswer: 0,
    explanation: 'The Farewell Sermon (Khutbat al-Wada\') was delivered by the Prophet during his final Hajj in 632 CE.',
    category: 'seerah',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },

  // ========== SAHABAH Questions ==========
  {
    id: 'sahabah_1',
    question: 'Who was known as "As-Siddiq" (The Truthful)?',
    options: ['Umar (RA)', 'Abu Bakr (RA)', 'Uthman (RA)', 'Ali (RA)'],
    correctAnswer: 1,
    explanation: 'Abu Bakr (RA) was given the title "As-Siddiq" because he affirmed the Isra and Miraj without hesitation.',
    category: 'sahabah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'sahabah_2',
    question: 'Who was the second Caliph of Islam?',
    options: ['Abu Bakr (RA)', 'Umar ibn al-Khattab (RA)', 'Uthman ibn Affan (RA)', 'Ali ibn Abi Talib (RA)'],
    correctAnswer: 1,
    explanation: 'Umar ibn al-Khattab (RA) was the second Caliph, ruling from 634 to 644 CE.',
    category: 'sahabah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'sahabah_3',
    question: 'Who compiled the Quran into a single book?',
    options: ['Abu Bakr (RA)', 'Umar (RA)', 'Uthman (RA)', 'Ali (RA)'],
    correctAnswer: 2,
    explanation: 'Uthman ibn Affan (RA) standardized the Quranic text and compiled the official mushaf.',
    category: 'sahabah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'sahabah_4',
    question: 'Who was the first child to accept Islam?',
    options: ['Hasan ibn Ali', 'Ali ibn Abi Talib', 'Abdullah ibn Umar', 'Anas ibn Malik'],
    correctAnswer: 1,
    explanation: 'Ali ibn Abi Talib (RA) was the first child to accept Islam, at the age of 10.',
    category: 'sahabah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'sahabah_5',
    question: 'Who was known as "The Sword of Allah"?',
    options: ['Hamza (RA)', 'Khalid ibn al-Walid (RA)', 'Sa\'d ibn Abi Waqqas (RA)', 'Abu Ubaidah (RA)'],
    correctAnswer: 1,
    explanation: 'Khalid ibn al-Walid (RA) was given the title "Saifullah" (Sword of Allah) by the Prophet.',
    category: 'sahabah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'sahabah_6',
    question: 'Who was the first female to accept Islam?',
    options: ['Aisha (RA)', 'Khadijah (RA)', 'Fatimah (RA)', 'Sumayyah (RA)'],
    correctAnswer: 1,
    explanation: 'Khadijah bint Khuwaylid (RA) was the first person to accept Islam, both male and female.',
    category: 'sahabah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'sahabah_7',
    question: 'Who was the first martyr in Islam?',
    options: ['Bilal (RA)', 'Sumayyah (RA)', 'Yasir (RA)', 'Khadijah (RA)'],
    correctAnswer: 1,
    explanation: 'Sumayyah bint Khayyat (RA) was the first martyr in Islam, killed by Abu Jahl for her faith.',
    category: 'sahabah',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'sahabah_8',
    question: 'How many people were in the group that migrated to Abyssinia?',
    options: ['11 men and 4 women', '15 men and 5 women', '12 men and 4 women', '10 men and 6 women'],
    correctAnswer: 0,
    explanation: 'The first migration to Abyssinia consisted of 11 men and 4 women, led by Jafar ibn Abi Talib (RA).',
    category: 'sahabah',
    difficulty: 'hard',
    points: 30,
    timeLimit: 30
  },

  // ========== TAFSIR Questions ==========
  {
    id: 'tafsir_1',
    question: 'What does "Tafsir" literally mean?',
    options: ['To read', 'To explain or interpret', 'To memorize', 'To recite'],
    correctAnswer: 1,
    explanation: 'Tafsir literally means explanation or interpretation, referring to Quranic exegesis.',
    category: 'tafsir',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'tafsir_2',
    question: 'What is the most famous Tafsir of the Quran?',
    options: ['Tafsir al-Jalalayn', 'Tafsir Ibn Kathir', 'Tafsir al-Tabari', 'Tafsir al-Qurtubi'],
    correctAnswer: 1,
    explanation: 'Tafsir Ibn Kathir is one of the most widely used and respected Quranic commentaries.',
    category: 'tafsir',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'tafsir_3',
    question: 'What are Makki and Madani surahs classified by?',
    options: ['Length of surah', 'Time and place of revelation', 'Number of verses', 'Theme of surah'],
    correctAnswer: 1,
    explanation: 'Makki surahs were revealed before the Hijra in Makkah, and Madani surahs were revealed after in Madinah.',
    category: 'tafsir',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'tafsir_4',
    question: 'What is the literal meaning of "Surah"?',
    options: ['Chapter', 'Rank or elevation', 'Book', 'Section'],
    correctAnswer: 1,
    explanation: 'Surah literally means "rank" or "elevation" in Arabic, referring to the high status of each chapter.',
    category: 'tafsir',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'tafsir_5',
    question: 'What does "Muhkam" ayat mean?',
    options: ['Clear and unambiguous verses', 'Abrogated verses', 'Metaphorical verses', 'Short verses'],
    correctAnswer: 0,
    explanation: 'Muhkam verses are clear and unambiguous, forming the foundation of Islamic law and belief.',
    category: 'tafsir',
    difficulty: 'hard',
    points: 30,
    timeLimit: 30
  },
  {
    id: 'tafsir_6',
    question: 'Who was the first Mufassir (commentator) of the Quran?',
    options: ['Ibn Abbas (RA)', 'Ali ibn Abi Talib (RA)', 'Abdullah ibn Mas\'ud (RA)', 'The Prophet Muhammad (PBUH)'],
    correctAnswer: 3,
    explanation: 'The first and primary Mufassir was the Prophet Muhammad (PBUH) himself, as he explained the Quran to his companions.',
    category: 'tafsir',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },

  // ========== FIQH Questions ==========
  {
    id: 'fiqh_1',
    question: 'What does "Fiqh" mean literally?',
    options: ['Knowledge', 'Understanding', 'Action', 'Worship'],
    correctAnswer: 1,
    explanation: 'Fiqh literally means "understanding" and refers to Islamic jurisprudence derived from the Quran and Sunnah.',
    category: 'fiqh',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'fiqh_2',
    question: 'What are the four primary sources of Fiqh?',
    options: ['Quran, Sunnah, Ijma, Qiyas', 'Quran, Hadith, Fasting, Prayer', 'Sunnah, Charity, Hajj, Zakat', 'Quran, Tafsir, Fiqh, Iman'],
    correctAnswer: 0,
    explanation: 'The four sources are: Quran, Sunnah, Ijma (consensus), and Qiyas (analogical reasoning).',
    category: 'fiqh',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'fiqh_3',
    question: 'How many Fiqh rulings are there in Islamic law?',
    options: ['3', '5', '7', '9'],
    correctAnswer: 1,
    explanation: 'The five rulings (Ahkam al-Khamsa) are: Fard (obligatory), Sunnah (recommended), Mubah (permissible), Makruh (disliked), Haram (forbidden).',
    category: 'fiqh',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'fiqh_4',
    question: 'Which act is considered "Fard Kifayah"?',
    options: ['Fasting in Ramadan', 'Janazah (funeral) prayer', 'Five daily prayers', 'Zakat'],
    correctAnswer: 1,
    explanation: 'Fard Kifayah is a communal obligation — if some fulfill it, the rest are absolved. The Janazah prayer is an example.',
    category: 'fiqh',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'fiqh_5',
    question: 'What does "Qiyas" refer to in Fiqh?',
    options: ['Consensus of scholars', 'Analogical deduction', 'Individual opinion', 'Tradition'],
    correctAnswer: 1,
    explanation: 'Qiyas is analogical reasoning — applying an established ruling to a new case with a similar cause.',
    category: 'fiqh',
    difficulty: 'hard',
    points: 30,
    timeLimit: 30
  },
  {
    id: 'fiqh_6',
    question: 'How many schools of Fiqh (Madhahib) are widely followed today?',
    options: ['2', '3', '4', '5'],
    correctAnswer: 2,
    explanation: 'Four major Sunni schools: Hanafi, Maliki, Shafi\'i, and Hanbali. Jafari is the main Shia school.',
    category: 'fiqh',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },

  // ========== ARABIC Questions ==========
  {
    id: 'arabic_1',
    question: 'How many letters are in the Arabic alphabet?',
    options: ['26', '28', '30', '24'],
    correctAnswer: 1,
    explanation: 'The Arabic alphabet consists of 28 letters.',
    category: 'arabic',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'arabic_2',
    question: 'What direction is Arabic written?',
    options: ['Left to right', 'Right to left', 'Top to bottom', 'Both directions'],
    correctAnswer: 1,
    explanation: 'Arabic is written and read from right to left.',
    category: 'arabic',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'arabic_3',
    question: 'What does "Jazakallah Khair" mean?',
    options: ['Allah is great', 'May Allah reward you with goodness', 'Peace be upon you', 'In the name of Allah'],
    correctAnswer: 1,
    explanation: 'Jazakallah Khair means "May Allah reward you with goodness" — a common expression of thanks.',
    category: 'arabic',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'arabic_4',
    question: 'What is the meaning of "Masha Allah"?',
    options: ['If Allah wills', 'Allah has willed it', 'Allah is great', 'Thanks to Allah'],
    correctAnswer: 1,
    explanation: 'Masha Allah means "Allah has willed it" — said to express appreciation for something good.',
    category: 'arabic',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'arabic_5',
    question: 'What is the Arabic word for "heart"?',
    options: ['Aql', 'Qalb', 'Ruh', 'Nafs'],
    correctAnswer: 1,
    explanation: 'Qalb (قلب) means heart in Arabic.',
    category: 'arabic',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'arabic_6',
    question: 'What does "Alhamdulillah" literally translate to?',
    options: ['Allah is great', 'All praise belongs to Allah', 'There is no god but Allah', 'Allah is the best'],
    correctAnswer: 1,
    explanation: 'Alhamdulillah literally means "All praise belongs to Allah."',
    category: 'arabic',
    difficulty: 'hard',
    points: 30,
    timeLimit: 20
  },

  // ========== Additional Questions for Existing Categories ==========
  {
    id: 'hadith_1',
    question: 'What is the most authentic book of Hadith?',
    options: ['Sahih Muslim', 'Sahih Bukhari', 'Sunan Abu Dawud', 'Sunan Ibn Majah'],
    correctAnswer: 1,
    explanation: 'Sahih Bukhari is considered the most authentic book after the Quran.',
    category: 'hadith',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'hadith_2',
    question: 'What is a "Sahih" Hadith?',
    options: ['Weak hadith', 'Authentic hadith', 'Fabricated hadith', 'Good hadith'],
    correctAnswer: 1,
    explanation: 'A Sahih hadith is one with an unbroken chain of reliable narrators and no inconsistencies.',
    category: 'hadith',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'hadith_3',
    question: 'Who compiled Sahih Bukhari?',
    options: ['Muslim ibn al-Hajjaj', 'Muhammad al-Bukhari', 'Abu Dawud', 'Al-Tirmidhi'],
    correctAnswer: 1,
    explanation: 'Imam Muhammad ibn Ismail al-Bukhari compiled the Sahih Bukhari collection.',
    category: 'hadith',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'hadith_4',
    question: 'How many hadith are in Sahih Bukhari?',
    options: ['Around 4,000', 'Around 7,275', 'Around 3,000', 'Around 10,000'],
    correctAnswer: 1,
    explanation: 'Sahih Bukhari contains approximately 7,275 hadith (including repetitions).',
    category: 'hadith',
    difficulty: 'hard',
    points: 30,
    timeLimit: 25
  },
  {
    id: 'quran_11',
    question: 'Which surah is known as the "Mother of the Book" (Umm al-Kitab)?',
    options: ['Al-Baqarah', 'Al-Fatiha', 'Al-Ikhlas', 'Yasin'],
    correctAnswer: 1,
    explanation: 'Surah Al-Fatiha is called Umm al-Kitab (Mother of the Book) because it summarizes the Quran.',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'quran_12',
    question: 'How many verses does Surah Al-Fatiha have?',
    options: ['5', '6', '7', '8'],
    correctAnswer: 2,
    explanation: 'Surah Al-Fatiha contains 7 verses and is the most recited chapter in the Quran.',
    category: 'quran',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'pillars_7',
    question: 'What is Shahada?',
    options: ['Prayer', 'Declaration of faith', 'Charity', 'Fasting'],
    correctAnswer: 1,
    explanation: 'Shahada is the declaration: "I bear witness there is no god but Allah, and Muhammad is His servant and messenger."',
    category: 'pillars',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'prayer_9',
    question: 'What is the night prayer called?',
    options: ['Tarawih', 'Tahajjud', 'Witr', 'Isha'],
    correctAnswer: 1,
    explanation: 'Tahajjud is the voluntary night prayer performed after waking from sleep.',
    category: 'prayer',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'prophets_8',
    question: 'Which prophet was swallowed by a whale?',
    options: ['Prophet Musa (AS)', 'Prophet Yunus (AS)', 'Prophet Nuh (AS)', 'Prophet Yusuf (AS)'],
    correctAnswer: 1,
    explanation: 'Prophet Yunus (Jonah) (AS) was swallowed by a whale and prayed to Allah from its belly.',
    category: 'prophets',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'ramadan_8',
    question: 'Who is exempted from fasting in Ramadan?',
    options: ['Only children', 'Travelers, sick, elderly, and pregnant women', 'Only the elderly', 'Only travelers'],
    correctAnswer: 1,
    explanation: 'Travelers, the sick, elderly, pregnant/nursing women, and children are exempt from fasting.',
    category: 'ramadan',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'vq_quran_1',
    question: 'Which surah must be recited in every rakat of every prayer?',
    options: [
      'Surah Al-Ikhlas',
      'Surah Al-Fatiha',
      'Surah Al-Baqarah',
      'Surah Al-Mulk',
    ],
    correctAnswer: 1,
    explanation: 'The Prophet (PBUH) said: "There is no prayer for the one who does not recite Al-Fatiha" (Bukhari 756, Muslim 394).',
    category: 'quran',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'vq_quran_2',
    question: 'Which surah the Prophet (PBUH) said equals one-third of the Quran?',
    options: [
      'Surah Ya-Sin',
      'Surah Al-Kafirun',
      'Surah Al-Ikhlas',
      'Surah An-Nas',
    ],
    correctAnswer: 2,
    explanation: 'The Prophet (PBUH) said that Surah Al-Ikhlas is equal to one-third of the Quran (Bukhari 5013), because it sums up Tawhid.',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_quran_3',
    question: 'Which surah is known to protect from the punishment of the grave?',
    options: [
      'Surah Al-Mulk',
      'Surah Ar-Rahman',
      'Surah Al-Waqiah',
      'Surah Yasin',
    ],
    correctAnswer: 0,
    explanation: 'The Prophet (PBUH) said Surah Tabarak (Al-Mulk) is the protector from the torment of the grave (Tirmidhi 2891 - hasan).',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_quran_4',
    question: 'How many surahs of the Quran begin with the separate letters (Muqatta\'at) such as Alif-Lam-Mim?',
    options: [
      '14',
      '22',
      '29',
      '33',
    ],
    correctAnswer: 2,
    explanation: 'Exactly 29 surahs begin with the abbreviated letters (Muqatta\'at), from Al-Baqarah (Alif-Lam-Mim) to Al-Qalam (Nun).',
    category: 'quran',
    difficulty: 'hard',
    points: 30,
    timeLimit: 30
  },
  {
    id: 'vq_quran_5',
    question: 'Which surah mentions the conversation between Sulaiman (AS) and an ant?',
    options: [
      'Surah An-Naml',
      'Surah Al-Ankabut',
      'Surah An-Nahl',
      'Surah Al-Fil',
    ],
    correctAnswer: 0,
    explanation: 'Surah An-Naml (The Ant) recounts how Sulaiman (AS) smiled at the ant\'s words (Quran 27:18-19).',
    category: 'quran',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'vq_quran_6',
    question: 'In which surah is Ayat al-Kursi found?',
    options: [
      'Surah Al-Imran',
      'Surah An-Nur',
      'Surah Al-Baqarah',
      'Surah Al-Araf',
    ],
    correctAnswer: 2,
    explanation: 'Ayat al-Kursi (the Throne Verse) is verse 255 of Surah Al-Baqarah, the greatest verse of the Quran (Muslim 810).',
    category: 'quran',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_quran_7',
    question: 'What was the first word of the Quran to be revealed?',
    options: [
      'Sabbih (Glorify)',
      'Qul (Say)',
      'Iqra (Read)',
      'Alhamdu (Praise)',
    ],
    correctAnswer: 2,
    explanation: 'The first revealed verses were "Iqra bismi rabbika..." (Read, in the name of your Lord) - Surah Al-Alaq 96:1 (Bukhari 3).',
    category: 'quran',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_quran_8',
    question: 'Over approximately how many years was the Quran revealed?',
    options: [
      '10 years',
      '13 years',
      '23 years',
      '40 years',
    ],
    correctAnswer: 2,
    explanation: 'The Quran was revealed over about 23 years: 13 years in Makkah and 10 years in Madinah.',
    category: 'quran',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'vq_hadith_1',
    question: 'Who compiled Sahih Muslim?',
    options: [
      'Imam Muslim ibn al-Hajjaj',
      'Imam Malik ibn Anas',
      'Imam Ahmad ibn Hanbal',
      'Imam At-Tirmidhi',
    ],
    correctAnswer: 0,
    explanation: 'Sahih Muslim was compiled by Imam Muslim ibn al-Hajjaj (d. 261 AH), regarded as the second most authentic hadith collection.',
    category: 'hadith',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'vq_hadith_2',
    question: 'What does the word "Sunnah" literally mean?',
    options: [
      'A path or way',
      'A sacred book',
      'A religious order',
      'A holy place',
    ],
    correctAnswer: 0,
    explanation: 'Sunnah literally means a path, way, or course of conduct - the practice of the Prophet (PBUH).',
    category: 'hadith',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_hadith_3',
    question: 'How many collections make up the "Kutub al-Sittah" (the six books of hadith)?',
    options: [
      'Four',
      'Five',
      'Six',
      'Seven',
    ],
    correctAnswer: 2,
    explanation: 'The Six Books are: Sahih Bukhari, Sahih Muslim, Sunan Abu Dawud, Jami\' At-Tirmidhi, Sunan An-Nasa\'i, and Sunan Ibn Majah.',
    category: 'hadith',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_hadith_4',
    question: 'Which famous book of hadith and law did Imam Malik write?',
    options: [
      'Al-Muwatta',
      'Musnad Ahmad',
      'Sunan Abu Dawud',
      'Riyad as-Salihin',
    ],
    correctAnswer: 0,
    explanation: 'Al-Muwatta is Imam Malik\'s earliest written collection of hadith and Islamic law, praised as "the soundest book on earth after the Quran" by Imam Ash-Shafi\'i.',
    category: 'hadith',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_hadith_5',
    question: 'What does a "Da\'if" hadith mean?',
    options: [
      'An authentic hadith',
      'A weak hadith',
      'A fabricated hadith',
      'A stopped hadith',
    ],
    correctAnswer: 1,
    explanation: 'Da\'if means weak - a hadith whose chain of narrators or text does not meet the conditions of authenticity.',
    category: 'hadith',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_prayer_1',
    question: 'How many obligatory (fard) rakats are in Maghrib prayer?',
    options: [
      'Two',
      'Three',
      'Four',
      'Five',
    ],
    correctAnswer: 1,
    explanation: 'Maghrib consists of three obligatory rakats, prayed immediately after sunset.',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_prayer_2',
    question: 'Which voluntary prayer has an odd number of rakats and is performed after Isha?',
    options: [
      'Duha',
      'Witr',
      'Tahajjud',
      'Tasbeeh',
    ],
    correctAnswer: 1,
    explanation: 'Witr literally means "odd number" - it is performed after the Isha prayer with one, three, five, or more odd rakats.',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'vq_prayer_3',
    question: 'How many takbirs (Allahu Akbar) are said in the funeral (Janazah) prayer?',
    options: [
      'Two',
      'Three',
      'Four',
      'Five',
    ],
    correctAnswer: 2,
    explanation: 'The Janazah prayer has four takbirs: after praising Allah, salawat, dua for the deceased, and the final salam.',
    category: 'prayer',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_prayer_4',
    question: 'What is the prostration performed to make up for a mistake or forgetfulness in prayer called?',
    options: [
      'Sujud ash-Shukr',
      'Sujud as-Sahw',
      'Sujud at-Tilawah',
      'Sujud al-Farah',
    ],
    correctAnswer: 1,
    explanation: 'Sujud as-Sahw (prostration of forgetfulness) compensates for errors in prayer (Bukhari 1224, Muslim 571).',
    category: 'prayer',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_prayer_5',
    question: 'How many times does a person prostrate (sujud) in one rakat of prayer?',
    options: [
      'Once',
      'Twice',
      'Three times',
      'Four times',
    ],
    correctAnswer: 1,
    explanation: 'Every rakat contains two prostrations (sujud) - one after recitation and standing, and one after sitting in between.',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_prayer_6',
    question: 'Which daily prayer does Jumu\'ah replace on Friday?',
    options: [
      'Fajr',
      'Asr',
      'Dhuhr',
      'Isha',
    ],
    correctAnswer: 2,
    explanation: 'The Friday prayer (Jumu\'ah) replaces the Dhuhr prayer on Friday, performed in congregation with a khutbah (Quran 62:9).',
    category: 'prayer',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_prayer_7',
    question: 'How many fard rakats are there in total across the five daily prayers?',
    options: [
      '15',
      '16',
      '17',
      '20',
    ],
    correctAnswer: 2,
    explanation: 'Fajr 2 + Dhuhr 4 + Asr 4 + Maghrib 3 + Isha 4 = 17 obligatory rakats per day.',
    category: 'prayer',
    difficulty: 'hard',
    points: 30,
    timeLimit: 30
  },
  {
    id: 'vq_pillars_1',
    question: 'How many times is Hajj obligatory upon a Muslim who is able?',
    options: [
      'Once in a lifetime',
      'Every year',
      'Once every five years',
      'Twice in a lifetime',
    ],
    correctAnswer: 0,
    explanation: 'Hajj is obligatory once in a lifetime for those who are able (Quran 3:97); performing it more is voluntary.',
    category: 'pillars',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_pillars_2',
    question: 'What does the stoning of the Jamarat during Hajj commemorate?',
    options: [
      'The building of the Kaaba',
      'Ibrahim (AS) rejecting Satan\'s temptations',
      'The farewell sermon',
      'The first call to prayer',
    ],
    correctAnswer: 1,
    explanation: 'The stoning re-enacts Ibrahim (AS) throwing stones at Satan when he tried to dissuade him from obeying Allah\'s command.',
    category: 'pillars',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_ramadan_1',
    question: 'Which gate of Paradise is reserved for those who fast?',
    options: [
      'Bab As-Salah',
      'Bab Ar-Rayyan',
      'Bab As-Sadaqah',
      'Bab Al-Jihad',
    ],
    correctAnswer: 1,
    explanation: '"In Paradise there is a gate called Ar-Rayyan through which those who fast will enter" (Bukhari 1896, Muslim 1152).',
    category: 'ramadan',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_ramadan_2',
    question: 'What is the obligatory charity paid before the Eid al-Fitr prayer called?',
    options: [
      'Zakat al-Mal',
      'Zakat al-Fitr (Fitrana)',
      'Sadaqah Jariyah',
      'Kaffarah',
    ],
    correctAnswer: 1,
    explanation: 'Zakat al-Fitr purifies the fast and feeds the poor; the Prophet (PBUH) ordered it to be paid before the Eid prayer (Bukhari 1503).',
    category: 'ramadan',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_ramadan_3',
    question: 'On which day of the Islamic calendar does Eid al-Fitr fall?',
    options: [
      '1st of Shawwal',
      '10th of Dhul Hijjah',
      '1st of Muharram',
      '12th of Rabi\' al-Awwal',
    ],
    correctAnswer: 0,
    explanation: 'Eid al-Fitr is on the 1st of Shawwal, the day after the last fast of Ramadan. (10th Dhul Hijjah is Eid al-Adha.)',
    category: 'ramadan',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_prophets_1',
    question: 'Which prophet is known as "Abu al-Anbiya" (Father of the Prophets)?',
    options: [
      'Prophet Nuh (AS)',
      'Prophet Ibrahim (AS)',
      'Prophet Musa (AS)',
      'Prophet Adam (AS)',
    ],
    correctAnswer: 1,
    explanation: 'Ibrahim (AS) is called the Father of the Prophets because many prophets descended from him, and he is the father of Ismail and Ishaq (AS).',
    category: 'prophets',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_prophets_2',
    question: 'Which prophet was sent to the people of \'Ad?',
    options: [
      'Prophet Hud (AS)',
      'Prophet Salih (AS)',
      'Prophet Lut (AS)',
      'Prophet Shu\'ayb (AS)',
    ],
    correctAnswer: 0,
    explanation: 'Prophet Hud (AS) was sent to the people of \'Ad, who were destroyed by a furious wind for their disbelief (Quran 11:50-60).',
    category: 'prophets',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_prophets_3',
    question: 'Which prophet was sent to the people of Thamud with the miracle of the she-camel?',
    options: [
      'Prophet Salih (AS)',
      'Prophet Hud (AS)',
      'Prophet Ibrahim (AS)',
      'Prophet Yunus (AS)',
    ],
    correctAnswer: 0,
    explanation: 'Prophet Salih (AS) was sent to Thamud; the she-camel was his sign, and they hamstrung it (Quran 11:61-68).',
    category: 'prophets',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_prophets_4',
    question: 'Which prophet was sent to the people of Nineveh?',
    options: [
      'Prophet Yunus (AS)',
      'Prophet Ayyub (AS)',
      'Prophet Ilyas (AS)',
      'Prophet Zakariyya (AS)',
    ],
    correctAnswer: 0,
    explanation: 'Prophet Yunus (AS) was sent to Nineveh; when he left, its people believed and were spared (Quran 10:98).',
    category: 'prophets',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_seerah_1',
    question: 'What was the name of the mother of Prophet Muhammad (PBUH)?',
    options: [
      'Halimah Sa\'diyah',
      'Aminah bint Wahb',
      'Fatimah bint Amr',
      'Barakah (Umm Ayman)',
    ],
    correctAnswer: 1,
    explanation: 'His mother was Aminah bint Wahb, who died when he was six years old; Halimah was his wet-nurse.',
    category: 'seerah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'vq_seerah_2',
    question: 'In which city is the Prophet Muhammad (PBUH) buried?',
    options: [
      'Makkah',
      'Madinah',
      'Jerusalem',
      'Ta\'if',
    ],
    correctAnswer: 1,
    explanation: 'He (PBUH) is buried in Madinah, in the room of Aisha (RA) inside Masjid an-Nabawi, beside Abu Bakr and Umar (RA).',
    category: 'seerah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 10
  },
  {
    id: 'vq_seerah_3',
    question: 'Which uncle of the Prophet (PBUH) raised and protected him in Makkah?',
    options: [
      'Abu Lahab',
      'Abu Talib',
      'Abbas (RA)',
      'Hamzah (RA)',
    ],
    correctAnswer: 1,
    explanation: 'Abu Talib, the chief of Banu Hashim, raised him after Abdul-Muttalib\'s death and protected him for over 40 years.',
    category: 'seerah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'vq_seerah_4',
    question: 'During Mi\'raj, how many daily prayers were originally prescribed before Allah reduced them to five?',
    options: [
      'Ten',
      'Twenty',
      'Thirty',
      'Fifty',
    ],
    correctAnswer: 3,
    explanation: 'On the night journey, fifty prayers were first prescribed; on Musa\'s (AS) advice the Prophet (PBUH) returned repeatedly until Allah made them five (Bukhari 349, Muslim 162).',
    category: 'seerah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_seerah_5',
    question: 'In which hijri year did the Conquest of Makkah take place?',
    options: [
      '2 AH',
      '5 AH',
      '8 AH',
      '10 AH',
    ],
    correctAnswer: 2,
    explanation: 'Makkah was conquered peacefully in Ramadan 8 AH (630 CE), after the Quraysh broke the Treaty of Hudaybiyyah.',
    category: 'seerah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'vq_sahabah_1',
    question: 'Which companion was called "Dhun-Nurayn" (possessor of two lights)?',
    options: [
      'Uthman ibn Affan (RA)',
      'Umar ibn al-Khattab (RA)',
      'Talhah ibn Ubaydullah (RA)',
      'Zubayr ibn al-Awwam (RA)',
    ],
    correctAnswer: 0,
    explanation: 'Uthman (RA) earned this title because he married two daughters of the Prophet (PBUH), one after the other.',
    category: 'sahabah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_sahabah_2',
    question: 'Which companion was both the cousin and the son-in-law of the Prophet (PBUH)?',
    options: [
      'Ali ibn Abi Talib (RA)',
      'Abu Bakr as-Siddiq (RA)',
      'Sa\'d ibn Abi Waqqas (RA)',
      'Bilal ibn Rabah (RA)',
    ],
    correctAnswer: 0,
    explanation: 'Ali (RA) was the son of Abu Talib (the Prophet\'s uncle) and married his daughter Fatimah (RA).',
    category: 'sahabah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_sahabah_3',
    question: 'Who was the first muezzin (caller to prayer) in Islam?',
    options: [
      'Bilal ibn Rabah (RA)',
      'Abdullah ibn Zayd (RA)',
      'Umar ibn al-Khattab (RA)',
      'Salman al-Farisi (RA)',
    ],
    correctAnswer: 0,
    explanation: 'Bilal ibn Rabah (RA), a freed Abyssinian slave, was chosen by the Prophet (PBUH) as the first muezzin.',
    category: 'sahabah',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_sahabah_4',
    question: 'Which young companion was titled "Hibr al-Ummah" (the most learned of the Ummah) for his deep knowledge of the Quran?',
    options: [
      'Abdullah ibn Abbas (RA)',
      'Anas ibn Malik (RA)',
      'Usamah ibn Zayd (RA)',
      'Zayd ibn Thabit (RA)',
    ],
    correctAnswer: 0,
    explanation: 'Abdullah ibn Abbas (RA), the Prophet\'s cousin, became one of the greatest early scholars of tafsir and fiqh.',
    category: 'sahabah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_fiqh_1',
    question: 'What does the ruling "Makruh" mean?',
    options: [
      'Obligatory',
      'Recommended',
      'Disliked but not sinful',
      'Permitted',
    ],
    correctAnswer: 2,
    explanation: 'Makruh is an action that is disliked; avoiding it is rewarded but doing it is not punished.',
    category: 'fiqh',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'vq_fiqh_2',
    question: 'What does "Ijma" refer to in Islamic law?',
    options: [
      'Analogy',
      'Consensus of qualified scholars',
      'Custom',
      'A legal maxim',
    ],
    correctAnswer: 1,
    explanation: 'Ijma is the unanimous agreement of qualified scholars of a generation on a ruling - the third source of Islamic law after the Quran and Sunnah.',
    category: 'fiqh',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_fiqh_3',
    question: 'For how long must wealth be held (the "hawl") before Zakat becomes due?',
    options: [
      'Six months',
      'One lunar year',
      'One solar year',
      'Two years',
    ],
    correctAnswer: 1,
    explanation: 'Zakat on wealth becomes due after it has been possessed for one full lunar year (hawl), above the nisab.',
    category: 'fiqh',
    difficulty: 'medium',
    points: 20,
    timeLimit: 20
  },
  {
    id: 'vq_worship_1',
    question: 'Which of the following breaks wudu (ablution)?',
    options: [
      'Talking during wudu',
      'Deep sleep',
      'Drinking water',
      'Hearing the adhan',
    ],
    correctAnswer: 1,
    explanation: 'Deep sleep invalidates wudu because one loses awareness (Bukhari 236, Muslim 362); light dozing while seated does not.',
    category: 'worship',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_worship_2',
    question: 'What is used to perform Tayammum?',
    options: [
      'Clean earth or dust',
      'Sea water only',
      'A dry cloth',
      'Snow only',
    ],
    correctAnswer: 0,
    explanation: '"...then wipe your faces and hands with clean earth" (Quran 4:43) - Tayammum uses clean earth/dust when water is unavailable.',
    category: 'worship',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'vq_calendar_1',
    question: 'Which of these is one of the four sacred months in Islam?',
    options: [
      'Shawwal',
      'Dhul-Qa\'dah',
      'Rabi\' al-Awwal',
      'Sha\'ban',
    ],
    correctAnswer: 1,
    explanation: 'The four sacred months (Quran 9:36) are Dhul-Qa\'dah, Dhul-Hijjah, Muharram, and Rajab.',
    category: 'calendar',
    difficulty: 'hard',
    points: 30,
    timeLimit: 30
  },
  {
    id: 'vq_calendar_2',
    question: 'On which day does the Islamic (Hijri) new year begin?',
    options: [
      '1st of Muharram',
      '1st of Ramadan',
      '1st of Shawwal',
      '1st of Safar',
    ],
    correctAnswer: 0,
    explanation: 'The Hijri calendar begins with Muharram, the first month, and its new year starts on 1 Muharram.',
    category: 'calendar',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_angels_1',
    question: 'Which angel is responsible for rain and sustenance by Allah\'s command?',
    options: [
      'Jibril (AS)',
      'Mika\'il (AS)',
      'Israfil (AS)',
      'Malik (AS)',
    ],
    correctAnswer: 1,
    explanation: 'Mika\'il (AS) is entrusted with the rain and vegetation that sustain life, while Jibril (AS) brings revelation.',
    category: 'angels',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_aqeedah_1',
    question: 'Which Quranic title (33:40) establishes that Prophet Muhammad (PBUH) is the last messenger?',
    options: [
      'Rasul Karim',
      'Khatam an-Nabiyyin (Seal of the Prophets)',
      'Siraj Munir',
      'Bashir Nadhir',
    ],
    correctAnswer: 1,
    explanation: '"Muhammad is not the father of any of your men, but he is the Messenger of Allah and the Seal (Khatam) of the Prophets" (Quran 33:40).',
    category: 'aqeedah',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_places_1',
    question: 'What is the walking between the hills of Safa and Marwah during Hajj/Umrah called?',
    options: [
      'Tawaf',
      'Sa\'i',
      'Wuquf',
      'Rami',
    ],
    correctAnswer: 1,
    explanation: 'Sa\'i is the seven circuits of walking between Safa and Marwah, commemorating Hajar\'s search for water (Quran 2:158).',
    category: 'places',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_places_2',
    question: 'What is the sacred Black Stone in the corner of the Kaaba called?',
    options: [
      'Al-Hajar al-Aswad',
      'Al-Maqam Ibrahim',
      'Al-Hatim',
      'Al-Mizab',
    ],
    correctAnswer: 0,
    explanation: 'Al-Hajar al-Aswad (the Black Stone) is kissed or gestured to at the start of each Tawaf circuit; it was placed by Ibrahim (AS).',
    category: 'places',
    difficulty: 'easy',
    points: 10,
    timeLimit: 20
  },
  {
    id: 'vq_arabic_1',
    question: 'What does "Subhan Allah" mean?',
    options: [
      'Allah is Greater',
      'Glory be to Allah',
      'Praise be to Allah',
      'Allah willing',
    ],
    correctAnswer: 1,
    explanation: 'Subhan Allah declares Allah\'s perfection - far above any imperfection or what the wrongdoers attribute to Him.',
    category: 'arabic',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_arabic_2',
    question: 'What is the meaning of "Astaghfirullah"?',
    options: [
      'Allah is the Greatest',
      'I seek Allah\'s forgiveness',
      'Allah has willed it',
      'In Allah we trust',
    ],
    correctAnswer: 1,
    explanation: 'Astaghfirullah means "I seek forgiveness from Allah" - a dhikr the Prophet (PBUH) said more than 70 times a day (Bukhari 6307).',
    category: 'arabic',
    difficulty: 'easy',
    points: 10,
    timeLimit: 15
  },
  {
    id: 'vq_ethics_1',
    question: 'According to the Quran, which worldly duty is commanded immediately alongside worship of Allah?',
    options: [
      'Kindness to parents',
      'Trade',
      'Travel',
      'Fasting',
    ],
    correctAnswer: 0,
    explanation: '"Worship Allah and associate nothing with Him, and be kind to parents" (Quran 4:36; also 17:23, 31:14).',
    category: 'ethics',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_ethics_2',
    question: 'What is backbiting (talking ill of someone behind their back) called in Arabic?',
    options: [
      'Ghibah',
      'Nameemah',
      'Buhtan',
      'Riya',
    ],
    correctAnswer: 0,
    explanation: 'Ghibah is condemned in Quran 49:12: "Do not backbite one another. Would any of you like to eat the flesh of his dead brother?"',
    category: 'ethics',
    difficulty: 'medium',
    points: 20,
    timeLimit: 25
  },
  {
    id: 'vq_tafsir_1',
    question: 'What does "Asbab al-Nuzul" refer to in Quranic studies?',
    options: [
      'The seven readings of the Quran',
      'The occasions and reasons for revelation',
      'The collection of the Quran',
      'The abrogated verses',
    ],
    correctAnswer: 1,
    explanation: 'Asbab al-Nuzul is the field studying the specific events/circumstances that prompted particular verses to be revealed.',
    category: 'tafsir',
    difficulty: 'hard',
    points: 30,
    timeLimit: 30
  },
];

// Achievements System
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_quiz',
    name: 'First Steps',
    description: 'Complete your first quiz',
    icon: '👶',
    requirement: { type: 'total', value: 1 },
    points: 50,
    unlocked: false
  },
  {
    id: 'perfect_score',
    name: 'Perfect Score',
    description: 'Get 100% on a quiz',
    icon: '💯',
    requirement: { type: 'score', value: 10 },
    points: 100,
    unlocked: false
  },
  {
    id: 'streak_3',
    name: 'On Fire',
    description: 'Get 3 correct answers in a row',
    icon: '🔥',
    requirement: { type: 'streak', value: 3 },
    points: 75,
    unlocked: false
  },
  {
    id: 'streak_5',
    name: 'Unstoppable',
    description: 'Get 5 correct answers in a row',
    icon: '⚡',
    requirement: { type: 'streak', value: 5 },
    points: 150,
    unlocked: false
  },
  {
    id: 'quran_master',
    name: 'Quran Scholar',
    description: 'Answer 10 Quran questions correctly',
    icon: '📖',
    requirement: { type: 'category', value: 10, category: 'quran' },
    points: 200,
    unlocked: false
  },
  {
    id: 'daily_warrior',
    name: 'Daily Warrior',
    description: 'Play for 7 consecutive days',
    icon: '🗓️',
    requirement: { type: 'total', value: 7 },
    points: 300,
    unlocked: false
  },
  {
    id: 'accuracy_90',
    name: 'Precision Master',
    description: 'Maintain 90% accuracy over 50 questions',
    icon: '🎯',
    requirement: { type: 'accuracy', value: 90 },
    points: 250,
    unlocked: false
  },
  {
    id: 'level_10',
    name: 'Knowledge Seeker',
    description: 'Reach level 10',
    icon: '🌟',
    requirement: { type: 'total', value: 500 },
    points: 500,
    unlocked: false
  },
  {
    id: 'seerah_scholar',
    name: 'Seerah Scholar',
    description: 'Answer 10 Seerah questions correctly',
    icon: '🕊️',
    requirement: { type: 'category', value: 10, category: 'seerah' },
    points: 200,
    unlocked: false
  },
  {
    id: 'aqeedah_expert',
    name: 'Aqeedah Expert',
    description: 'Answer 10 Aqeedah questions correctly',
    icon: '☝️',
    requirement: { type: 'category', value: 10, category: 'aqeedah' },
    points: 200,
    unlocked: false
  },
  {
    id: 'all_rounder',
    name: 'All-Rounder',
    description: 'Play at least one quiz in every category',
    icon: '🏅',
    requirement: { type: 'total', value: 8 },
    points: 300,
    unlocked: false
  },
  {
    id: 'century',
    name: 'Century',
    description: 'Answer 100 questions in total',
    icon: '💯',
    requirement: { type: 'total', value: 100 },
    points: 400,
    unlocked: false
  }
];

// Level System
export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: 'Beginner' },
  { level: 2, xp: 100, title: 'Student' },
  { level: 3, xp: 250, title: 'Learner' },
  { level: 4, xp: 500, title: 'Scholar' },
  { level: 5, xp: 1000, title: 'Knowledge Seeker' },
  { level: 6, xp: 2000, title: 'Islamic Scholar' },
  { level: 7, xp: 3500, title: 'Expert' },
  { level: 8, xp: 5000, title: 'Master' },
  { level: 9, xp: 7500, title: 'Grand Master' },
  { level: 10, xp: 10000, title: 'Enlightened One' },
  { level: 11, xp: 15000, title: 'Mufti' },
  { level: 12, xp: 20000, title: 'Hafiz' },
  { level: 13, xp: 30000, title: 'Sheikh' },
  { level: 14, xp: 50000, title: 'Grand Sheikh' },
  { level: 15, xp: 75000, title: 'Guardian of Knowledge' }
];

// Power-ups
export const POWER_UPS: PowerUp[] = [
  {
    id: 'fifty_fifty',
    name: '50:50',
    description: 'Remove two incorrect answers',
    icon: '✂️',
    uses: 3,
    maxUses: 3
  },
  {
    id: 'extra_time',
    name: 'Extra Time',
    description: 'Add 30 seconds to the timer',
    icon: '⏰',
    uses: 2,
    maxUses: 2
  },
  {
    id: 'hint',
    name: 'Hint',
    description: 'Get a helpful clue',
    icon: '💡',
    uses: 5,
    maxUses: 5
  },
  {
    id: 'skip',
    name: 'Skip Question',
    description: 'Skip to the next question',
    icon: '⏭️',
    uses: 1,
    maxUses: 1
  }
];
