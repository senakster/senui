// TypeScript 6 checks side-effect imports. Vite handles CSS, so declare it to the compiler.
declare module '*.css';
// A stylesheet's text, for a docs code block that shows the CSS a live example runs.
declare module '*.css?raw' {
  const css: string;
  export default css;
}
