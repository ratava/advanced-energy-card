import { LocalizationManager } from './localization-manager.js';
import { SVG_DIMENSIONS, GRID_CURRENT_HIDE_DAILY_OFFSET } from './constants.js';

/**
 * Text Bindings Manager
 * Populates SVG-embedded text placeholders (labels, values, units, odometer digits,
 * static translations, title/PV-daily overlays) from the rendered viewState.
 */
export class TextBindingsManager {
  constructor(card) {
    this.card = card;
  }

  apply(viewState) {
    if (!this.card._domRefs || !this.card._domRefs.backgroundSvg) {
      return;
    }
    const svgRoot = this.card._domRefs.backgroundSvg;
    if (!svgRoot || !svgRoot.children || svgRoot.children.length === 0) {
      return;
    }

    const globalFontFamily = (viewState && typeof viewState.fontFamily === 'string' && viewState.fontFamily.trim())
      ? viewState.fontFamily.trim()
      : null;

    const odometerFontFamily = (viewState && typeof viewState.odometerFontFamily === 'string' && viewState.odometerFontFamily.trim())
      ? viewState.odometerFontFamily.trim()
      : (globalFontFamily || null);


    const hasFeatureToken = (el, token) => {
      try {
        if (!el || typeof el.getAttribute !== 'function') return false;
        const raw = (el.getAttribute('data-feature') || '').trim();
        if (!raw) return false;
        const tokens = raw.split(/\s+/g);
        return tokens.includes(token);
      } catch (e) {
        return false;
      }
    };
    if (globalFontFamily) {
      if (svgRoot.getAttribute('font-family') !== globalFontFamily) {
        svgRoot.setAttribute('font-family', globalFontFamily);
      }
      if (svgRoot.style && svgRoot.style.fontFamily !== globalFontFamily) {
        svgRoot.style.fontFamily = globalFontFamily;
      }
    }

    const shouldApplyConfiguredTextStyle = (node, options = {}) => {
      // Configuration styling always wins (fill/font-size from viewState/config override SVG).
      return true;
    };

    const isConfigStyledTextNode = (node) => {
      try {
        const host = getVisibilityTarget(node);
        const raw = (host && typeof host.getAttribute === 'function') ? host.getAttribute('data-style') : null;
        if (typeof raw !== 'string') return false;
        const v = raw.trim().toLowerCase();
        return v === 'config' || v === 'config-center' || v === 'config-right';
      } catch (e) {
        return false;
      }
    };

    const getVisibilityTarget = (node) => {
      if (!node || typeof node.closest !== 'function') {
        return node;
      }
      const textHost = node.closest('text');
      return textHost || node;
    };

    // Unified alignment scheme: data-style="config"/"config-center"/"config-right"
    // map to left/center/right alignment for label-ish roles (see applyBaselineConfigStyles).
    const ALIGNMENT_BY_DATA_STYLE = {
      config: { anchor: 'start', align: 'left' },
      'config-center': { anchor: 'middle', align: 'center' },
      'config-right': { anchor: 'end', align: 'right' },
    };

    const getConfiguredAlignment = (node) => {
      try {
        const host = getVisibilityTarget(node);
        const raw = (host && typeof host.getAttribute === 'function') ? host.getAttribute('data-style') : null;
        const v = (typeof raw === 'string') ? raw.trim().toLowerCase() : '';
        return ALIGNMENT_BY_DATA_STYLE[v] || null;
      } catch (e) {
        return null;
      }
    };

    const applyAlignment = (target, alignment) => {
      if (!target || !alignment) return;
      try {
        target.setAttribute('text-anchor', alignment.anchor);
        if (target.style) {
          target.style.textAnchor = alignment.anchor;
          target.style.textAlign = alignment.align;
          if (typeof target.style.setProperty === 'function') {
            target.style.setProperty('text-anchor', alignment.anchor);
            target.style.setProperty('text-align', alignment.align);
          }
        }
      } catch (e) {
        // ignore
      }
    };

    // Per-digit odometer animation support (initially used for grid-current-power).
    const SVG_NS = 'http://www.w3.org/2000/svg';
    if (!this.card._odometerStates) {
      this.card._odometerStates = new WeakMap();
    }

    const ensureDefs = (svg) => {
      if (!svg) return null;
      let defs = svg.querySelector('defs[data-role="advanced-defs"]');
      if (!defs) defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        defs.setAttribute('data-role', 'advanced-defs');
        svg.insertBefore(defs, svg.firstChild);
      } else if (!defs.getAttribute('data-role')) {
        defs.setAttribute('data-role', 'advanced-defs');
      }
      return defs;
    };

    const getNumberAttr = (node, attr) => {
      const raw = node && typeof node.getAttribute === 'function' ? node.getAttribute(attr) : null;
      const v = raw ? parseFloat(raw) : NaN;
      return Number.isFinite(v) ? v : NaN;
    };

    const parseOdometerParts = (text) => {
      const s = (text === null || text === undefined) ? '' : String(text);
      const firstDigitIndex = s.search(/[0-9]/);
      if (firstDigitIndex < 0) return { ok: false, prefix: s, core: '', suffix: '' };
      let lastDigitIndex = -1;
      for (let i = s.length - 1; i >= 0; i--) {
        if (/[0-9]/.test(s[i])) {
          lastDigitIndex = i;
          break;
        }
      }
      if (lastDigitIndex < firstDigitIndex) return { ok: false, prefix: s, core: '', suffix: '' };
      const prefix = s.slice(0, firstDigitIndex);
      const core = s.slice(firstDigitIndex, lastDigitIndex + 1);
      const suffix = s.slice(lastDigitIndex + 1);
      const ok = /^[0-9.\-]+$/.test(core);
      return { ok, prefix, core, suffix };
    };

    const resolveOdometerStyle = (textNode, options = {}) => {
      const fontSize = (typeof options.fontSize === 'number' && Number.isFinite(options.fontSize))
        ? options.fontSize
        : (Number.isFinite(getNumberAttr(textNode, 'font-size')) ? getNumberAttr(textNode, 'font-size') : 14);
      const fill = (typeof options.fill === 'string' && options.fill)
        ? options.fill
        : (textNode && textNode.getAttribute ? (textNode.getAttribute('fill') || '') : '');
      const fontFamily = (typeof options.fontFamily === 'string' && options.fontFamily)
        ? options.fontFamily
        : (textNode && textNode.getAttribute ? (textNode.getAttribute('font-family') || '') : (globalFontFamily || ''));

      // text-anchor is often set via inline style on the SVG <text> (especially in the night SVG).
      // Prefer explicit attribute, then inline style, then computed style.
      let textAnchor = 'start';
      try {
        const attrAnchor = textNode && textNode.getAttribute ? textNode.getAttribute('text-anchor') : null;
        if (typeof attrAnchor === 'string' && attrAnchor.trim()) {
          textAnchor = attrAnchor.trim();
        } else if (textNode && textNode.style) {
          const styleAnchor = textNode.style.textAnchor || (typeof textNode.style.getPropertyValue === 'function' ? textNode.style.getPropertyValue('text-anchor') : '');
          if (typeof styleAnchor === 'string' && styleAnchor.trim()) {
            textAnchor = styleAnchor.trim();
          }
        }
        if (textAnchor === 'start') {
          const rawStyle = textNode && textNode.getAttribute ? textNode.getAttribute('style') : null;
          if (typeof rawStyle === 'string' && rawStyle) {
            const m = rawStyle.match(/(?:^|;)\s*text-anchor\s*:\s*([^;]+)/i);
            if (m && m[1]) {
              textAnchor = String(m[1]).trim();
            }
          }
        }
        if (textAnchor === 'start' && typeof getComputedStyle === 'function' && textNode) {
          const cs = getComputedStyle(textNode);
          if (cs && typeof cs.textAnchor === 'string' && cs.textAnchor.trim()) {
            textAnchor = cs.textAnchor.trim();
          }
        }
      } catch (e) {
        textAnchor = 'start';
      }
      textAnchor = String(textAnchor || 'start').toLowerCase();
      if (textAnchor !== 'middle' && textAnchor !== 'end') textAnchor = 'start';
      return { fontSize, fill, fontFamily, textAnchor };
    };

    const ensureMeasureText = (svg, style) => {
      if (!svg) return null;
      let measure = svg.querySelector('text[data-role="advanced-odometer-measure"]');
      if (!measure) {
        measure = document.createElementNS(SVG_NS, 'text');
        measure.setAttribute('data-role', 'advanced-odometer-measure');
        // Keep the measuring node inside the viewport. Some WebViews return 0 width
        // for off-viewport text even with getComputedTextLength/getBBox.
        measure.setAttribute('x', '0');
        measure.setAttribute('y', '0');
        measure.setAttribute('opacity', '0');
        measure.style.opacity = '0';
        measure.style.pointerEvents = 'none';
        measure.setAttribute('text-anchor', 'start');
        svg.appendChild(measure);
      }
      if (style) {
        if (style.fontFamily) {
          measure.setAttribute('font-family', style.fontFamily);
          measure.style.fontFamily = style.fontFamily;
        }
        if (Number.isFinite(style.fontSize)) {
          measure.setAttribute('font-size', String(style.fontSize));
          measure.style.fontSize = `${style.fontSize}px`;
        }
        if (style.fill) {
          measure.setAttribute('fill', style.fill);
          measure.style.fill = style.fill;
        }
        measure.style.fontVariantNumeric = 'tabular-nums';
      }
      return measure;
    };

    const measureWidth = (svg, style, text) => {
      const measure = ensureMeasureText(svg, style);
      if (!measure) return 0;
      measure.textContent = (text === null || text === undefined) ? '' : String(text);
      try {
        if (typeof measure.getComputedTextLength === 'function') {
          const w = measure.getComputedTextLength();
          if (Number.isFinite(w) && w > 0) return w;
        }
      } catch (e) {
        // ignore
      }
      try {
        if (typeof measure.getBBox === 'function') {
          const box = measure.getBBox();
          const w = box && typeof box.width === 'number' ? box.width : 0;
          return Number.isFinite(w) ? w : 0;
        }
      } catch (e) {
        // ignore
      }

      // Last resort: create a temporary measuring text node at (0,0).
      // Some environments return 0 for a reused hidden node.
      try {
        if (svg && typeof svg.appendChild === 'function') {
          const tmp = document.createElementNS(SVG_NS, 'text');
          tmp.setAttribute('x', '0');
          tmp.setAttribute('y', '0');
          tmp.setAttribute('opacity', '0');
          tmp.style.opacity = '0';
          tmp.style.pointerEvents = 'none';
          tmp.setAttribute('text-anchor', 'start');
          if (style && style.fontFamily) {
            tmp.setAttribute('font-family', style.fontFamily);
            tmp.style.fontFamily = style.fontFamily;
          }
          if (style && Number.isFinite(style.fontSize)) {
            tmp.setAttribute('font-size', String(style.fontSize));
            tmp.style.fontSize = `${style.fontSize}px`;
          }
          if (style && style.fill) {
            tmp.setAttribute('fill', style.fill);
            tmp.style.fill = style.fill;
          }
          tmp.style.fontVariantNumeric = 'tabular-nums';
          tmp.textContent = (text === null || text === undefined) ? '' : String(text);
          svg.appendChild(tmp);
          let w = 0;
          try {
            if (typeof tmp.getComputedTextLength === 'function') {
              w = tmp.getComputedTextLength();
            }
          } catch (e) {
            // ignore
          }
          if (!(Number.isFinite(w) && w > 0)) {
            try {
              if (typeof tmp.getBBox === 'function') {
                const box = tmp.getBBox();
                w = box && typeof box.width === 'number' ? box.width : 0;
              }
            } catch (e) {
              // ignore
            }
          }
          try {
            if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
          } catch (e) {
            // ignore
          }
          return Number.isFinite(w) ? w : 0;
        }
      } catch (e) {
        // ignore
      }
      return 0;
    };

    const teardownOdometer = (textNode) => {
      if (!textNode) return;
      const state = this.card._odometerStates.get(textNode);
      if (state && state.group && state.group.parentNode) {
        try {
          state.group.parentNode.removeChild(state.group);
        } catch (e) {
          // ignore
        }
      }
      if (state && Array.isArray(state.hiddenNodes) && state.hiddenNodes.length) {
        state.hiddenNodes.forEach((n) => {
          try {
            if (n && n.style && n.style.display === 'none') {
              n.style.display = '';
            }
          } catch (e) {
            // ignore
          }
        });
        state.hiddenNodes = [];
      }
      try {
        if (textNode.style && textNode.style.display === 'none') {
          textNode.style.display = '';
        }
      } catch (e) {
        // ignore
      }
      this.card._odometerStates.delete(textNode);
    };

    const ensureOdometerState = (textNode) => {
      if (!textNode || !textNode.ownerSVGElement) return null;
      let state = this.card._odometerStates.get(textNode);
      if (state && state.group && state.group.isConnected) {
        try {
          state.hostTransform = (textNode.getAttribute && textNode.getAttribute('transform')) ? (textNode.getAttribute('transform') || '') : '';
        } catch (e) {
          state.hostTransform = '';
        }
        return state;
      }
      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('data-role', 'advanced-odometer');
      group.setAttribute('aria-hidden', 'true');
      group.style.pointerEvents = 'none';
      try {
        const feature = textNode.getAttribute && textNode.getAttribute('data-feature');
        if (feature) group.setAttribute('data-feature', feature);
        const dataStyle = textNode.getAttribute && textNode.getAttribute('data-style');
        if (dataStyle) group.setAttribute('data-style', dataStyle);
      } catch (e) {
        // ignore
      }
      if (textNode.parentNode) {
        textNode.parentNode.insertBefore(group, textNode.nextSibling);
      }
      state = { group, builtKey: '', slots: [], lineHeight: 0, hiddenNodes: [], hostTransform: '' };
      try {
        state.hostTransform = (textNode.getAttribute && textNode.getAttribute('transform')) ? (textNode.getAttribute('transform') || '') : '';
      } catch (e) {
        state.hostTransform = '';
      }
      this.card._odometerStates.set(textNode, state);
      return state;
    };

