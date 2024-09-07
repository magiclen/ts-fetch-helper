import { TimeoutAbort } from "./timeout-abort.js";

/**
 * Creates a new `ReadableStream` that monitors and handles timeouts using the provided `TimeoutAbort` instance.
 *
 * The stream is wrapped in a `TransformStream` which resets the timeout on each chunk and clears it when the stream is flushed.
 *
 * @template T The type of the stream's data.
 *
 * @param {ReadableStream<T>} stream The original `ReadableStream` to be monitored.
 * @param {TimeoutAbort} timeoutAbort An instance of `TimeoutAbort` used to manage timeouts and abort signals.
 * @param {number | null} [timeout = undefined] The timeout duration in milliseconds to be reset on each chunk.
 * @param {boolean} [terminateTimeoutAbort = false] Terminate `timeoutAbort` when the stream is at the end.
 *
 * @returns {ReadableStream<T>} A new `ReadableStream` that applies the timeout management.
 */
export const createTimeoutReadableStream = <T> (stream: ReadableStream<T>, timeoutAbort: TimeoutAbort, timeout?: number | null, terminateTimeoutAbort = false): ReadableStream<T> => {
    const endTimeoutAbort = () => {
        if (terminateTimeoutAbort) {
            timeoutAbort.abort();
        } else {
            timeoutAbort.clearTimeout();
        }
    };

    let monitoredStream;

    if (typeof timeout !== "number") {
        monitoredStream = new TransformStream<T, T>({
            start() {
                timeoutAbort.clearTimeout();
            },
            flush(controller) {
                endTimeoutAbort();
                controller.terminate();
            },
        });
    } else {
        monitoredStream = new TransformStream<T, T>({
            start() {
                timeoutAbort.resetTimeout(timeout);
            },
            transform(chunk, controller) {
                timeoutAbort.resetTimeout(timeout);
                controller.enqueue(chunk);
            },
            flush(controller) {
                endTimeoutAbort();
                controller.terminate();
            },
        });
    }

    return stream.pipeThrough(monitoredStream);
};
