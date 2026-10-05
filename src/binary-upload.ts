import { Transform, type Readable } from "node:stream";

export { declaredContentLength } from "./upload-policy.ts";

export class BinaryLengthError extends Error {}

export function exactLengthStream(
  source: Readable,
  expectedBytes: number,
  maxBytes: number,
): Readable {
  let received = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      if (received > expectedBytes || received > maxBytes) {
        callback(new BinaryLengthError("binary body exceeds declared size"));
        return;
      }
      callback(null, chunk);
    },
    flush(callback) {
      if (received !== expectedBytes) {
        callback(new BinaryLengthError("binary body size does not match metadata"));
        return;
      }
      callback();
    },
  });
  return source.pipe(counter);
}

export function isReadableBody(value: unknown): value is Readable {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as Readable).pipe === "function",
  );
}
