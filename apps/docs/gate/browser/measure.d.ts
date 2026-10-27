// Types for `measure.js`, the in-page helpers the gate injects (`window.__senuiMeasure`).
type Rgba = [number, number, number, number];

interface SenuiRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width?: number;
  height?: number;
}

interface SenuiMeasure {
  rgba(css: string): Rgba;
  over(top: Rgba, bottom: Rgba): Rgba;
  contrast(a: Rgba, b: Rgba): number;
  backgroundOf(element: Element): Rgba;
  isTarget(element: Element): boolean;
  targetBox(element: Element): Required<SenuiRect>;
  clipAncestor(element: Element): Element | null;
  clipRect(element: Element): SenuiRect;
  describe(element: Element): string;
  paintsOver(top: Element, element: Element): boolean;
  hasOwnText(element: Element): boolean;
  union(rects: SenuiRect[]): Required<SenuiRect>;
}

interface Window {
  __senuiMeasure: SenuiMeasure;
}
