// L08: in-page measuring shared by the gate's specs. Injected with `page.addScriptTag`; everything
// hangs off `window.__senuiMeasure`. Plain JavaScript: it runs in the browser, untranspiled.
(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  /** Any CSS colour (oklch, color(), named…) as [r, g, b, a], each 0–255, via the canvas. */
  function rgba(css) {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#000';
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  }

  /** `top` drawn over `bottom` (both [r, g, b, a]); the result is opaque when `bottom` is. */
  function over(top, bottom) {
    const a = top[3] / 255;
    return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(255);
  }

  function luminance([r, g, b]) {
    const linear = (c) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  }

  function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  /** The opaque colour painted behind `element`: its own and its ancestors' backgrounds. */
  function backgroundOf(element) {
    const layers = [];
    for (let node = element; node; node = node.parentElement) {
      const colour = rgba(getComputedStyle(node).backgroundColor);
      if (colour[3] > 0) layers.push(colour);
      if (colour[3] === 255) break;
    }
    let result = [255, 255, 255, 255];
    for (const layer of layers.reverse()) result = over(layer, result);
    return result;
  }

  const TARGET =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="checkbox"], [role="switch"], [role="link"], [tabindex]:not([tabindex="-1"])';

  /** A pointer target: has activation behaviour, is rendered, isn't disabled. */
  function isTarget(element) {
    return (
      element.matches(TARGET) &&
      !element.matches(':disabled') &&
      element.checkVisibility({ visibilityProperty: true })
    );
  }

  function union(rects) {
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  /** A target's hit area: its box, merged with its labels' boxes (a label activates its control). */
  function targetBox(element) {
    const rects = [element.getBoundingClientRect()];
    for (const label of element.labels ?? []) {
      if (label.checkVisibility()) rects.push(label.getBoundingClientRect());
    }
    return union(rects);
  }

  /** The nearest ancestor that clips its overflow, or null. */
  function clipAncestor(element) {
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') return node;
    }
    return null;
  }

  /** The rect `element` is clipped to: its nearest clipping ancestor's padding box, or the viewport. */
  function clipRect(element) {
    const node = clipAncestor(element);
    if (!node) return { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const r = node.getBoundingClientRect();
    return {
      left: r.left + node.clientLeft,
      top: r.top + node.clientTop,
      right: r.left + node.clientLeft + node.clientWidth,
      bottom: r.top + node.clientTop + node.clientHeight,
    };
  }

  function describe(element) {
    const classes = [...element.classList].slice(0, 2).join('.');
    return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
  }

  /** Elements with their own non-blank text (not just text in descendants). */
  function hasOwnText(element) {
    return [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '',
    );
  }

  /**
   * Whether `top` (the element hit at a point) paints over `element`'s outline there. Hit-testing
   * doesn't see outlines, so this follows CSS paint order instead: within their nearest common
   * ancestor, non-positioned content never covers an outline (outlines paint after in-flow content);
   * a positioned element covers a non-positioned one, and between two positioned ones the higher
   * z-index, then the later in tree order, wins.
   */
  function paintsOver(top, element) {
    if (top === element || element.contains(top) || top.contains(element)) return false;
    let common = element.parentElement;
    while (common && !common.contains(top)) common = common.parentElement;
    const layer = (node) => {
      let found = null;
      for (let n = node; n && n !== common; n = n.parentElement) {
        if (getComputedStyle(n).position !== 'static') found = n; // the outermost below `common`
      }
      return found;
    };
    const topLayer = layer(top);
    if (!topLayer) return false;
    const elementLayer = layer(element);
    if (!elementLayer) return true;
    const z = (n) => Number.parseInt(getComputedStyle(n).zIndex, 10) || 0;
    if (z(topLayer) !== z(elementLayer)) return z(topLayer) > z(elementLayer);
    return Boolean(
      elementLayer.compareDocumentPosition(topLayer) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
  }

  window.__senuiMeasure = {
    paintsOver,
    rgba,
    over,
    contrast,
    backgroundOf,
    isTarget,
    targetBox,
    clipAncestor,
    clipRect,
    describe,
    hasOwnText,
    union,
  };
})();
