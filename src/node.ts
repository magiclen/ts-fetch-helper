import { Readable } from "node:stream";

/**
 * Convert a Node.js Readable stream to a Web Streams API ReadableStream.
 */
export const nodeReadableToWebReadableStream = (nodeStream: Readable) => {
    return new ReadableStream({
        start(controller) {
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
        cancel() {
            nodeStream.destroy();
        },
    });
};
