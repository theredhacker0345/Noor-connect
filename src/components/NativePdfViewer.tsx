import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ZoomIn, ZoomOut, RotateCw, Loader2, ExternalLink, Scroll, Eye, EyeOff } from 'lucide-react';
import { getPdfBlobUrl } from '@/lib/ebooks-storage';
import { getReadingProgress, saveReadingProgress } from '@/lib/reading-progress';
import PdfAudioPlayer from '@/components/PdfAudioPlayer';

// Lazy load pdfjs-dist to reduce bundle size
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let pdfjsLib: any = null;
let workerConfigured = false;

async function getPdfjsLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    if (!workerConfigured) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      workerConfigured = true;
    }
  }
  return pdfjsLib;
}

interface NativePdfViewerProps {
  url: string;
  title: string;
  localKey?: string;
  progressKey?: string;
  onClose: () => void;
}

type ViewerMode = 'loading' | 'pdfjs' | 'iframe' | 'error';

// Module scope (pure function, no props/state).
// MUST live here: it was previously a `const` defined AFTER the loading/error
// early-returns inside the component, so calling it from loadPdf() (which the
// useEffect fires while viewerMode is still 'loading') hit the temporal dead
// zone -> "ReferenceError: Cannot access '$' before initialization" and EVERY
// archive.org PDF failed to open. See user report from the ebook section.
const getBetterViewerUrl = (pdfUrl: string): string => {
  if (pdfUrl.includes('archive.org')) {
    // Try to get the direct PDF download URL from archive.org
    const downloadMatch = pdfUrl.match(/archive\.org\/download\/([^/]+)\/.*\.pdf/);
    if (downloadMatch?.[1]) {
      // Keep the direct download URL for the PDF
      return pdfUrl;
    }

    // If it's a details page, try to construct the download URL
    const detailsMatch = pdfUrl.match(/archive\.org\/details\/([^/]+)/);
    if (detailsMatch?.[1]) {
      // Try to get the first PDF file from the archive
      // This assumes there's a PDF with the same name as the identifier
      return `https://archive.org/download/${detailsMatch[1]}/${detailsMatch[1]}.pdf`;
    }

    // If it's already a download URL, keep it as is
    if (pdfUrl.includes('archive.org/download/')) {
      return pdfUrl;
    }
  }
  return pdfUrl;
};

// Sub-component for rendering individual pages in vertical mode
function PdfPage({ pdf, pageNumber, scale }: { pdf: any; pageNumber: number; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const renderTaskRef = useRef<any>(null);

  const getOptimalScale = (baseScale: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    return baseScale / dpr;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { rootMargin: '100% 0px' } // Preload nicely
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !pdf || !canvasRef.current) return;

    let mounted = true;

    const render = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (!mounted) return;

        const viewport = page.getViewport({ scale: getOptimalScale(scale) });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        if (canvas.height !== viewport.height || canvas.width !== viewport.width) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
        }

        // Cancel previous render if any
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error('Error rendering page', pageNumber, error);
        }
      }
    };

    render();

    return () => {
      mounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [inView, pdf, pageNumber, scale]);

  return (
    <div ref={containerRef} className="flex justify-center my-4 min-h-[400px]">
      <canvas ref={canvasRef} className="border border-border shadow-lg bg-white" />
    </div>
  );
}

