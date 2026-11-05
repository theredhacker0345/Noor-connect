/**
 * json-parse-worker.ts
 * Web Worker that fetches, optionally gzip-inflates, and JSON-parses a data
 * asset entirely off the renderer main thread. Large payloads (e.g. the
 * 15MB+ hadith collections) would otherwise block the main thread for long
 * stretches — a common trigger for WebView renderer-process death on Android.
 *
 * Bundled via Vite's `?worker` import; the worker is a classic worker so it
 * loads reliably inside the Capacitor local server (no module-worker/CORS
 * concerns).
 */

interface ParseRequest {
  id: number;
  url: string;
  gzipped: boolean;
}

interface ParseResponse {
  id: number;
  ok: boolean;
  data?: unknown;
  error?: string;
}

const workerScope = self as unknown as {
  onmessage: ((e: MessageEvent<ParseRequest>) => void) | null;
  postMessage: (msg: ParseResponse) => void;
};

workerScope.onmessage = async (event: MessageEvent<ParseRequest>) => {
  const { id, url, gzipped } = event.data;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    // Content-encoding aware decode — see decodeResponseBody in gzip-loader.ts.
    // Servers that auto-decompress pre-compressed .gz files (Content-Encoding:
    // gzip) make a second manual DecompressionStream pass fail with the cryptic
    // "TypeError: Failed to fetch" body-stream error.
    const buffer = await response.arrayBuffer();
    const encoding = response.headers.get("content-encoding");
    let text: string;
    if (
      (gzipped || (encoding && encoding !== "identity" && encoding !== "")) &&
      typeof DecompressionStream !== "undefined" &&
      buffer.byteLength > 1
    ) {
      try {
        const stream = new Response(buffer).body!.pipeThrough(new DecompressionStream("gzip"));
        text = await new Response(stream).text();
      } catch {
        // Already decoded by the server, or not actually gzip — plain text.
        text = new TextDecoder().decode(buffer);
      }
    } else {
      text = new TextDecoder().decode(buffer);
    }

    const data = JSON.parse(text);
    workerScope.postMessage({ id, ok: true, data } satisfies ParseResponse);
  } catch (error) {
    workerScope.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies ParseResponse);
  }
};
