/**
 * Festive UI Popup for Islamic Events
 * Shows congratulations and celebratory messages for Eid and other special occasions
 */

import { useState, useEffect } from 'react';
import { X, Sparkles, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FestiveEvent {
  type: 'eid' | 'ramadan' | 'hajj' | 'other';
  name: string;
  arabicName: string;
  message: string;
}

export function FestivePopup() {
  const [event, setEvent] = useState<FestiveEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for Islamic events from notification manager
    const handleIslamicEvent = (e: CustomEvent<FestiveEvent>) => {
      setEvent(e.detail);
      setIsVisible(true);
    };

    window.addEventListener('islamicEvent', handleIslamicEvent as EventListener);

    return () => {
      window.removeEventListener('islamicEvent', handleIslamicEvent as EventListener);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Add a little animation delay before completely removing
    setTimeout(() => setEvent(null), 300);
  };

  const getFestiveIcon = () => {
    switch (event?.type) {
      case 'eid':
        return <Star className="w-8 h-8 text-yellow-500 animate-pulse" />;
      case 'ramadan':
        return <Heart className="w-8 h-8 text-green-500 animate-pulse" />;
      case 'hajj':
        return <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />;
      default:
        return <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />;
    }
  };

  const getFestiveGradient = () => {
    switch (event?.type) {
      case 'eid':
        return 'from-yellow-400/20 to-orange-400/20 border-yellow-400/30';
      case 'ramadan':
        return 'from-green-400/20 to-emerald-400/20 border-green-400/30';
      case 'hajj':
        return 'from-blue-400/20 to-cyan-400/20 border-blue-400/30';
      default:
        return 'from-purple-400/20 to-pink-400/20 border-purple-400/30';
    }
  };

  if (!isVisible || !event) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <Card className={`relative max-w-md w-full p-6 bg-gradient-to-br ${getFestiveGradient()} border-2 animate-scale-in`}>
        {/* Decorative elements */}
        <div className="absolute -top-2 -left-2">
          <Sparkles className="w-6 h-6 text-yellow-400 animate-spin" />
        </div>
        <div className="absolute -top-2 -right-2">
          <Star className="w-6 h-6 text-yellow-400 animate-spin" />
        </div>
        <div className="absolute -bottom-2 -left-2">
          <Heart className="w-6 h-6 text-red-400 animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -right-2">
          <Star className="w-6 h-6 text-yellow-400 animate-spin" />
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 hover:bg-white/20"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Content */}
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              {getFestiveIcon()}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {event.name}
            </h2>
            <p className="text-lg font-arabic text-muted-foreground">
              {event.arabicName}
            </p>
          </div>

          {/* Message */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {event.message}
          </p>

          {/* Action buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleClose}
              className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
            >
              Thank You
            </Button>
            {event.type === 'eid' && (
              <Button 
                variant="outline"
                className="flex-1 border-primary/30 hover:bg-primary/10"
                onClick={() => {
                  // Navigate to the prayers page (the old '/prayer-times'
                  // target is not a registered route — it landed on 404)
                  window.location.href = '/prayers';
                }}
              >
                View Prayer Times
              </Button>
            )}
          </div>

          {/* Special wishes for Eid */}
          {event.type === 'eid' && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg border border-white/20">
              <p className="text-xs text-center text-muted-foreground">
                May Allah accept our good deeds and forgive our sins. 
                Eid Mubarak to you and your families! 🌙✨
              </p>
            </div>
          )}
        </div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden rounded-lg">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400/30 rounded-full animate-pulse" />
          <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-green-400/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-1/3 w-4 h-4 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>
      </Card>
    </div>
  );
}

// Add custom animations to your CSS or global styles
/*
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

.animate-scale-in {
  animation: scaleIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.9);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
}
*/