export default function NativePdfViewer({ url, title, localKey, progressKey, onClose }: NativePdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pdfDocumentRef = useRef<any>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [viewerMode, setViewerMode] = useState<ViewerMode>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isVertical, setIsVertical] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [resolvedPdfSource, setResolvedPdfSource] = useState(url);
  const [visibleWindow, setVisibleWindow] = useState({ start: 1, end: 20 });
  const [focusMode, setFocusMode] = useState(false);
  const effectiveProgressKey = progressKey || (localKey ? `local:${localKey}` : url);

  useEffect(() => {
    void loadPdf();
  }, [url, localKey]);

  useEffect(() => {
    if (!effectiveProgressKey || totalPages <= 0) return;
    saveReadingProgress(effectiveProgressKey, currentPage, totalPages);
  }, [effectiveProgressKey, currentPage, totalPages]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (pdfDocumentRef.current) {
        try {
          pdfDocumentRef.current.destroy();
        } catch {
          // Error is non-critical, silently ignored
        }
      }
    };
  }, []);

  // Windowed rendering for vertical mode
  useEffect(() => {
    if (!isVertical || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      const pageHeight = container.scrollHeight / totalPages;
      const scrollTop = container.scrollTop;
      const viewHeight = container.clientHeight;
      const buffer = 5;
      const start = Math.max(1, Math.floor(scrollTop / pageHeight) - buffer + 1);
      const end = Math.min(totalPages, Math.ceil((scrollTop + viewHeight) / pageHeight) + buffer);
      setVisibleWindow({ start, end });
    };
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isVertical, totalPages]);

  const loadPdf = async () => {
    try {
      setViewerMode('loading');
      setError(null);

      let pdfUrl = url;

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      // If we have a localKey, get the blob URL from storage
      if (localKey) {
        console.log('Loading local PDF from storage:', localKey);
        const blobUrl = await getPdfBlobUrl(localKey);
        if (blobUrl) {
          pdfUrl = blobUrl;
          objectUrlRef.current = blobUrl;
        } else if (!url) {
          throw new Error('Local PDF not found in storage');
        }
      }

      if (!pdfUrl) {
        throw new Error('No PDF URL available');
      }

      // Handle archive.org URLs - get direct download URL
      if (pdfUrl.includes('archive.org')) {
        const directUrl = getBetterViewerUrl(pdfUrl);
        if (directUrl !== pdfUrl) {
          console.log('Converted archive.org URL to direct download:', directUrl);
          pdfUrl = directUrl;
        }
      }

      console.log('Loading PDF from:', pdfUrl);
      setResolvedPdfSource(pdfUrl);

      // Lazy load pdfjs-dist
      const lib = await getPdfjsLib();

      // Configure PDF.js with proper settings
      const loadingTask = lib.getDocument({
        url: pdfUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
        cMapPacked: true,
        enableXfa: true,
        // Add withCredentials: false to avoid credential issues
        withCredentials: false,
        // Try to disable XFA for better compatibility
        disableAutoFetch: true,
        disableStream: true,
      });

      const pdf = await loadingTask.promise;
      const savedProgress = getReadingProgress(effectiveProgressKey);
      const initialPage = savedProgress && savedProgress.currentPage >= 1 && savedProgress.currentPage <= pdf.numPages
        ? savedProgress.currentPage
        : 1;

      setPdfDocument(pdf);
      pdfDocumentRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(initialPage);
      setViewerMode('pdfjs');

      // Only render page 1 if we remain in single-page mode or want to init
      if (!isVertical) {
        await renderPage(pdf, initialPage, scale);
      }

      saveReadingProgress(effectiveProgressKey, initialPage, pdf.numPages);
    } catch (err: any) {
      console.error('Failed to load PDF with pdf.js:', err);

      // Check if it's a CORS error
      const isCorsError = err?.message?.includes('Failed to fetch') ||
        err?.name === 'UnknownErrorException' ||
        err?.message?.includes('CORS');

      if (isCorsError) {
        console.log('CORS error detected, using iframe with direct PDF URL');
        // Fall back to iframe-based viewer with direct PDF URL for CORS-restricted PDFs
        setViewerMode('iframe');
      } else {
        setError(`Unable to load PDF: ${err?.message || 'Unknown error'}`);
        setViewerMode('error');
      }
    }
  };

  const getOptimalScale = (baseScale: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1); // cap at 1 for memory savings on HiDPI
    return baseScale / dpr;
  };

  const renderPage = async (pdf: any, pageNum: number, scaleValue: number) => {
    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale: getOptimalScale(scaleValue) });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Failed to render page:', err);
      setError('Failed to render PDF page.');
    }
  };

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || !pdfDocument) return;

    setCurrentPage(newPage);
    if (!isVertical) {
      renderPage(pdfDocument, newPage, scale);
    }
  };

  const zoomIn = () => {
    const newScale = Math.min(scale + 0.25, 3.0);
    setScale(newScale);
    if (pdfDocument && !isVertical) {
      renderPage(pdfDocument, currentPage, newScale);
    }
  };

  const zoomOut = () => {
    const newScale = Math.max(scale - 0.25, 0.5);
    setScale(newScale);
    if (pdfDocument && !isVertical) {
      renderPage(pdfDocument, currentPage, newScale);
    }
  };

  const rotate = () => {
    // For simplicity, we'll just reload the page/layout
    if (pdfDocument && !isVertical) {
      renderPage(pdfDocument, currentPage, scale);
    }
  };

  const downloadPdf = () => {
    const source = resolvedPdfSource || url;
    if (source) {
      window.open(source, '_blank');
    }
  };

  const toggleLayout = () => {
    setIsVertical(!isVertical);
    // If switching back to single page, re-render current page
    if (isVertical && pdfDocument) {
      // We need to wait for layout change then render, but effect might handle or we can just trigger it
      setTimeout(() => renderPage(pdfDocument, currentPage, scale), 50);
    }
  };

  // Loading state
  if (viewerMode === 'loading') {
    return (
      <div className="fixed inset-0 bg-background z-[1000] flex flex-col">
        <header className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border shrink-0 safe-area-top">
          <Button size="icon" variant="ghost" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="flex-1 font-medium text-sm truncate">{title}</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading PDF...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (viewerMode === 'error') {
    return (
      <div className="fixed inset-0 bg-background z-[1000] flex flex-col">
        <header className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border shrink-0 safe-area-top">
          <Button size="icon" variant="ghost" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="flex-1 font-medium text-sm truncate">{title}</h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <p className="text-destructive mb-2 text-sm">{error}</p>
            <p className="text-xs text-muted-foreground mb-4">
              Some PDF sources may be restricted by browser CORS policies.
              You can try opening the PDF directly in your browser.
            </p>
            <div className="flex gap-2 flex-col sm:flex-row justify-center">
              <Button variant="outline" onClick={loadPdf}>
                Retry
              </Button>
              <Button variant="default" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Browser
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // External viewer mode (fallback for CORS-restricted PDFs)
  if (viewerMode === 'iframe') {
    const viewerUrl = getBetterViewerUrl(url);

    return (
      <div className="fixed inset-0 bg-background z-[1000] flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border shrink-0 safe-area-top">
          <Button size="icon" variant="ghost" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="flex-1 font-medium text-sm truncate">{title}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(viewerUrl, '_blank', 'noopener,noreferrer')}
            title="Open in browser"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </header>

        {/* Content - Embedded PDF viewer using direct PDF URL */}
        <div className="flex-1 bg-muted/20">
          <iframe
            src={`${viewerUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            title={title}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          />
        </div>

        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground text-center">
          Viewing PDF directly. Use the external button to open in archive.org if needed.
        </div>
      </div>
    );
  }

  // PDF.js canvas viewer mode (for PDFs without CORS issues)
  return (
    <div className="fixed inset-0 bg-background z-[1000] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      {!focusMode && (
        <header className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border shrink-0 safe-area-top">
          <Button size="icon" variant="ghost" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="flex-1 font-medium text-sm truncate">{title}</h1>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setFocusMode(true)}
              title="Focus mode (hide controls)"
            >
              <EyeOff className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={isVertical ? "secondary" : "ghost"}
              onClick={toggleLayout}
              title={isVertical ? "Switch to Page View" : "Switch to Vertical Scroll"}
            >
              <Scroll className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={downloadPdf}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </header>
      )}

      {/* PDF Controls */}
      {!focusMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            {!isVertical && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <input
                  type="range"
                  min={1}
                  max={totalPages || 1}
                  value={currentPage}
                  onChange={e => changePage(Number(e.target.value))}
                  className="w-24 h-1.5 cursor-pointer accent-primary"
                  title="Scrub through pages"
                />
                <span className="text-sm font-medium px-1 min-w-[80px] text-center tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </>
            )}
            {isVertical && (
              <span className="text-sm font-medium px-2">
                {totalPages} Pages
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={zoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-2">
              {Math.round(scale * 100)}%
            </span>
            <Button size="sm" variant="outline" onClick={zoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            {!isVertical && (
              <Button size="sm" variant="outline" onClick={rotate}>
                <RotateCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Focus mode floating exit button */}
      {focusMode && (
        <div className="absolute top-2 right-2 z-[1001] opacity-20 hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFocusMode(false)}
            title="Exit focus mode"
            className="shadow-lg"
          >
            <Eye className="w-4 h-4 mr-1" />
            Show controls
          </Button>
        </div>
      )}

      {/* PDF Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-muted/30 p-4">
        <div className="flex justify-center flex-col items-center">
          {isVertical ? (
            // Vertical Scroll Mode: Windowed rendering of visible pages + buffer
            Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1;
              if (pageNum < visibleWindow.start || pageNum > visibleWindow.end) {
                // Render placeholder for hidden pages to maintain scroll height
                return <div key={pageNum} className="flex justify-center my-4 min-h-[400px] items-center text-muted-foreground/30">...</div>;
              }
              return (
                <PdfPage
                  key={pageNum}
                  pdf={pdfDocument}
                  pageNumber={pageNum}
                  scale={scale}
                />
              );
            })
          ) : (
            // Single Page Mode: Render simplified single canvas
            <canvas
              ref={canvasRef}
              className="border border-border shadow-lg bg-white"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          )}
        </div>
      </div>

      {/* Audio Player */}
      {showAudioPlayer && viewerMode === 'pdfjs' && totalPages > 0 && (
        <PdfAudioPlayer
          pdfSource={resolvedPdfSource || url}
          cacheKey={effectiveProgressKey}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            if (!isVertical && pdfDocument) {
              renderPage(pdfDocument, page, scale);
            }
          }}
          onClose={() => setShowAudioPlayer(false)}
        />
      )}
    </div>
  );
}

