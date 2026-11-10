import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, BookOpen, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CollectionCard } from "./CollectionCard";
import { getAllCollections, HadithCollection } from "@/data/hadith-collections";
import { goBackOrFallback } from "@/lib/navigation";

export function HadithCollections() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const allCollections = useMemo(() => getAllCollections(), []);

  const filteredCollections = useMemo(() => {
    if (!searchTerm) return allCollections;
    
    const term = searchTerm.toLowerCase();
    return allCollections.filter(collection =>
      collection.title.toLowerCase().includes(term) ||
      collection.author.toLowerCase().includes(term) ||
      collection.description.toLowerCase().includes(term)
    );
  }, [allCollections, searchTerm]);

  const handleCollectionClick = (collection: HadithCollection) => {
    // Navigate to collection books first.
    navigate(`/hadith/collections/${collection.name}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goBackOrFallback(navigate, '/hadith')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Hadith Collections</h1>
            <p className="text-muted-foreground">
              Explore authentic Hadith from available collections
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hadith/bookmarks")}
            className="rounded-xl"
            title="View bookmarked hadith"
          >
            <Bookmark className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-border/50 focus:border-primary/50"
          />
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((collection) => (
            <CollectionCard
              key={collection.name}
              collection={collection}
              onClick={() => handleCollectionClick(collection)}
            />
          ))}
        </div>

        {/* No Results */}
        {filteredCollections.length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Collections Found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms to find what you're looking for.
              </p>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <Card className="mt-8 border-border/50">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Collection Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{allCollections.length}</p>
                <p className="text-sm text-muted-foreground">Collections</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {allCollections.reduce((sum, c) => sum + c.totalBooks, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Books</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {allCollections.reduce((sum, c) => sum + c.totalHadith, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Hadith</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  Authentic Sources
                </Badge>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
