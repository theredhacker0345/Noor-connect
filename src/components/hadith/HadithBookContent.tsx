import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, BookOpen, ChevronRight, Copy, Bookmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCollectionByName, HadithBook, HadithCollection, EnhancedHadith } from "@/data/hadith-collections";
import { getHadithBookData, getHadithCollectionMetadata } from "@/lib/hadith";
import { getGradeBadgeClass } from "@/lib/hadith-utils";
import { useHadithBookmarks } from "@/hooks/useHadithBookmarks";
import { useI18n } from "@/hooks/useI18n";
import i18n from "@/lib/i18n-new";

const SHOW_ALL_PAGE_SIZE = 300;

interface HadithCardProps {
  hadith: EnhancedHadith;
  index: number;
  collection: string;
  book: string;
  bookmarked: boolean;
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>["toast"];
  toggleBookmark: (item: { collection: string; bookNumber: string; hadithNumber: string; arabic: string; englishTranslation?: string; bookName?: string }) => void;
}

const HadithCard = memo(function HadithCard({ hadith, index, collection, book, bookmarked, navigate, toast, toggleBookmark }: HadithCardProps) {
  // Subscribes this memoized card to language changes
  useI18n();
  // Arabic UI: the authentic Arabic matn IS the content — hide the English translation
  const isArabicUi = i18n.language?.startsWith("ar");
  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01] border-border/50 hover:border-primary/30"
      onClick={() => navigate(`/hadith/collections/${collection}/${book}/${hadith.hadithNumber}`)}
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs">
                #{hadith.hadithNumber}
              </Badge>
              {hadith.grade && (
                <Badge variant="outline" className={`text-xs ${getGradeBadgeClass(hadith.grade)}`}>
                  {hadith.grade}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 ml-auto rounded-lg hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark({
                    collection,
                    bookNumber: book,
                    hadithNumber: hadith.hadithNumber,
                    arabic: hadith.arabic,
                    englishTranslation: hadith.englishTranslation,
                    bookName: hadith.bookName,
                  });
                }}
              >
                <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </Button>
            </div>

            {/* Arabic Text */}
            <div className="glass-card p-4 rounded-xl mb-3">
              <p className="text-xl md:text-2xl font-arabic text-right leading-loose text-foreground" dir="rtl">
                {hadith.arabic}
              </p>
            </div>

            {/* Translation — hidden for Arabic readers (matn is the content) */}
            {!isArabicUi && hadith.englishTranslation && (
              <p className="text-sm text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
                {hadith.englishTranslation}
              </p>
            )}

            {/* Narrator */}
            {hadith.narrator && (
              <p className="text-sm font-semibold text-primary mt-3">
                Narrated by: {hadith.narrator}
              </p>
            )}

            {/* Copy */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs rounded-lg hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  const text = `${hadith.arabic}\n\n${hadith.englishTranslation || ""}\n\n— ${collection} (${hadith.hadithNumber})`;
                  navigator.clipboard.writeText(text).then(() => {
                    toast({ title: "Copied to clipboard" });
                  });
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy
              </Button>
            </div>

          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
        </div>
      </CardContent>
    </Card>
  );
});

function normalizeBookNumber(bookNumber: string): string {
  const parsed = Number.parseInt(bookNumber, 10);
  return Number.isNaN(parsed) ? bookNumber : String(parsed);
}