    const buildOdometer = (textNode, parts, style, options = {}) => {
      const state = ensureOdometerState(textNode);
      if (!state) return null;
      const group = state.group;
      while (group.firstChild) group.removeChild(group.firstChild);
      state.slots = [];
      state.prefixNode = null;
      state.suffixNode = null;
      state.prefixWUsed = 0;
      state.lastPrefixDelta = 0;
      state.baseX = NaN;
      state.baseY = NaN;
      state.anchor = style && style.textAnchor ? style.textAnchor : 'start';

      const svg = textNode.ownerSVGElement;
      const x = getNumberAttr(textNode, 'x');
      const y = getNumberAttr(textNode, 'y');
      const rawHostTransform = (state.hostTransform || '').trim();
      if (Number.isFinite(x) && Number.isFinite(y)) {
        state.baseX = x;
        state.baseY = y;
        // Match SVG semantics: x/y are applied first, then the element's transform.
        // In SVG transform lists, the rightmost transform is applied first, so we put
        // the host transform first, then the x/y translate.
        const t = [rawHostTransform, `translate(${x},${y})`].filter(Boolean).join(' ');
        if (t) {
          group.setAttribute('transform', t);
        } else {
          group.removeAttribute('transform');
        }
      } else {
        if (rawHostTransform) {
          group.setAttribute('transform', rawHostTransform);
        } else {
          group.removeAttribute('transform');
        }
      }

      if (!textNode.dataset.odometerId) {
        textNode.dataset.odometerId = `advanced-odo-${Math.random().toString(36).slice(2, 9)}`;
      }
      const odoId = textNode.dataset.odometerId;

      const has3dEdge = (() => {
        try {
          return !hasFeatureToken(textNode, 'noborder');
        } catch (e) {
          return false;
        }
      })();

      const edgeStrokeWidth = has3dEdge ? Math.min(2.4, Math.max(0.8, style.fontSize * 0.12)) : 0;

      const prefixW = parts.prefix ? measureWidth(svg, style, parts.prefix) : 0;
      const suffixW = parts.suffix ? measureWidth(svg, style, parts.suffix) : 0;
      const digitWidths = Array.from({ length: 10 }, (_, i) => measureWidth(svg, style, String(i)));
      // Add a small pad to avoid occasional right-edge clipping in some SVG renderers/webviews.
      const digitPad = Math.max(1, style.fontSize * 0.12);
      const digitW = (Math.max(...digitWidths, 0) || Math.max(1, style.fontSize * 0.6)) + digitPad;
      // Punctuation often extends beyond its advance width; pad to avoid overlaps like "2.39".
      const punctPad = Math.max(1, style.fontSize * 0.14);
      const dotW = Math.max(measureWidth(svg, style, '.'), Math.max(1, digitW * 0.35)) + punctPad;
      const minusW = Math.max(measureWidth(svg, style, '-'), Math.max(1, digitW * 0.6)) + punctPad;

      const coreChars = parts.core.split('');
      const coreWidths = coreChars.map((ch) => {
        if (ch >= '0' && ch <= '9') return digitW;
        if (ch === '.') return dotW;
        if (ch === '-') return minusW;
        return digitW;
      });
      const coreW = coreWidths.reduce((a, b) => a + b, 0);
      const totalW = prefixW + coreW + suffixW;

      let startX = 0;
      if (style.textAnchor === 'middle') startX = -totalW / 2;
      else if (style.textAnchor === 'end') startX = -totalW;

      const applyTextStyle = (el) => {
        el.setAttribute('text-anchor', 'start');
        // Some SVGs authored in editors include CSS `text-align:center`.
        // While SVG alignment should be driven by `text-anchor`, a few WebViews
        // behave better if we explicitly set `text-align` too.
        try {
          if (el.style) {
            el.style.textAlign = 'left';
            if (typeof el.style.setProperty === 'function') {
              el.style.setProperty('text-align', 'left');
            }
          }
        } catch (e) {
          // ignore
        }
        if (style.fontFamily) {
          el.setAttribute('font-family', style.fontFamily);
          el.style.fontFamily = style.fontFamily;
        }
        el.setAttribute('font-size', String(style.fontSize));
        el.style.fontSize = `${style.fontSize}px`;
        if (style.fill) {
          el.setAttribute('fill', style.fill);
          el.style.fill = style.fill;
        }
        el.style.fontVariantNumeric = 'tabular-nums';

        // Keep parity with the card's outline effect.
        // (The global applyFixedExtrusionByFeature only styles the original SVG text nodes,
        // so we replicate it for odometer-generated nodes. Use data-feature="noborder" to opt out.)
        if (has3dEdge) {
          const strokeColor = '#000';
          const strokeOpacity = 1;
          const strokeWidth = edgeStrokeWidth;
          el.setAttribute('paint-order', 'stroke fill');
          el.setAttribute('stroke', strokeColor);
          el.setAttribute('stroke-opacity', String(strokeOpacity));
          el.setAttribute('stroke-width', String(strokeWidth));
          el.setAttribute('stroke-linejoin', 'round');
          el.setAttribute('stroke-miterlimit', '2');
          el.style.paintOrder = 'stroke fill';
          el.style.stroke = strokeColor;
          el.style.strokeOpacity = String(strokeOpacity);
          el.style.strokeWidth = String(strokeWidth);
          el.style.strokeLinejoin = 'round';
          el.style.strokeMiterlimit = '2';
        }
      };

      if (parts.prefix) {
        const t = document.createElementNS(SVG_NS, 'text');
        applyTextStyle(t);
        t.setAttribute('x', String(startX));
        t.setAttribute('y', '0');
        t.textContent = parts.prefix;
        group.appendChild(t);
        state.prefixNode = t;
        state.prefixWUsed = prefixW;
      }

      let cursorX = startX + prefixW;
      // Clip viewport for rolling digits.
      // Use the actual rendered glyph bbox (with stroke if enabled) to avoid webview quirks
      // where heuristic clip windows can look vertically offset or bleed into adjacent lines.
      let clipY = -(style.fontSize * 1.15);
      let clipH = style.fontSize * 1.5;
      let baselineY = -clipY;
      let lineHeight = Math.max(1, style.fontSize * 1.2);
      try {
        const tmp = document.createElementNS(SVG_NS, 'text');
        applyTextStyle(tmp);
        tmp.setAttribute('x', '0');
        tmp.setAttribute('y', '0');
        tmp.setAttribute('opacity', '0');
        tmp.style.opacity = '0';
        tmp.style.pointerEvents = 'none';
        tmp.textContent = '0';
        svg.appendChild(tmp);
        const b = (typeof tmp.getBBox === 'function') ? tmp.getBBox() : null;
        try {
          if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
        } catch (e) {
          // ignore
        }
        if (b && Number.isFinite(b.y) && Number.isFinite(b.height) && b.height > 0.5) {
          const pad = Math.max(1, edgeStrokeWidth * 1.8);
          clipY = b.y - pad;
          clipH = b.height + pad * 2;
          baselineY = -clipY;
          // Ensure the second line is fully out of view before animation completes.
          lineHeight = Math.max(clipH, style.fontSize * 1.2);
        }
      } catch (e) {
        // ignore
      }
      state.lineHeight = lineHeight;
      coreChars.forEach((ch, i) => {
        const slotW = coreWidths[i] || digitW;
        // Use a nested <svg> viewport to clip the rolling digit.
        // This is robust even when parent groups have transforms.
        const slotViewport = document.createElementNS(SVG_NS, 'svg');
        slotViewport.setAttribute('x', String(cursorX));
        slotViewport.setAttribute('y', String(clipY));
        slotViewport.setAttribute('width', String(slotW));
        slotViewport.setAttribute('height', String(clipH));
        slotViewport.setAttribute('viewBox', `0 0 ${slotW} ${clipH}`);
        slotViewport.setAttribute('overflow', 'hidden');
        slotViewport.style.overflow = 'hidden';

        const inner = document.createElementNS(SVG_NS, 'g');
        inner.setAttribute('transform', 'translate(0,0)');

        const t1 = document.createElementNS(SVG_NS, 'text');
        applyTextStyle(t1);
        t1.setAttribute('x', '0');
        t1.setAttribute('y', String(baselineY));
        t1.textContent = ch;

        const t2 = document.createElementNS(SVG_NS, 'text');
        applyTextStyle(t2);
        t2.setAttribute('x', '0');
        t2.setAttribute('y', String(baselineY + lineHeight));
        t2.textContent = ch;

        inner.appendChild(t1);
        inner.appendChild(t2);
        slotViewport.appendChild(inner);
        group.appendChild(slotViewport);
        state.slots.push({ viewport: slotViewport, baseX: cursorX, inner, primary: t1, secondary: t2 });
        cursorX += slotW;
      });

      if (parts.suffix) {
        const t = document.createElementNS(SVG_NS, 'text');
        applyTextStyle(t);
        const suffixX = startX + prefixW + coreW;
        t.setAttribute('x', String(suffixX));
        t.setAttribute('y', '0');
        t.textContent = parts.suffix;
        group.appendChild(t);
        state.suffixNode = t;
        state.suffixBaseX = suffixX;
      }

      const duration = (typeof options.odometerDuration === 'number' && Number.isFinite(options.odometerDuration))
        ? options.odometerDuration
        : 350;
      group.dataset.duration = String(duration);
      // NOTE: builtKey must be stable across value changes, otherwise we'd rebuild every update
      // and never see any digit animation. Normalize digits to keep structure but ignore value.
      const coreSig = String(parts.core || '').replace(/[0-9]/g, '0');
      state.builtKey = `${parts.prefix}__${coreSig}__${parts.suffix}__${style.fontFamily}__${style.fontSize}__${style.fill}__${style.textAnchor}`;
      return state;
    };

    const finalizeOdometerLayout = (state, style) => {
      if (!state || !state.group || !style) return;
      const group = state.group;
      const baseX = Number.isFinite(state.baseX) ? state.baseX : 0;
      const baseY = Number.isFinite(state.baseY) ? state.baseY : 0;
      const rawHostTransform = (state.hostTransform || '').trim();

      // 1) Fix prefix overlap by shifting slots/suffix based on the actual rendered prefix width.
      try {
        const used = Number.isFinite(state.prefixWUsed) ? state.prefixWUsed : 0;
        let actual = 0;
        if (state.prefixNode) {
          try {
            if (typeof state.prefixNode.getBBox === 'function') {
              const b = state.prefixNode.getBBox();
              if (b && Number.isFinite(b.width)) actual = b.width;
            }
          } catch (e) {
            // ignore
          }
          if (!(Number.isFinite(actual) && actual > 0)) {
            try {
              if (typeof state.prefixNode.getComputedTextLength === 'function') {
                const w = state.prefixNode.getComputedTextLength();
                if (Number.isFinite(w)) actual = w;
              }
            } catch (e) {
              // ignore
            }
          }
        }

        const delta = (Number.isFinite(actual) ? actual : 0) - used;
        state.lastPrefixDelta = delta;

        // IMPORTANT: apply correction idempotently (based on stored baseX), so it doesn't drift
        // further apart on each update.
        state.slots.forEach((slot) => {
          if (!slot || !slot.viewport) return;
          const base = Number.isFinite(slot.baseX) ? slot.baseX : NaN;
          if (Number.isFinite(base)) {
            slot.viewport.setAttribute('x', String(base + delta));
          }
        });
        if (state.suffixNode) {
          const base = Number.isFinite(state.suffixBaseX) ? state.suffixBaseX : NaN;
          if (Number.isFinite(base)) {
            state.suffixNode.setAttribute('x', String(base + delta));
          }
        }
      } catch (e) {
        // ignore
      }

      // 2) Re-center (or end-align) the whole odometer group based on its real bbox.
      try {
        if (typeof group.getBBox === 'function') {
          // Measure bbox in local coordinates (without the base translate), otherwise some
          // WebViews can report 0 width and we'd double-translate off-canvas.
          const prevTransform = group.getAttribute('transform');
          try {
            group.removeAttribute('transform');
          } catch (e) {
            // ignore
          }

          const bbox = group.getBBox();

          try {
            if (prevTransform) group.setAttribute('transform', prevTransform);
          } catch (e) {
            // ignore
          }

          if (bbox && Number.isFinite(bbox.x) && Number.isFinite(bbox.width) && bbox.width > 0.5) {
            const anchor = (state.anchor || style.textAnchor || 'start');
            let localShiftX = 0;
            if (anchor === 'middle') {
              localShiftX = -(bbox.x + bbox.width / 2);
            } else if (anchor === 'end') {
              localShiftX = -(bbox.x + bbox.width);
            } else {
              // For start-anchored text, don't compensate for bbox.x.
              // BBox can extend left of x=0 because of stroke/overhang, which would cause
              // the odometer group to "jump" right on the first measured update.
              localShiftX = 0;
            }
            group.setAttribute('transform', [rawHostTransform, `translate(${baseX},${baseY}) translate(${localShiftX},0)`].filter(Boolean).join(' '));
          } else {
            // Keep the base position only.
            group.setAttribute('transform', [rawHostTransform, `translate(${baseX},${baseY})`].filter(Boolean).join(' '));
          }
        }
      } catch (e) {
        // ignore
      }
    };

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animateTranslateYRaf = (slot, fromY, toY, duration, onFinish) => {
      if (!slot || !slot.inner) return;

      const nowFn = (typeof performance !== 'undefined' && performance && typeof performance.now === 'function')
        ? () => performance.now()
        : () => Date.now();
      const raf = (typeof requestAnimationFrame === 'function')
        ? (cb) => requestAnimationFrame(cb)
        : (cb) => setTimeout(() => cb(nowFn()), 16);
      const caf = (typeof cancelAnimationFrame === 'function')
        ? (id) => cancelAnimationFrame(id)
        : (id) => clearTimeout(id);
      try {
        if (slot._rafId) {
          caf(slot._rafId);
          slot._rafId = 0;
        }
      } catch (e) {
        // ignore
      }

      const start = nowFn();
      const safeDuration = Math.max(0, duration || 0);

      const tick = (now) => {
        const tNow = (typeof now === 'number') ? now : nowFn();
        const elapsed = Math.max(0, tNow - start);
        const t = safeDuration <= 0 ? 1 : Math.min(1, elapsed / safeDuration);
        const eased = easeOutCubic(t);
        const y = fromY + (toY - fromY) * eased;
        try {
          slot.inner.setAttribute('transform', `translate(0,${y})`);
        } catch (e) {
          // ignore
        }
        if (t < 1) {
          slot._rafId = raf(tick);
        } else {
          slot._rafId = 0;
          try {
            if (typeof onFinish === 'function') onFinish();
          } catch (e) {
            // ignore
          }
        }
      };

      slot._rafId = raf(tick);
    };

