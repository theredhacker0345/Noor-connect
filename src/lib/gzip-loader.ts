/**
 * gzip-loader.ts
 * Loads gzip-compressed JSON assets from the local bundle (see clean-dist-data.js).
 *
 * At build time hadith data is shipped as *.json.gz (~65-70% smaller in the APK);
 * at runtime we decompress it with DecompressionStream (Chromium 103+, i.e. all
 * modern Android WebViews). Older WebViews fall back to the caller's plain-fetch
 * path via isGzipSupported().
 *
 * Heavy loads (the hadith collections are 15MB+ of JSON) are parsed inside a
 * Web Worker so the renderer main thread is never blocked for long stretches —
 * long synchronous work in the renderer is a common cause of WebView
 * renderer-process death on Android. If the worker can't be created or fails,
 * we transparently fall back to the original inline path.
 */

import JsonParseWorker from "./json-parse-worker?worker";

/** True when the runtime WebView supports DecompressionStream. */
export const isGzipSupported = (): boolean =>
  typeof DecompressionStream !== "undefined";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

let workerInstance: Worker | null = null;
let workerRequestSeq = 0;
let workerBroken = false;
const pendingRequests = new Map<number, PendingRequest>();

/** Get the shared parse worker, or null if workers are unavailable. */
function getParseWorker(): Worker | null {
  if (workerBroken) return null;
  if (workerInstance) return workerInstance;

  let instance: Worker;
  try {
    instance = new JsonParseWorker();
  } catch {
    workerBroken = true;
    return null;
  }

  instance.onmessage = (event: MessageEvent) => {
    const msg = event.data as {
      id?: number;
      ok?: boolean;
      data?: unknown;
      error?: string;
    };
    if (typeof msg?.id !== "number") return;
    const pending = pendingRequests.get(msg.id);
    if (!pending) return;
    pendingRequests.delete(msg.id);
    if (msg.ok) {
      pending.resolve(msg.data);
    } else {
      pending.reject(new Error(msg.error || "Worker failed to parse data"));
    }
  };

  instance.onerror = () => {
    // Worker crashed or failed to load — reject everything pending and stop
    // trying so callers fall back to the inline parse path.
    workerBroken = true;
    for (const pending of pendingRequests.values()) {
      pending.reject(new Error("Worker unavailable"));
    }
    pendingRequests.clear();
    if (workerInstance) {
      try {
        workerInstance.terminate();
      } catch {
        // ignore
      }
    }
    workerInstance = null;
  };

  workerInstance = instance;
  return instance;
}

/**
 * Fetch a gzipped JSON file and parse it.
 * Throws when the request fails or the payload is not valid JSON.
 */
export async function loadGzippedJson<T>(url: string): Promise<T> {
  const worker = getParseWorker();
  if (worker) {
    try {
      return await new Promise<T>((resolve, reject) => {
        const id = ++workerRequestSeq;
        pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject });
        worker.postMessage({ id, url, gzipped: true });
      });
    } catch (error) {
      // Worker path failed (crash, timeout, unsupported) — fall through to the
      // inline implementation so loading still works everywhere.
      console.warn(`Worker parse failed for ${url}, falling back inline:`, error);
    }
  }

  return loadGzippedJsonInline<T>(url);
}

/** Inline (main-thread) implementation, used as a fallback. */
async function loadGzippedJsonInline<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await decodeResponseBody(response, true);
  return JSON.parse(text) as T;
}

/**
 * Read a (possibly gzipped) JSON payload out of a fetch Response.
 *
 * Some static servers (sirv — used by vite preview — and several CDNs) serve
 * pre-compressed .json.gz files with `Content-Encoding: gzip`, which makes the
 * BROWSER transparently decompress the body. Piping that already-decoded body
 * through DecompressionStream again errors, and Chromium surfaces the dead
 * body stream as the cryptic "TypeError: Failed to fetch" — which used to kill
 * the whole hadith/seerah/qisas load chain on those servers.
 *
 * Strategy: read the body ONCE into a buffer, then — if the payload might be
 * gzip (the response advertises an encoding, or the caller asked for gzip
 * because of the .gz URL) — try manual inflation and fall back to treating the
 * buffer as plain text. This is correct for every server behaviour:
 *   - header + auto-decoded body  → inflate attempt fails → plain text ✓
 *   - no header + raw gzip bytes  → inflate attempt succeeds ✓
 *   - plain JSON (no gzip at all) → inflate attempt fails → plain text ✓
 */
export async function decodeResponseBody(response: Response, maybeGzipped: boolean): Promise<string> {
  const encoding = response.headers.get("content-encoding");
  const buffer = await response.arrayBuffer();
  if ((encoding && encoding !== "identity" && encoding !== "") || maybeGzipped) {
    if (typeof DecompressionStream !== "undefined" && buffer.byteLength > 1) {
      try {
        const stream = new Response(buffer).body!.pipeThrough(new DecompressionStream("gzip"));
        return await new Response(stream).text();
      } catch {
        // Body was already decoded by the server, or the payload isn't gzip —
        // fall through and read it as plain text.
      }
    }
  }
  return new TextDecoder().decode(buffer);
}
