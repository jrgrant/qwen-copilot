/**
 * SSE stream parser for OpenAI-compatible APIs.
 *
 * DashScope streams chunks as SSE lines: `data: {...json...}\n\n`.
 * This async generator reads the response body stream incrementally,
 * handles partial lines across chunk boundaries, and yields parsed
 * JSON chunk objects.
 */

import { DashScopeStreamChunk } from './types';

/**
 * Yields parsed SSE data chunks from a ReadableStream.
 * Handles partial line buffering and the `data: [DONE]` sentinel.
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<DashScopeStreamChunk> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal.aborted) break;

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');

    // The last element is either an empty string (if buffer ended with \n)
    // or a partial line — keep it for the next iteration.
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) {
        continue;
      }

      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') {
        return;
      }

      try {
        yield JSON.parse(data) as DashScopeStreamChunk;
      } catch {
        // Malformed JSON — skip this chunk gracefully
      }
    }
  }
}