    const animateOdometerTo = (textNode, nextText, options = {}) => {
      const parts = parseOdometerParts(nextText);
      if (!parts.ok) return false;
      const state = ensureOdometerState(textNode);
      if (!state) return false;
      const style = resolveOdometerStyle(textNode, options);

      // Remember the latest inputs so we can safely rebuild after fonts load.
      state._lastNextText = nextText;
      state._lastOptions = options;
      const coreSig = String(parts.core || '').replace(/[0-9]/g, '0');
      const buildKey = `${parts.prefix}__${coreSig}__${parts.suffix}__${style.fontFamily}__${style.fontSize}__${style.fill}__${style.textAnchor}`;
      const needsRebuild = (state.builtKey !== buildKey || !Array.isArray(state.slots) || state.slots.length !== parts.core.length);
      if (needsRebuild) {
        // Avoid showing an intermediate mis-measured layout (font loads / bbox settle).
        try {
          if (state.group && state.group.style) {
            state.group.style.opacity = '0';
          }
        } catch (e) {
          // ignore
        }
        buildOdometer(textNode, parts, style, options);
      }

      // Finalize layout using actual rendered geometry (prevents Curr: overlap in HA WebViews).
      try {
        state.anchor = style.textAnchor;
        finalizeOdometerLayout(state, style);

        // Run once on next frame to ensure the DOM has a chance to layout.
        try {
          if (!state._layoutRaf) {
            state._layoutRaf = requestAnimationFrame(() => {
              try {
                finalizeOdometerLayout(state, style);
              } catch (e) {
                // ignore
              }
              try {
                if (state.group && state.group.style) state.group.style.opacity = '';
              } catch (e) {
                // ignore
              }
              state._layoutRaf = 0;
            });
          }
        } catch (e) {
          // ignore
        }

        // If font loading API is available, re-run once fonts are ready (prevents first-update flash).
        try {
          if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.ready === 'object' && typeof document.fonts.ready.then === 'function') {
            if (!state._fontsReadyPromise) {
              state._fontsReadyPromise = document.fonts.ready;
            }
            state._fontsReadyPromise.then(() => {
              // Fonts can load after the initial build; finalize alone can't fix digit widths,
              // so rebuild once with the now-available font metrics.
              try {
                if (!state._rebuiltAfterFonts) {
                  state._rebuiltAfterFonts = true;
                  const latestText = (state._lastNextText !== undefined && state._lastNextText !== null) ? String(state._lastNextText) : String(nextText);
                  const latestParts = parseOdometerParts(latestText);
                  if (latestParts && latestParts.ok) {
                    const latestOptions = state._lastOptions || options || {};
                    const latestStyle = resolveOdometerStyle(textNode, latestOptions);
                    buildOdometer(textNode, latestParts, latestStyle, latestOptions);
                  }
                }
              } catch (e) {
                // ignore
              }
              try {
                const latestOptions = state._lastOptions || options || {};
                const finalizeStyle = resolveOdometerStyle(textNode, latestOptions);
                state.anchor = finalizeStyle.textAnchor;
                finalizeOdometerLayout(state, finalizeStyle);
              } catch (e) {
                // ignore
              }
              try {
                if (state.group && state.group.style) state.group.style.opacity = '';
              } catch (e) {
                // ignore
              }
            }).catch(() => {
              try {
                if (state.group && state.group.style) state.group.style.opacity = '';
              } catch (e) {
                // ignore
              }
            });
          } else if (needsRebuild) {
            // Ensure we don't leave it hidden.
            if (state.group && state.group.style) state.group.style.opacity = '';
          }
        } catch (e) {
          // ignore
        }
        // Fonts can load late; re-run once shortly after to stabilize widths.
        if (!state._layoutTimer) {
          state._layoutTimer = setTimeout(() => {
            try {
              finalizeOdometerLayout(state, style);
            } catch (e) {
              // ignore
            }
            try {
              if (state.group && state.group.style) state.group.style.opacity = '';
            } catch (e) {
              // ignore
            }
            state._layoutTimer = 0;
          }, 250);
        }
      } catch (e) {
        // ignore
      }

      const duration = (typeof options.odometerDuration === 'number' && Number.isFinite(options.odometerDuration))
        ? options.odometerDuration
        : (state.group && state.group.dataset && state.group.dataset.duration ? parseFloat(state.group.dataset.duration) : 350);
      const lineHeight = state.lineHeight || Math.max(1, style.fontSize * 1.2);
      const chars = parts.core.split('');

