/**
 * Global TypeScript declarations for CSS modules and other assets
 */

declare module '*.css' {
	const content: string;
	export default content;
}
