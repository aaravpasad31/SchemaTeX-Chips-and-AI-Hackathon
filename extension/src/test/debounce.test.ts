/**
 * Tests for debounce utility function.
 * Verifies that debouncing works correctly for rapid function calls.
 */

import * as assert from 'assert';
import { debounce } from '../debounce';

suite('Debounce Test Suite', () => {
	test('Should execute function after delay', async () => {
		let callCount = 0;
		const fn = () => {
			callCount++;
		};

		const debouncedFn = debounce(fn, 50);

		debouncedFn();

		// Should not have executed yet
		assert.strictEqual(callCount, 0, 'Function should not execute immediately');

		// Wait for debounce delay
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Should have executed once
		assert.strictEqual(callCount, 1, 'Function should execute after delay');
	});

	test('Should reset timer on each call', async () => {
		let callCount = 0;
		const fn = () => {
			callCount++;
		};

		const debouncedFn = debounce(fn, 100);

		// Rapid fire calls
		debouncedFn();
		await new Promise((resolve) => setTimeout(resolve, 30));
		debouncedFn();
		await new Promise((resolve) => setTimeout(resolve, 30));
		debouncedFn();

		// Should not have executed yet (we've made 3 calls within 100ms total)
		assert.strictEqual(callCount, 0, 'Function should not execute during rapid calls');

		// Wait for debounce delay
		await new Promise((resolve) => setTimeout(resolve, 120));

		// Should have executed only once (coalesced into single call)
		assert.strictEqual(callCount, 1, 'Function should execute only once after all calls');
	});

	test('Should cancel pending execution', async () => {
		let callCount = 0;
		const fn = () => {
			callCount++;
		};

		const debouncedFn = debounce(fn, 100);

		debouncedFn();

		// Cancel before timeout
		debouncedFn.cancel();

		// Wait beyond the debounce delay
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Should not have executed
		assert.strictEqual(callCount, 0, 'Function should not execute after cancel');
	});

	test('Should check if execution is pending', async () => {
		let callCount = 0;
		const fn = () => {
			callCount++;
		};

		const debouncedFn = debounce(fn, 100);

		// Before call, should not be pending
		assert.strictEqual(
			debouncedFn.isPending(),
			false,
			'Should not be pending before call'
		);

		debouncedFn();

		// After call, should be pending
		assert.strictEqual(debouncedFn.isPending(), true, 'Should be pending after call');

		// Wait for execution
		await new Promise((resolve) => setTimeout(resolve, 120));

		// After execution, should not be pending
		assert.strictEqual(
			debouncedFn.isPending(),
			false,
			'Should not be pending after execution'
		);
	});

	test('Should pass arguments correctly', async () => {
		let receivedArgs: any[] = [];
		const fn = (a: number, b: string) => {
			receivedArgs = [a, b];
		};

		const debouncedFn = debounce(fn, 50);

		debouncedFn(42, 'test');

		// Wait for debounce delay
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Should have received the correct arguments
		assert.deepStrictEqual(
			receivedArgs,
			[42, 'test'],
			'Function should receive correct arguments'
		);
	});

	test('Should support async functions', async () => {
		let callCount = 0;
		const asyncFn = async () => {
			callCount++;
			return new Promise((resolve) => setTimeout(resolve, 10));
		};

		const debouncedFn = debounce(asyncFn, 50);

		debouncedFn();

		// Wait for debounce delay and async execution
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Should have executed
		assert.strictEqual(callCount, 1, 'Async function should execute');
	});

	test('Should handle multiple rapid saves scenario', async () => {
		let parseCount = 0;
		const parseFile = async (filePath: string) => {
			parseCount++;
			console.log(`Parsing ${filePath}`);
		};

		const debouncedParse = debounce(parseFile, 500);

		// Simulate 5 rapid saves
		debouncedParse('/path/to/file.sv');
		await new Promise((resolve) => setTimeout(resolve, 100));
		debouncedParse('/path/to/file.sv');
		await new Promise((resolve) => setTimeout(resolve, 100));
		debouncedParse('/path/to/file.sv');
		await new Promise((resolve) => setTimeout(resolve, 100));
		debouncedParse('/path/to/file.sv');
		await new Promise((resolve) => setTimeout(resolve, 100));
		debouncedParse('/path/to/file.sv');

		// Should not have parsed yet
		assert.strictEqual(parseCount, 0, 'Should not parse during rapid saves');

		// Wait for debounce timeout
		await new Promise((resolve) => setTimeout(resolve, 600));

		// Should have parsed exactly once
		assert.strictEqual(parseCount, 1, 'Should parse exactly once after debounce timeout');
	});
});
