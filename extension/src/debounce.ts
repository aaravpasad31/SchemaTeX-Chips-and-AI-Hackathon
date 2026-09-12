/**
 * Utility functions for debouncing function calls.
 * Debouncing delays execution until after a specified delay has passed without new calls.
 */

/**
 * Creates a debounced version of a function.
 * The function will only be called after the specified delay has passed without any new invocations.
 * Each call resets the timer, so only the final call in a sequence will execute.
 *
 * @param fn The function to debounce
 * @param delayMs The delay in milliseconds before executing the function
 * @returns A debounced function that can also be cancelled
 *
 * @example
 * const debouncedUpdate = debounce(() => updateDiagram(), 500);
 * fileWatcher.onChange(() => debouncedUpdate.call());
 * // Call cancel() to stop pending execution
 * debouncedUpdate.cancel();
 */
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	delayMs: number
): DebouncedFunction<T> {
	let timeoutId: NodeJS.Timeout | null = null;

	/**
	 * The debounced function that can be called with the same arguments as the original.
	 * Each call resets the internal timer.
	 */
	const debouncedFn = function (this: any, ...args: Parameters<T>) {
		// Clear the previous timeout if it exists
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}

		// Set a new timeout to call the function after the delay
		timeoutId = setTimeout(() => {
			fn.apply(this, args);
			timeoutId = null;
		}, delayMs);
	};

	/**
	 * Cancels any pending execution of the debounced function.
	 * If called before the timer fires, the function will not execute.
	 */
	const cancel = () => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};

	/**
	 * Immediately executes the pending debounced function if one exists.
	 * Useful for forcing the function to run before the normal timeout.
	 */
	const flush = () => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			fn.apply(debouncedFn);
			timeoutId = null;
		}
	};

	// Attach methods to the debounced function
	(debouncedFn as any).cancel = cancel;
	(debouncedFn as any).flush = flush;
	(debouncedFn as any).isPending = () => timeoutId !== null;

	return debouncedFn as DebouncedFunction<T>;
}

/**
 * Type definition for a debounced function with control methods.
 */
export interface DebouncedFunction<T extends (...args: any[]) => any> {
	(...args: Parameters<T>): void;
	/** Cancels any pending execution */
	cancel(): void;
	/** Flushes pending execution immediately */
	flush(): void;
	/** Returns true if there's a pending execution */
	isPending(): boolean;
}