export function HadithBookContent() {
  const { collection, book } = useParams<{ collection: string; book: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [hadithData, setHadithData] = useState<EnhancedHadith[]>([]);
  const [remoteCollectionData, setRemoteCollectionData] = useState<HadithCollection | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const staticCollectionData = useMemo(() => {
    return collection ? getCollectionByName(collection) : null;
  }, [collection]);

  const collectionData = remoteCollectionData ?? staticCollectionData;

  useEffect(() => {
    let isMounted = true;

    async function loadCollectionMetadata() {
      if (!collection) {
        setRemoteCollectionData(null);
        return;
      }

      try {
        const metadata = await getHadithCollectionMetadata(collection);
        if (isMounted) {
          setRemoteCollectionData(metadata);
        }
      } catch (error) {
        console.warn(`Failed to load metadata for ${collection}:`, error);
        if (isMounted) {
          setRemoteCollectionData(null);
        }
      }
    }

    loadCollectionMetadata();

    return () => {
      isMounted = false;
    };
  }, [collection]);

  useEffect(() => {
    let isMounted = true;

    async function loadBookHadith() {
      if (!collection || !book) {
        setHadithData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(false);
      try {
        const data = await getHadithBookData(collection, book);
        if (isMounted) {
          setHadithData(Array.isArray(data) ? data : []);
          // Data resolved empty — treat like a failure so the user gets a
          // retry instead of a misleading "Book Not Found".
          setLoadError(!data || data.length === 0);
        }
      } catch (error) {
        console.warn(`Failed to load hadith for ${collection}/${book}:`, error);
        if (isMounted) {
          setHadithData([]);
          setLoadError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadBookHadith();

    return () => {
      isMounted = false;
    };
  }, [collection, book, retryCount]);

  const bookInfo = useMemo<HadithBook | null>(() => {
    if (!book) {
      return null;
    }

    const normalizedBook = normalizeBookNumber(book);
    const fromMetadata = collectionData?.books.find(
      (entry) => normalizeBookNumber(entry.number) === normalizedBook
    );
    if (fromMetadata) {
      return fromMetadata;
    }

    const firstHadith = hadithData[0];
    if (!firstHadith) {
      return null;
    }

    return {
      number: String(firstHadith.bookNumber ?? book),
      name: firstHadith.bookName ?? `Book ${book}`,
      arabicName: "",
      hadithCount: hadithData.length,
      description: undefined,
    };
  }, [book, collectionData, hadithData]);

  const filteredHadith = useMemo(() => {
    if (!searchTerm) return hadithData;

    const term = searchTerm.toLowerCase();
    return hadithData.filter((hadith) => {
      const tags = Array.isArray(hadith.tags) ? hadith.tags : [];
      return (
        hadith.arabic?.toLowerCase().includes(term) ||
        hadith.englishTranslation?.toLowerCase().includes(term) ||
        hadith.narrator?.toLowerCase().includes(term) ||
        hadith.bookName?.toLowerCase().includes(term) ||
        hadith.chapterName?.toLowerCase().includes(term) ||
        tags.some((tag) => tag.toLowerCase().includes(term))
      );
    });
  }, [hadithData, searchTerm]);

  const { bookmarks, toggleBookmark } = useHadithBookmarks();

  const bookmarkSet = useMemo(
    () => new Set(bookmarks.map(b => `${b.collection}:${b.hadithNumber}`)),
    [bookmarks]
  );

  const isBookmarked = useCallback(
    (hadithNumber: string) => bookmarkSet.has(`${collection}:${hadithNumber}`),
    [bookmarkSet, collection]
  );

  const [displayCount, setDisplayCount] = useState(50);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDisplayCount(50);
  }, [searchTerm, book, collection]);

  // Auto-load more hadith when the sentinel at the end of the list becomes visible
  useEffect(() => {
    if (displayCount >= filteredHadith.length || filteredHadith.length === 0) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting)) {
          setDisplayCount(prev => Math.min(prev + SHOW_ALL_PAGE_SIZE, filteredHadith.length));
        }
      },
      { rootMargin: "1200px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayCount, filteredHadith.length]);

  const displayedHadith = useMemo(() => {
    return filteredHadith.slice(0, displayCount);
  }, [filteredHadith, displayCount]);

  const loadMore = () => {
    setDisplayCount(prev => prev + 50);
  };

  if (!collectionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Collection Not Found
          </h2>
          <p className="text-muted-foreground">
            The requested Hadith collection could not be found.
          </p>
          <Button
            onClick={() => navigate("/hadith/collections")}
            className="mt-4"
          >
            Browse Collections
          </Button>
        </div>
      </div>
    );
  }

  if (loadError && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Couldn't load this book
          </h2>
          <p className="text-muted-foreground mb-4">
            Check your connection and try again.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={() => setRetryCount(c => c + 1)} className="rounded-xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/hadith/collections/${collection}`)}
              className="rounded-xl"
            >
              Back to Collection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!bookInfo && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Book Not Found
          </h2>
          <p className="text-muted-foreground">
            The requested Hadith book could not be found.
          </p>
          <Button
            onClick={() => navigate(`/hadith/collections/${collection}`)}
            className="mt-4"
          >
            Back to Collection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/hadith/collections/${collection}`)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{bookInfo?.name ?? `Book ${book}`}</h1>
            {bookInfo?.arabicName && (
              <p className="text-muted-foreground font-arabic" dir="rtl">
                {bookInfo.arabicName}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {loading ? "Loading..." : `${filteredHadith.length} Hadith`}
          </Badge>
        </div>

        {/* Book Info */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Book Information</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Collection:</span> {collectionData.title}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Book Number:</span> {bookInfo?.number ?? book}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Total Hadith:</span> {hadithData.length}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {bookInfo?.description || "Description is not available for this book."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search hadith in this book..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-border/50 focus:border-primary/50"
          />
        </div>

        {loading && (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                  <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Hadith List */}
        {!loading && (
          <div className="space-y-4">
            {displayedHadith.map((hadith, index) => (
              <HadithCard
                key={`${hadith.id}-${hadith.bookNumber}-${hadith.hadithNumber}-${index}`}
                hadith={hadith}
                index={index}
                collection={collection!}
                book={book!}
                bookmarked={isBookmarked(hadith.hadithNumber)}
                navigate={navigate}
                toast={toast}
                toggleBookmark={toggleBookmark}
              />
            ))}

            {displayCount < filteredHadith.length && (
              <div ref={sentinelRef} aria-hidden="true" />
            )}

            {/* Load More / Show All */}
            {filteredHadith.length > displayCount && (
              <div className="pt-4 pb-8 flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {displayCount} of {filteredHadith.length} hadith
                </p>
                <div className="flex gap-2 w-full max-w-sm">
                  <Button
                    onClick={loadMore}
                    variant="outline"
                    className="flex-1 rounded-xl border-primary/20 hover:bg-primary/5"
                  >
                    Load More ({filteredHadith.length - displayCount} remaining)
                  </Button>
                  <Button
                    onClick={() => setDisplayCount(Math.min(filteredHadith.length, SHOW_ALL_PAGE_SIZE))}
                    variant="outline"
                    className="flex-1 rounded-xl border-primary/20 hover:bg-primary/5"
                  >
                    Show All
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!loading && filteredHadith.length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hadithData.length === 0 ? "No Hadith Imported Yet" : "No Hadith Found"}
              </h3>
              <p className="text-muted-foreground">
                {hadithData.length === 0
                  ? "This book is configured but has no local hadith data files yet."
                  : "Try adjusting your search terms to find what you're looking for."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
