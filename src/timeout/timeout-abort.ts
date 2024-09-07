/**
 * A class that manages timeouts and abort signals, allowing for both a lifespan timeout and a resettable timeout.
 *
 * The class uses an `AbortController` to signal cancellation and provides methods to manage and clear timeouts.
 */
export class TimeoutAbort {
    private readonly abortController = new AbortController();

    private timeoutHandle: NodeJS.Timeout | undefined;
    private lifespanTimeoutHandle: NodeJS.Timeout | undefined;

    private _isAborted = false;

    /**
     * Constructs a `TimeoutAbort` instance with an optional lifespan timeout.
     *
     * @param {number | null} [lifespan = undefined] The lifespan in milliseconds after which the instance will be automatically aborted.
     */
    public constructor(lifespan?: number | null) {
        if (typeof lifespan === "number") {
            this.lifespanTimeoutHandle = setTimeout(() => {
                this._isAborted = true;

                if (typeof this.timeoutHandle !== "undefined") {
                    clearTimeout(this.timeoutHandle);
                }

                this.abortController.abort();
            }, lifespan);
        }
    }

    /**
     * Gets the `AbortSignal` associated with this instance.
     *
     * @returns {AbortSignal} The `AbortSignal` that allows for cancellation of operations.
     */
    public get signal(): AbortSignal {
        return this.abortController.signal;
    }
    
    /**
     * Checks if the instance has been aborted.
     *
     * @returns {boolean} `true` if the instance is aborted, otherwise `false`.
     */
    public get isAborted(): boolean {
        return this._isAborted;
    }

    /**
     * Resets the timeout to a new value, aborting if necessary.
     *
     * @param {number} newTimeout The new timeout duration in milliseconds.
     *
     * @returns {boolean} `true` if the timeout was successfully reset, `false` if the instance is already aborted.
     */
    public resetTimeout(newTimeout: number): boolean {
        if (this._isAborted) {
            return false;
        }

        if (typeof this.timeoutHandle !== "undefined") {
            clearTimeout(this.timeoutHandle);
        }

        this.timeoutHandle = setTimeout(() => {
            this._isAborted = true;
            this.timeoutHandle = undefined;
            
            if (typeof this.lifespanTimeoutHandle !== "undefined") {
                clearTimeout(this.lifespanTimeoutHandle);
            }

            this.abortController.abort();
        }, newTimeout);

        return true;
    }

    /**
     * Clears the currently set timeout, if any.
     */
    public clearTimeout(): void {
        if (typeof this.timeoutHandle !== "undefined") {
            clearTimeout(this.timeoutHandle);
            
            this.timeoutHandle = undefined;
        }
    }

    /**
     * Aborts the instance immediately, clearing any active timeouts and signaling cancellation.
     */
    public abort(): void {
        if (this._isAborted) {
            return;
        }

        this._isAborted = true;

        if (typeof this.timeoutHandle !== "undefined") {
            clearTimeout(this.timeoutHandle);
        }

        if (typeof this.lifespanTimeoutHandle !== "undefined") {
            clearTimeout(this.lifespanTimeoutHandle);
        }

        this.abortController.abort();
    }
}
