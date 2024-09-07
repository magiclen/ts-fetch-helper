import { TimeoutAbort, createTimeoutReadableStream } from "./timeout/index.js";

export * from "./node.js";

export * from "./timeout/index.js";

/**
 * Interface defining options for managing timeouts in a fetch request.
 */
export interface TimeoutOptions {
    /**
     * Request timeout in milliseconds. This will set a maximum lifespan for the request.
     */
    requestTimeout?: number,

    /**
     * Idle timeout in milliseconds. Resets each time data is received, aborting the request if no data is received within the specified duration.
     */
    idleTimeout?: number,
}

/**
 * Class representing a response object with optional timeout management for its body stream.
 */
export class TimeoutResponse {
    private _body?: ReadableStream<Uint8Array> | null;

    constructor(private readonly response: Response, private readonly createBody?: () => ReadableStream<Uint8Array>) {
    }

    /**
     * Getter for response headers.
     */
    public get headers() {
        return this.response.headers;
    }

    /**
     * Getter for the `ok` status of the response.
     */
    public get ok() {
        return this.response.ok;
    }

    /**
     * Getter for whether the response was redirected.
     */
    public get redirected() {
        return this.response.redirected;
    }

    /**
     * Getter for the response status code.
     */
    public get status() {
        return this.response.status;
    }

    /**
     * Getter for the status text of the response.
     */
    public get statusText() {
        return this.response.statusText;
    }

    /**
     * Getter for the response type.
     */
    public get type() {
        return this.response.type;
    }

    /**
     * Getter for the response URL.
     */
    public get url() {
        return this.response.url;
    }

    /**
     * Getter for the body stream of the response. If `createBody` is provided, it will be used to create a body stream with timeout management.
     */
    public get body(): ReadableStream<Uint8Array> | null {
        if (typeof this._body === "undefined") {
            if (typeof this.createBody !== "undefined") {
                this._body = this.createBody();
            } else {
                this._body = this.response.body;
            }
        }

        return this._body;
    }

    /**
     * Getter for whether the body has already been used.
     */
    public get bodyUsed() {
        return this.response.bodyUsed;
    }

    /**
     * Reads and returns the body content as a string.
     *
     * @returns {Promise<string>} The body content in text form.
     */
    public async text(): Promise<string> {
        if (this.body === null) {
            return "";
        }

        const reader = this.body.getReader();
        const decoder = new TextDecoder();

        let text = "";

        for (;;) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            text += decoder.decode(value, { stream: true });
        }

        return text;
    }

    /**
     * Reads and parses the body content as JSON.
     *
     * @template T The expected JSON type.
     * @returns {Promise<T>} The parsed JSON object.
     */
    public async json<T>(): Promise<T> {
        const text = await this.text();

        return JSON.parse(text) as T;
    }
}

/**
 * A utility function to perform a fetch request with optional request and idle timeouts.
 *
 * @param {string | URL} input The URL or request input for the fetch.
 * @param {Omit<RequestInit, "signal"> & TimeoutOptions} [init] Options for the fetch request, including request timeout and idle timeout.
 *
 * @returns {Promise<TimeoutResponse>} A `TimeoutResponse` instance wrapping the fetch response.
 *
 * @throws {AbortError} If the request is aborted due to a timeout.
 */
export const timeoutFetch = async (input: string | URL, init?: Omit<RequestInit, "signal"> & TimeoutOptions): Promise<TimeoutResponse> => {
    if (typeof init === "undefined" || (typeof init.idleTimeout === "undefined" && typeof init.requestTimeout === "undefined")) {
        const response = await fetch(input, init);

        return new TimeoutResponse(response);
    }

    const timeoutAbort = new TimeoutAbort(init.requestTimeout);

    const options = init as RequestInit;
    options.signal = timeoutAbort.signal;

    if (typeof init.idleTimeout !== "undefined") {
        if (options.body instanceof ReadableStream) {
            options.body = createTimeoutReadableStream(options.body, timeoutAbort, init.idleTimeout);
        } else {
            timeoutAbort.resetTimeout(init.idleTimeout);
        }
    }

    const response = await fetch(input, options);

    if (typeof init.idleTimeout !== "undefined") {
        if (!(options.body instanceof ReadableStream)) {
            timeoutAbort.clearTimeout();
        }
    }

    let createBody;

    if (response.body !== null) {
        const body = response.body;

        createBody = () => createTimeoutReadableStream(body, timeoutAbort, init.idleTimeout, true);
    } else {
        timeoutAbort.abort();
    }

    return new TimeoutResponse(response, createBody);
};

/**
 * Utility function to check if an error is of type `AbortError`.
 *
 * @param {Error} error The error to check.
 *
 * @returns {boolean} `true` if the error is an `AbortError`, otherwise `false`.
 */
export const isAbortError = (error: Error): boolean => {
    return error.name === "AbortError";
};
