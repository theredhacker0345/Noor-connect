/**
 * Changelog Component
 * Displays version history with beautiful UI
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, 
  Bug, 
  Zap, 
  AlertTriangle, 
  Lock, 
  X, 
  Check,
  GitCommit,
  Calendar,
  Package
} from 'lucide-react';
import { 
  CHANGELOG_DATA, 
  getAllChangelogs, 
  markVersionAsSeen,
  hasUnseenChangelog,
  getChangeTypeIcon,
  getChangeTypeLabel,
  getChangeTypeColor,
  type ChangeType,
  type VersionChangelog,
} from '@/lib/changelog';
import { CURRENT_APP_VERSION } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/useI18n';

interface ChangelogProps {
  onClose?: () => void;
  showCloseButton?: boolean;
  maxHeight?: string;
}

const ChangeTypeIcon = ({ type }: { type: ChangeType }) => {
  switch (type) {
    case 'feature':
      return <Sparkles className="w-4 h-4" />;
    case 'fix':
      return <Bug className="w-4 h-4" />;
    case 'improvement':
      return <Zap className="w-4 h-4" />;
    case 'breaking':
      return <AlertTriangle className="w-4 h-4" />;
    case 'security':
      return <Lock className="w-4 h-4" />;
    default:
      return <GitCommit className="w-4 h-4" />;
  }
};

const ChangelogItem = ({ change }: { change: VersionChangelog }) => {
  const { t, formatDate } = useI18n();
  return (
    <div className="space-y-3">
      {/* Version Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg text-foreground">
              v{change.version}
            </h3>
            {change.version === CURRENT_APP_VERSION && (
              <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                {t('currentBadge')}
              </Badge>
            )}
          </div>
          <p className="text-base font-medium text-foreground/80 mt-0.5">
            {change.title}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(new Date(change.date), {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* Changes List */}
      <div className="space-y-2">
        {change.changes.map((item, idx) => (
          <div 
            key={idx}
            className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${getChangeTypeColor(item.type)}`}>
              <ChangeTypeIcon type={item.type} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <Badge 
                variant="outline" 
                className={`text-xs px-1.5 py-0 h-4 mb-1 ${getChangeTypeColor(item.type)}`}
              >
                {getChangeTypeLabel(item.type)}
              </Badge>
              <p className="text-sm text-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function Changelog({ onClose, showCloseButton = true, maxHeight = '60vh' }: ChangelogProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    setHasUnread(hasUnseenChangelog());
    // Mark current version as seen when viewing
    markVersionAsSeen(CURRENT_APP_VERSION);
  }, []);

  const changelogs = getAllChangelogs();

  return (
    <Card className="w-full max-w-2xl mx-auto border-border/60 shadow-lg h-[70vh] flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{t('whatsNew')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('versionHistoryUpdates')}
              </p>
            </div>
          </div>
          
          {showCloseButton && onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 rounded-full h-9 w-9"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {hasUnread && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-800">
              {t('newUpdatesAvailable')}
            </span>
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 overflow-y-auto p-0">
        <div className="px-6 py-4">
          <div className="space-y-6">
            {changelogs.map((changelog, index) => (
              <div key={changelog.version}>
                <ChangelogItem change={changelog} />
                {index < changelogs.length - 1 && (
                  <Separator className="my-6" />
                )}
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              {t('youreOnVersion', { version: CURRENT_APP_VERSION })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for embedding in settings
export function ChangelogCompact({ onViewFull }: { onViewFull?: () => void }) {
  const latest = CHANGELOG_DATA[0];
  const { t } = useI18n();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    setHasUnread(hasUnseenChangelog());
    markVersionAsSeen(CURRENT_APP_VERSION);
  }, []);

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">{t('latestUpdate')}</h4>
              {hasUnread && (
                <Badge variant="default" className="bg-emerald-500 text-white text-xs px-1.5 py-0 h-4">
                  {t('newBadge')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              v{latest.version} • {latest.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('changesLabel', { count: latest.changes.length })}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onViewFull}
            className="shrink-0 text-xs h-8"
          >
            {t('viewAll')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default Changelog;
