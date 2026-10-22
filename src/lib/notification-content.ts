/**
 * Enhanced Notification Content Generator
 * Creates rich, contextual notification content for different audio types
 */

export interface NotificationContent {
  title: string;
  body: string;
  icon: string;
  badge: string;
  actions?: NotificationAction[];
  data?: any;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export class NotificationContentGenerator {
  
  // Generate content for Quran recitation
  static generateQuranRecitationContent(data: {
    surahNumber: number;
    surahName: string;
    reciterName: string;
    isPlaying: boolean;
    currentTime?: number;
    duration?: number;
    verses?: number;
    type?: string;
  }): NotificationContent {
    const baseTitle = data.isPlaying ? '🎵 Quran Recitation' : '⏸️ Quran Recitation';
    const baseInfo = `Surah ${data.surahNumber}: ${data.surahName}`;
    
    let body = `${baseInfo} • ${data.reciterName}`;
    
    // Add progress information
    if (data.currentTime !== undefined && data.duration !== undefined) {
      const currentMinutes = Math.floor(data.currentTime / 60);
      const currentSeconds = Math.floor(data.currentTime % 60).toString().padStart(2, '0');
      const durationMinutes = Math.floor(data.duration / 60);
      const durationSeconds = Math.floor(data.duration % 60).toString().padStart(2, '0');
      const progress = `${currentMinutes}:${currentSeconds} / ${durationMinutes}:${durationSeconds}`;
      
      body += `\n⏱️ ${progress}`;
    }
    
    // Add additional context
    if (data.verses) {
      body += `\n📖 ${data.verses} verses`;
    }
    
    if (data.type) {
      body += `\n📜 ${data.type}`;
    }
    
    body += '\n🌙 Noor Connect - Holy Quran';
    
    return {
      title: baseTitle,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      actions: [
        {
          action: 'play-pause',
          title: data.isPlaying ? 'Pause' : 'Play',
          icon: data.isPlaying ? '/icons/pause.png' : '/icons/play.png'
        },
        {
          action: 'stop',
          title: 'Stop',
          icon: '/icons/stop.png'
        },
        {
          action: 'next-surah',
          title: 'Next Surah',
          icon: '/icons/next.png'
        }
      ],
      data: {
        type: 'quran-recitation',
        surahNumber: data.surahNumber,
        surahName: data.surahName,
        reciterName: data.reciterName,
        isPlaying: data.isPlaying,
        currentTime: data.currentTime,
        duration: data.duration,
        verses: data.verses,
        // The caller's recitation style (e.g. "Murattal") — must NOT shadow the
        // `type` discriminator above (was a duplicate key that silently broke
        // audio-notifications' `data.type === 'quran-recitation'` routing).
        recitationType: data.type
      }
    };
  }
  
  // Generate content for Quran radio
  static generateQuranRadioContent(data: {
    stationName: string;
    stationLanguage?: string;
    isPlaying: boolean;
    bitrate?: string;
    location?: string;
  }): NotificationContent {
    const baseTitle = data.isPlaying ? '📻 Quran Radio Live' : '⏸️ Quran Radio';
    let body = `${data.stationName}`;
    
    // Add station details
    if (data.stationLanguage) {
      body += `\n🌍 ${data.stationLanguage}`;
    }
    
    if (data.bitrate) {
      body += `\n📶 ${data.bitrate}`;
    }
    
    if (data.location) {
      body += `\n📍 ${data.location}`;
    }
    
    body += '\n🌙 Noor Connect - Quran Radio';
    
    return {
      title: baseTitle,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      actions: [
        {
          action: 'play-pause',
          title: data.isPlaying ? 'Pause' : 'Play',
          icon: data.isPlaying ? '/icons/pause.png' : '/icons/play.png'
        },
        {
          action: 'stop',
          title: 'Stop',
          icon: '/icons/stop.png'
        },
        {
          action: 'next-station',
          title: 'Next Station',
          icon: '/icons/next.png'
        }
      ],
      data: {
        type: 'quran-radio',
        stationName: data.stationName,
        stationLanguage: data.stationLanguage,
        isPlaying: data.isPlaying,
        bitrate: data.bitrate,
        location: data.location
      }
    };
  }
  
  // Generate content for Adhan (prayer call)
  static generateAdhanContent(data: {
    prayerName: string;
    city: string;
    time: string;
    isPlaying: boolean;
  }): NotificationContent {
    const baseTitle = data.isPlaying ? '🕌 Adhan Playing' : '⏸️ Adhan';
    const body = `${data.prayerName} in ${data.city}\n⏰ ${data.time}\n🌙 Noor Connect - Prayer Times`;
    
    return {
      title: baseTitle,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      actions: [
        {
          action: 'stop',
          title: 'Stop Adhan',
          icon: '/icons/stop.png'
        },
        {
          action: 'snooze',
          title: 'Snooze',
          icon: '/icons/snooze.png'
        }
      ],
      data: {
        type: 'adhan',
        prayerName: data.prayerName,
        city: data.city,
        time: data.time,
        isPlaying: data.isPlaying
      }
    };
  }
  
  // Generate content for general app notifications
  static generateAppNotification(data: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    priority?: 'low' | 'normal' | 'high';
    actions?: NotificationAction[];
  }): NotificationContent {
    const iconMap = {
      info: '📢',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    const title = `${iconMap[data.type]} ${data.title}`;
    const body = `${data.message}\n🌙 Noor Connect`;
    
    return {
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      actions: data.actions || [
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/close.png'
        }
      ],
      data: {
        type: 'app-notification',
        category: data.type,
        priority: data.priority || 'normal',
        timestamp: Date.now()
      }
    };
  }
  
