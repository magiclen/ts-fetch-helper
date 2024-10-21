import type { Readable } from "node:stream";

/**
 * Convert a Node.js Readable stream to a Web Streams API ReadableStream.
 */
export const nodeReadableToWebReadableStream = (nodeStream: Readable): ReadableStream => new ReadableStream({
    start: (controller): void => {
        nodeStream.on("data", (chunk) => {
            controller.enqueue(chunk);
        });
        nodeStream.on("end", () => {
            controller.close();
        });
        nodeStream.on("error", (err) => {
            controller.error(err);
        });
    },
    cancel: (): void => {
        nodeStream.destroy();
    },
});
