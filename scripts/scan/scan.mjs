// Runs n8n's verification lint (@n8n/scan-community-package, the check the
// Creator Portal's pre-check runs on the published package) against this
// checkout, so a failure shows up before a release instead of after it.
// `npm run lint` uses @n8n/node-cli's bundled rules, which can lag behind
// the scanner's (0.1.0 failed verification on a category rule the CLI's
// copy didn't have yet). The scanner lives in its own install here
// (scripts/scan/package.json): as a root devDependency it pulls
// @typescript/old, whose `tsc` bin shadows the TypeScript the build uses.

import {
	analyzePackage,
	SOURCE_FILE_PATTERNS,
} from '@n8n/scan-community-package/scanner/scanner.mjs';

const root = new URL('../..', import.meta.url).pathname;
let failed = false;
for (const [label, patterns] of [
	['source', SOURCE_FILE_PATTERNS],
	['build', ['package.json', 'dist/**/*.{js,json}']],
]) {
	const result = await analyzePackage(root, patterns);
	console.log(`${label}: ${result.passed ? 'passed' : result.message}`);
	if (result.details) console.log(result.details);
	failed ||= !result.passed;
}
process.exitCode = failed ? 1 : 0;
