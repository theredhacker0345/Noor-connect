/**
 * Quran Features Service
 * Manages bookmarks, notes, and recitation progress for Quran
 */

export interface QuranBookmark {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  ayahText: string;
  createdAt: string;
  note?: string;
}

export interface QuranNote {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  ayahText: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecitationProgress {
  id: string;
  surahNumber: number;
  surahName: string;
  totalAyahs: number;
  completedAyahs: number;
  lastReadAyah: number;
  pagesRead: number;
  totalPages: number;
  startDate?: string;
  lastReadDate: string;
  isCompleted: boolean;
}

export interface QuranStreak {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string;
  totalDaysRead: number;
}

export interface QuranAchievement {
  id: string;
  type: 'first_surah' | 'streak_7' | 'streak_30' | 'surahs_25' | 'surahs_50' | 'surahs_75' | 'quran_complete';
  title: string;
  description: string;
  unlockedAt: string;
  icon: string;
}

class QuranFeaturesService {
  private static instance: QuranFeaturesService;
  private readonly BOOKMARKS_KEY = 'quran-bookmarks';
  private readonly NOTES_KEY = 'quran-notes';
  private readonly PROGRESS_KEY = 'quran-recitation-progress';
  private readonly STREAK_KEY = 'quran-reading-streak';
  private readonly ACHIEVEMENTS_KEY = 'quran-achievements';

  static getInstance(): QuranFeaturesService {
    if (!QuranFeaturesService.instance) {
      QuranFeaturesService.instance = new QuranFeaturesService();
    }
    return QuranFeaturesService.instance;
  }

  // Bookmark Methods
  async addBookmark(surahNumber: number, ayahNumber: number, surahName: string, ayahText: string, note?: string): Promise<QuranBookmark> {
    const bookmarks = await this.getBookmarks();
    const bookmark: QuranBookmark = {
      id: this.generateId(),
      surahNumber,
      ayahNumber,
      surahName,
      ayahText,
      createdAt: new Date().toISOString(),
      note
    };

    bookmarks.push(bookmark);
    this.saveBookmarks(bookmarks);
    return bookmark;
  }

