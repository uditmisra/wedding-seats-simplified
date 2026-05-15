import { supabase } from "@/integrations/supabase/client";

// Per-chunk caps. The AI does best with ~40 rows of tabular data per call;
// the byte cap stays well under ai-parse's 256 KB request limit so wide rows
// (many columns, long values) don't trip a 413 before the AI even sees them.
const ROWS_PER_CHUNK = 40;
const MAX_CHUNK_BYTES = 200 * 1024;

// Room descriptions are sent as one shot — chunking a single coherent
// description would strip the AI of context. This is the per-request guard.
const MAX_ROOM_BYTES = 200 * 1024;

const textEncoder = new TextEncoder();
const byteLen = (s: string) => textEncoder.encode(s).byteLength;

/**
 * Split a large text input into chunks bounded by both row count and byte
 * size, preserving the header (first line) on every chunk so the AI keeps
 * column context. Returns a single-element array if the input is small.
 */
export function chunkForParsing(text: string): string[] {
  const lines = text.split("\n").map(l => l.trimEnd()).filter(l => l.length > 0);
  if (!lines.length) return [text];

  const first = lines[0];
  const hasDelimiter = /\t|,|;|\|/.test(first);
  const looksLikeHeader = hasDelimiter && /name|guest|side|rsvp|table|meal|diet|email|shape|seat|capacity/i.test(first);

  const header = looksLikeHeader ? lines[0] : null;
  const body = looksLikeHeader ? lines.slice(1) : lines;

  if (body.length <= ROWS_PER_CHUNK && byteLen(text) <= MAX_CHUNK_BYTES) {
    return [text];
  }

  const headerBytes = header ? byteLen(header) + 1 : 0;
  const chunks: string[] = [];
  let current: string[] = [];
  let currentBytes = headerBytes;

  const flush = () => {
    if (!current.length) return;
    chunks.push((header ? [header, ...current] : current).join("\n"));
    current = [];
    currentBytes = headerBytes;
  };

  for (const row of body) {
    const rowBytes = byteLen(row) + 1;
    if (current.length > 0 && (current.length >= ROWS_PER_CHUNK || currentBytes + rowBytes > MAX_CHUNK_BYTES)) {
      flush();
    }
    current.push(row);
    currentBytes += rowBytes;
  }
  flush();

  return chunks;
}

async function extractErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!error || typeof error !== "object") return fallback;
  const err = error as { message?: string; context?: { json?: () => Promise<{ error?: string }> } };
  let msg = err.message ?? fallback;
  try {
    const body = await err.context?.json?.();
    if (body?.error) msg = body.error;
  } catch {
    /* ignore — fall back to message */
  }
  return msg;
}

interface ChunkedInvokeOpts<TItem> {
  mode: "guests" | "tables";
  text: string;
  /** Pull the array of items from a successful server response. */
  collect: (data: unknown) => TItem[];
  /** Called before each chunk request; useful for driving progress UI. */
  onProgress?: (batch: number, total: number) => void;
}

export interface ChunkedInvokeResult<TItem> {
  items: TItem[];
  batches: number;
  error?: string;
}

/**
 * Invoke the ai-parse edge function across as many chunks as the input
 * needs, merging items from every batch. Stops on the first error.
 */
export async function invokeAIChunked<T>(opts: ChunkedInvokeOpts<T>): Promise<ChunkedInvokeResult<T>> {
  const chunks = chunkForParsing(opts.text);
  const items: T[] = [];
  for (let i = 0; i < chunks.length; i++) {
    opts.onProgress?.(i + 1, chunks.length);
    const { data, error } = await supabase.functions.invoke("ai-parse", {
      body: { mode: opts.mode, input: chunks[i] },
    });
    if (error) {
      const msg = await extractErrorMessage(error, "AI request failed");
      return { items, batches: chunks.length, error: msg };
    }
    if (data && typeof data === "object" && "error" in data) {
      return { items, batches: chunks.length, error: String((data as { error: unknown }).error) };
    }
    items.push(...opts.collect(data));
  }
  return { items, batches: chunks.length };
}

export interface SingleInvokeResult {
  data?: unknown;
  error?: string;
}

/**
 * One-shot invoke for modes where the input is a coherent free-form
 * description (room layout, table list in prose). Chunking would lose
 * context. We guard the body size and surface a friendly oversize message
 * rather than letting the server return a 413.
 */
export async function invokeAISingle(mode: "room" | "tables", text: string): Promise<SingleInvokeResult> {
  if (byteLen(text) > MAX_ROOM_BYTES) {
    return { error: "That description is too long. Try a sentence or two with the highlights." };
  }
  const { data, error } = await supabase.functions.invoke("ai-parse", {
    body: { mode, input: text },
  });
  if (error) {
    const msg = await extractErrorMessage(error, "AI request failed");
    return { error: msg };
  }
  if (data && typeof data === "object" && "error" in data) {
    return { error: String((data as { error: unknown }).error) };
  }
  return { data };
}

export const invokeAIRoom = (text: string) => invokeAISingle("room", text);
