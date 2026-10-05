import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { BinaryLengthError, exactLengthStream } from "../src/binary-upload.ts";
import { declaredContentLength } from "../src/upload-policy.ts";
import {
  assertSafetyProviderAvailable,
  parseSafetyProviderVerdict,
  unavailableSafetyVerdict,
} from "../src/safety-verdict.ts";
import { uploadCompletionAction } from "../src/upload-completion.ts";

async function read(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test("upload streams enforce actual bytes against declared and maximum sizes", async () => {
  const body = Buffer.from("synthetic-artwork");
  assert.equal(declaredContentLength(String(body.length)), body.length);
  assert.deepEqual(await read(exactLengthStream(Readable.from([body]), body.length, 1024)), body);
  await assert.rejects(
    read(exactLengthStream(Readable.from([Buffer.alloc(9)]), 8, 16)),
    BinaryLengthError,
  );
  await assert.rejects(
    read(exactLengthStream(Readable.from([Buffer.alloc(17)]), 17, 16)),
    BinaryLengthError,
  );
});

test("safety decisions accept explicit verdicts and fail closed on provider outages", () => {
  assert.deepEqual(parseSafetyProviderVerdict({ verdict: "clean" }), { blocked: false });
  assert.deepEqual(parseSafetyProviderVerdict({ verdict: "blocked" }), {
    blocked: true,
    reason: "safety_provider_blocked",
  });
  assert.throws(() => parseSafetyProviderVerdict({ verdict: "unknown" }));
  assert.deepEqual(unavailableSafetyVerdict(true), {
    blocked: true,
    reason: "safety_provider_unavailable",
    retryable: true,
  });
  assert.throws(() => assertSafetyProviderAvailable(unavailableSafetyVerdict(true)));
});

test("a stored upload can be safely retried after its upload URL expires", () => {
  assert.equal(
    uploadCompletionAction("RECEIVED", new Date("2026-01-01T00:00:00Z"), new Date("2026-02-01T00:00:00Z")),
    "requeue",
  );
  assert.equal(
    uploadCompletionAction("PROCESSED", new Date("2026-01-01T00:00:00Z"), new Date("2026-02-01T00:00:00Z")),
    "conflict",
  );
});