  async getBookmarks(): Promise<QuranBookmark[]> {
    try {
      const stored = localStorage.getItem(this.BOOKMARKS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      return [];
    }
  }

  async removeBookmark(bookmarkId: string): Promise<void> {
    const bookmarks = await this.getBookmarks();
    const filtered = bookmarks.filter(b => b.id !== bookmarkId);
    this.saveBookmarks(filtered);
  }

  async updateBookmark(bookmarkId: string, note: string): Promise<void> {
    const bookmarks = await this.getBookmarks();
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    if (bookmark) {
      bookmark.note = note;
      this.saveBookmarks(bookmarks);
    }
  }

  private saveBookmarks(bookmarks: QuranBookmark[]): void {
    localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }

  // Notes Methods
  async addNote(surahNumber: number, ayahNumber: number, surahName: string, ayahText: string, note: string): Promise<QuranNote> {
    const notes = await this.getNotes();
    const quranNote: QuranNote = {
      id: this.generateId(),
      surahNumber,
      ayahNumber,
      surahName,
      ayahText,
      note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.push(quranNote);
    this.saveNotes(notes);
    return quranNote;
  }

  async getNotes(): Promise<QuranNote[]> {
    try {
      const stored = localStorage.getItem(this.NOTES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading notes:', error);
      return [];
    }
  }

  async getNotesForAyah(surahNumber: number, ayahNumber: number): Promise<QuranNote[]> {
    const notes = await this.getNotes();
    return notes.filter(n => n.surahNumber === surahNumber && n.ayahNumber === ayahNumber);
  }

  async updateNote(noteId: string, note: string): Promise<void> {
    const notes = await this.getNotes();
    const quranNote = notes.find(n => n.id === noteId);
    if (quranNote) {
      quranNote.note = note;
      quranNote.updatedAt = new Date().toISOString();
      this.saveNotes(notes);
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    const notes = await this.getNotes();
    const filtered = notes.filter(n => n.id !== noteId);
    this.saveNotes(filtered);
  }

  private saveNotes(notes: QuranNote[]): void {
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(notes));
  }

  // Recitation Progress Methods
  async updateRecitationProgress(surahNumber: number, surahName: string, totalAyahs: number, completedAyahs: number, lastReadAyah: number, pagesRead: number = 0, totalPages: number = 0): Promise<RecitationProgress> {
    const progress = await this.getRecitationProgress();
    const existingIndex = progress.findIndex(p => p.surahNumber === surahNumber);
    
    const progressEntry: RecitationProgress = {
      id: this.generateId(),
      surahNumber,
      surahName,
      totalAyahs,
      completedAyahs,
      lastReadAyah,
      pagesRead,
      totalPages,
      lastReadDate: new Date().toISOString(),
      isCompleted: completedAyahs >= totalAyahs,
      startDate: existingIndex >= 0 ? progress[existingIndex].startDate : new Date().toISOString()
    };

    if (existingIndex >= 0) {
      progress[existingIndex] = progressEntry;
    } else {
      progress.push(progressEntry);
    }

    this.saveRecitationProgress(progress);
    return progressEntry;
  }

  async getRecitationProgress(): Promise<RecitationProgress[]> {
    try {
      const stored = localStorage.getItem(this.PROGRESS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading recitation progress:', error);
      return [];
    }
  }

  async getProgressForSurah(surahNumber: number): Promise<RecitationProgress | null> {
    const progress = await this.getRecitationProgress();
    return progress.find(p => p.surahNumber === surahNumber) || null;
  }

  async getOverallProgress(): Promise<{
    totalSurahs: number;
    completedSurahs: number;
    totalAyahs: number;
    completedAyahs: number;
    totalPages: number;
    pagesRead: number;
    percentage: number;
  }> {
    const progress = await this.getRecitationProgress();
    const totalSurahs = 114; // Total surahs in Quran
    const completedSurahs = progress.filter(p => p.isCompleted).length;
    const totalAyahs = 6236; // Total ayahs in Quran
    const completedAyahs = progress.reduce((sum, p) => sum + p.completedAyahs, 0);
    const totalPages = 604; // Total pages in standard Quran
    const pagesRead = progress.reduce((sum, p) => sum + (p.pagesRead || 0), 0);
    const percentage = totalPages > 0 ? (pagesRead / totalPages) * 100 : 0;

    return {
      totalSurahs,
      completedSurahs,
      totalAyahs,
      completedAyahs,
      totalPages,
      pagesRead,
      percentage
    };
  }

  private saveRecitationProgress(progress: RecitationProgress[]): void {
    localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));
  }

  private calculateOverallProgress(progress: RecitationProgress[]): {
    completedSurahs: number;
    completedAyahs: number;
    pagesRead: number;
    percentage: number;
  } {
    const completedSurahs = progress.filter(p => p.isCompleted).length;
    const completedAyahs = progress.reduce((sum, p) => sum + p.completedAyahs, 0);
    const pagesRead = progress.reduce((sum, p) => sum + (p.pagesRead || 0), 0);
    const totalPages = 604;
    const percentage = totalPages > 0 ? (pagesRead / totalPages) * 100 : 0;

    return { completedSurahs, completedAyahs, pagesRead, percentage };
  }

  // Streak Tracking Methods
  async updateReadingStreak(): Promise<QuranStreak> {
    const streak = await this.getReadingStreak();
    const today = new Date().toDateString();
    const lastReadDate = streak?.lastReadDate;
    
    let currentStreak = streak?.currentStreak || 0;
    let longestStreak = streak?.longestStreak || 0;
    let totalDaysRead = streak?.totalDaysRead || 0;
    
    if (lastReadDate === today) {
      // Already read today, no change
      return streak || { currentStreak: 0, longestStreak: 0, lastReadDate: today, totalDaysRead: 0 };
    }
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    if (lastReadDate === yesterday) {
      currentStreak += 1;
      totalDaysRead += 1;
    } else {
      // Streak broken
      currentStreak = 1;
      totalDaysRead += 1;
    }
    
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
    
    const updatedStreak: QuranStreak = {
      currentStreak,
      longestStreak,
      lastReadDate: today,
      totalDaysRead
    };
    
    this.saveReadingStreak(updatedStreak);
    return updatedStreak;
  }
  
  async getReadingStreak(): Promise<QuranStreak | null> {
    try {
      const stored = localStorage.getItem(this.STREAK_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading reading streak:', error);
      return null;
    }
  }

  private getReadingStreakSync(): QuranStreak | null {
    try {
      const stored = localStorage.getItem(this.STREAK_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading reading streak:', error);
      return null;
    }
  }
  
  private saveReadingStreak(streak: QuranStreak): void {
    localStorage.setItem(this.STREAK_KEY, JSON.stringify(streak));
  }

  // Achievement Methods
  async checkAndUnlockAchievements(): Promise<QuranAchievement[]> {
    const achievements = await this.getAchievements();
    const overallProgress = await this.getOverallProgress();
    const streak = await this.getReadingStreak();
    const newAchievements: QuranAchievement[] = [];
    
    // Define all possible achievements
    const achievementDefinitions = [
      {
        type: 'first_surah' as const,
        title: 'First Steps',
        description: 'Read your first surah',
        icon: '🌱',
        condition: () => overallProgress.completedSurahs >= 1
      },
      {
        type: 'streak_7' as const,
        title: 'Week Warrior',
        description: 'Read Quran for 7 consecutive days',
        icon: '🔥',
        condition: () => streak?.currentStreak >= 7
      },
      {
        type: 'streak_30' as const,
        title: 'Month Master',
        description: 'Read Quran for 30 consecutive days',
        icon: '⭐',
        condition: () => streak?.currentStreak >= 30
      },
      {
        type: 'surahs_25' as const,
        title: 'Quarter Complete',
        description: 'Complete 25 surahs',
        icon: '📚',
        condition: () => overallProgress.completedSurahs >= 25
      },
      {
        type: 'surahs_50' as const,
        title: 'Half Way There',
        description: 'Complete 50 surahs',
        icon: '🎯',
        condition: () => overallProgress.completedSurahs >= 50
      },
      {
        type: 'surahs_75' as const,
        title: 'Advanced Reader',
        description: 'Complete 75 surahs',
        icon: '🏆',
        condition: () => overallProgress.completedSurahs >= 75
      },
      {
        type: 'quran_complete' as const,
        title: 'Quran Master',
        description: 'Complete the entire Quran',
        icon: '🎉',
        condition: () => overallProgress.completedSurahs >= 114
      }
    ];
    
    for (const def of achievementDefinitions) {
      const existingAchievement = achievements.find(a => a.type === def.type);
      if (!existingAchievement && def.condition()) {
        const newAchievement: QuranAchievement = {
          id: this.generateId(),
          type: def.type,
          title: def.title,
          description: def.description,
          unlockedAt: new Date().toISOString(),
          icon: def.icon
        };
        achievements.push(newAchievement);
        newAchievements.push(newAchievement);
      }
    }
    
    if (newAchievements.length > 0) {
      this.saveAchievements(achievements);
    }
    
    return newAchievements;
  }
  
  async getAchievements(): Promise<QuranAchievement[]> {
    try {
      const stored = localStorage.getItem(this.ACHIEVEMENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading achievements:', error);
      return [];
    }
  }
  
  private saveAchievements(achievements: QuranAchievement[]): void {
    localStorage.setItem(this.ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  }

  // Utility Methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Export/Import functionality
  async exportData(): Promise<{
    bookmarks: QuranBookmark[];
    notes: QuranNote[];
    progress: RecitationProgress[];
    streak: QuranStreak | null;
    achievements: QuranAchievement[];
  }> {
    const [bookmarks, notes, progress, streak, achievements] = await Promise.all([
      this.getBookmarks(),
      this.getNotes(),
      this.getRecitationProgress(),
      this.getReadingStreak(),
      this.getAchievements()
    ]);

    return { bookmarks, notes, progress, streak, achievements };
  }

  async importData(data: {
    bookmarks?: QuranBookmark[];
    notes?: QuranNote[];
    progress?: RecitationProgress[];
    streak?: QuranStreak;
    achievements?: QuranAchievement[];
  }): Promise<void> {
    try {
      if (data.bookmarks) {
        this.saveBookmarks(data.bookmarks);
      }
      if (data.notes) {
        this.saveNotes(data.notes);
      }
      if (data.progress) {
        this.saveRecitationProgress(data.progress);
      }
      if (data.streak) {
        this.saveReadingStreak(data.streak);
      }
      if (data.achievements) {
        this.saveAchievements(data.achievements);
      }
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    localStorage.removeItem(this.BOOKMARKS_KEY);
    localStorage.removeItem(this.NOTES_KEY);
    localStorage.removeItem(this.PROGRESS_KEY);
    localStorage.removeItem(this.STREAK_KEY);
    localStorage.removeItem(this.ACHIEVEMENTS_KEY);
  }
}

export const quranFeaturesService = QuranFeaturesService.getInstance();
