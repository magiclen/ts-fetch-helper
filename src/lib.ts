import { TimeoutAbort, createTimeoutReadableStream } from "./timeout/index.js";

export * from "./node.js";

export * from "./timeout/index.js";

export class TimeoutError extends Error {
    constructor(input: string | URL) {
        super("URL: " + input.toString());

        this.name = "TimeoutError";
    }
}

export interface TimeoutOptions {
    requestTimeout?: number,
    idleTimeout?: number,
}

export class TimeoutResponse {
    private _body?: ReadableStream<Uint8Array> | null;

    constructor(private readonly response: Response, private readonly createBody?: () => ReadableStream<Uint8Array>) {
    }

    public get headers() {
        return this.response.headers;
    }

    public get ok() {
        return this.response.ok;
    }

    public get redirected() {
        return this.response.redirected;
    }

    public get status() {
        return this.response.status;
    }

    public get statusText() {
        return this.response.statusText;
    }

    public get type() {
        return this.response.type;
    }

    public get url() {
        return this.response.url;
    }

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

    public get bodyUsed() {
        return this.response.bodyUsed;
    }

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

    public async json<T>(): Promise<T> {
        const text = await this.text();

        return JSON.parse(text) as T;
    }
}

/**
 *
 * @throws {AbortError}
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
