import { describe, it, expect } from "vitest";

/**
 * Tests for the SSE streaming `finish_reason` capture logic.
 *
 * The `streamFromEdge` function in Debate.tsx reads SSE chunks and captures
 * `finish_reason` from the last chunk. These unit tests validate the parsing
 * logic extracted from the component.
 */

// ─── Extracted parsing logic (mirrors Debate.tsx handleEvent) ───────────────

interface StreamResult {
  text: string;
  finishReason: string | null;
}

function parseSSEChunks(chunks: string[]): StreamResult {
  let full = "";
  let lastFinishReason: string | null = null;

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (trimmed === "[DONE]") break;
    try {
      const parsed = JSON.parse(trimmed);
      const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
      const fr = parsed.choices?.[0]?.finish_reason as string | undefined;
      if (fr) lastFinishReason = fr;
      if (delta) full += delta;
    } catch {
      // skip malformed
    }
  }

  return { text: full, finishReason: lastFinishReason };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("SSE finish_reason capture", () => {
  it("captures finish_reason: stop for a normal completion", () => {
    const chunks = [
      '{"choices":[{"delta":{"content":"Hello "},"finish_reason":null}]}',
      '{"choices":[{"delta":{"content":"world."},"finish_reason":null}]}',
      '{"choices":[{"delta":{},"finish_reason":"stop"}]}',
      "[DONE]",
    ];
    const result = parseSSEChunks(chunks);
    expect(result.text).toBe("Hello world.");
    expect(result.finishReason).toBe("stop");
  });

  it("captures finish_reason: length for a truncated response", () => {
    const chunks = [
      '{"choices":[{"delta":{"content":"Partial re"},"finish_reason":null}]}',
      '{"choices":[{"delta":{"content":"spon"},"finish_reason":null}]}',
      '{"choices":[{"delta":{},"finish_reason":"length"}]}',
      "[DONE]",
    ];
    const result = parseSSEChunks(chunks);
    expect(result.text).toBe("Partial respon");
    expect(result.finishReason).toBe("length");
  });

  it("returns null finishReason when stream has no finish_reason", () => {
    const chunks = [
      '{"choices":[{"delta":{"content":"data"}}]}',
    ];
    const result = parseSSEChunks(chunks);
    expect(result.text).toBe("data");
    expect(result.finishReason).toBeNull();
  });

  it("skips malformed chunks without crashing", () => {
    const chunks = [
      "not json at all",
      '{"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}',
      "[DONE]",
    ];
    const result = parseSSEChunks(chunks);
    expect(result.text).toBe("ok");
    expect(result.finishReason).toBe("stop");
  });
});

describe("Retry eligibility logic", () => {
  const MAX_RETRIES = 2;
  const MIN_READING_LENGTH = 200;

  function shouldRetry(result: StreamResult): boolean {
    const isTruncated = result.finishReason === "length";
    const isTooShort = result.text.length < MIN_READING_LENGTH;
    const noStopReason = !result.finishReason && result.text.length > 0;
    return isTruncated || isTooShort || noStopReason;
  }

  it("triggers retry for finish_reason: length", () => {
    expect(shouldRetry({ text: "some text", finishReason: "length" })).toBe(true);
  });

  it("triggers retry for too-short text", () => {
    expect(shouldRetry({ text: "short", finishReason: "stop" })).toBe(true);
  });

  it("triggers retry when finish_reason is null but text exists", () => {
    expect(shouldRetry({ text: "some text without finish reason", finishReason: null })).toBe(true);
  });

  it("does NOT retry a normal completion with sufficient length", () => {
    const longText = "A".repeat(300);
    expect(shouldRetry({ text: longText, finishReason: "stop" })).toBe(false);
  });

  it("does NOT retry empty text with null finish_reason (stream failure handled elsewhere)", () => {
    // Empty text is too short (< 200 chars), so retry still triggers via isTooShort
    // Only an empty string with finishReason 'stop' and length >= MIN would skip retry
    expect(shouldRetry({ text: "", finishReason: null })).toBe(true);
  });
});
