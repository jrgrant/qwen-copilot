import { describe, it, expect } from 'vitest';
import { parseSSEStream } from './sse-parser';
import { DashScopeStreamChunk } from './types';

// ── Helpers ────────────────────────────────────────────────────────────

function createMockReader(
  chunks: Uint8Array[],
): ReadableStreamDefaultReader<Uint8Array> {
  let index = 0;
  return {
    read: async () => {
      if (index >= chunks.length)
        return { done: true, value: undefined as any };
      return { done: false, value: chunks[index++] };
    },
    cancel: async () => {},
    releaseLock: () => {},
    closed: Promise.resolve(undefined),
  } as ReadableStreamDefaultReader<Uint8Array>;
}

function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

const abortNever = new AbortController().signal;

// ── Sample chunk ────────────────────────────────────────────────────────

const sampleChunk: DashScopeStreamChunk = {
  id: 'chatcmpl-123',
  object: 'chat.completion.chunk',
  created: 1680000000,
  model: 'qwen3.7-max',
  choices: [
    {
      index: 0,
      delta: { content: 'Hello' },
      finish_reason: null,
    },
  ],
};

const sampleJSON = JSON.stringify(sampleChunk);

// ── Tests ──────────────────────────────────────────────────────────────

describe('parseSSEStream', () => {
  // REQ-005: Complete single SSE event parsed correctly (S1-SC2)
  it('REQ-005: parses a complete single SSE event', async () => {
    const reader = createMockReader([
      encodeText(`data: ${sampleJSON}\n\n`),
    ]);
    const results: DashScopeStreamChunk[] = [];
    for await (const chunk of parseSSEStream(reader, abortNever)) {
      results.push(chunk);
    }
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(sampleChunk);
  });

  // REQ-006: Multiple consecutive events yield separate chunks (S1-SC3)
  it('REQ-006: yields separate chunks for multiple consecutive events', async () => {
    const chunk2: DashScopeStreamChunk = {
      ...sampleChunk,
      id: 'chatcmpl-456',
      choices: [{ index: 0, delta: { content: ' world' }, finish_reason: null }],
    };
    const reader = createMockReader([
      encodeText(`data: ${sampleJSON}\n\ndata: ${JSON.stringify(chunk2)}\n\n`),
    ]);
    const results: DashScopeStreamChunk[] = [];
    for await (const chunk of parseSSEStream(reader, abortNever)) {
      results.push(chunk);
    }
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('chatcmpl-123');
    expect(results[1].id).toBe('chatcmpl-456');
  });

  // REQ-007: Payload split across chunk boundaries reassembled (S1-SC4)
  it('REQ-007: reassembles payload split across chunk boundaries', async () => {
    const payload = `data: ${sampleJSON}\n\n`;
    const mid = Math.floor(payload.length / 2);
    const reader = createMockReader([
      encodeText(payload.slice(0, mid)),
      encodeText(payload.slice(mid)),
    ]);
    const results: DashScopeStreamChunk[] = [];
    for await (const chunk of parseSSEStream(reader, abortNever)) {
      results.push(chunk);
    }
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(sampleChunk);
  });

  // REQ-008: Non-data lines silently skipped (S1-SC5)
  it('REQ-008: silently skips blank lines and heartbeat lines', async () => {
    const reader = createMockReader([
      encodeText(`\n:\n\n\ndata: ${sampleJSON}\n\n`),
    ]);
    const results: DashScopeStreamChunk[] = [];
    for await (const chunk of parseSSEStream(reader, abortNever)) {
      results.push(chunk);
    }
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(sampleChunk);
  });

  it('REQ-008b: silently skips data: with empty content', async () => {
    const reader = createMockReader([
      encodeText(`data:\n\ndata: ${sampleJSON}\n\n`),
    ]);
    const results: DashScopeStreamChunk[] = [];
    for await (const chunk of parseSSEStream(reader, abortNever)) {
      results.push(chunk);
    }
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(sampleChunk);
  });

  // REQ-009: data: [DONE] sentinel stops iteration (S1-SC6)
  it('REQ-009: stops iteration on data: [DONE] sentinel, ignores subsequent data', async () => {
    const chunk2: DashScopeStreamChunk = {
      ...sampleChunk,
      id: 'chatcmpl-789',
      choices: [{ index: 0, delta: { content: ' after' }, finish_reason: null }],
    };
    const reader = createMockReader([
      encodeText(`data: ${sampleJSON}\n\ndata: [DONE]\n\ndata: ${JSON.stringify(chunk2)}\n\n`),
    ]);
    const results: DashScopeStreamChunk[] = [];
    for await (const chunk of parseSSEStream(reader, abortNever)) {
      results.push(chunk);
    }
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('chatcmpl-123');
  });

  // REQ-010: Abort signal discards buffered data, stops immediately (S1-SC7)
  it('REQ-010: stops iteration immediately when aborted, discarding buffered data', async () => {
    const controller = new AbortController();
    const reader = createMockReader([
      encodeText(`data: ${sampleJSON}\n\ndata: {\n`),
      // This chunk will never be fully delivered because we abort mid-stream
    ]);
    const results: DashScopeStreamChunk[] = [];
    // Abort before reading begins
    controller.abort();
    for await (const chunk of parseSSEStream(reader, controller.signal)) {
      results.push(chunk);
    }
    expect(results).toHaveLength(0);
  });

  // REQ-011: Malformed JSON silently skipped (S1-SC8)
  it('REQ-011: silently skips lines with malformed JSON after data:', async () => {
    const reader = createMockReader([
      encodeText(`data: {invalid json}\n\ndata: ${sampleJSON}\n\n`),
    ]);
    const results: DashScopeStreamChunk[] = [];
    for await (const chunk of parseSSEStream(reader, abortNever)) {
      results.push(chunk);
    }
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(sampleChunk);
  });

  // Empty stream
  it('completes without yielding when the stream delivers no data', async () => {
    const reader = createMockReader([]);
    const results: DashScopeStreamChunk[] = [];
    for await (const chunk of parseSSEStream(reader, abortNever)) {
      results.push(chunk);
    }
    expect(results).toHaveLength(0);
  });
});
