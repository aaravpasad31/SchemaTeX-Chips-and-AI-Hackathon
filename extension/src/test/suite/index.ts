import * as path from 'path';
import Mocha from 'mocha';

export async function run(): Promise<void> {
	// Create the mocha test suite
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: 10000,
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((c, e) => {
		try {
			// Add test files
			mocha.addFile(path.resolve(testsRoot, 'parser-bridge.test.ts'));
			mocha.addFile(path.resolve(testsRoot, '../ast-analyzer/ast-transformer.test.ts'));

			// Run the mocha test suite
			mocha.run((failures: number) => {
				if (failures > 0) {
					e(new Error(`${failures} tests failed.`));
				} else {
					c();
				}
			});
		} catch (err) {
			console.error(err);
			e(err);
		}
	});
}