      state.slots.forEach((slot, i) => {
        if (!slot || !slot.primary || !slot.secondary || !slot.inner) return;
        const nextCh = chars[i] || '';
        const prevCh = slot.primary.textContent || '';
        if (prevCh === nextCh) return;

        slot.secondary.textContent = nextCh;
        try {
          if (typeof slot.inner.getAnimations === 'function') {
            slot.inner.getAnimations().forEach((a) => a.cancel());
          }
        } catch (e) {
          // ignore
        }
        // WAAPI animations on SVG content are unreliable in some HA WebViews.
        // Use an rAF-driven transform tween for consistent digit rolling.
        slot.inner.setAttribute('transform', 'translate(0,0)');
        animateTranslateYRaf(slot, 0, -lineHeight, duration, () => {
          slot.primary.textContent = nextCh;
          slot.secondary.textContent = nextCh;
          slot.inner.setAttribute('transform', 'translate(0,0)');
        });
      });
      return true;
    };

    const applyTextContent = (node, nextText) => {
      if (!node) return;
      const tag = (node.tagName || '').toLowerCase();
      if (tag === 'text') {
        const tspans = node.querySelectorAll(':scope > tspan');
        if (tspans && tspans.length) {
          tspans.forEach((tspan, index) => {
            const value = index === 0 ? nextText : '';
            if (tspan.textContent !== value) {
              tspan.textContent = value;
            }
          });
          return;
        }
      }

      // Avoid wiping SVG groups or paths that contain child elements.
      if (tag !== 'text' && node.childElementCount) {
        const childText = node.querySelector('text');
        if (childText) {
          applyTextContent(childText, nextText);
        }
        return;
      }

      if (node.textContent !== nextText) {
        node.textContent = nextText;
      }
    };

    const applyStaticTextTranslations = () => {
      const config = this.card._config || this.card.config || {};
      const heatPumpLabelOverride = (config && typeof config.heat_pump_label === 'string' && config.heat_pump_label.trim())
        ? config.heat_pump_label.trim()
        : '';

      const language = (viewState && typeof viewState.language === 'string' && viewState.language.trim())
        ? viewState.language.trim().toLowerCase()
        : 'en';

      let styleSyncScheduled = false;

      // Built-in static label translations from LocalizationManager
      // Only applied when a translation exists; otherwise the SVG's existing (English) text remains.
      const i18n = new LocalizationManager(language);
      const STATIC_TEXT_TRANSLATIONS = i18n.getStaticTextTranslations();

      // Optional external locale override hook (if you later add it):
      // localeStrings.staticText[role][language]
      let localeStaticText = null;
      try {
        const localeStrings = (typeof this.card._getLocaleStrings === 'function') ? this.card._getLocaleStrings() : null;
        localeStaticText = (localeStrings && localeStrings.staticText) ? localeStrings.staticText : null;
      } catch (e) {
        localeStaticText = null;
      }

      const nodes = svgRoot.querySelectorAll('[data-role$="-label"]');
      if (!nodes || !nodes.length) return;

      const syncLabelStylesFromBase = () => {
        if (!nodes || !nodes.length) return;
        nodes.forEach((node) => {
          try {
            if (!node || typeof node.getAttribute !== 'function') return;
            const role = (node.getAttribute('data-role') || '').trim();
            if (!role || !role.endsWith('-label')) return;
            const entry = STATIC_TEXT_TRANSLATIONS[role];
            const explicitLinkTo = (entry && typeof entry === 'object') ? (entry.linkTo || entry._linkTo) : null;
            const baseRole = (typeof explicitLinkTo === 'string' && explicitLinkTo.trim())
              ? explicitLinkTo.trim()
              : role.slice(0, -6);
            if (!baseRole) return;

            const baseNode = svgRoot.querySelector(`[data-role="${baseRole}"]`);
            if (!baseNode) return;

            const baseTarget = getVisibilityTarget(baseNode) || baseNode;
            const labelTarget = getVisibilityTarget(node) || node;

            // Static labels should not remain hidden when they participate in configured styling.
            // Some base roles start with opacity:0 for animation, but the corresponding '*-label' label must stay visible.
            const labelDataStyle = ((node.getAttribute && node.getAttribute('data-style')) ? node.getAttribute('data-style') : '') || '';
            const _labelDsNorm = String(labelDataStyle).trim().toLowerCase();
            const isConfigStyledLabel = (_labelDsNorm === 'config' || _labelDsNorm === 'config-center' || _labelDsNorm === 'config-right');
            if (isConfigStyledLabel) {
              if (labelTarget && typeof labelTarget.getAttribute === 'function' && labelTarget.getAttribute('opacity') === '0') {
                labelTarget.removeAttribute('opacity');
              }
              if (labelTarget && labelTarget.style) {
                  if (typeof labelTarget.style.setProperty === 'function') {
                    labelTarget.style.setProperty('opacity', '1', 'important');
                  } else {
                    labelTarget.style.opacity = '1';
                  }
              }
            }

            // Copy fill + font-size + font-family from the base role onto the label.
            // Skipped for config-styled labels (data-style="config"/"config-center"/"config-right"):
            // for those, applyBaselineConfigStyles is the single source of truth for
            // card_label_color/card_label_font_size/card_label_font_family.
            // Prefer runtime-styled fill over SVG's original fill="none".
            const fill = (() => {
              const normalize = (v) => {
                if (v === null || v === undefined) return '';
                const s = String(v).trim();
                if (!s) return '';
                const lower = s.toLowerCase();
                if (lower === 'none' || lower === 'transparent' || lower === 'rgba(0, 0, 0, 0)') return '';
                return s;
              };

              const fromStyle = normalize(baseTarget.style && baseTarget.style.fill);
              if (fromStyle) return fromStyle;

              const fromAttr = normalize(baseTarget.getAttribute && baseTarget.getAttribute('fill'));
              if (fromAttr) return fromAttr;

              try {
                return normalize(getComputedStyle(baseTarget).fill);
              } catch (e) {
                return '';
              }
            })();
            // Don't copy fill color to icon elements (paths) - only to text elements
            const isIconElement = labelTarget.tagName && labelTarget.tagName.toLowerCase() === 'path';
            if (fill && !isIconElement && !isConfigStyledLabel) {
              labelTarget.setAttribute('fill', fill);
              if (labelTarget.style) labelTarget.style.fill = fill;
            }

            const fontSize = (() => {
              // Prefer runtime-configured fontSize (style) over the SVG's original font-size attribute.
              const fromStyle = (baseTarget.style && baseTarget.style.fontSize) ? parseFloat(baseTarget.style.fontSize) : NaN;
              if (Number.isFinite(fromStyle) && fromStyle > 0) return fromStyle;

              const raw = (baseTarget.getAttribute && baseTarget.getAttribute('font-size')) ? baseTarget.getAttribute('font-size') : null;
              const parsed = raw !== null ? Number(raw) : NaN;
              if (Number.isFinite(parsed) && parsed > 0) return parsed;

              try {
                const computed = parseFloat(getComputedStyle(baseTarget).fontSize);
                return (Number.isFinite(computed) && computed > 0) ? computed : NaN;
              } catch (e) {
                return NaN;
              }
            })();
            if (Number.isFinite(fontSize) && !isConfigStyledLabel) {
              labelTarget.setAttribute('font-size', String(fontSize));
              if (labelTarget.style) labelTarget.style.fontSize = `${fontSize}px`;
              const tag = (labelTarget.tagName || '').toLowerCase();
              if (tag === 'text') {
                const tspans = labelTarget.querySelectorAll(':scope > tspan');
                if (tspans && tspans.length) {
                  tspans.forEach((tspan) => {
                    tspan.setAttribute('font-size', String(fontSize));
                    if (tspan.style) tspan.style.fontSize = `${fontSize}px`;
                  });
                }
              }
            }

            const fontFamily = (() => {
              const normalize = (v) => {
                if (v === null || v === undefined) return '';
                const s = String(v).trim();
                if (!s) return '';
                const lower = s.toLowerCase();
                if (lower === 'inherit' || lower === 'initial' || lower === 'unset') return '';
                return s;
              };

              const fromStyle = normalize(baseTarget.style && baseTarget.style.fontFamily);
              if (fromStyle) return fromStyle;

              const fromAttr = normalize(baseTarget.getAttribute && baseTarget.getAttribute('font-family'));
              if (fromAttr) return fromAttr;

              try {
                return normalize(getComputedStyle(baseTarget).fontFamily);
              } catch (e) {
                return '';
              }
            })();
            if (fontFamily && !isConfigStyledLabel) {
              labelTarget.setAttribute('font-family', fontFamily);
              if (labelTarget.style) labelTarget.style.fontFamily = fontFamily;
            }
          } catch (e) {
            // ignore
          }
        });
      };

      nodes.forEach((node) => {
        if (!node || typeof node.getAttribute !== 'function') return;
        const role = (node.getAttribute('data-role') || '').trim();
        if (!role) return;

        const fromLocale = (() => {
          try {
            const entry = localeStaticText && localeStaticText[role];
            if (!entry) return null;
            if (typeof entry === 'string') return entry;
            if (entry && typeof entry === 'object') {
              return entry[language] || entry.en || null;
            }
            return null;
          } catch (e) {
            return null;
          }
        })();

        const fromBuiltIn = (() => {
          const entry = STATIC_TEXT_TRANSLATIONS[role];
          if (!entry) return null;
          return entry[language] || entry.en || null;
        })();

        const translated = (role === 'heat-pump-power-label' && heatPumpLabelOverride)
          ? heatPumpLabelOverride
          : (fromLocale || fromBuiltIn);
        if (typeof translated === 'string' && translated.trim()) {
          applyTextContent(node, translated);
        }

        // Apply alignment + non-odometer font for config-styled static labels immediately
        // (before the rest of the bindings run), so odometer doesn't "jump" on the first update
        // due to anchor changes.
        try {
          const labelDataStyle = ((node.getAttribute && node.getAttribute('data-style')) ? node.getAttribute('data-style') : '') || '';
          const _labelDs2Norm = String(labelDataStyle).trim().toLowerCase();
          if (_labelDs2Norm === 'config' || _labelDs2Norm === 'config-center' || _labelDs2Norm === 'config-right') {
            const entry = STATIC_TEXT_TRANSLATIONS[role];
            const explicitLinkTo = (entry && typeof entry === 'object') ? (entry.linkTo || entry._linkTo) : null;
            const baseRole = (typeof explicitLinkTo === 'string' && explicitLinkTo.trim())
              ? explicitLinkTo.trim()
              : role.endsWith('-label') ? role.slice(0, -6) : '';
            const labelTarget = getVisibilityTarget(node) || node;
            // Labels are non-animated: always use the normal configured font, not the odometer font.
            if (typeof globalFontFamily === 'string' && globalFontFamily) {
              if (labelTarget && typeof labelTarget.setAttribute === 'function') {
                labelTarget.setAttribute('font-family', globalFontFamily);
              }
              if (labelTarget && labelTarget.style) {
                labelTarget.style.fontFamily = globalFontFamily;
              }
            }
          }
        } catch (e) {
          // ignore
        }
      });

      // Defer style syncing until after the rest of bindings update the base nodes.
      if (!styleSyncScheduled) {
        styleSyncScheduled = true;
        Promise.resolve().then(() => {
          styleSyncScheduled = false;
          syncLabelStylesFromBase();
        }).catch(() => {
          styleSyncScheduled = false;
        });
      }
    };

    const setRoleVisibilityOnly = (role, visible) => {
      if (!svgRoot) {
        return;
      }
      const nodes = svgRoot.querySelectorAll(`[data-role="${role.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
      if (!nodes || !nodes.length) {
        return;
      }
      const shouldShow = Boolean(visible);
      nodes.forEach((node) => {
        const target = getVisibilityTarget(node) || node;
        if (!target) {
          return;
        }
        if (target.style) {
          if (shouldShow && target.style.display === 'none') {
            target.style.display = '';
          } else if (!shouldShow && target.style.display !== 'none') {
            target.style.display = 'none';
          }
        }
        if (typeof target.getAttribute === 'function' && typeof target.removeAttribute === 'function') {
          if (shouldShow) {
            if (target.getAttribute('display') === 'none') {
              target.removeAttribute('display');
            }
            if (target.getAttribute('visibility') === 'hidden') {
              target.removeAttribute('visibility');
            }
            if (target.getAttribute('opacity') === '0') {
              target.removeAttribute('opacity');
            }
            if (target.style.opacity === '0') {
              target.style.opacity = '';
            }
          } else {
            target.setAttribute('display', 'none');
          }
        }
        if (this.card._odometerStates && typeof this.card._odometerStates.get === 'function') {
          const state = this.card._odometerStates.get(target);
          if (state && state.group && state.group.style) {
            state.group.style.display = shouldShow ? '' : 'none';
          }
        }
      });
    };

    const setRoleOpacityOnly = (role, opacityValue) => {
      if (!svgRoot) {
        return;
      }
      const nodes = svgRoot.querySelectorAll(`[data-role="${role.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
      if (!nodes || !nodes.length) {
        return;
      }
      const normalizedOpacity = Number.isFinite(opacityValue) ? opacityValue : 0;
      nodes.forEach((node) => {
        const target = getVisibilityTarget(node) || node;
        if (!target) {
          return;
        }
        if (target.style) {
          target.style.opacity = String(normalizedOpacity);
        }
        if (typeof target.setAttribute === 'function') {
          target.setAttribute('opacity', String(normalizedOpacity));
        }
      });
    };

    const getBaseYForNode = (node) => {
      if (!node) {
        return Number.NaN;
      }
      const dataKey = 'advancedBaseY';
      let raw = (node.dataset && Object.prototype.hasOwnProperty.call(node.dataset, dataKey))
        ? node.dataset[dataKey]
        : undefined;
      if (raw === undefined && typeof node.getAttribute === 'function') {
        raw = node.getAttribute('data-advanced-base-y');
      }
      if (raw === undefined || raw === null) {
        const attr = typeof node.getAttribute === 'function' ? node.getAttribute('y') : null;
        if (attr !== null && attr !== '') {
          raw = attr;
        } else if (typeof node.getBBox === 'function') {
          try {
            const bbox = node.getBBox();
            if (bbox && Number.isFinite(bbox.y)) {
              raw = String(bbox.y);
            }
          } catch (e) {
            raw = null;
          }
        }
        if (raw === undefined || raw === null) {
          raw = '';
        }
        if (node.dataset) {
          node.dataset[dataKey] = raw;
        } else if (typeof node.setAttribute === 'function') {
          node.setAttribute('data-advanced-base-y', raw);
        }
      }
      if (raw === '' || raw === null || raw === undefined) {
        return Number.NaN;
      }
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    };

    const adjustTextNodeY = (textNode, offset) => {
      const safeOffset = Number.isFinite(offset) ? offset : 0;
      const baseY = getBaseYForNode(textNode);
      if (!Number.isFinite(baseY)) {
        return;
      }
      const nextY = baseY + safeOffset;
      try {
        textNode.setAttribute('y', String(nextY));
      } catch (e) {
        // ignore
      }
      const tspans = textNode.querySelectorAll(':scope > tspan');
      if (tspans && tspans.length) {
        tspans.forEach((tspan) => {
          const spanBaseY = getBaseYForNode(tspan);
          if (!Number.isFinite(spanBaseY)) {
            return;
          }
          try {
            tspan.setAttribute('y', String(spanBaseY + safeOffset));
          } catch (e) {
            // ignore
          }
        });
      }
      if (this.card._odometerStates && typeof this.card._odometerStates.get === 'function') {
        const state = this.card._odometerStates.get(textNode);
        if (state) {
          state.baseY = nextY;
          state.builtKey = '';
        }
      }
    };

    const applyRoleYOffset = (role, offset) => {
      if (!svgRoot) {
        return;
      }
      const safeOffset = Number.isFinite(offset) ? offset : 0;
      const nodes = svgRoot.querySelectorAll(`[data-role="${role.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
      if (!nodes || !nodes.length) {
        return;
      }
      nodes.forEach((node) => {
        const target = getVisibilityTarget(node) || node;
        if (!target) {
          return;
        }
        const dataKey = 'advancedYOffset';
        const prevRaw = (target.dataset && Object.prototype.hasOwnProperty.call(target.dataset, dataKey))
          ? target.dataset[dataKey]
          : (typeof target.getAttribute === 'function' ? target.getAttribute('data-advanced-y-offset') : undefined);
        const prev = (prevRaw === undefined || prevRaw === null || prevRaw === '')
          ? 0
          : Number.parseFloat(prevRaw);
        if (Number.isFinite(prev) && prev === safeOffset) {
          return;
        }
        if (target.dataset) {
          target.dataset[dataKey] = String(safeOffset);
        } else if (typeof target.setAttribute === 'function') {
          target.setAttribute('data-advanced-y-offset', String(safeOffset));
        }
        adjustTextNodeY(target, safeOffset);
      });
    };

    const updateRole = (role, text, options = {}) => {
      const nodes = svgRoot.querySelectorAll(`[data-role="${role}"]`);
      if (!nodes || nodes.length === 0) {
        return;
      }
      const visible = options.visible !== undefined ? Boolean(options.visible) : true;
      const display = visible ? 'inline' : 'none';
      const nextText = (text === null || text === undefined) ? '' : String(text);

      nodes.forEach((node) => {
        const visibilityTarget = getVisibilityTarget(node);
        const featureOwner = (() => {
          const vtTag = visibilityTarget ? (visibilityTarget.tagName || '').toLowerCase() : '';
          if (vtTag === 'text') return visibilityTarget;
          const tag = (node.tagName || '').toLowerCase();
          if (tag === 'text') return node;
          return (typeof node.closest === 'function') ? node.closest('text') : null;
        })();
        const nodeWantsAnimate = hasFeatureToken(featureOwner || node, 'animate');
        const nodeWantsOdometer = Boolean(options && options.odometer) || nodeWantsAnimate;
        const nodeOptionsBase = (nodeWantsAnimate && !(options && options.odometer))
          ? { ...options, odometer: true }
          : options;
        const nodeOptions = (nodeWantsOdometer && odometerFontFamily && !(typeof nodeOptionsBase.fontFamily === 'string' && nodeOptionsBase.fontFamily))
          ? { ...nodeOptionsBase, fontFamily: odometerFontFamily }
          : nodeOptionsBase;

        const useOdometer = Boolean(nodeOptions && nodeOptions.odometer);
        if (useOdometer && visibilityTarget && (visibilityTarget.tagName || '').toLowerCase() === 'text') {
          const hostText = visibilityTarget;
          let ok = false;
          try {
            ok = animateOdometerTo(hostText, nextText, nodeOptions);
          } catch (e) {
            ok = false;
          }
          if (ok) {
            const state = this.card._odometerStates.get(hostText);
            if (state && state.group) {
              if (state.group.style.display !== display) {
                state.group.style.display = display;
              }
              if (state.group.getAttribute('opacity') === '0') {
                state.group.removeAttribute('opacity');
              }
              if (state.group.style.opacity === '0') {
                state.group.style.opacity = '';
              }
            }

            // Keep the underlying SVG text node styled, even when hidden, so other helpers
            // (notably '*-label' label style inheritance) can read configured values.
            const applyStyle = shouldApplyConfiguredTextStyle(node, nodeOptions)
              && (!nodeOptions.onlyWhenConfigStyle || isConfigStyledTextNode(node));
            if (applyStyle) {
              if (typeof nodeOptions.fill === 'string' && nodeOptions.fill) {
                hostText.setAttribute('fill', nodeOptions.fill);
                hostText.style.fill = nodeOptions.fill;
              }
              const resolvedFontFamily = (typeof nodeOptions.fontFamily === 'string' && nodeOptions.fontFamily)
                ? nodeOptions.fontFamily
                : (isConfigStyledTextNode(node) ? globalFontFamily : null);
              if (typeof resolvedFontFamily === 'string' && resolvedFontFamily) {
                hostText.setAttribute('font-family', resolvedFontFamily);
                hostText.style.fontFamily = resolvedFontFamily;
              }
              if (typeof nodeOptions.fontSize === 'number' && Number.isFinite(nodeOptions.fontSize)) {
                hostText.setAttribute('font-size', String(nodeOptions.fontSize));
                hostText.style.fontSize = `${nodeOptions.fontSize}px`;
                const tspans = hostText.querySelectorAll(':scope > tspan');
                if (tspans && tspans.length) {
                  tspans.forEach((tspan) => {
                    tspan.setAttribute('font-size', String(nodeOptions.fontSize));
                    tspan.style.fontSize = `${nodeOptions.fontSize}px`;
                  });
                }
              }
            }
            hostText.style.display = 'none';
            return;
          }
          // If odometer couldn't be applied, fall back to plain text.
          teardownOdometer(hostText);
        } else if (visibilityTarget && (visibilityTarget.tagName || '').toLowerCase() === 'text') {
          // Ensure we remove any prior odometer group when toggled off.
          teardownOdometer(visibilityTarget);
        }
        applyTextContent(node, nextText);
        if (visibilityTarget) {
          if (visibilityTarget.style.display !== display) {
            visibilityTarget.style.display = display;
          }
          if (display === 'inline') {
            if (visibilityTarget.getAttribute('display') === 'none') {
              visibilityTarget.removeAttribute('display');
            }
            if (visibilityTarget.getAttribute('visibility') === 'hidden') {
              visibilityTarget.removeAttribute('visibility');
            }
            if (visibilityTarget.getAttribute('opacity') === '0') {
              visibilityTarget.removeAttribute('opacity');
            }
            if (visibilityTarget.style.opacity === '0') {
              visibilityTarget.style.opacity = '';
            }
          }
        }
          const applyStyle = shouldApplyConfiguredTextStyle(node, nodeOptions)
            && (!nodeOptions.onlyWhenConfigStyle || isConfigStyledTextNode(node));
        if (applyStyle) {
          if (typeof nodeOptions.fill === 'string' && nodeOptions.fill) {
            node.setAttribute('fill', nodeOptions.fill);
            node.style.fill = nodeOptions.fill;
          }
          const resolvedFontFamily = (typeof nodeOptions.fontFamily === 'string' && nodeOptions.fontFamily)
            ? nodeOptions.fontFamily
            : (isConfigStyledTextNode(node) ? globalFontFamily : null);
          if (typeof resolvedFontFamily === 'string' && resolvedFontFamily) {
            node.setAttribute('font-family', resolvedFontFamily);
            node.style.fontFamily = resolvedFontFamily;
          }

          // Normalize `text-align` for better cross-WebView consistency.
          try {
            if (node && node.style) {
              node.style.textAlign = 'left';
              if (typeof node.style.setProperty === 'function') {
                node.style.setProperty('text-align', 'left');
              }
            }
          } catch (e) {
            // ignore
          }
          if (typeof nodeOptions.fontSize === 'number' && Number.isFinite(nodeOptions.fontSize)) {
            node.setAttribute('font-size', String(nodeOptions.fontSize));
            node.style.fontSize = `${nodeOptions.fontSize}px`;

            const tag = (node.tagName || '').toLowerCase();
            if (tag === 'text') {
              const tspans = node.querySelectorAll(':scope > tspan');
              if (tspans && tspans.length) {
                tspans.forEach((tspan) => {
                  tspan.setAttribute('font-size', String(nodeOptions.fontSize));
                  tspan.style.fontSize = `${nodeOptions.fontSize}px`;
                });
              }
            } else if (tag === 'tspan') {
              const host = getVisibilityTarget(node);
              if (host && host !== node && host.style) {
                host.setAttribute('font-size', String(nodeOptions.fontSize));
                host.style.fontSize = `${nodeOptions.fontSize}px`;
              }
            }
          }
        }
      });

      // If this role has a paired static label (`${role}-label`) styled via
      // data-style="config"/"config-center"/"config-right", keep its alignment
      // and visibility in sync after updates. Its fill/font-size/font-family are
      // NOT copied from this (value) node - applyBaselineConfigStyles is the
      // single source of truth for card_label_color/card_label_font_size/font_family.
      try {
        if (role && !String(role).endsWith('-label')) {
          const labelNodes = svgRoot.querySelectorAll(`[data-role="${role}-label"]`);
          if (labelNodes && labelNodes.length) {
            labelNodes.forEach((ln) => {
              const labelTarget = getVisibilityTarget(ln) || ln;
              const ds = (labelTarget && typeof labelTarget.getAttribute === 'function') ? (labelTarget.getAttribute('data-style') || '') : '';
              const dsNorm = String(ds).trim().toLowerCase();
              if (dsNorm !== 'config' && dsNorm !== 'config-center' && dsNorm !== 'config-right') return;

              applyAlignment(labelTarget, ALIGNMENT_BY_DATA_STYLE[dsNorm]);

              try {
                if (labelTarget.style) {
                  // Ensure visible
                  labelTarget.style.setProperty ? labelTarget.style.setProperty('opacity', '1', 'important') : (labelTarget.style.opacity = '1');
                }
                if (labelTarget.getAttribute && labelTarget.getAttribute('opacity') === '0') {
                  labelTarget.removeAttribute('opacity');
                }
              } catch (e) {
                // ignore
              }
            });
          }
        }
      } catch (e) {
        // ignore
      }
    };

    // Baseline styling pass for all data-style="config"/"config-center"/"config-right"
    // elements: card background, label-ish alignment + label theming, and the
    // card_value_color/card_value_font_size fallback for plain value text.
    const applyBaselineConfigStyles = () => {
      if (!svgRoot || !viewState.configStyles) return;
      const cs = viewState.configStyles;

      if (cs.cardBg) {
        svgRoot.querySelectorAll('[data-style="config"][data-role="card"], [data-style="config"][data-role="car1-card"], [data-style="config"][data-role="car2-card"]').forEach(el => {
          el.setAttribute('fill', cs.cardBg);
          el.style.fill = cs.cardBg;
        });
      }

      const allConfigStyled = svgRoot.querySelectorAll('[data-style="config"], [data-style="config-center"], [data-style="config-right"]');
      allConfigStyled.forEach((el) => {
        const role = (el.getAttribute('data-role') || '').trim();
        if (!role || role === 'card' || role === 'car1-card' || role === 'car2-card') return;

        const isLabel = (role === 'label' || role.endsWith('-label'));

        // Alignment from data-style: ONLY for label roles. Plain value roles
        // keep whatever text-anchor/transform the SVG already defines.
        if (isLabel) {
          applyAlignment(el, getConfiguredAlignment(el));
        }

        if (isLabel) {
          if (cs.labelColor) {
            el.setAttribute('fill', cs.labelColor);
            el.style.fill = cs.labelColor;
          }
          if (cs.labelFontSize) {
            el.setAttribute('font-size', cs.labelFontSize);
            el.style.fontSize = cs.labelFontSize + 'px';
          }
          if (cs.labelFontFamily) {
            el.setAttribute('font-family', cs.labelFontFamily);
            el.style.fontFamily = cs.labelFontFamily;
          }
          if (cs.labelCss) {
            cs.labelCss.split(';').forEach(decl => {
              const colon = decl.indexOf(':');
              if (colon <= 0) return;
              const prop = decl.substring(0, colon).trim();
              const val = decl.substring(colon + 1).trim();
              if (!prop || !val) return;
              const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              el.style[camelProp] = val;
            });
          }
        } else {
          // Plain value roles (data-role does not contain "-label").
          if (cs.valueColor) {
            el.setAttribute('fill', cs.valueColor);
            el.style.fill = cs.valueColor;
          }
          if (cs.valueFontSize) {
            el.setAttribute('font-size', cs.valueFontSize);
            el.style.fontSize = cs.valueFontSize + 'px';
            const tspans = el.querySelectorAll(':scope > tspan');
            if (tspans && tspans.length) {
              tspans.forEach((tspan) => {
                tspan.setAttribute('font-size', cs.valueFontSize);
                tspan.style.fontSize = cs.valueFontSize + 'px';
              });
            }
          }
          if (cs.valueCss) {
            cs.valueCss.split(';').forEach(decl => {
              const colon = decl.indexOf(':');
              if (colon <= 0) return;
              const prop = decl.substring(0, colon).trim();
              const val = decl.substring(colon + 1).trim();
              if (!prop || !val) return;
              const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              el.style[camelProp] = val;
            });
          }
        }
      });
    };

    applyBaselineConfigStyles();

    // Apply translated static label nodes (data-role="*-label") after helpers are ready.
    applyStaticTextTranslations();

    // Renders an MDI icon using <ha-icon> inside a <foreignObject> positioned at the data-role
    // text element's coordinates. Falls back to plain text via updateRole for non-mdi: values.
    const updateIconRole = (role, text, options = {}) => {
      const iconValue = (text === null || text === undefined) ? '' : String(text).trim();
      const isMdi = iconValue.startsWith('mdi:');

      if (!isMdi) {
        // Clean up any previous foreignObject for this role then render as text
        const exFo = svgRoot.querySelector(`[data-icon-fo="icon-${role}"]`);
        if (exFo) exFo.style.display = 'none';
        updateRole(role, text, options);
        return;
      }

      const visible = options.visible !== undefined ? Boolean(options.visible) : true;
      const iconSize = (typeof options.fontSize === 'number' && Number.isFinite(options.fontSize)) ? options.fontSize : 24;
      const fill = (typeof options.fill === 'string' && options.fill) ? options.fill : '#FFFFFF';
      const foKey = `icon-${role}`;

      const nodes = svgRoot.querySelectorAll(`[data-role="${role}"]`);
      if (!nodes || nodes.length === 0) return;

      nodes.forEach((node) => {
        const tag = (node.tagName || '').toLowerCase();
        const textNode = tag === 'text' ? node : ((typeof node.closest === 'function') ? node.closest('text') : null);

        // Suppress the raw "mdi:..." string from appearing as text
        if (textNode) textNode.textContent = '';

        if (!visible) {
          const exFo = svgRoot.querySelector(`[data-icon-fo="${foKey}"]`);
          if (exFo) exFo.style.display = 'none';
          if (textNode) textNode.style.display = 'none';
          return;
        }
        if (textNode) textNode.style.display = 'inline';

        const anchorEl = textNode || node;
        const x = parseFloat(anchorEl.getAttribute('x') || '0');
        const y = parseFloat(anchorEl.getAttribute('y') || '0');
        const anchor = anchorEl.getAttribute('text-anchor') || 'middle';
        const foX = anchor === 'middle' ? x - iconSize / 2 : anchor === 'end' ? x - iconSize : x;
        const foY = y - iconSize;

        let fo = svgRoot.querySelector(`[data-icon-fo="${foKey}"]`);
        if (!fo) {
          fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
          fo.setAttribute('data-icon-fo', foKey);
          (anchorEl.parentNode || svgRoot).appendChild(fo);
        }
        fo.setAttribute('x', String(foX));
        fo.setAttribute('y', String(foY));
        fo.setAttribute('width', String(iconSize));
        fo.setAttribute('height', String(iconSize));
        fo.style.display = 'inline';
        fo.style.overflow = 'visible';

        let haIcon = fo.querySelector('ha-icon');
        if (!haIcon) {
          const wrapper = document.createElement('div');
          wrapper.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
          haIcon = document.createElement('ha-icon');
          wrapper.appendChild(haIcon);
          fo.appendChild(wrapper);
        }
        if (haIcon.getAttribute('icon') !== iconValue) haIcon.setAttribute('icon', iconValue);
        haIcon.style.color = fill;
        haIcon.style.setProperty('--mdc-icon-size', `${iconSize}px`);
        haIcon.style.display = 'block';
      });
    };

    const updateIndexedRoles = (prefix, lines, defaults = {}) => {
      const allNodes = svgRoot.querySelectorAll(`[data-role^="${prefix}-"]`);
      if (allNodes && allNodes.length) {
        allNodes.forEach((node) => {
          const visibilityTarget = getVisibilityTarget(node);
          const role = node.getAttribute('data-role') || '';
          const match = role.match(new RegExp(`^${prefix}-(\\d+)$`));
          const index = match ? Number(match[1]) : NaN;
          const line = Number.isFinite(index) && Array.isArray(lines) ? lines[index] : null;
          const visible = Boolean(line && line.visible);
          const display = visible ? 'inline' : 'none';
          if (visibilityTarget) {
            if (visibilityTarget.style.display !== display) {
              visibilityTarget.style.display = display;
            }
            if (display === 'inline') {
              if (visibilityTarget.getAttribute('display') === 'none') {
                visibilityTarget.removeAttribute('display');
              }
              if (visibilityTarget.getAttribute('visibility') === 'hidden') {
                visibilityTarget.removeAttribute('visibility');
              }
              if (visibilityTarget.getAttribute('opacity') === '0') {
                visibilityTarget.removeAttribute('opacity');
              }
              if (visibilityTarget.style.opacity === '0') {
                visibilityTarget.style.opacity = '';
              }
            }
          }
          const nextText = visible ? String(line.text || '') : '';
          applyTextContent(node, nextText);
          const applyStyle = shouldApplyConfiguredTextStyle(node, defaults);
          if (applyStyle) {
            const fill = (line && typeof line.fill === 'string' && line.fill) ? line.fill : defaults.fill;
            if (typeof fill === 'string' && fill) {
              node.setAttribute('fill', fill);
              node.style.fill = fill;
            }
            const resolvedFontFamily = (line && typeof line.fontFamily === 'string' && line.fontFamily)
              ? line.fontFamily
              : ((defaults && typeof defaults.fontFamily === 'string' && defaults.fontFamily)
                ? defaults.fontFamily
                : (isConfigStyledTextNode(node) ? globalFontFamily : null));
            if (typeof resolvedFontFamily === 'string' && resolvedFontFamily) {
              node.setAttribute('font-family', resolvedFontFamily);
              node.style.fontFamily = resolvedFontFamily;
            }
            const fontSize = (line && typeof line.fontSize === 'number' && Number.isFinite(line.fontSize))
              ? line.fontSize
              : defaults.fontSize;
            if (typeof fontSize === 'number' && Number.isFinite(fontSize)) {
              node.setAttribute('font-size', String(fontSize));
              node.style.fontSize = `${fontSize}px`;

              const tag = (node.tagName || '').toLowerCase();
              if (tag === 'text') {
                const tspans = node.querySelectorAll(':scope > tspan');
                if (tspans && tspans.length) {
                  tspans.forEach((tspan) => {
                    tspan.setAttribute('font-size', String(fontSize));
                    tspan.style.fontSize = `${fontSize}px`;
                  });
                }
              } else if (tag === 'tspan') {
                const host = getVisibilityTarget(node);
                if (host && host !== node && host.style) {
                  host.setAttribute('font-size', String(fontSize));
                  host.style.fontSize = `${fontSize}px`;
                }
              }
            }
          }
        });
      }

      if (Array.isArray(lines)) {
        lines.forEach((line, index) => {
          const lineFontSize = (line && typeof line.fontSize === 'number' && Number.isFinite(line.fontSize))
            ? line.fontSize
            : defaults.fontSize;
          updateRole(`${prefix}-${index}`, line.text || '', {
            visible: Boolean(line.visible),
            fill: line.fill || defaults.fill,
            fontSize: lineFontSize
          });
        });
      }
    };

    const syncTitleOverlayToRect = () => {
      try {
        const overlay = this.card._domRefs && this.card._domRefs.titleOverlay;
        if (!overlay) {
          return;
        }
        const hasTitle = Boolean(viewState && viewState.title && viewState.title.text);
        if (!hasTitle) {
          if (overlay.style.display !== 'none') {
            overlay.style.display = 'none';
          }
          return;
        }

        const titleText = String(viewState.title.text || '');
        overlay.textContent = titleText;
        overlay.style.display = 'flex';

        const fill = (viewState.title && typeof viewState.title.fill === 'string' && viewState.title.fill) ? viewState.title.fill : '';
        const bgFill = (viewState.titleBg && typeof viewState.titleBg.fill === 'string' && viewState.titleBg.fill) ? viewState.titleBg.fill : '';
        overlay.style.color = fill || '';
        overlay.style.background = bgFill || '';

        const svgEl = this.card._domRefs && this.card._domRefs.svgRoot;
        const cardEl = this.card._domRefs && this.card._domRefs.card;
        const rect = svgRoot.querySelector('[data-role="title-bg"]');
        if (!cardEl || !rect || typeof rect.getBoundingClientRect !== 'function') {
          overlay.style.left = '50%';
          overlay.style.top = '8px';
          overlay.style.transform = 'translateX(-50%)';
          return;
        }

        const rectBox = rect.getBoundingClientRect();
        const cardBox = cardEl.getBoundingClientRect();
        if (!rectBox || !cardBox || rectBox.width <= 0 || rectBox.height <= 0) {
          return;
        }

        const centerX = (rectBox.left - cardBox.left) + rectBox.width / 2;
        const centerY = (rectBox.top - cardBox.top) + rectBox.height / 2;

        // Padding request: make the background box roomy based on card size.
        // Horizontal ends: 4% of card width each side.
        // Top/bottom: 1% of card height each side.
        const paddingX = Math.max(0, cardBox.width * 0.04);
        const paddingY = Math.max(0, cardBox.height * 0.01);
        overlay.style.padding = `${paddingY}px ${paddingX}px`;

        // Center the overlay on the SVG title-bg rect.
        overlay.style.left = `${centerX}px`;
        overlay.style.top = `${centerY}px`;
        overlay.style.transform = 'translate(-50%, -50%)';

        let scaleX = 1;
        if (svgEl && typeof svgEl.getBoundingClientRect === 'function') {
          const svgBox = svgEl.getBoundingClientRect();
          if (svgBox && svgBox.width > 0) {
            scaleX = svgBox.width / SVG_DIMENSIONS.width;
          }
        }

        // Glow effect: match the title text color.
        const glowColor = fill || 'currentColor';
        const glowInset = Math.max(2, 8 * scaleX);
        const glowInner = Math.max(2, 3 * scaleX);
        const glowOuter = Math.max(3, 9 * scaleX);
        overlay.style.boxShadow = `inset 0 0 ${glowInset}px ${glowColor}, 0 0 ${glowInner}px ${glowColor}, 0 0 ${glowOuter}px ${glowColor}`;
        overlay.style.textShadow = `0 0 ${Math.max(2, 6 * scaleX)}px ${glowColor}`;

        const fontSizeBase = (viewState.title && typeof viewState.title.fontSize === 'number' && Number.isFinite(viewState.title.fontSize))
          ? viewState.title.fontSize
          : 16;
        const fontSizePx = Math.max(8, fontSizeBase * scaleX);
        overlay.style.fontSize = `${fontSizePx}px`;
        overlay.style.fontFamily = globalFontFamily || '';
        overlay.style.fontWeight = '900';
        overlay.style.letterSpacing = `${Math.max(0, 3 * scaleX)}px`;
        overlay.style.textTransform = 'uppercase';
        // Let padding + content determine size; keep it snug.
        overlay.style.width = 'max-content';
        overlay.style.height = 'auto';
      } catch (e) {
        // ignore
      }
    };

    const syncPvDailyOverlayToRect = () => {
      try {
        const overlay = this.card._domRefs && this.card._domRefs.pvDailyOverlay;
        if (!overlay) {
          return;
        }

        const pvDaily = viewState && viewState.pvDaily;
        const visible = Boolean(pvDaily && pvDaily.visible && pvDaily.text);
        if (!visible) {
          if (overlay.style.display !== 'none') {
            overlay.style.display = 'none';
          }
          return;
        }

        overlay.textContent = String(pvDaily.text || '');
        overlay.style.display = 'flex';

        const fill = (pvDaily && typeof pvDaily.fill === 'string' && pvDaily.fill) ? pvDaily.fill : '';
        const bgFill = (pvDaily && typeof pvDaily.bgFill === 'string' && pvDaily.bgFill) ? pvDaily.bgFill : '';
        overlay.style.color = fill || '';
        overlay.style.background = bgFill || '';

        const svgEl = this.card._domRefs && this.card._domRefs.svgRoot;
        const cardEl = this.card._domRefs && this.card._domRefs.card;
        const rect = svgRoot.querySelector('[data-role="pvDaily"]');
        // PV daily uses an SVG rect as an anchor. If it doesn't exist, don't show the overlay.
        if (!cardEl || !rect || typeof rect.getBoundingClientRect !== 'function') {
          if (overlay.style.display !== 'none') {
            overlay.style.display = 'none';
          }
          return;
        }

        const rectBox = rect.getBoundingClientRect();
        const cardBox = cardEl.getBoundingClientRect();
        if (!rectBox || !cardBox || rectBox.width <= 0 || rectBox.height <= 0) {
          return;
        }

        const centerX = (rectBox.left - cardBox.left) + rectBox.width / 2;
        const centerY = (rectBox.top - cardBox.top) + rectBox.height / 2;

        // Keep padding consistent with the title overlay sizing.
        const paddingX = Math.max(0, cardBox.width * 0.04);
        const paddingY = Math.max(0, cardBox.height * 0.01);
        overlay.style.padding = `${paddingY}px ${paddingX}px`;

        overlay.style.left = `${centerX}px`;
        overlay.style.top = `${centerY}px`;
        overlay.style.transform = 'translate(-50%, -50%)';

        let scaleX = 1;
        if (svgEl && typeof svgEl.getBoundingClientRect === 'function') {
          const svgBox = svgEl.getBoundingClientRect();
          if (svgBox && svgBox.width > 0) {
            scaleX = svgBox.width / SVG_DIMENSIONS.width;
          }
        }

        // Glow effect: match the PV daily text color.
        const glowColor = fill || 'currentColor';
        const glowInset = Math.max(2, 8 * scaleX);
        const glowInner = Math.max(2, 3 * scaleX);
        const glowOuter = Math.max(3, 9 * scaleX);
        overlay.style.boxShadow = `inset 0 0 ${glowInset}px ${glowColor}, 0 0 ${glowInner}px ${glowColor}, 0 0 ${glowOuter}px ${glowColor}`;
        overlay.style.textShadow = `0 0 ${Math.max(2, 6 * scaleX)}px ${glowColor}`;

        const fontSizeBase = (pvDaily && typeof pvDaily.fontSize === 'number' && Number.isFinite(pvDaily.fontSize))
          ? pvDaily.fontSize
          : 16;
        const fontSizePx = Math.max(8, fontSizeBase * scaleX);
        overlay.style.fontSize = `${fontSizePx}px`;
        overlay.style.fontFamily = globalFontFamily || '';
        overlay.style.fontWeight = '900';
        overlay.style.letterSpacing = `${Math.max(0, 1 * scaleX)}px`;
        overlay.style.textTransform = 'none';
        overlay.style.width = 'max-content';
        overlay.style.height = 'auto';
      } catch (e) {
        // ignore
      }
    };

    // Title + daily
    const hasTitleText = Boolean(viewState.title && viewState.title.text);

    updateRole('title-bg', '', {
      visible: hasTitleText,
      fill: viewState.titleBg ? viewState.titleBg.fill : undefined
    });

    // PV Daily anchor box (SVG rect) + HTML overlay text
    const pvDailyVisible = Boolean(viewState.pvDaily && viewState.pvDaily.visible);
    updateRole('pvDaily', '', {
      visible: pvDailyVisible,
      fill: (viewState.pvDaily && viewState.pvDaily.bgFill) ? viewState.pvDaily.bgFill : undefined
    });
    if (pvDailyVisible) {
      const pvDailyRect = svgRoot.querySelector('[data-role="pvDaily"]');
      if (pvDailyRect && pvDailyRect.style) {
        pvDailyRect.style.opacity = '0';
      }
    }
    syncPvDailyOverlayToRect();

    // Hide the SVG title text; keep the bg rect present (but invisible) so we can anchor the HTML overlay to it.
    updateRole('title-text', '', { visible: false });
    const titleBgRect = svgRoot.querySelector('[data-role="title-bg"]');
    if (titleBgRect && titleBgRect.style) {
      titleBgRect.style.opacity = '0';
    }
    syncTitleOverlayToRect();

    // Always run overlay sync once so switching modes hides/shows properly.
    syncTitleOverlayToRect();
    syncPvDailyOverlayToRect();

    if (!this.card._titleLayoutSyncScheduled) {
      this.card._titleLayoutSyncScheduled = true;
      requestAnimationFrame(() => {
        syncTitleOverlayToRect();
        syncPvDailyOverlayToRect();
        this.card._titleLayoutSyncScheduled = false;
      });
      if (document.fonts && typeof document.fonts.ready === 'object' && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(() => {
          syncTitleOverlayToRect();
          syncPvDailyOverlayToRect();
        }).catch(() => {
          // ignore
        });
      }
    }
    const dailyVisible = Boolean(viewState.daily && viewState.daily.visible);
    updateRole('daily-label', viewState.daily ? viewState.daily.label : '', {
      visible: dailyVisible,
      fontSize: viewState.daily ? viewState.daily.labelSize : undefined
    });
    updateRole('daily-value', viewState.daily ? viewState.daily.value : '', {
      visible: dailyVisible,
      fontSize: viewState.daily ? viewState.daily.valueSize : undefined
    });

    // PV lines
    updateIndexedRoles('pv-line', viewState.pv ? viewState.pv.lines : [], {
      fontSize: viewState.pv ? viewState.pv.fontSize : undefined
    });

    // PV Total (Array 1 + Array 2 combined, direct binding)
    updateRole('pv-total', viewState.pvTotal ? viewState.pvTotal.text : '', {
      visible: Boolean(viewState.pvTotal && viewState.pvTotal.visible),
      fill: viewState.pvTotal ? viewState.pvTotal.fill : undefined,
      fontSize: viewState.pvTotal ? viewState.pvTotal.fontSize : undefined
    });

    // PV Array 1 total (direct binding)
    updateRole('pv1-total', viewState.pv1Total ? viewState.pv1Total.text : '', {
      visible: Boolean(viewState.pv1Total && viewState.pv1Total.visible),
      fill: viewState.pv1Total ? viewState.pv1Total.fill : undefined,
      fontSize: viewState.pv1Total ? viewState.pv1Total.fontSize : undefined
    });

    // Resource-friendly text edge/outline effect.
    // Implemented as a black stroke on the face text (no clone layers, no filters).
    // Applies to all text nodes by default; opt out per node with data-feature="noborder".
    const applyTextEdgeToTextNode = (textNode, extrusionKey, options = {}) => {
      if (!textNode || !textNode.parentNode) return;
      const parent = textNode.parentNode;

      const key = (extrusionKey === null || extrusionKey === undefined) ? '' : String(extrusionKey);
      if (!key) return;

      // If a previous version created an extrusion group, remove it (outline-only mode).
      const group = parent.querySelector(`:scope > g[data-advanced-extrusion-for="${key}"]`);
      if (group && group.parentNode) {
        group.parentNode.removeChild(group);
      }

      const fontSize = (() => {
        const raw = textNode.getAttribute('font-size');
        const parsed = raw !== null ? Number(raw) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
        const fallback = Number(options.fontSize);
        return (Number.isFinite(fallback) && fallback > 0) ? fallback : 16;
      })();

      const strokeColor = (typeof options.strokeColor === 'string' && options.strokeColor.trim()) ? options.strokeColor.trim() : '#000';
      const strokeOpacity = Number.isFinite(Number(options.strokeOpacity)) ? Number(options.strokeOpacity) : 1;
      const strokeWidth = Number.isFinite(Number(options.strokeWidth))
        ? Number(options.strokeWidth)
        : Math.min(2.4, Math.max(0.8, fontSize * 0.12));

      const applyEdge = (node) => {
        if (!node) return;
        try {
          node.setAttribute('data-advanced-text-edge', '1');
          node.setAttribute('paint-order', 'stroke fill');
          node.setAttribute('stroke', strokeColor);
          node.setAttribute('stroke-opacity', String(strokeOpacity));
          node.setAttribute('stroke-width', String(strokeWidth));
          node.setAttribute('stroke-linejoin', 'round');
          node.setAttribute('stroke-miterlimit', '2');
        } catch (e) {
          // ignore
        }
        try {
          if (node.style) {
            node.style.paintOrder = 'stroke fill';
            if (typeof node.style.setProperty === 'function') {
              node.style.setProperty('paint-order', 'stroke fill', 'important');
              node.style.setProperty('stroke', strokeColor, 'important');
              node.style.setProperty('stroke-opacity', String(strokeOpacity), 'important');
              node.style.setProperty('stroke-width', String(strokeWidth), 'important');
              node.style.setProperty('stroke-linejoin', 'round', 'important');
              node.style.setProperty('stroke-miterlimit', '2', 'important');
            } else {
              node.style.stroke = strokeColor;
              node.style.strokeOpacity = String(strokeOpacity);
              node.style.strokeWidth = String(strokeWidth);
              node.style.strokeLinejoin = 'round';
              node.style.strokeMiterlimit = '2';
            }
          }
        } catch (e) {
          // ignore
        }
      };

      // Apply to the host text node.
      applyEdge(textNode);

      // Also apply to child tspans: Inkscape often writes per-tspan stroke/stroke-width in inline style,
      // which overrides the host <text> stroke-width and makes the outline appear "missing".
      try {
        const tag = (textNode.tagName || '').toLowerCase();
        if (tag === 'text' && typeof textNode.querySelectorAll === 'function') {
          const tspans = textNode.querySelectorAll('tspan');
          if (tspans && tspans.length) {
            tspans.forEach((tspan) => {
              try {
                if (hasFeatureToken(tspan, 'noborder')) return;
              } catch (e) {
                // ignore
              }
              applyEdge(tspan);
            });
          }
        }
      } catch (e) {
        // ignore
      }
    };

    const applyFixedExtrusionByFeature = () => {
      // Always remove any extrusion groups (outline-only mode no longer uses them).
      const allGroups = svgRoot.querySelectorAll('g[data-advanced-extrusion-for]');
      if (allGroups && allGroups.length) {
        allGroups.forEach((group) => {
          if (group.parentNode) group.parentNode.removeChild(group);
        });
      }

      const enabledTextNodes = new Set();
      // Apply to all <text> nodes, plus any role-bearing <tspan> nodes.
      // Some custom SVGs place data-role on a <tspan> (e.g. car1-name), which previously
      // missed the outline pass.
      const textNodes = svgRoot.querySelectorAll('text');
      const roleTspans = svgRoot.querySelectorAll('tspan[data-role]');
      let autoIndex = 0;
      const applyOne = (textNode) => {
        if (!textNode) return;
        if (hasFeatureToken(textNode, 'noborder')) return;

        const role = textNode.getAttribute ? (textNode.getAttribute('data-role') || '') : '';
        const id = textNode.getAttribute ? (textNode.getAttribute('id') || '') : '';
        const key = role ? `role:${role}` : (id ? `id:${id}` : `auto:${autoIndex++}`);
        enabledTextNodes.add(textNode);
        applyTextEdgeToTextNode(textNode, key, { strokeColor: '#000' });
      };
      if (textNodes && textNodes.length) textNodes.forEach(applyOne);
      if (roleTspans && roleTspans.length) roleTspans.forEach(applyOne);

      // Cleanup any previously-applied edge styling if the feature is no longer enabled
      // (or disabled globally / opted-out via noborder).
      const previouslyApplied = svgRoot.querySelectorAll('text[data-advanced-text-edge], tspan[data-advanced-text-edge]');
      if (previouslyApplied && previouslyApplied.length) {
        previouslyApplied.forEach((textNode) => {
          if (enabledTextNodes.has(textNode)) return;
          textNode.removeAttribute('data-advanced-text-edge');
          textNode.removeAttribute('paint-order');
          textNode.removeAttribute('stroke');
          textNode.removeAttribute('stroke-opacity');
          textNode.removeAttribute('stroke-width');
          textNode.removeAttribute('stroke-linejoin');
          textNode.removeAttribute('stroke-miterlimit');
          if (textNode.style) {
            textNode.style.paintOrder = '';
            textNode.style.stroke = '';
            textNode.style.strokeOpacity = '';
            textNode.style.strokeWidth = '';
            textNode.style.strokeLinejoin = '';
            textNode.style.strokeMiterlimit = '';
          }
        });
      }
    };
    applyFixedExtrusionByFeature();

    // PV Array 2 total (direct binding)
    updateRole('pv2-total', viewState.pv2Total ? viewState.pv2Total.text : '', {
      visible: Boolean(viewState.pv2Total && viewState.pv2Total.visible),
      fill: viewState.pv2Total ? viewState.pv2Total.fill : undefined,
      fontSize: viewState.pv2Total ? viewState.pv2Total.fontSize : undefined
    });

    // PV Array 2 per-string lines
    updateIndexedRoles('pv2-line', viewState.pv2Lines || [], {
      fontSize: viewState.pv2Total ? viewState.pv2Total.fontSize : undefined
    });

    // Windmill total (direct binding)
    updateRole('windmill-power', viewState.windmillPower ? viewState.windmillPower.text : '', {
      visible: Boolean(viewState.windmillPower && viewState.windmillPower.visible),
      fill: viewState.windmillPower ? viewState.windmillPower.fill : undefined,
      fontSize: viewState.windmillPower ? viewState.windmillPower.fontSize : undefined
    });

    // Inverter 1 Temperature (direct binding)
    updateRole('inverter1-temp', viewState.inverter1Temp ? viewState.inverter1Temp.text : '', {
      visible: Boolean(viewState.inverter1Temp && viewState.inverter1Temp.visible),
      fill: viewState.inverter1Temp ? viewState.inverter1Temp.fill : undefined,
      fontSize: viewState.inverter1Temp ? viewState.inverter1Temp.fontSize : undefined
    });

    // Battery 1 Temperature (direct binding)
    updateRole('battery1-temp', viewState.battery1Temp ? viewState.battery1Temp.text : '', {
      visible: Boolean(viewState.battery1Temp && viewState.battery1Temp.visible),
      fill: viewState.battery1Temp ? viewState.battery1Temp.fill : undefined,
      fontSize: viewState.battery1Temp ? viewState.battery1Temp.fontSize : undefined
    });

    if (Array.isArray(viewState.batteryText) && viewState.batteryText.length) {
      viewState.batteryText.forEach((bat) => {
        const index = bat && Number.isFinite(bat.index) ? bat.index : null;
        if (!index) return;
        updateRole(`battery${index}-soc`, bat.socText || '', {
          visible: Boolean(bat.visible && bat.socText),
          fill: bat.socColor,
          fontSize: bat.socFontSize,
          onlyWhenConfigStyle: true
        });
        updateRole(`battery${index}-power`, bat.powerText || '', {
          visible: Boolean(bat.visible && bat.powerText),
          fill: bat.powerColor,
          fontSize: bat.powerFontSize,
          onlyWhenConfigStyle: true
        });
        updateRole(`battery${index}-time-until`, bat.timeUntilText || '', {
          visible: Boolean(bat.visible && bat.timeUntilText),
          fill: bat.timeUntilColor,
          fontSize: bat.timeUntilFontSize,
          onlyWhenConfigStyle: true
        });
        updateRole(`battery${index}-state`, bat.stateText || '', {
          visible: Boolean(bat.visible && bat.stateText),
          fill: bat.stateColor,
          fontSize: bat.stateFontSize,
          onlyWhenConfigStyle: true
        });
      });
    }

    // Combined battery text — drives data-role="battery-*" in overview-profile SVGs
    if (viewState.combinedBatteryText) {
      const cb = viewState.combinedBatteryText;
      updateRole('battery-soc', cb.socText || '', {
        visible: Boolean(cb.visible && cb.socText),
        fill: cb.socColor,
        fontSize: cb.socFontSize,
        onlyWhenConfigStyle: true
      });
      updateRole('battery-power', cb.powerText || '', {
        visible: Boolean(cb.visible && cb.powerText),
        fill: cb.powerColor,
        fontSize: cb.powerFontSize,
        onlyWhenConfigStyle: true
      });
      updateRole('battery-time-until', cb.timeUntilText || '', {
        visible: Boolean(cb.visible && cb.timeUntilText),
        fill: cb.timeUntilColor,
        fontSize: cb.timeUntilFontSize,
        onlyWhenConfigStyle: true
      });
      updateRole('battery-state', cb.stateText || '', {
        visible: Boolean(cb.visible && cb.stateText),
        fill: cb.stateColor,
        fontSize: cb.stateFontSize,
        onlyWhenConfigStyle: true
      });
      updateRole('battery-temp', cb.tempText || '', {
        visible: Boolean(cb.tempVisible),
        fill: cb.tempColor,
        fontSize: cb.tempFontSize
      });
    }

    // Load
    const hasLoadLines = Boolean(viewState.load && Array.isArray(viewState.load.lines) && viewState.load.lines.length);
    updateRole('load-power', viewState.load ? viewState.load.text : '', {
      visible: Boolean(viewState.load && !hasLoadLines),
      fill: viewState.load ? viewState.load.fill : undefined,
      fontSize: viewState.load ? viewState.load.fontSize : undefined
    });
    updateIndexedRoles('load-line', hasLoadLines ? viewState.load.lines : [], {
      fill: viewState.load ? viewState.load.fill : undefined,
      fontSize: viewState.load ? viewState.load.fontSize : undefined
    });

    // House load (SVG-embedded text)
    updateRole('house-load', viewState.houseLoad ? viewState.houseLoad.text : '', {
      visible: Boolean(viewState.houseLoad && viewState.houseLoad.visible),
      fill: viewState.houseLoad ? viewState.houseLoad.fill : undefined,
      fontSize: viewState.houseLoad ? viewState.houseLoad.fontSize : undefined,
      odometer: Boolean(viewState.houseLoad && viewState.houseLoad.odometer),
      odometerDuration: viewState.houseLoad ? viewState.houseLoad.odometerDuration : undefined
    });

    // Grid
    const showDailyGridConfig = Boolean(viewState && viewState.showDailyGrid);
    const gridCurrentYOffset = showDailyGridConfig ? 0 : GRID_CURRENT_HIDE_DAILY_OFFSET;
    applyRoleYOffset('grid-current-power-label', gridCurrentYOffset);
    applyRoleYOffset('grid-current-power', gridCurrentYOffset);
    updateRole('grid-power', viewState.grid ? viewState.grid.text : '', {
      visible: Boolean(viewState.grid),
      fill: viewState.grid ? viewState.grid.fill : undefined,
      fontSize: viewState.grid ? viewState.grid.fontSize : undefined
    });

    // Grid State (direct binding)
    updateRole('grid-state', viewState.gridState ? viewState.gridState.text : '', {
      visible: Boolean(viewState.gridState && viewState.gridState.visible),
      fill: viewState.gridState ? viewState.gridState.fill : undefined,
      fontSize: viewState.gridState ? viewState.gridState.fontSize : undefined
    });
    // Solar State (direct binding)
    updateRole('solar-state', viewState.solarState ? viewState.solarState.text : '', {
      visible: Boolean(viewState.solarState && viewState.solarState.visible),
      fill: viewState.solarState ? viewState.solarState.fill : undefined,
      fontSize: viewState.solarState ? viewState.solarState.fontSize : undefined
    });
    // Solar Forecast Today (direct binding)
    updateRole('solar-forecast-today', viewState.solarForecastToday ? viewState.solarForecastToday.text : '', {
      visible: Boolean(viewState.solarForecastToday && viewState.solarForecastToday.visible)
    });
    // Solar Forecast Tomorrow (direct binding)
    updateRole('solar-forecast-tomorrow', viewState.solarForecastTomorrow ? viewState.solarForecastTomorrow.text : '', {
      visible: Boolean(viewState.solarForecastTomorrow && viewState.solarForecastTomorrow.visible)
    });
    // Weather Icon (direct binding)
    updateIconRole('weather-icon', viewState.weatherIcon ? viewState.weatherIcon.text : '', {
      visible: Boolean(viewState.weatherIcon && viewState.weatherIcon.visible),
      fill: viewState.weatherIcon ? viewState.weatherIcon.fill : undefined,
      fontSize: viewState.weatherIcon ? viewState.weatherIcon.fontSize : undefined
    });
    // Weather Forecast (direct binding)
    updateRole('weather-forecast', viewState.weatherForecast ? viewState.weatherForecast.text : '', {
      visible: Boolean(viewState.weatherForecast && viewState.weatherForecast.visible),
      fill: viewState.weatherForecast ? viewState.weatherForecast.fill : undefined,
      fontSize: viewState.weatherForecast ? viewState.weatherForecast.fontSize : undefined
    });
    // Stats Section
    const _statsLabelSnapshots = [];
    (viewState.statsData || []).forEach((stat) => {
      updateRole(stat.role, stat.value.text, {
        visible: stat.value.visible,
        fill: stat.value.fill,
        fontSize: stat.value.fontSize
      });
      updateRole(`${stat.role}-label`, stat.label.text, {
        visible: stat.label.visible,
        fill: stat.label.fill,
        fontSize: stat.label.fontSize
      });
      _statsLabelSnapshots.push({
        role: `${stat.role}-label`,
        text: stat.label.text,
        fill: stat.label.fill,
        fontSize: stat.label.fontSize,
        visible: stat.label.visible
      });
    });
    // Re-apply stats label styles after the deferred syncLabelStylesFromBase() in
    // applyStaticTextTranslations() runs. That helper copies the value node's fill/fontSize
    // onto every paired -label node, which would otherwise overwrite the distinct label
    // color and font-size configured for stats. Scheduling our correction as a second
    // microtask guarantees it runs after syncLabelStylesFromBase.
    if (_statsLabelSnapshots.length) {
      Promise.resolve().then(() => {
        _statsLabelSnapshots.forEach(({ role, text, fill, fontSize, visible }) => {
          updateRole(role, text, { visible, fill, fontSize });
        });
      }).catch(() => {});
    }
    // Footer cards (overview.svg): no dedicated colors/sizes here - the
    // card_value_color/card_value_font_size baseline (applyBaselineConfigStyles)
    // and label-sync handle styling for both value and label nodes.
    (viewState.footerData || []).forEach((slot) => {
      updateRole(slot.role, slot.value.text, { visible: slot.value.visible });
      updateRole(`${slot.role}-label`, slot.label.text, { visible: slot.label.visible });
    });
    updateRole('grid-current-power', viewState.gridCurrentPower ? viewState.gridCurrentPower.text : '', {
      visible: Boolean(viewState.gridCurrentPower),
      fill: viewState.gridCurrentPower ? viewState.gridCurrentPower.fill : undefined,
      fontSize: viewState.gridCurrentPower ? viewState.gridCurrentPower.fontSize : undefined,
      odometer: Boolean(viewState.gridCurrentPower && viewState.gridCurrentPower.odometer),
      odometerDuration: viewState.gridCurrentPower ? viewState.gridCurrentPower.odometerDuration : undefined
    });
    const gridDailyImportVisible = Boolean(showDailyGridConfig && viewState.gridDailyImport && viewState.gridDailyImport.visible);
    updateRole('grid-daily-import', gridDailyImportVisible ? viewState.gridDailyImport.text : '', {
      visible: gridDailyImportVisible,
      fill: viewState.gridDailyImport ? viewState.gridDailyImport.fill : undefined,
      fontSize: viewState.gridDailyImport ? viewState.gridDailyImport.fontSize : undefined,
      odometer: Boolean(viewState.gridDailyImport && viewState.gridDailyImport.odometer),
      odometerDuration: viewState.gridDailyImport ? viewState.gridDailyImport.odometerDuration : undefined
    });
    const gridDailyExportVisible = Boolean(showDailyGridConfig && viewState.gridDailyExport && viewState.gridDailyExport.visible);
    updateRole('grid-daily-export', gridDailyExportVisible ? viewState.gridDailyExport.text : '', {
      visible: gridDailyExportVisible,
      fill: viewState.gridDailyExport ? viewState.gridDailyExport.fill : undefined,
      fontSize: viewState.gridDailyExport ? viewState.gridDailyExport.fontSize : undefined,
      odometer: Boolean(viewState.gridDailyExport && viewState.gridDailyExport.odometer),
      odometerDuration: viewState.gridDailyExport ? viewState.gridDailyExport.odometerDuration : undefined
    });
    updateIndexedRoles('grid-line', viewState.grid ? viewState.grid.lines : [], {
      fill: viewState.grid ? viewState.grid.fill : undefined,
      fontSize: viewState.grid ? viewState.grid.fontSize : undefined
    });
    setRoleVisibilityOnly('grid-daily-import-label', showDailyGridConfig);
    setRoleVisibilityOnly('grid-daily-export-label', showDailyGridConfig);
    setRoleVisibilityOnly('grid-daily-import', gridDailyImportVisible);
    setRoleVisibilityOnly('grid-daily-export', gridDailyExportVisible);
    setRoleVisibilityOnly('inverter1', !(viewState && viewState.gridPowerOnly));

    // Heat pump
    const heatPumpVisible = Boolean(viewState.heatPump && viewState.heatPump.visible);
    updateRole('heat-pump-power', viewState.heatPump ? viewState.heatPump.text : '', {
      visible: heatPumpVisible,
      fill: viewState.heatPump ? viewState.heatPump.fill : undefined,
      fontSize: viewState.heatPump ? viewState.heatPump.fontSize : undefined
    });
    setRoleVisibilityOnly('heat-pump-power-label', heatPumpVisible);
    setRoleVisibilityOnly('hp-power-label', heatPumpVisible);

    // Alias for custom SVGs
    updateRole('hp-power', viewState.heatPump ? viewState.heatPump.text : '', {
      visible: heatPumpVisible,
      fill: viewState.heatPump ? viewState.heatPump.fill : undefined,
      fontSize: viewState.heatPump ? viewState.heatPump.fontSize : undefined
    });

    // Hot water
    const hotWaterVisible = Boolean(viewState.hotWater && viewState.hotWater.visible);
    updateRole('hot-water-power', viewState.hotWater ? viewState.hotWater.text : '', {
      visible: hotWaterVisible,
      fill: viewState.hotWater ? viewState.hotWater.fill : undefined,
      fontSize: viewState.hotWater ? viewState.hotWater.fontSize : undefined
    });
    setRoleVisibilityOnly('hot-water-power-label', hotWaterVisible);

    // Pool
    const poolVisible = Boolean(viewState.pool && viewState.pool.visible);
    updateRole('pool-power', viewState.pool ? viewState.pool.text : '', {
      visible: poolVisible,
      fill: viewState.pool ? viewState.pool.fill : undefined,
      fontSize: viewState.pool ? viewState.pool.fontSize : undefined
    });
    setRoleVisibilityOnly('pool-power-label', poolVisible);
    setRoleOpacityOnly('base', poolVisible ? 1 : 0);
    setRoleOpacityOnly('base-nopool', poolVisible ? 0 : 1);

    // Home appliances
    const washingMachineVisible = Boolean(viewState.washingMachine && viewState.washingMachine.visible);
    updateRole('washing-machine-power', viewState.washingMachine ? viewState.washingMachine.text : '', {
      visible: washingMachineVisible,
      fill: viewState.washingMachine ? viewState.washingMachine.fill : undefined,
      fontSize: viewState.washingMachine ? viewState.washingMachine.fontSize : undefined
    });
    setRoleVisibilityOnly('washing-machine-power-label', washingMachineVisible);
    const dishwasherVisible = Boolean(viewState.dishwasher && viewState.dishwasher.visible);
    updateRole('dishwasher-power', viewState.dishwasher ? viewState.dishwasher.text : '', {
      visible: dishwasherVisible,
      fill: viewState.dishwasher ? viewState.dishwasher.fill : undefined,
      fontSize: viewState.dishwasher ? viewState.dishwasher.fontSize : undefined
    });
    setRoleVisibilityOnly('dishwasher-power-label', dishwasherVisible);
    const dryerVisible = Boolean(viewState.dryer && viewState.dryer.visible);
    updateRole('dryer-power', viewState.dryer ? viewState.dryer.text : '', {
      visible: dryerVisible,
      fill: viewState.dryer ? viewState.dryer.fill : undefined,
      fontSize: viewState.dryer ? viewState.dryer.fontSize : undefined
    });
    setRoleVisibilityOnly('dryer-power-label', dryerVisible);
    const refrigeratorVisible = Boolean(viewState.refrigerator && viewState.refrigerator.visible);
    updateRole('refrigerator-power', viewState.refrigerator ? viewState.refrigerator.text : '', {
      visible: refrigeratorVisible,
      fill: viewState.refrigerator ? viewState.refrigerator.fill : undefined,
      fontSize: viewState.refrigerator ? viewState.refrigerator.fontSize : undefined
    });
    setRoleVisibilityOnly('refrigerator-power-label', refrigeratorVisible);
    const freezerVisible = Boolean(viewState.freezer && viewState.freezer.visible);
    updateRole('freezer-power', viewState.freezer ? viewState.freezer.text : '', {
      visible: freezerVisible,
      fill: viewState.freezer ? viewState.freezer.fill : undefined,
      fontSize: viewState.freezer ? viewState.freezer.fontSize : undefined
    });
    setRoleVisibilityOnly('freezer-power-label', freezerVisible);

    // Cars
    const car1Visible = Boolean(viewState.car1 && viewState.car1.visible);
    updateRole('car1-name', viewState.car1 && viewState.car1.label ? viewState.car1.label.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.label ? viewState.car1.label.fill : undefined,
      fontSize: viewState.car1 && viewState.car1.label ? viewState.car1.label.fontSize : undefined
    });
    // car1-label elements behave like the generic `label` role: alignment
    // (left/center/right) and card_label_* styling come from each element's own
    // data-style ("config"/"config-center"/"config-right") via
    // applyBaselineConfigStyles; they are only additionally hidden when car 1
    // is not configured/visible.
    setRoleVisibilityOnly('car1-label', car1Visible);
    updateRole('car1-power', viewState.car1 && viewState.car1.power ? viewState.car1.power.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.power ? viewState.car1.power.fill : undefined,
      fontSize: viewState.car1 && viewState.car1.power ? viewState.car1.power.fontSize : undefined
    });
    const car1SocVisible = Boolean(viewState.car1 && viewState.car1.soc && viewState.car1.soc.visible);
    updateRole('car1-soc', viewState.car1 && viewState.car1.soc ? viewState.car1.soc.text : '', {
      visible: car1SocVisible,
      fill: viewState.car1 && viewState.car1.soc ? viewState.car1.soc.fill : undefined,
      fontSize: viewState.car1 && viewState.car1.soc ? viewState.car1.soc.fontSize : undefined
    });
    updateRole('car1-range', viewState.car1 && viewState.car1.range ? viewState.car1.range.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.range ? viewState.car1.range.fill : undefined
    });
    updateRole('car1-state', viewState.car1 && viewState.car1.state ? viewState.car1.state.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.state ? viewState.car1.state.fill : undefined
    });
    updateRole('car1-hvac-status', viewState.car1 && viewState.car1.hvacStatus ? viewState.car1.hvacStatus.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.hvacStatus ? viewState.car1.hvacStatus.fill : undefined
    });
    updateRole('car1-outside-temp', viewState.car1 && viewState.car1.outsideTemp ? viewState.car1.outsideTemp.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.outsideTemp ? viewState.car1.outsideTemp.fill : undefined
    });
    updateRole('car1-inside-temp', viewState.car1 && viewState.car1.insideTemp ? viewState.car1.insideTemp.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.insideTemp ? viewState.car1.insideTemp.fill : undefined
    });
    updateRole('car1-ac-temp', viewState.car1 && viewState.car1.acTemp ? viewState.car1.acTemp.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.acTemp ? viewState.car1.acTemp.fill : undefined
    });

    const car2Visible = Boolean(viewState.car2 && viewState.car2.visible);
    updateRole('car2-name', viewState.car2 && viewState.car2.label ? viewState.car2.label.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.label ? viewState.car2.label.fill : undefined,
      fontSize: viewState.car2 && viewState.car2.label ? viewState.car2.label.fontSize : undefined
    });
    // car2-label elements behave like the generic `label` role: alignment
    // (left/center/right) and card_label_* styling come from each element's own
    // data-style ("config"/"config-center"/"config-right") via
    // applyBaselineConfigStyles; they are only additionally hidden when car 2
    // is not configured/visible.
    setRoleVisibilityOnly('car2-label', car2Visible);
    updateRole('car2-power', viewState.car2 && viewState.car2.power ? viewState.car2.power.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.power ? viewState.car2.power.fill : undefined,
      fontSize: viewState.car2 && viewState.car2.power ? viewState.car2.power.fontSize : undefined
    });
    const car2SocVisible = Boolean(viewState.car2 && viewState.car2.soc && viewState.car2.soc.visible);
    updateRole('car2-soc', viewState.car2 && viewState.car2.soc ? viewState.car2.soc.text : '', {
      visible: car2SocVisible,
      fill: viewState.car2 && viewState.car2.soc ? viewState.car2.soc.fill : undefined,
      fontSize: viewState.car2 && viewState.car2.soc ? viewState.car2.soc.fontSize : undefined
    });
    updateRole('car2-range', viewState.car2 && viewState.car2.range ? viewState.car2.range.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.range ? viewState.car2.range.fill : undefined
    });
    updateRole('car2-state', viewState.car2 && viewState.car2.state ? viewState.car2.state.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.state ? viewState.car2.state.fill : undefined
    });
    updateRole('car2-hvac-status', viewState.car2 && viewState.car2.hvacStatus ? viewState.car2.hvacStatus.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.hvacStatus ? viewState.car2.hvacStatus.fill : undefined
    });
    updateRole('car2-outside-temp', viewState.car2 && viewState.car2.outsideTemp ? viewState.car2.outsideTemp.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.outsideTemp ? viewState.car2.outsideTemp.fill : undefined
    });
    updateRole('car2-inside-temp', viewState.car2 && viewState.car2.insideTemp ? viewState.car2.insideTemp.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.insideTemp ? viewState.car2.insideTemp.fill : undefined
    });
    updateRole('car2-ac-temp', viewState.car2 && viewState.car2.acTemp ? viewState.car2.acTemp.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.acTemp ? viewState.car2.acTemp.fill : undefined
    });

    // Sun/Moon arc position
    this.card._sunMoonManager._updateSunMoonPosition(viewState);
  }
}