  // Generate content for Quran alarm
  static generateQuranAlarmContent(data: {
    alarmName: string;
    surahName: string;
    reciterName: string;
    time: string;
    isTriggered: boolean;
  }): NotificationContent {
    const baseTitle = data.isTriggered ? '⏰ Quran Alarm' : '🔔 Quran Alarm Set';
    const body = `${data.alarmName}\n📖 ${data.surahName} • ${data.reciterName}\n⏰ ${data.time}\n🌙 Noor Connect - Quran Alarms`;
    
    return {
      title: baseTitle,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      actions: data.isTriggered ? [
        {
          action: 'stop-alarm',
          title: 'Stop Alarm',
          icon: '/icons/stop.png'
        },
        {
          action: 'snooze-alarm',
          title: 'Snooze 5 min',
          icon: '/icons/snooze.png'
        }
      ] : [
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/close.png'
        }
      ],
      data: {
        type: 'quran-alarm',
        alarmName: data.alarmName,
        surahName: data.surahName,
        reciterName: data.reciterName,
        time: data.time,
        isTriggered: data.isTriggered
      }
    };
  }
  
  // Generate content for download progress
  static generateDownloadProgressContent(data: {
    itemName: string;
    progress: number;
    totalSize?: string;
    speed?: string;
    isCompleted: boolean;
  }): NotificationContent {
    const progressPercent = Math.round(data.progress);
    const title = data.isCompleted ? '✅ Download Complete' : '📥 Downloading';
    
    let body = `${data.itemName}`;
    
    if (!data.isCompleted) {
      body += `\n📊 ${progressPercent}% complete`;
      
      if (data.totalSize) {
        body += `\n💾 ${data.totalSize}`;
      }
      
      if (data.speed) {
        body += `\n⚡ ${data.speed}`;
      }
    } else {
      body += '\n🎉 Ready for offline listening';
    }
    
    body += '\n🌙 Noor Connect';
    
    return {
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      actions: data.isCompleted ? [
        {
          action: 'play',
          title: 'Play Now',
          icon: '/icons/play.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/close.png'
        }
      ] : [
        {
          action: 'cancel',
          title: 'Cancel',
          icon: '/icons/cancel.png'
        }
      ],
      data: {
        type: 'download-progress',
        itemName: data.itemName,
        progress: data.progress,
        totalSize: data.totalSize,
        speed: data.speed,
        isCompleted: data.isCompleted
      }
    };
  }
}

// Additional notification utilities
export class NotificationUtils {
  
  // Format time for notifications
  static formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Format file size for notifications
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  // Get appropriate icon based on audio type
  static getAudioIcon(type: 'quran-recitation' | 'quran-radio' | 'adhan' | 'alarm'): string {
    const iconMap = {
      'quran-recitation': '/icons/quran.png',
      'quran-radio': '/icons/radio.png',
      'adhan': '/icons/mosque.png',
      'alarm': '/icons/alarm.png'
    };
    
    return iconMap[type] || '/icon-192x192.png';
  }
  
  // Generate notification ID
  static generateNotificationId(type: string, data: any): string {
    const timestamp = Date.now();
    const hash = btoa(JSON.stringify(data)).slice(0, 8);
    return `${type}-${timestamp}-${hash}`;
  }
  
  // Check if notification should be silent
  static shouldSilentNotification(type: string, priority: string = 'normal'): boolean {
    // Don't play sound for low priority notifications or certain types
    const silentTypes = ['download-progress', 'background-sync'];
    return priority === 'low' || silentTypes.includes(type);
  }
}
