import { buffer } from "node:stream/consumers";

import {
    TimeoutAbort, createTimeoutReadableStream, isAbortError, timeoutFetch,
} from "../src/lib.js";

const sleep = (milliseconds: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const URL = "https://google.com";

describe("with Fetch API", () => {
    it("TimeoutAbort should work", async () => {
        await expect(fetch(URL)).resolves.toBeDefined();

        {
            const timeoutAbort = new TimeoutAbort();
        
            await expect(fetch(URL, { signal: timeoutAbort.signal })).resolves.toBeDefined();
        }
        
        {
            const timeoutAbort = new TimeoutAbort(0);
        
            await expect(fetch(URL, { signal: timeoutAbort.signal })).rejects.toThrow(DOMException);
        }
    });

    it("TimeoutReadableStream should work", async () => {
        {
            const response = await fetch(URL);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await expect(buffer(response.body!)).resolves.toBeDefined();
        }

        {
            const timeoutAbort = new TimeoutAbort();
            
            const response = await fetch(URL, { signal: timeoutAbort.signal });
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await expect(buffer(createTimeoutReadableStream(response.body!, timeoutAbort, undefined, true))).resolves.toBeDefined();
        }

        {
            const timeoutAbort = new TimeoutAbort();
            
            const response = await fetch(URL, { signal: timeoutAbort.signal });
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await expect(buffer(createTimeoutReadableStream(response.body!, timeoutAbort, 1, true))).rejects.toThrow(DOMException);
        }
    });
});

describe("with Timeout Fetch API", () => {
    it("send", async () => {
        await expect(timeoutFetch(URL)).resolves.toBeDefined();

        await expect(timeoutFetch(URL, { requestTimeout: 0 })).rejects.toThrow(DOMException);
        await expect(timeoutFetch(URL, { idleTimeout: 0 })).rejects.toThrow(DOMException);
    });

    it("receive", async () => {
        {
            const response = await timeoutFetch(URL);

            await sleep(3000);

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await expect(buffer(response.body!)).resolves.toBeDefined();
        }

        {
            const response = await timeoutFetch(URL, { requestTimeout: 3000 });

            await sleep(3000);

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await expect(buffer(response.body!)).rejects.toThrow(DOMException);
        }
    }, 10000);
});

describe("isAbortError", () => {
    it("send", async () => {
        try {
            await timeoutFetch(URL, { requestTimeout: 0 });
        } catch (error) {
            if (error instanceof Error) {
                expect(isAbortError(error)).toBe(true);
            }

            return;
        }
        
        fail("should throw a `isAbortError`");
    });

    it("receive", async () => {
        {
            const response = await timeoutFetch(URL, { requestTimeout: 3000 });

            await sleep(3000);

            try {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                await buffer(response.body!);
            } catch (error) {
                if (error instanceof Error) {
                    expect(isAbortError(error)).toBe(true);
                }
    
                return;
            }

            fail("should throw a `isAbortError`");
        }
    }, 7000);
});

describe("cancelBody", () => {
    it("close", async () => {
        const response = await timeoutFetch(URL, { requestTimeout: 100000 });

        await response.cancelBody();
    });
});
