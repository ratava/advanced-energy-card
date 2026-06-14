/**
 * Animation Manager
 * Owns the card's animation machinery: dashes/arrows/fluid_flow flow animation
 * (GSAP tweens, glow filters, fluid-flow overlays/masks, rAF-driven motion),
 * GSAP script loading, rAF-driven element rotation, and headlight/car-effect
 * flash animations.
 */
import { ColorUtils } from './color-utils.js';
import { FLOW_STYLE_DEFAULT, FLOW_STYLE_PATTERNS, FLOW_BASE_LOOP_RATE, FLOW_MIN_GLOW_SCALE, ARROW_SCALE_REFERENCE_STROKE_WIDTH, ARROW_BASE_SCALE, HEADLIGHT_DEBUG_LOGGING_ENABLED, HEADLIGHT_FILTERS_ENABLED, HEADLIGHT_SVG_FILTER_ID, HEADLIGHT_SVG_FILTER_URL, HEADLIGHT_SVG_FILTER_STD_DEV } from './constants.js';

export class AnimationManager {
  /**
   * @param {object} card - Reference to the AdvancedEnergyCard instance
   */
  constructor(card) {
    this.card = card;
    this.tweens = new Map();
    this.pathLengths = new Map();
    this.fluidFlowRafs = new Map();
    this.fluidFlowDebugColors = new Map();
    this.fluidFlowDebugStopLog = new Map();
    this.gsap = null;
    this.gsapLoading = null;
    this.rotateEntries = new Map();
    this.rotateAnimRaf = null;
    this.rotateAnimLastTs = null;
    this.headlightAnimations = new Map();
  }

  _applyFlowAnimationTargets(flowDurations, flowStates) {
    if (!this.card._domRefs || !this.card._domRefs.flows) {
      return;
    }

    const execute = () => {
      const flowElements = this.card._domRefs.flows;
      const seenKeys = new Set();

      Object.entries(flowDurations || {}).forEach(([flowKey, seconds]) => {
        const element = flowElements[flowKey];
        if (!element) {
          return;
        }
        seenKeys.add(flowKey);
        const state = flowStates && flowStates[flowKey] ? flowStates[flowKey] : undefined;
        this.syncFlowAnimation(flowKey, element, seconds, state);
      });

      this.tweens.forEach((entry, key) => {
        if (!seenKeys.has(key)) {
          this.killFlowEntry(entry);
          this.tweens.delete(key);
        }
      });
    };

    if (!flowDurations || Object.keys(flowDurations).length === 0) {
      execute();
      return;
    }

    this._ensureGsap()
      .then(() => execute())
      .catch((error) => {
        console.warn('Advanced Energy Card: Unable to load GSAP', error);
        execute();
      });
  }

  _positionArrowOnPath(pathElement, distance, shape, directionSign, scale = 1) {
    if (!pathElement || !shape || typeof pathElement.getPointAtLength !== 'function' || typeof pathElement.getTotalLength !== 'function') {
      return;
    }
    const length = pathElement.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) {
      return;
    }
    const wrapped = ((Number(distance) % length) + length) % length;
    const point = pathElement.getPointAtLength(wrapped);
    const ahead = pathElement.getPointAtLength(Math.min(wrapped + 2, length));
    const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * (180 / Math.PI);
    const flip = directionSign < 0 ? 180 : 0;
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    shape.setAttribute('transform', `translate(${point.x}, ${point.y}) rotate(${angle + flip}) scale(${safeScale})`);
  }

  _normalizeAnimationStyle(style) {
    const normalized = typeof style === 'string' ? style.trim().toLowerCase() : '';
    if (normalized && Object.prototype.hasOwnProperty.call(FLOW_STYLE_PATTERNS, normalized)) {
      return normalized;
    }
    return FLOW_STYLE_DEFAULT;
  }

  syncFlowAnimation(flowKey, element, seconds, flowState) {
    if (!element) {
      return;
    }

    const animationStyle = this.card._animationStyle || FLOW_STYLE_DEFAULT;
    let pattern = FLOW_STYLE_PATTERNS[animationStyle] || FLOW_STYLE_PATTERNS[FLOW_STYLE_DEFAULT];
    const useArrows = animationStyle === 'arrows';
    const arrowGroup = useArrows && this.card._domRefs && this.card._domRefs.arrows ? this.card._domRefs.arrows[flowKey] : null;
    const arrowShapes = useArrows && this.card._domRefs && this.card._domRefs.arrowShapes ? this.card._domRefs.arrowShapes[flowKey] : null;
    const dashReferenceCycle = FLOW_STYLE_PATTERNS.dashes && Number.isFinite(FLOW_STYLE_PATTERNS.dashes.cycle)
      ? FLOW_STYLE_PATTERNS.dashes.cycle
      : 32;
    const pathLength = useArrows ? this._getFlowPathLength(flowKey) : 0;
    let resolvedPathLength = pathLength;
    if (!Number.isFinite(resolvedPathLength) || resolvedPathLength <= 0) {
      resolvedPathLength = this._getFlowPathLength(flowKey);
    }
    const strokeColor = flowState && (flowState.glowColor || flowState.stroke) ? (flowState.glowColor || flowState.stroke) : '#00FFFF';
    let speedFactor = Number(this.card._animationSpeedFactor);
    if (!Number.isFinite(speedFactor)) {
      speedFactor = 1;
    }
    const speedMagnitude = Math.abs(speedFactor);
    const directionSign = speedFactor < 0 ? -1 : 1;
    // fluid_flow is visually more "sensitive" than dashed styles because the mask window
    // reads as continuous motion; scale it down so speed=1 matches the old ~0.25 feel.
    const fluidFlowSpeedScale = animationStyle === 'fluid_flow' ? 0.25 : 1;
    const baseLoopRate = this._computeFlowLoopRate(speedMagnitude * fluidFlowSpeedScale);
    let loopRate = baseLoopRate;
    if (useArrows) {
      if (Number.isFinite(resolvedPathLength) && resolvedPathLength > 0) {
        loopRate = baseLoopRate * (dashReferenceCycle / resolvedPathLength);
      } else {
        loopRate = baseLoopRate * 0.25;
      }
    }
    const baseDirection = flowState && typeof flowState.direction === 'number' && flowState.direction !== 0 ? Math.sign(flowState.direction) : 1;
    const elementDirectionMultiplier = (() => {
      // Optional SVG override:
      // - data-flow-dir="reverse" | "invert" | "-1"
      // - data-flow-direction="reverse" | ...
      // - data-flow-reverse="true"
      try {
        const raw = (
          (typeof element.getAttribute === 'function' ? element.getAttribute('data-flow-dir') : null)
          || (typeof element.getAttribute === 'function' ? element.getAttribute('data-flow-direction') : null)
          || (typeof element.getAttribute === 'function' ? element.getAttribute('data-flow-reverse') : null)
          || ''
        );
        const v = String(raw).trim().toLowerCase();
        if (!v) {
          return 1;
        }
        if (v === 'reverse' || v === 'invert' || v === 'true' || v === 'yes' || v === 'on' || v === '-1' || v === 'ccw') {
          return -1;
        }
        if (v === 'forward' || v === 'false' || v === 'no' || v === 'off' || v === '1' || v === 'cw') {
          return 1;
        }
        const n = Number(v);
        if (Number.isFinite(n) && n !== 0) {
          return n < 0 ? -1 : 1;
        }
      } catch (e) {
        // ignore
      }
      return 1;
    })();
    const effectiveDirection = baseDirection * elementDirectionMultiplier * directionSign;
    const isActive = seconds > 0;
    const isConfigStyled = (() => {
      try {
        const raw = element.getAttribute && element.getAttribute('data-style');
        return typeof raw === 'string' && raw.trim().toLowerCase() === 'config';
      } catch (e) {
        return false;
      }
    })();
    const shouldShow = isActive || isConfigStyled;
    const isForceHidden = (() => {
      try {
        const raw = element.getAttribute && element.getAttribute('data-advanced-force-hidden');
        return raw === '1' || raw === 'true';
      } catch (e) {
        return false;
      }
    })();
    const isForceHiddenByState = Boolean(flowState && flowState.forceHidden);
    if (isForceHidden || isForceHiddenByState) {
      try {
        if (typeof element.removeAttribute === 'function') {
          element.removeAttribute('data-style');
        }
      } catch (e) {
        // ignore
      }
      if (element.tagName === 'g') {
        const paths = element.querySelectorAll('path');
        paths.forEach(path => path.style.opacity = '0');
      } else if (element.style) {
        element.style.opacity = '0';
      }
      if (arrowGroup && arrowGroup.style) {
        arrowGroup.style.opacity = '0';
      }
      return;
    }
    const configuredFlowStrokeWidthPx = (() => {
      const v = Number(this.card._flowStrokeWidthPx);
      return Number.isFinite(v) ? v : null;
    })();
    const intrinsicFlowStrokeWidthPx = (() => {
      // Prefer the flow element's own stroke width (SVG attribute/CSS) so fluid_flow
      // respects per-flow widths unless a global override is set.
      try {
        const target = element && element.tagName === 'g'
          ? element.querySelector('path')
          : element;
        if (!target) {
          return null;
        }
        // Presentation attribute
        const attr = (typeof target.getAttribute === 'function') ? target.getAttribute('stroke-width') : null;
        const attrNum = attr !== null && attr !== undefined && String(attr).trim() !== '' ? Number(attr) : NaN;
        if (Number.isFinite(attrNum) && attrNum > 0) {
          return attrNum;
        }
        // Computed style
        if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
          const cs = window.getComputedStyle(target);
          const sw = cs && cs.strokeWidth ? String(cs.strokeWidth) : '';
          const parsed = sw ? parseFloat(sw) : NaN;
          if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
          }
        }
      } catch (e) {
        // ignore
      }
      return null;
    })();
    const fluidBaseWidthPx = (() => {
      const v = Number(this.card._fluidFlowStrokeWidthPx);
      if (Number.isFinite(v)) return v;
      if (configuredFlowStrokeWidthPx !== null) return configuredFlowStrokeWidthPx;
      if (intrinsicFlowStrokeWidthPx !== null) return intrinsicFlowStrokeWidthPx;
      return 5;
    })();
    // Arrow polygons are sized for ARROW_SCALE_REFERENCE_STROKE_WIDTH; grow them (never
    // shrink below 1x) so they stay visible against wider flow lines too. The user-set
    // arrow_scale (config.arrow_scale -> _arrowScaleFactor) is applied on top of that.
    const arrowScale = (() => {
      const widthPx = configuredFlowStrokeWidthPx !== null
        ? configuredFlowStrokeWidthPx
        : (intrinsicFlowStrokeWidthPx !== null ? intrinsicFlowStrokeWidthPx : ARROW_SCALE_REFERENCE_STROKE_WIDTH);
      const autoScale = Math.max(1, widthPx / ARROW_SCALE_REFERENCE_STROKE_WIDTH) * ARROW_BASE_SCALE;
      const userFactor = Number(this.card._arrowScaleFactor);
      return autoScale * (Number.isFinite(userFactor) && userFactor > 0 ? userFactor : 1);
    })();
    const fluidWidths = {
      base: fluidBaseWidthPx,
      outer: fluidBaseWidthPx - 4,
      mid: fluidBaseWidthPx,
      inner: Math.max(0.5, fluidBaseWidthPx - 2),
      mask: fluidBaseWidthPx + 3
    };
    let entry = this.tweens.get(flowKey);

    // Auto-scale dasharray/cycle so animations look the same visual size regardless of
    // the background SVG's viewBox coordinate space. tech.svg (reference) uses viewBox
    // width ≈ 677 units. Custom SVGs (e.g. 2525-wide) need proportionally larger values.
    // Paths that already have a transform (e.g. 3.78× scale) are handled automatically
    // because getScreenCTM() reflects the full chain including element transforms.
    if (pattern && animationStyle !== 'arrows') {
      try {
        const _scaleTarget = element.tagName === 'g' ? (element.querySelector('path') || element) : element;
        const _pctm = (typeof _scaleTarget.getScreenCTM === 'function') ? _scaleTarget.getScreenCTM() : null;
        if (_pctm && Number.isFinite(_pctm.a) && _pctm.a !== 0) {
          const _pScale = Math.sqrt(_pctm.a * _pctm.a + _pctm.b * _pctm.b);
          const _innerSvg = _scaleTarget.ownerSVGElement;
          const _outerSvg = _innerSvg && _innerSvg.ownerSVGElement ? _innerSvg.ownerSVGElement : null;
          if (_outerSvg) {
            const _outerCtm = (typeof _outerSvg.getScreenCTM === 'function') ? _outerSvg.getScreenCTM() : null;
            const _outerVb = _outerSvg.viewBox && _outerSvg.viewBox.baseVal;
            if (_outerCtm && _outerVb && Number.isFinite(_outerVb.width) && _outerVb.width > 0) {
              const _cssPerOuter = Math.sqrt(_outerCtm.a * _outerCtm.a + _outerCtm.b * _outerCtm.b);
              // Reference: tech.svg paths in a 677.33-wide viewBox, no element transforms
              const _refScale = _cssPerOuter * (_outerVb.width / 677.33);
              const _sf = _refScale / _pScale;
              if (Number.isFinite(_sf) && _sf > 0 && Math.abs(_sf - 1) >= 0.05) {
                const _scaledDash = String(pattern.dasharray || '').split(/[\s,]+/).map(v => {
                  const n = parseFloat(v);
                  return Number.isFinite(n) ? String(+(n * _sf).toFixed(2)) : v;
                }).join(' ');
                const _scaledCycle = Number.isFinite(Number(pattern.cycle)) ? Number(pattern.cycle) * _sf : pattern.cycle;
                pattern = Object.assign({}, pattern, { dasharray: _scaledDash, cycle: _scaledCycle });
              }
            }
          }
        }
      } catch (_e) {
        // ignore — fall back to original pattern
      }
    }

    if (entry && entry.mode !== animationStyle) {
      this.killFlowEntry(entry);
      this.tweens.delete(flowKey);
      entry = null;
    }

    const ensurePattern = () => {
      element.setAttribute('data-flow-style', animationStyle);
      const targets = element.tagName === 'g' ? element.querySelectorAll('path') : [element];
      const isFluid = animationStyle === 'fluid_flow';
      const fluidBaseColor = strokeColor;

      if (isFluid && this.card._debugFluidFlow) {
        try {
          const last = this.fluidFlowDebugColors ? this.fluidFlowDebugColors.get(flowKey) : undefined;
          if (last !== strokeColor) {
            this.fluidFlowDebugColors.set(flowKey, strokeColor);
            console.debug('Advanced Energy Card: fluid_flow color', {
              flowKey,
              strokeColor,
              flowState: flowState ? { stroke: flowState.stroke, glowColor: flowState.glowColor, active: flowState.active } : null
            });
          }
        } catch (e) {
          // ignore
        }
      }
      if (!isFluid) {
        this._removeFluidFlowOverlay(flowKey, element);
        this._removeFluidFlowMask(flowKey, element);
      }
      const overlay = isFluid ? this._ensureFluidFlowOverlay(flowKey, element) : null;
      const maskInfo = (isFluid && pattern && pattern.dasharray)
        ? this._ensureFluidFlowMask(flowKey, element, pattern.dasharray, fluidWidths.mask)
        : (isFluid ? this._ensureFluidFlowMask(flowKey, element, '12 18', fluidWidths.mask) : null);

      targets.forEach(target => {
        // Smooth corners and ends on polyline-like path segments
        target.style.strokeLinecap = 'round';
        target.style.strokeLinejoin = 'round';
        if (useArrows) {
          target.style.strokeDasharray = '';
          target.style.strokeDashoffset = '';
          target.style.strokeOpacity = '';
          if (!isFluid && configuredFlowStrokeWidthPx !== null) {
            target.style.strokeWidth = `${configuredFlowStrokeWidthPx}px`;
          }
        } else if (pattern && pattern.dasharray) {
          if (isFluid) {
            // Base "bed" (matches example's rgba(0,255,255,0.15)).
            target.style.strokeDasharray = '';
            target.style.strokeDashoffset = '';
            target.style.strokeOpacity = '0.15';
            target.style.strokeWidth = `${fluidWidths.base}px`;
          } else {
            target.style.strokeDasharray = pattern.dasharray;
            if (!target.style.strokeDashoffset) {
              target.style.strokeDashoffset = '0';
            }
            target.style.strokeOpacity = '';
            if (configuredFlowStrokeWidthPx !== null) {
              target.style.strokeWidth = `${configuredFlowStrokeWidthPx}px`;
            } else {
              target.style.strokeWidth = '';
            }
          }

          // Inkscape often uses marker-start/mid/end arrowheads which render as triangles.
          // When we're animating dashes/dots, those markers are unwanted, so strip them.
          target.removeAttribute('marker-start');
          target.removeAttribute('marker-mid');
          target.removeAttribute('marker-end');
          target.style.markerStart = '';
          target.style.markerMid = '';
          target.style.markerEnd = '';
        }
        target.style.stroke = isFluid ? fluidBaseColor : strokeColor;
      });

      if (overlay && overlay.group && overlay.paths && overlay.paths.length) {
        overlay.group.setAttribute('data-flow-style', animationStyle);
        if (maskInfo && maskInfo.maskId) {
          overlay.group.setAttribute('mask', `url(#${maskInfo.maskId})`);
        } else {
          overlay.group.removeAttribute('mask');
        }
        overlay.group.style.opacity = isActive ? '1' : '0';
        overlay.paths.forEach((path) => {
          if (!path || !path.style) {
            return;
          }
          path.style.strokeLinecap = 'round';
          path.style.strokeLinejoin = 'round';
          const layer = (typeof path.getAttribute === 'function') ? (path.getAttribute('data-fluid-layer') || '') : '';
          // "Blue → white → blue" should be the pulse itself (not a separate white dash).
          // We get that by masking 3 stacked strokes with a blurred mask window:
          // - cyan haze
          // - cyan core
          // - white core
          // The mask's blur provides the ease-in/ease-out.

          if (layer === 'outer') {
            path.style.strokeWidth = `${fluidWidths.outer}px`;
            path.style.stroke = fluidBaseColor;
            path.style.strokeOpacity = this.card._fluidFlowOuterGlowEnabled ? '0.4' : '0';
          } else if (layer === 'mid') {
            path.style.strokeWidth = `${fluidWidths.mid}px`;
            path.style.stroke = fluidBaseColor;
            path.style.strokeOpacity = '1';
          } else {
            path.style.strokeWidth = `${fluidWidths.inner}px`;
            path.style.stroke = '#ffffff';
            path.style.strokeOpacity = '1';
          }
          path.style.fill = 'none';
          // The mask provides the moving pulse window and its easing.
          // Keep all overlay strokes solid; the blurred mask blends them into a cyan→white→cyan pulse.
          path.style.strokeDasharray = '';
          path.style.strokeDashoffset = '';
          path.removeAttribute('data-fluid-white-shift');
          path.removeAttribute('data-fluid-period');
          path.removeAttribute('marker-start');
          path.removeAttribute('marker-mid');
          path.removeAttribute('marker-end');
          path.style.markerStart = '';
          path.style.markerMid = '';
          path.style.markerEnd = '';
        });
      }
    };
    ensurePattern();

    if (element.tagName === 'g') {
      const paths = element.querySelectorAll('path');
      paths.forEach(path => path.style.opacity = shouldShow ? '1' : '0');
    } else {
      element.style.opacity = shouldShow ? '1' : '0';
    }

    if (useArrows && arrowShapes && arrowShapes.length) {
      arrowShapes.forEach((shape) => {
        if (shape.getAttribute('fill') !== strokeColor) {
          shape.setAttribute('fill', strokeColor);
        }
      });
    }

    const hideArrows = () => {
      if (arrowGroup) {
        arrowGroup.style.opacity = '0';
      }
      if (useArrows && arrowShapes && arrowShapes.length) {
        arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
      }
    };

    // fluid_flow uses a dedicated rAF animator (mask dashoffset) so it keeps moving
    // even when GSAP isn't available or can't tick elements in <mask>/<defs> reliably.
    if (animationStyle !== 'fluid_flow') {
      this._stopFluidFlowRaf(flowKey);
    }

    if (!this.gsap) {
      if (entry) {
        this.killFlowEntry(entry);
        this.tweens.delete(flowKey);
      }
      this.setFlowGlow(element, strokeColor, isActive ? 0.8 : 0.25);
      if (animationStyle === 'fluid_flow') {
        const overlay = this._ensureFluidFlowOverlay(flowKey, element);
        const maskInfo = this._ensureFluidFlowMask(flowKey, element, pattern && pattern.dasharray ? pattern.dasharray : '12 18', fluidWidths.mask);
        if (overlay && overlay.group && maskInfo && maskInfo.maskId) {
          overlay.group.setAttribute('mask', `url(#${maskInfo.maskId})`);
        }
        if (overlay && overlay.group) {
          overlay.group.setAttribute('data-flow-style', animationStyle);
          overlay.group.style.opacity = isActive ? '1' : '0';
          this.setFlowGlow(overlay.group, strokeColor, isActive ? 0.8 : 0.25);
        }
        if (overlay && overlay.paths && overlay.paths.length) {
          overlay.paths.forEach((path) => {
            if (path && path.style) {
              path.style.strokeDashoffset = '0';
              path.style.opacity = isActive ? '1' : '0';
            }
          });
        }

        // Drive the mask motion ourselves.
        this._setFluidFlowRaf(flowKey, {
          active: isActive,
          maskPaths: maskInfo && maskInfo.paths ? maskInfo.paths : [],
          maskId: maskInfo && maskInfo.maskId ? maskInfo.maskId : null,
          cycle: (pattern && Number.isFinite(Number(pattern.cycle))) ? Number(pattern.cycle) : 30,
          loopRate,
          direction: effectiveDirection
        });
      }
      if (!useArrows) {
        if (element.tagName === 'g') {
          const paths = element.querySelectorAll('path');
          paths.forEach(path => path.style.strokeDashoffset = '0');
        } else {
          element.style.strokeDashoffset = '0';
        }
      }
      hideArrows();
      return;
    }

    if (!entry || entry.element !== element || entry.arrowElement !== arrowGroup) {
      if (entry) {
        this.killFlowEntry(entry);
      }

      const glowState = { value: isActive ? 0.8 : 0.25 };
      const motionState = { phase: Math.random(), distance: 0 };
      const directionState = { value: effectiveDirection };
      const newEntry = {
        flowKey,
        element,
        glowState,
        color: strokeColor,
        tween: null,
        arrowElement: arrowGroup,
        arrowShapes: useArrows && arrowShapes ? arrowShapes : [],
        directionState,
        directionTween: null,
        motionState,
        tickerCallback: null,
        pathLength: resolvedPathLength,
        direction: effectiveDirection,
        mode: animationStyle,
        overlayGroup: null,
        overlayPaths: [],
        maskId: null,
        maskPaths: [],
        dashCycle: pattern && pattern.cycle ? pattern.cycle : 24,
        speedMagnitude,
        loopRate,
        arrowSpeedPx: baseLoopRate * dashReferenceCycle,
        arrowScale,
        active: isActive
      };

      if (animationStyle === 'fluid_flow') {
        const overlay = this._ensureFluidFlowOverlay(flowKey, element);
        newEntry.overlayGroup = overlay.group;
        newEntry.overlayPaths = overlay.paths;
        if (newEntry.overlayGroup) {
          newEntry.overlayGroup.style.opacity = isActive ? '1' : '0';
        }
        const maskInfo = this._ensureFluidFlowMask(flowKey, element, pattern && pattern.dasharray ? pattern.dasharray : '12 18', fluidWidths.mask);
        newEntry.maskId = maskInfo.maskId;
        newEntry.maskPaths = maskInfo.paths;

        this._setFluidFlowRaf(flowKey, {
          active: isActive,
          maskPaths: newEntry.maskPaths,
          maskId: newEntry.maskId,
          cycle: (pattern && Number.isFinite(Number(pattern.cycle))) ? Number(pattern.cycle) : 30,
          loopRate,
          direction: effectiveDirection
        });
      }

      newEntry.tickerCallback = this._createFlowTicker(newEntry);
      if (newEntry.tickerCallback) {
        this.gsap.ticker.add(newEntry.tickerCallback);
      }

      this.setFlowGlow(element, strokeColor, glowState.value);
      if (animationStyle === 'fluid_flow' && newEntry.overlayGroup) {
        this.setFlowGlow(newEntry.overlayGroup, strokeColor, glowState.value);
      }
      if (useArrows && arrowGroup) {
        const arrowVisible = isActive && loopRate > 0;
        arrowGroup.style.opacity = arrowVisible ? '1' : '0';
        this.setFlowGlow(arrowGroup, strokeColor, glowState.value);
        if (!arrowVisible && newEntry.arrowShapes && newEntry.arrowShapes.length) {
          newEntry.arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
        }
      } else if (arrowGroup) {
        arrowGroup.style.opacity = '0';
      }

      this._updateFlowMotion(newEntry);

      const glowTween = this.gsap.to(glowState, {
        value: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        duration: 1,
        onUpdate: () => {
          this.setFlowGlow(newEntry.element, newEntry.color, glowState.value);
          if (useArrows && newEntry.arrowElement) {
            this.setFlowGlow(newEntry.arrowElement, newEntry.color, glowState.value);
          }
          if (newEntry.mode === 'fluid_flow' && newEntry.overlayGroup) {
            this.setFlowGlow(newEntry.overlayGroup, newEntry.color, glowState.value);
          }
        }
      });
      newEntry.tween = glowTween;

      this.tweens.set(flowKey, newEntry);
      entry = newEntry;
    } else {
      entry.mode = animationStyle;
      entry.arrowShapes = useArrows && arrowShapes ? arrowShapes : [];
      entry.arrowElement = arrowGroup;
      entry.pathLength = resolvedPathLength;
      entry.dashCycle = pattern && pattern.cycle ? pattern.cycle : entry.dashCycle;
      entry.speedMagnitude = speedMagnitude;
      entry.loopRate = loopRate;
      entry.arrowSpeedPx = baseLoopRate * dashReferenceCycle;
      entry.arrowScale = arrowScale;
      entry.direction = effectiveDirection;
      entry.active = isActive;
      if (animationStyle === 'fluid_flow') {
        const overlay = this._ensureFluidFlowOverlay(flowKey, element);
        entry.overlayGroup = overlay.group;
        entry.overlayPaths = overlay.paths;
        if (entry.overlayGroup) {
          entry.overlayGroup.style.opacity = isActive ? '1' : '0';
        }
        const maskInfo = this._ensureFluidFlowMask(flowKey, element, pattern && pattern.dasharray ? pattern.dasharray : '12 18', fluidWidths.mask);
        entry.maskId = maskInfo.maskId;
        entry.maskPaths = maskInfo.paths;
        if (entry.overlayGroup && entry.maskId) {
          entry.overlayGroup.setAttribute('mask', `url(#${entry.maskId})`);
        }

        this._setFluidFlowRaf(flowKey, {
          active: isActive,
          maskPaths: entry.maskPaths,
          maskId: entry.maskId,
          cycle: (pattern && Number.isFinite(Number(pattern.cycle))) ? Number(pattern.cycle) : 30,
          loopRate,
          direction: effectiveDirection
        });
      } else if (entry.overlayGroup || (entry.overlayPaths && entry.overlayPaths.length)) {
        this._removeFluidFlowOverlay(flowKey, element);
        this._removeFluidFlowMask(flowKey, element);
        entry.overlayGroup = null;
        entry.overlayPaths = [];
        entry.maskId = null;
        entry.maskPaths = [];
      }
      if (!entry.motionState) {
        entry.motionState = { phase: Math.random(), distance: 0 };
      }
      if (typeof entry.motionState.distance !== 'number' || !Number.isFinite(entry.motionState.distance)) {
        entry.motionState.distance = 0;
      }
      if (!entry.directionState) {
        entry.directionState = { value: effectiveDirection };
      }
      if (!entry.tickerCallback) {
        entry.tickerCallback = this._createFlowTicker(entry);
        if (entry.tickerCallback) {
          this.gsap.ticker.add(entry.tickerCallback);
        }
      }
      if (entry.directionTween) {
        entry.directionTween.kill();
        entry.directionTween = null;
      }
      if (entry.directionState.value !== effectiveDirection) {
        entry.directionState.value = effectiveDirection;
        this._updateFlowMotion(entry);
      }
      if (useArrows && arrowGroup) {
        const arrowVisible = isActive && loopRate > 0;
        arrowGroup.style.opacity = arrowVisible ? '1' : '0';
        if (!arrowVisible && entry.arrowShapes && entry.arrowShapes.length) {
          entry.arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
        }
      }
      this._updateFlowMotion(entry);
    }

    entry.color = strokeColor;

    if (!entry.directionState) {
      entry.directionState = { value: effectiveDirection };
    }

    if (!isActive) {
      entry.active = false;
      entry.speedMagnitude = 0;
      entry.loopRate = 0;
      if (entry.mode === 'fluid_flow') {
        this._setFluidFlowRaf(flowKey, {
          active: false,
          maskPaths: entry.maskPaths,
          maskId: entry.maskId,
          cycle: (pattern && Number.isFinite(Number(pattern.cycle))) ? Number(pattern.cycle) : 30,
          loopRate: 0,
          direction: effectiveDirection
        });
      }
      this.setFlowGlow(element, strokeColor, 0.25);
      if (entry.mode === 'fluid_flow' && entry.overlayGroup) {
        entry.overlayGroup.style.opacity = '0';
        this.setFlowGlow(entry.overlayGroup, strokeColor, 0.25);
        if (entry.overlayPaths && entry.overlayPaths.length) {
          entry.overlayPaths.forEach((path) => {
            if (path && path.style) {
              path.style.strokeDashoffset = '0';
              path.style.opacity = '0';
            }
          });
        }
      }
      if (entry.directionTween) {
        entry.directionTween.kill();
        entry.directionTween = null;
      }
      if (!useArrows) {
        if (element.tagName === 'g') {
          const paths = element.querySelectorAll('path');
          paths.forEach(path => path.style.strokeDashoffset = '0');
          paths.forEach(path => path.style.opacity = isActive ? '1' : '0');
        } else {
          element.style.strokeDashoffset = '0';
          element.style.opacity = isActive ? '1' : '0';
        }
      }
      hideArrows();
      if (entry.tween) {
        entry.tween.pause();
      }
      return;
    }

    entry.active = true;
    entry.speedMagnitude = speedMagnitude;
    entry.loopRate = loopRate;
    entry.arrowSpeedPx = baseLoopRate * dashReferenceCycle;
    entry.arrowScale = arrowScale;
    if (useArrows) {
      if (loopRate === 0) {
        hideArrows();
      } else if (arrowGroup) {
        arrowGroup.style.opacity = '1';
      }
    }
    this._updateFlowMotion(entry);

    if (entry.tween) {
      if (speedMagnitude === 0 || loopRate === 0) {
        entry.tween.pause();
      } else {
        entry.tween.timeScale(Math.max(speedMagnitude, FLOW_MIN_GLOW_SCALE));
        entry.tween.play();
      }
    }
  }

  // ----------------------------------------------------------
  // FLOW GLOW EFFECTS
  // ----------------------------------------------------------

  setFlowGlow(element, color, intensity) {
    if (!element) {
      return;
    }
    const style = typeof element.getAttribute === 'function' ? (element.getAttribute('data-flow-style') || '') : '';
    // Glow is intentionally limited to a small set of styles.
    // (This makes "dashes" truly "no glow".)
    // Note: fluid_flow has its own layered pulse; disable outer glow for it.
    const allowFluidFlowGlow = style === 'fluid_flow' && Boolean(this.card._fluidFlowOuterGlowEnabled);
    if (style !== 'dashes_glow' && !allowFluidFlowGlow) {
      if (element.style) {
        element.style.filter = '';
      }
      if (typeof element.removeAttribute === 'function') {
        element.removeAttribute('filter');
      }
      if (element.tagName === 'g') {
        const paths = element.querySelectorAll('path');
        paths.forEach((path) => {
          if (path && path.style) {
            path.style.filter = '';
          }
          if (path && typeof path.removeAttribute === 'function') {
            path.removeAttribute('filter');
          }
        });
      }
      return;
    }

    let userFactor = Number(this.card._dashGlowIntensity);
    if (!Number.isFinite(userFactor)) {
      userFactor = 1;
    }
    userFactor = Math.min(Math.max(userFactor, 0), 3);
    if (userFactor <= 0) {
      if (element.style) {
        element.style.filter = '';
      }
      if (typeof element.removeAttribute === 'function') {
        element.removeAttribute('filter');
      }
      if (element.tagName === 'g') {
        const paths = element.querySelectorAll('path');
        paths.forEach((path) => {
          if (path && path.style) {
            path.style.filter = '';
          }
          if (path && typeof path.removeAttribute === 'function') {
            path.removeAttribute('filter');
          }
        });
      }
      return;
    }

    // Perceptual tuning: too much blur can look "weaker" because it spreads light.
    // So we scale opacity more aggressively and blur more gently.
    // Keep glow "tight": vary blur only slightly with intensity.
    const blurBoost = 0.85 + 0.15 * userFactor;  // 0->0.85, 1->1.00, 3->1.30
    const opacityBoost = 0.6 + 0.7 * userFactor; // 0->0.6, 1->1.3, 3->2.7
    const clamped = Math.min(Math.max(Number(intensity) || 0, 0), 1);

    const key = typeof element.getAttribute === 'function'
      ? (element.getAttribute('data-flow-key') || element.getAttribute('data-arrow-key') || element.getAttribute('data-arrow-shape') || 'flow')
      : 'flow';

    // Prefer a real SVG filter for SVG elements. CSS drop-shadow on SVG can be unsupported
    // in some environments, and a non-supported CSS filter value can effectively suppress
    // any presentation-attribute filter.
    const svgRoot = element.ownerSVGElement || (element.tagName && element.tagName.toLowerCase && element.tagName.toLowerCase() === 'svg' ? element : null);

    const applyToTargets = (targets, applyFn) => {
      if (!targets) return;
      if (targets instanceof Array) {
        targets.forEach((t) => t && applyFn(t));
        return;
      }
      applyFn(targets);
    };

    if (svgRoot && typeof svgRoot.querySelector === 'function') {
      const defs = (() => {
        let d = svgRoot.querySelector('defs');
        if (!d) {
          d = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svgRoot.insertBefore(d, svgRoot.firstChild);
        }
        return d;
      })();

      const safeKey = String(key).replace(/[^a-z0-9_-]/gi, '_');
      const filterId = `advanced-glow-${safeKey}`;
      let filterEl = defs.querySelector(`#${CSS.escape(filterId)}`);
      if (!filterEl) {
        filterEl = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filterEl.setAttribute('id', filterId);
        // Expand filter region to avoid clipping of glow.
        filterEl.setAttribute('x', '-50%');
        filterEl.setAttribute('y', '-50%');
        filterEl.setAttribute('width', '200%');
        filterEl.setAttribute('height', '200%');
        filterEl.setAttribute('color-interpolation-filters', 'sRGB');

        const innerShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
        innerShadow.setAttribute('dx', '0');
        innerShadow.setAttribute('dy', '0');
        innerShadow.setAttribute('result', 'inner');

        const outerShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
        outerShadow.setAttribute('dx', '0');
        outerShadow.setAttribute('dy', '0');
        outerShadow.setAttribute('result', 'outer');

        filterEl.appendChild(innerShadow);
        filterEl.appendChild(outerShadow);
        defs.appendChild(filterEl);
      }

      const drops = Array.from(filterEl.querySelectorAll('feDropShadow'));
      const innerDrop = drops[0] || null;
      const outerDrop = drops[1] || null;

      const innerOpacity = Math.min((0.35 + 0.45 * clamped) * opacityBoost, 1);
      const outerOpacity = Math.min((0.2 + 0.35 * clamped) * opacityBoost, 1);
      // Tighter base radii so the glow doesn't spread as far.
      const innerStd = (1.4 + 2.6 * clamped) * blurBoost;
      const outerStd = (2.2 + 4.2 * clamped) * blurBoost;

      if (innerDrop) {
        innerDrop.setAttribute('stdDeviation', `${innerStd}`);
        innerDrop.setAttribute('flood-color', `${color || '#00FFFF'}`);
        innerDrop.setAttribute('flood-opacity', `${innerOpacity}`);
      }
      if (outerDrop) {
        outerDrop.setAttribute('stdDeviation', `${outerStd}`);
        outerDrop.setAttribute('flood-color', `${color || '#00FFFF'}`);
        outerDrop.setAttribute('flood-opacity', `${outerOpacity}`);
      }

      const applySvgFilter = (target) => {
        if (!target || typeof target.setAttribute !== 'function') return;
        // Clear CSS filter to avoid overriding the SVG filter.
        if (target.style) {
          target.style.filter = '';
        }
        target.setAttribute('filter', `url(#${filterId})`);
      };

      applySvgFilter(element);
      if (element.tagName === 'g') {
        applyToTargets(Array.from(element.querySelectorAll('path')), applySvgFilter);
      }
      return;
    }

    // Non-SVG fallback: CSS drop-shadow.
    const inner = ColorUtils.withAlpha(color, 0.35 + 0.45 * clamped);
    const outer = ColorUtils.withAlpha(color, 0.2 + 0.3 * clamped);
    const innerBlur = 10 * blurBoost;
    const outerBlur = 16 * blurBoost;
    const filterValue = `drop-shadow(0 0 ${innerBlur}px ${inner}) drop-shadow(0 0 ${outerBlur}px ${outer})`;
    if (element.style) {
      element.style.filter = filterValue;
    }
  }

  // ----------------------------------------------------------
  // FLOW CALCULATION UTILITIES
  // ----------------------------------------------------------

  _computeFlowLoopRate(magnitude) {
    if (!Number.isFinite(magnitude) || magnitude <= 0) {
      return 0;
    }
    return magnitude * FLOW_BASE_LOOP_RATE;
  }

  killFlowEntry(entry) {
    if (!entry) {
      return;
    }
    try {
      this._stopFluidFlowRaf(entry.flowKey);
    } catch (e) {
      // ignore
    }
    if (entry.mode === 'fluid_flow') {
      try {
        this._removeFluidFlowMask(entry.flowKey, entry.element);
      } catch (e) {
        // ignore
      }
    }
    if (entry.tween) {
      entry.tween.kill();
    }
    if (entry.directionTween) {
      entry.directionTween.kill();
    }
    if (entry.tickerCallback && this.gsap && this.gsap.ticker) {
      this.gsap.ticker.remove(entry.tickerCallback);
    }
    if (entry.motionState) {
      entry.motionState.phase = 0;
    }
    if (entry.overlayPaths && entry.overlayPaths.length) {
      entry.overlayPaths.forEach((path) => {
        if (path && path.style) {
          path.style.strokeDashoffset = '0';
          path.style.opacity = '0';
        }
      });
    }
    if (entry.overlayGroup) {
      try {
        entry.overlayGroup.style.opacity = '0';
      } catch (e) {
        // ignore
      }
      try {
        if (typeof entry.overlayGroup.remove === 'function') {
          entry.overlayGroup.remove();
        } else if (entry.overlayGroup.parentNode) {
          entry.overlayGroup.parentNode.removeChild(entry.overlayGroup);
        }
      } catch (e) {
        // ignore
      }
    }
    if (entry.element && entry.mode && entry.mode !== 'arrows') {
      if (entry.element.tagName === 'g') {
        const paths = entry.element.querySelectorAll('path');
        paths.forEach(path => path.style.strokeDashoffset = '0');
        paths.forEach(path => path.style.opacity = '0');
        paths.forEach(path => path.style.strokeOpacity = '');
      } else {
        entry.element.style.strokeDashoffset = '0';
        entry.element.style.opacity = '0';
        entry.element.style.strokeOpacity = '';
      }
    }
    if (entry.arrowElement) {
      entry.arrowElement.style.opacity = '0';
      entry.arrowElement.removeAttribute('transform');
    }
    if (entry.arrowShapes && entry.arrowShapes.length) {
      entry.arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
    }
    entry.speedMagnitude = 0;
    entry.loopRate = 0;
  }

  _getFlowPathLength(flowKey) {
    if (this.pathLengths && this.pathLengths.has(flowKey)) {
      return this.pathLengths.get(flowKey);
    }
    const paths = this.card._domRefs && this.card._domRefs.flows ? this.card._domRefs.flows : null;
    const element = paths ? paths[flowKey] : null;
    if (!element) {
      return 0;
    }
    let length = 0;
    const geometry = this._getFlowGeometryPaths(element);
    if (geometry && geometry.length) {
      geometry.forEach((path) => {
        try {
          length += path.getTotalLength();
        } catch (err) {
          // ignore
        }
      });
    }
    if (!this.pathLengths) {
      this.pathLengths = new Map();
    }
    this.pathLengths.set(flowKey, length);
    return length;
  }

  _updateFlowMotion(entry) {
    if (!entry || !entry.element) {
      return;
    }
    const motionState = entry.motionState;
    if (!motionState) {
      return;
    }
    const phase = Number(motionState.phase) || 0;
    if (entry.mode === 'arrows' && entry.arrowShapes && entry.arrowShapes.length) {
      const directionValue = entry.directionState && Number.isFinite(entry.directionState.value)
        ? entry.directionState.value
        : (entry.direction || 1);
      const directionSign = directionValue >= 0 ? 1 : -1;

      const baseDistance = entry.motionState && Number.isFinite(entry.motionState.distance)
        ? entry.motionState.distance
        : 0;

      const geometry = this._getFlowGeometryPaths(entry.element);
      if (!geometry || geometry.length === 0) {
        return;
      }

      // Group arrow polygons by track index so multi-path flows get arrows on each path
      const shapesByTrack = new Map();
      entry.arrowShapes.forEach((shape) => {
        const attr = shape.getAttribute('data-arrow-track');
        const trackIndex = attr ? Number(attr) : 0;
        const safeIndex = Number.isFinite(trackIndex) ? trackIndex : 0;
        if (!shapesByTrack.has(safeIndex)) {
          shapesByTrack.set(safeIndex, []);
        }
        shapesByTrack.get(safeIndex).push(shape);
      });

      geometry.forEach((path, trackIndex) => {
        const shapes = shapesByTrack.get(trackIndex) || [];
        const count = shapes.length || 0;
        if (!count) {
          return;
        }
        let pathLength = 0;
        try {
          pathLength = path.getTotalLength();
        } catch (err) {
          pathLength = 0;
        }
        if (!Number.isFinite(pathLength) || pathLength <= 0) {
          return;
        }
        shapes.forEach((shape, index) => {
          const spacing = pathLength / count;
          const distance = directionSign >= 0
            ? baseDistance + index * spacing
            : baseDistance - index * spacing;
          this._positionArrowOnPath(path, distance, shape, directionSign, entry.arrowScale);
        });
      });
    } else if (entry.mode !== 'arrows') {
      const cycle = entry.dashCycle || 24;
      const directionValue = entry.directionState && Number.isFinite(entry.directionState.value)
        ? entry.directionState.value
        : (entry.direction || 1);
      // NOTE: directionValue is already applied when advancing phase in the ticker.
      // Applying it again here cancels out direction reversal.
      const offset = -phase * cycle;
      if (entry.mode === 'fluid_flow') {
        const maskTargets = entry.maskPaths && entry.maskPaths.length ? entry.maskPaths : [];
        if (maskTargets.length) {
          maskTargets.forEach((path) => {
            if (path && path.style) {
              const shiftRaw = (typeof path.getAttribute === 'function') ? path.getAttribute('data-fluid-mask-shift') : null;
              const shift = shiftRaw !== null && shiftRaw !== undefined ? Number(shiftRaw) : 0;
              const applied = Number.isFinite(shift) ? (offset + shift * cycle) : offset;
              path.style.strokeDashoffset = `${applied}`;
            }
          });
        } else if (entry.overlayPaths && entry.overlayPaths.length) {
          // Fallback for older entries created before mask support.
          entry.overlayPaths.forEach((path) => {
            if (path && path.style) {
              path.style.strokeDashoffset = `${offset}`;
            }
          });
        }
      } else if (entry.element.tagName === 'g') {
        const paths = entry.element.querySelectorAll('path');
        paths.forEach((path) => {
          const pathDirectionMultiplier = (() => {
            try {
              const raw = (
                (typeof path.getAttribute === 'function' ? path.getAttribute('data-flow-dir') : null)
                || (typeof path.getAttribute === 'function' ? path.getAttribute('data-flow-direction') : null)
                || (typeof path.getAttribute === 'function' ? path.getAttribute('data-flow-reverse') : null)
                || ''
              );
              const v = String(raw).trim().toLowerCase();
              if (!v) {
                return 1;
              }
              if (v === 'reverse' || v === 'invert' || v === 'true' || v === 'yes' || v === 'on' || v === '-1' || v === 'ccw') {
                return -1;
              }
              if (v === 'forward' || v === 'false' || v === 'no' || v === 'off' || v === '1' || v === 'cw') {
                return 1;
              }
              const n = Number(v);
              if (Number.isFinite(n) && n !== 0) {
                return n < 0 ? -1 : 1;
              }
            } catch (e) {
              // ignore
            }
            return 1;
          })();
          const appliedOffset = pathDirectionMultiplier < 0 ? -offset : offset;
          path.style.strokeDashoffset = `${appliedOffset}`;
        });
      } else {
        entry.element.style.strokeDashoffset = `${offset}`;
      }
    }
  }

  _createFlowTicker(entry) {
    if (!this.gsap || !this.gsap.ticker) {
      return null;
    }
    // fluid_flow is animated via a dedicated rAF loop.
    if (entry && entry.mode === 'fluid_flow') {
      return null;
    }
    return (time, deltaTime) => {
      if (!entry || !entry.active) {
        return;
      }
      const directionValue = entry.directionState && Number.isFinite(entry.directionState.value)
        ? entry.directionState.value
        : (entry.direction || 0);
      if (directionValue === 0) {
        return;
      }
      if (!entry.motionState) {
        entry.motionState = { phase: 0, distance: 0 };
      }

      if (entry.mode === 'arrows') {
        const speedPx = Number(entry.arrowSpeedPx) || 0;
        const delta = deltaTime * speedPx * (directionValue >= 0 ? 1 : -1);
        if (!Number.isFinite(delta) || delta === 0) {
          return;
        }
        entry.motionState.distance = (Number(entry.motionState.distance) || 0) + delta;
        if (!Number.isFinite(entry.motionState.distance)) {
          entry.motionState.distance = 0;
        }
      } else {
        const loopRate = entry.loopRate || 0;
        if (loopRate === 0) {
          return;
        }
        const delta = deltaTime * loopRate * directionValue;
        if (!Number.isFinite(delta) || delta === 0) {
          return;
        }
        entry.motionState.phase = (Number(entry.motionState.phase) || 0) + delta;
        if (!Number.isFinite(entry.motionState.phase)) {
          entry.motionState.phase = 0;
        }
      }
      this._updateFlowMotion(entry);
    };
  }

  killAllAnimations() {
    if (!this.tweens) {
      return;
    }
    this.tweens.forEach((entry) => {
      this.killFlowEntry(entry);
    });
    this.tweens.clear();
    if (this.fluidFlowRafs && this.fluidFlowRafs.size) {
      Array.from(this.fluidFlowRafs.keys()).forEach((key) => {
        try {
          this._stopFluidFlowRaf(key);
        } catch (e) {
          // ignore
        }
      });
      this.fluidFlowRafs.clear();
    }
  }

  _stopFluidFlowRaf(flowKey) {
    if (!flowKey || !this.fluidFlowRafs) {
      return;
    }
    const key = String(flowKey);
    const state = this.fluidFlowRafs.get(key);
    if (!state) {
      return;
    }
    if (state.rafId) {
      try {
        cancelAnimationFrame(state.rafId);
      } catch (e) {
        // ignore
      }
    }

    if (this.card._debugFluidFlow) {
      try {
        console.debug('[advanced][fluid_flow] rAF stop', {
          flowKey: key,
          maskId: state.maskId || null,
          maskPaths: (state.maskPaths && state.maskPaths.length) ? state.maskPaths.length : 0
        });
      } catch (e) {
        // ignore
      }
    }
    this.fluidFlowRafs.delete(key);
  }

  _setFluidFlowRaf(flowKey, opts) {
    if (!flowKey) {
      return;
    }
    if (!this.fluidFlowRafs) {
      this.fluidFlowRafs = new Map();
    }
    const key = String(flowKey);
    const active = Boolean(opts && opts.active);
    const maskPaths = (opts && opts.maskPaths && Array.isArray(opts.maskPaths)) ? opts.maskPaths : [];
    const cycle = (opts && Number.isFinite(Number(opts.cycle))) ? Number(opts.cycle) : 30;
    const loopRate = (opts && Number.isFinite(Number(opts.loopRate))) ? Number(opts.loopRate) : 0;
    const direction = (opts && Number.isFinite(Number(opts.direction))) ? Number(opts.direction) : 0;
    const maskId = (opts && typeof opts.maskId === 'string' && opts.maskId) ? opts.maskId : null;

    if (!active || !maskPaths.length || loopRate === 0 || direction === 0) {
      if (this.card._debugFluidFlow) {
        try {
          const now = Date.now();
          const prev = this.fluidFlowDebugStopLog ? this.fluidFlowDebugStopLog.get(key) : null;
          const shouldLog = !prev || !prev.t || (now - prev.t) > 2000;
          if (shouldLog) {
            if (this.fluidFlowDebugStopLog) {
              this.fluidFlowDebugStopLog.set(key, { t: now });
            }
            console.debug('[advanced][fluid_flow] rAF not starting (conditions)', {
              flowKey: key,
              active,
              maskId,
              maskPaths: maskPaths.length,
              loopRate,
              direction
            });
          }
        } catch (e) {
          // ignore
        }
      }
      this._stopFluidFlowRaf(key);
      return;
    }

    let state = this.fluidFlowRafs.get(key);
    if (!state) {
      state = {
        rafId: null,
        lastTs: null,
        phase: Math.random(),
        maskPaths: [],
        cycle,
        loopRate,
        direction,
        maskId,
        didLogStart: false,
        didLogFirstTick: false
      };
      this.fluidFlowRafs.set(key, state);
    }

    state.maskPaths = maskPaths;
    state.cycle = cycle;
    state.loopRate = loopRate;
    state.direction = direction;
    state.maskId = maskId;

    // Clear any throttled stop log once we are actually running.
    try {
      if (this.fluidFlowDebugStopLog) {
        this.fluidFlowDebugStopLog.delete(key);
      }
    } catch (e) {
      // ignore
    }

    if (this.card._debugFluidFlow && !state.didLogStart) {
      state.didLogStart = true;
      try {
        console.debug('[advanced][fluid_flow] rAF start', {
          flowKey: key,
          gsapPresent: Boolean(this.gsap),
          maskId: state.maskId,
          maskPaths: state.maskPaths.length,
          cycle: state.cycle,
          loopRate: state.loopRate,
          direction: state.direction
        });
      } catch (e) {
        // ignore
      }
    }

    const tick = (ts) => {
      const s = this.fluidFlowRafs.get(key);
      if (!s) {
        return;
      }
      if (s.lastTs === null || s.lastTs === undefined) {
        s.lastTs = ts;
      }
      const deltaMs = Number(ts) - Number(s.lastTs);
      s.lastTs = ts;
      if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
        s.rafId = requestAnimationFrame(tick);
        return;
      }

      // Keep units consistent with the existing FLOW_BASE_LOOP_RATE (expects ms deltas).
      s.phase = (Number(s.phase) || 0) + (deltaMs * s.loopRate * (s.direction >= 0 ? 1 : -1));
      if (!Number.isFinite(s.phase)) {
        s.phase = 0;
      }
      const offset = -(s.phase * s.cycle);

      const targets = s.maskPaths || [];
      targets.forEach((path) => {
        if (!path || !path.style) {
          return;
        }
        const shiftRaw = (typeof path.getAttribute === 'function') ? path.getAttribute('data-fluid-mask-shift') : null;
        const shift = shiftRaw !== null && shiftRaw !== undefined ? Number(shiftRaw) : 0;
        const applied = Number.isFinite(shift) ? (offset + shift * s.cycle) : offset;
        path.style.strokeDashoffset = `${applied}`;
      });

      if (this.card._debugFluidFlow && !s.didLogFirstTick) {
        s.didLogFirstTick = true;
        try {
          const sample = targets && targets.length ? targets[0].style.strokeDashoffset : null;
          console.debug('[advanced][fluid_flow] rAF first tick', {
            flowKey: key,
            deltaMs,
            sampleDashoffset: sample
          });
        } catch (e) {
          // ignore
        }
      }

      s.rafId = requestAnimationFrame(tick);
    };

    if (!state.rafId) {
      state.lastTs = null;
      state.rafId = requestAnimationFrame(tick);
    }
  }

  // ----------------------------------------------------------
  // FLUID FLOW OVERLAY / MASK GEOMETRY
  // ----------------------------------------------------------

  _getFlowGeometryPaths(element) {
    if (!element) {
      return [];
    }
    if (typeof element.getTotalLength === 'function') {
      return [element];
    }
    if (element.tagName === 'g') {
      return Array.from(element.querySelectorAll('path')).filter((p) => typeof p.getTotalLength === 'function');
    }
    return [];
  }

  _ensureFluidFlowOverlay(flowKey, element) {
    if (!flowKey || !element) {
      return { group: null, paths: [] };
    }
    const ns = 'http://www.w3.org/2000/svg';
    const container = element.tagName === 'g' ? element : element.parentNode;
    if (!container || typeof container.querySelector !== 'function') {
      return { group: null, paths: [] };
    }

    const key = String(flowKey);
    const escapeFn = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (v) => v;
    let group = null;
    try {
      group = container.querySelector(`[data-fluid-flow-overlay="${escapeFn(key)}"]`);
    } catch (e) {
      group = container.querySelector(`[data-fluid-flow-overlay="${key}"]`);
    }

    if (!group) {
      group = document.createElementNS(ns, 'g');
      group.setAttribute('data-fluid-flow-overlay', key);
      group.style.pointerEvents = 'none';
      group.style.opacity = '0';

      const geometry = this._getFlowGeometryPaths(element);
      geometry.forEach((path, index) => {
        try {
          const makeClone = (layer) => {
            const clone = path.cloneNode(true);
            clone.removeAttribute('id');
            clone.removeAttribute('class');
            clone.removeAttribute('data-flow-key');
            clone.removeAttribute('data-arrow-key');
            clone.removeAttribute('data-arrow-shape');
            clone.setAttribute('data-fluid-path', String(index));
            clone.setAttribute('data-fluid-layer', layer);
            clone.setAttribute('fill', 'none');
            return clone;
          };

          // 3-layer highlight (cyan haze + cyan core + white heart)
          group.appendChild(makeClone('outer'));
          group.appendChild(makeClone('mid'));
          group.appendChild(makeClone('inner'));
        } catch (err) {
          // ignore
        }
      });

      container.appendChild(group);
    }

    return { group, paths: Array.from(group.querySelectorAll('path')) };
  }

  _removeFluidFlowOverlay(flowKey, element) {
    if (!flowKey || !element) {
      return;
    }
    const container = element.tagName === 'g' ? element : element.parentNode;
    if (!container || typeof container.querySelector !== 'function') {
      return;
    }
    const key = String(flowKey);
    const escapeFn = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (v) => v;
    let group = null;
    try {
      group = container.querySelector(`[data-fluid-flow-overlay="${escapeFn(key)}"]`);
    } catch (e) {
      group = container.querySelector(`[data-fluid-flow-overlay="${key}"]`);
    }
    if (group && typeof group.remove === 'function') {
      group.remove();
    } else if (group && group.parentNode) {
      group.parentNode.removeChild(group);
    }
  }

  _ensureFluidFlowMask(flowKey, element, dasharray, maskStrokeWidthPx) {
    if (!flowKey || !element) {
      return { maskId: null, paths: [] };
    }
    const svgRoot = element.ownerSVGElement || null;
    if (!svgRoot || typeof svgRoot.querySelector !== 'function') {
      if (this.card._debugFluidFlow) {
        try {
          console.warn('[advanced][fluid_flow] No ownerSVGElement for mask', { flowKey });
        } catch (e) {
          // ignore
        }
      }
      return { maskId: null, paths: [] };
    }
    const ns = 'http://www.w3.org/2000/svg';
    const key = String(flowKey).replace(/[^a-z0-9_-]/gi, '_');
    const escapeFn = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (v) => v;
    const defs = (() => {
      let d = svgRoot.querySelector('defs');
      if (!d) {
        d = document.createElementNS(ns, 'defs');
        svgRoot.insertBefore(d, svgRoot.firstChild);
      }
      return d;
    })();

    const filterId = `advanced-fluid-mask-blur-${key}`;
    let filterEl = null;
    try {
      filterEl = defs.querySelector(`#${escapeFn(filterId)}`);
    } catch (e) {
      filterEl = defs.querySelector(`#${filterId}`);
    }
    if (!filterEl) {
      filterEl = document.createElementNS(ns, 'filter');
      filterEl.setAttribute('id', filterId);
      filterEl.setAttribute('x', '-50%');
      filterEl.setAttribute('y', '-50%');
      filterEl.setAttribute('width', '200%');
      filterEl.setAttribute('height', '200%');
      filterEl.setAttribute('color-interpolation-filters', 'sRGB');
      const blur = document.createElementNS(ns, 'feGaussianBlur');
      // Soft edges for the pulse ("ease in/out").
      blur.setAttribute('stdDeviation', '8');
      filterEl.appendChild(blur);
      defs.appendChild(filterEl);
    }

    const maskId = `advanced-fluid-mask-${key}`;
    let maskEl = null;
    try {
      maskEl = defs.querySelector(`#${escapeFn(maskId)}`);
    } catch (e) {
      maskEl = defs.querySelector(`#${maskId}`);
    }

    const resolvedDash = dasharray || '12 18';
    const resolvedWidth = Number.isFinite(Number(maskStrokeWidthPx)) ? Number(maskStrokeWidthPx) : 8;

    // If the mask exists from an older version (single window), rebuild it to add a
    // second phase-shifted window which makes the pulse feel continuous.
    try {
      if (maskEl) {
        const geometry = this._getFlowGeometryPaths(element);
        const desired = (geometry && geometry.length) ? geometry.length * 2 : 0;
        const existing = maskEl.querySelectorAll('[data-fluid-mask-path]');
        if (desired && existing && existing.length && existing.length < desired) {
          if (typeof maskEl.remove === 'function') {
            maskEl.remove();
          } else if (maskEl.parentNode) {
            maskEl.parentNode.removeChild(maskEl);
          }
          maskEl = null;
        }
      }
    } catch (e) {
      // ignore
    }
    if (!maskEl) {
      maskEl = document.createElementNS(ns, 'mask');
      maskEl.setAttribute('id', maskId);
      maskEl.setAttribute('maskUnits', 'userSpaceOnUse');
      maskEl.setAttribute('maskContentUnits', 'userSpaceOnUse');

      const g = document.createElementNS(ns, 'g');
      g.setAttribute('data-fluid-mask-group', key);
      g.setAttribute('filter', `url(#${filterId})`);

      const geometry = this._getFlowGeometryPaths(element);
      geometry.forEach((path, index) => {
        try {
          const makeClone = (shift) => {
            const clone = path.cloneNode(true);
            clone.removeAttribute('id');
            clone.removeAttribute('class');
            clone.removeAttribute('data-flow-key');
            clone.removeAttribute('data-arrow-key');
            clone.removeAttribute('data-arrow-shape');
            clone.setAttribute('data-fluid-mask-path', String(index));
            clone.setAttribute('data-fluid-mask-shift', String(shift));
            clone.setAttribute('fill', 'none');
            clone.style.stroke = '#ffffff';
            clone.style.strokeOpacity = '1';
            clone.style.strokeWidth = `${resolvedWidth}px`;
            clone.style.strokeLinecap = 'round';
            clone.style.strokeLinejoin = 'round';
            clone.style.strokeDasharray = resolvedDash;
            clone.style.strokeDashoffset = '0';
            return clone;
          };

          // Two windows, half-cycle apart.
          g.appendChild(makeClone(0));
          g.appendChild(makeClone(0.5));
        } catch (err) {
          // ignore
        }
      });

      maskEl.appendChild(g);
      defs.appendChild(maskEl);

      if (this.card._debugFluidFlow) {
        try {
          const createdCount = maskEl.querySelectorAll('[data-fluid-mask-path]').length;
          console.debug('[advanced][fluid_flow] Created mask', {
            flowKey,
            maskId,
            filterId,
            dasharray: resolvedDash,
            maskStrokeWidthPx: resolvedWidth,
            maskPaths: createdCount
          });
        } catch (e) {
          // ignore
        }
      }
    }

    const maskPaths = Array.from(maskEl.querySelectorAll('[data-fluid-mask-path]'));
    // Keep dasharray + width in sync if config changes (mask may already exist).
    maskPaths.forEach((p) => {
      try {
        p.style.strokeDasharray = resolvedDash;
        p.style.strokeWidth = `${resolvedWidth}px`;
      } catch (e) {
        // ignore
      }
    });

    if (this.card._debugFluidFlow) {
      try {
        console.debug('[advanced][fluid_flow] Mask ready', {
          flowKey,
          maskId,
          dasharray: resolvedDash,
          maskStrokeWidthPx: resolvedWidth,
          maskPaths: maskPaths.length
        });
      } catch (e) {
        // ignore
      }
    }
    return { maskId, paths: maskPaths };
  }

  _removeFluidFlowMask(flowKey, element) {
    if (!flowKey || !element) {
      return;
    }
    const svgRoot = element.ownerSVGElement || null;
    if (!svgRoot || typeof svgRoot.querySelector !== 'function') {
      return;
    }
    const defs = svgRoot.querySelector('defs');
    if (!defs) {
      return;
    }
    const key = String(flowKey).replace(/[^a-z0-9_-]/gi, '_');
    const escapeFn = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (v) => v;
    const maskId = `advanced-fluid-mask-${key}`;
    let maskEl = null;
    try {
      maskEl = defs.querySelector(`#${escapeFn(maskId)}`);
    } catch (e) {
      maskEl = defs.querySelector(`#${maskId}`);
    }
    if (maskEl && typeof maskEl.remove === 'function') {
      maskEl.remove();
    } else if (maskEl && maskEl.parentNode) {
      maskEl.parentNode.removeChild(maskEl);
    }
    const filterId = `advanced-fluid-mask-blur-${key}`;
    let filterEl = null;
    try {
      filterEl = defs.querySelector(`#${escapeFn(filterId)}`);
    } catch (e) {
      filterEl = defs.querySelector(`#${filterId}`);
    }
    if (filterEl && typeof filterEl.remove === 'function') {
      filterEl.remove();
    } else if (filterEl && filterEl.parentNode) {
      filterEl.parentNode.removeChild(filterEl);
    }
  }

  /**
   * Precompute and cache path lengths for all flow elements.
   * @param {object} flowRefs - Map of flowKey -> SVG element (this.card._domRefs.flows)
   */
  precomputePathLengths(flowRefs) {
    if (!flowRefs) {
      return;
    }
    Object.entries(flowRefs).forEach(([key, element]) => {
      const geometry = this._getFlowGeometryPaths(element);
      if (!geometry || geometry.length === 0) {
        return;
      }
      try {
        // For multi-path flows, store the total length (used for rough normalization)
        const total = geometry.reduce((acc, path) => {
          if (path && typeof path.getTotalLength === 'function') {
            return acc + path.getTotalLength();
          }
          return acc;
        }, 0);
        this.pathLengths.set(key, total);
      } catch (err) {
        console.warn('Advanced Energy Card: unable to compute path length', key, err);
      }
    });
  }

  // ----------------------------------------------------------
  // GSAP LOADER
  // ----------------------------------------------------------

  _ensureGsap() {
    if (this.gsap) {
      return Promise.resolve(this.gsap);
    }
    if (this.gsapLoading) {
      return this.gsapLoading;
    }

    const moduleCandidates = [
      'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js?module',
      'https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js'
    ];
    // Security: Whitelist of trusted GSAP CDN sources with SRI hashes
    const scriptCandidates = [
      {
        url: 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
        integrity: 'sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt',
        crossorigin: 'anonymous'
      },
      {
        url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
        integrity: 'sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt',
        crossorigin: 'anonymous'
      }
    ];

    // Security: Validate URL against whitelist
    const isValidGsapUrl = (url) => {
      return scriptCandidates.some(candidate => candidate.url === url);
    };

    const resolveCandidate = (module) => {
      const candidate = module && (module.gsap || module.default || module);
      if (candidate && typeof candidate.to === 'function') {
        this.gsap = candidate;
        return this.gsap;
      }
      if (typeof window !== 'undefined' && window.gsap && typeof window.gsap.to === 'function') {
        this.gsap = window.gsap;
        return this.gsap;
      }
      throw new Error('Advanced Energy Card: GSAP module missing expected exports');
    };

    const ensureGlobalGsap = () => {
      if (typeof window !== 'undefined' && window.gsap && typeof window.gsap.to === 'function') {
        this.gsap = window.gsap;
        return this.gsap;
      }
      throw new Error('Advanced Energy Card: GSAP global not available after script load');
    };

    const attemptModuleLoad = (index) => {
      if (index >= moduleCandidates.length) {
        return Promise.reject(new Error('Advanced Energy Card: module imports exhausted'));
      }
      return import(moduleCandidates[index])
        .then(resolveCandidate)
        .catch((error) => {
          console.warn('Advanced Energy Card: GSAP module load failed', moduleCandidates[index], error);
          return attemptModuleLoad(index + 1);
        });
    };

    const loadScript = (candidateObj) => {
      if (typeof document === 'undefined') {
        return Promise.reject(new Error('Advanced Energy Card: document not available for GSAP script load'));
      }

      const url = candidateObj.url;

      // Security: Validate URL is in whitelist
      if (!isValidGsapUrl(url)) {
        return Promise.reject(new Error('Advanced Energy Card: GSAP script URL not in whitelist'));
      }

      const existing = document.querySelector(`script[data-advanced-gsap="${url}"]`);
      if (existing && existing.dataset.loaded === 'true') {
        try {
          return Promise.resolve(ensureGlobalGsap());
        } catch (err) {
          return Promise.reject(err);
        }
      }
      if (existing) {
        return new Promise((resolve, reject) => {
          existing.addEventListener('load', () => {
            try {
              resolve(ensureGlobalGsap());
            } catch (err) {
              reject(err);
            }
          }, { once: true });
          existing.addEventListener('error', (event) => reject(event?.error || new Error(`Advanced Energy Card: failed to load GSAP script ${url}`)), { once: true });
        });
      }

      return new Promise((resolve, reject) => {
        // Security: Create script element with validated URL and security attributes
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.dataset.advancedGsap = url;

        // Security: Add SRI and CORS attributes for CDN script integrity
        if (candidateObj.integrity) {
          script.integrity = candidateObj.integrity;
        }
        if (candidateObj.crossorigin) {
          script.crossOrigin = candidateObj.crossorigin;
        }
        script.addEventListener('load', () => {
          script.dataset.loaded = 'true';
          try {
            resolve(ensureGlobalGsap());
          } catch (err) {
            reject(err);
          }
        }, { once: true });
        script.addEventListener('error', (event) => {
          script.dataset.loaded = 'error';
          reject(event?.error || new Error(`Advanced Energy Card: failed to load GSAP script ${url}`));
        }, { once: true });
        document.head.appendChild(script);
      });
    };

    const attemptScriptLoad = (index) => {
      if (index >= scriptCandidates.length) {
        return Promise.reject(new Error('Advanced Energy Card: script fallbacks exhausted'));
      }
      return loadScript(scriptCandidates[index])
        .catch((error) => {
          console.warn('Advanced Energy Card: GSAP script load failed', scriptCandidates[index].url, error);
          return attemptScriptLoad(index + 1);
        });
    };

    this.gsapLoading = attemptScriptLoad(0)
      .catch((scriptError) => {
        console.warn('Advanced Energy Card: GSAP script load failed, attempting module import', scriptError);
        return attemptModuleLoad(0);
      })
      .catch((error) => {
        this.gsapLoading = null;
        throw error;
      });

    return this.gsapLoading;
  }

  // ----------------------------------------------------------
  // ROTATION ANIMATION
  // ----------------------------------------------------------

  _teardownRotateAnimations() {
    if (this.rotateAnimRaf) {
      try {
        cancelAnimationFrame(this.rotateAnimRaf);
      } catch (e) {
        // ignore
      }
    }
    this.rotateAnimRaf = null;
    this.rotateAnimLastTs = null;
    if (this.rotateEntries) {
      this.rotateEntries.clear();
    }
  }

  _computeRotateCenter(element) {
    if (!element) {
      return { cx: 0, cy: 0 };
    }
    const cxAttr = element.getAttribute('data-rotate-cx');
    const cyAttr = element.getAttribute('data-rotate-cy');
    const cx = cxAttr !== null ? Number(cxAttr) : NaN;
    const cy = cyAttr !== null ? Number(cyAttr) : NaN;
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      return { cx, cy };
    }
    try {
      if (typeof element.getBBox === 'function') {
        const box = element.getBBox();
        const boxCx = box.x + box.width / 2;
        const boxCy = box.y + box.height / 2;
        if (Number.isFinite(boxCx) && Number.isFinite(boxCy)) {
          return { cx: boxCx, cy: boxCy };
        }
      }
    } catch (e) {
      // getBBox can throw if element isn't renderable yet
    }
    return { cx: 0, cy: 0 };
  }

  _parseRotateSpeedDps(element) {
    if (!element) {
      return 0;
    }
    const dpsAttr = element.getAttribute('data-rotate-dps');
    const rpmAttr = element.getAttribute('data-rotate-rpm');
    const speedAttr = element.getAttribute('data-rotate-speed');
    const dps = dpsAttr !== null ? Number(dpsAttr) : NaN;
    if (Number.isFinite(dps)) {
      return dps;
    }
    const rpm = rpmAttr !== null ? Number(rpmAttr) : NaN;
    if (Number.isFinite(rpm)) {
      return rpm * 6;
    }
    const speed = speedAttr !== null ? Number(speedAttr) : NaN;
    if (Number.isFinite(speed)) {
      return speed;
    }
    // Default: 10 RPM
    return 60;
  }

  _parseRotateDirection(element) {
    if (!element) {
      return 1;
    }
    const dirAttr = element.getAttribute('data-rotate-direction') || element.getAttribute('data-rotate-dir');
    if (dirAttr === null || dirAttr === undefined) {
      return 1;
    }
    const raw = String(dirAttr).trim().toLowerCase();
    if (raw === 'ccw' || raw === '-1' || raw === 'reverse') {
      return -1;
    }
    if (raw === 'cw' || raw === '1' || raw === 'forward') {
      return 1;
    }
    const num = Number(raw);
    if (Number.isFinite(num) && num !== 0) {
      return num < 0 ? -1 : 1;
    }
    return 1;
  }

  _applyRotateAnimations() {
    if (!this.card._domRefs || !this.card._domRefs.rotateElements || this.card._domRefs.rotateElements.length === 0) {
      if (this.rotateAnimRaf) {
        this._teardownRotateAnimations();
      }
      return;
    }

    // Prune stale entries (SVG got re-rendered)
    this.rotateEntries.forEach((entry, element) => {
      if (!element || !element.isConnected) {
        this.rotateEntries.delete(element);
      }
    });

    this.card._domRefs.rotateElements.forEach((element) => {
      if (!element || !element.isConnected) {
        return;
      }
      if (!this.rotateEntries.has(element)) {
        const baseTransform = element.getAttribute('data-advanced-base-transform') !== null
          ? (element.getAttribute('data-advanced-base-transform') || '')
          : (element.getAttribute('transform') || '');
        if (element.getAttribute('data-advanced-base-transform') === null) {
          element.setAttribute('data-advanced-base-transform', baseTransform);
        }
        const initialAngle = (() => {
          const raw = element.getAttribute('data-rotate-angle');
          const num = raw !== null ? Number(raw) : 0;
          return Number.isFinite(num) ? num : 0;
        })();
        const center = this._computeRotateCenter(element);
        this.rotateEntries.set(element, {
          element,
          baseTransform,
          angle: initialAngle,
          direction: this._parseRotateDirection(element),
          baseDps: this._parseRotateSpeedDps(element),
          center
        });
      }
    });

    if (this.rotateAnimRaf) {
      return;
    }

    this.rotateAnimLastTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    const tick = (ts) => {
      this.rotateAnimRaf = requestAnimationFrame(tick);

      const now = (typeof ts === 'number' && Number.isFinite(ts))
        ? ts
        : ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());
      const last = (typeof this.rotateAnimLastTs === 'number' && Number.isFinite(this.rotateAnimLastTs))
        ? this.rotateAnimLastTs
        : now;
      let dt = (now - last) / 1000;
      if (!Number.isFinite(dt) || dt <= 0) {
        dt = 0;
      }
      // Clamp to avoid huge jumps when the tab is backgrounded.
      if (dt > 0.25) {
        dt = 0.25;
      }
      this.rotateAnimLastTs = now;

      if (!this.rotateEntries || this.rotateEntries.size === 0) {
        return;
      }

      let speedFactor = Number(this.card._rotationSpeedFactor);
      if (!Number.isFinite(speedFactor)) {
        speedFactor = 1;
      }
      if (speedFactor === 0) {
        return;
      }

      this.rotateEntries.forEach((entry, element) => {
        if (!entry || !element || !element.isConnected) {
          this.rotateEntries.delete(element);
          return;
        }
        // Skip if element is not visible
        try {
          const display = element.style.display || (typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(element).display : '');
          if (display === 'none') {
            return;
          }
        } catch (e) {
          // ignore
        }

        // Skip rotation when explicitly disabled.
        try {
          const disabled = element.getAttribute('data-advanced-rotate-disabled');
          if (disabled === '1' || disabled === 'true') {
            return;
          }
        } catch (e) {
          // ignore
        }

        const baseTransform = entry.baseTransform || '';
        const dir = entry.direction || 1;
        const baseDps = Number(entry.baseDps) || 0;
        if (!Number.isFinite(baseDps) || baseDps === 0) {
          return;
        }

        // If a sensor is provided, scale rotation with its magnitude.
        let dps = baseDps;
        const entityId = element.getAttribute('data-rotate-entity');
        if (entityId && typeof entityId === 'string' && entityId.trim()) {
          const maxValueAttr = element.getAttribute('data-rotate-max-value');
          const maxRpmAttr = element.getAttribute('data-rotate-max-rpm');
          const maxValue = maxValueAttr !== null ? Number(maxValueAttr) : NaN;
          const maxRpm = maxRpmAttr !== null ? Number(maxRpmAttr) : NaN;
          const safeMaxValue = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1000;
          const safeMaxRpm = Number.isFinite(maxRpm) && maxRpm > 0 ? maxRpm : 30;
          const value = Math.abs(this.card.getStateSafe(entityId));
          const ratio = Math.min(Math.max(value / safeMaxValue, 0), 1);
          dps = ratio * safeMaxRpm * 6;
        }

        const cx = entry.center && Number.isFinite(entry.center.cx) ? entry.center.cx : 0;
        const cy = entry.center && Number.isFinite(entry.center.cy) ? entry.center.cy : 0;
        // If center wasn't known at init (0,0), try again once it becomes measurable.
        if (cx === 0 && cy === 0) {
          const recomputed = this._computeRotateCenter(element);
          entry.center = recomputed;
        }

        const effectiveDps = dps * speedFactor * dir;
        if (!Number.isFinite(effectiveDps) || effectiveDps === 0) {
          return;
        }
        entry.angle = (Number(entry.angle) || 0) + effectiveDps * dt;
        if (!Number.isFinite(entry.angle)) {
          entry.angle = 0;
        }
        // Keep angle bounded
        entry.angle = ((entry.angle % 360) + 360) % 360;

        const base = baseTransform ? `${baseTransform} ` : '';
        const centerNow = entry.center || { cx: 0, cy: 0 };
        const rotateCx = Number.isFinite(centerNow.cx) ? centerNow.cx : 0;
        const rotateCy = Number.isFinite(centerNow.cy) ? centerNow.cy : 0;
        element.setAttribute('transform', `${base}rotate(${entry.angle} ${rotateCx} ${rotateCy})`);
      });
    };

    this.rotateAnimRaf = requestAnimationFrame(tick);
  }

  // ----------------------------------------------------------
  // HEADLIGHT FLASH + CAR EFFECT
  // ----------------------------------------------------------

  _updateHeadlightFlash(viewState) {
    const flashState = viewState && viewState.headlightFlash;
    if (!flashState || !flashState.enabled || !this.card._domRefs) {
      this._teardownAllHeadlightAnimations();
      return;
    }

    const targets = [
      ['car1', flashState.car1],
      ['car2', flashState.car2]
    ];

    targets.forEach(([key, carState]) => {
      const shouldFlash = Boolean(carState && carState.visible && carState.charging);
      if (!shouldFlash) {
        this._teardownHeadlightFlash(key);
        return;
      }
      const nodes = this._getHeadlightElements(key);
      if (!nodes.length) {
        this._teardownHeadlightFlash(key);
        return;
      }
      this._activateHeadlightFlash(key, nodes);
    });
  }

  _getHeadlightElements(carKey) {
    if (!this.card._domRefs || !this.card._domRefs.headlights) {
      return [];
    }
    const bucket = this.card._domRefs.headlights[carKey];
    if (!bucket || !bucket.length) {
      return [];
    }
    return bucket.filter((node) => node && node.isConnected);
  }

  _getCarEffectElements(carKey) {
    if (!this.card._domRefs || !this.card._domRefs.backgroundSvg) {
      return [];
    }
    const key = (carKey || '').toLowerCase();
    if (!key) {
      return [];
    }
    const root = this.card._domRefs.backgroundSvg;
    const selector = `[data-car-effect="${key}"], [data-effect-car="${key}"]`;
    return Array.from(root.querySelectorAll(selector)).filter((node) => node && node.isConnected);
  }

  _applyCarEffectFilters(root, viewState) {
    const targetRoot = root || (this.card._domRefs ? this.card._domRefs.backgroundSvg : null);
    if (!targetRoot || typeof targetRoot.querySelectorAll !== 'function') {
      return;
    }

    const elements = Array.from(targetRoot.querySelectorAll('[data-car-effect], [data-effect-car]'));
    if (!elements.length) {
      return;
    }

    const applyGlowFilter = (element, color, key, intensity = 0.85, glowColor = 'cyan') => {
      if (!element) return;
      const clamped = Math.min(Math.max(Number(intensity) || 0, 0), 1);
      const userFactor = 1;
      const blurBoost = 0.85 + 0.15 * userFactor;
      const opacityBoost = 0.6 + 0.7 * userFactor;

      const svgRoot = element.ownerSVGElement || (
        element.tagName && element.tagName.toLowerCase && element.tagName.toLowerCase() === 'svg' ? element : null
      );

      const safeKey = String(key || 'effect').replace(/[^a-z0-9_-]/gi, '_');
      const filterId = `advanced-car-effect-${safeKey}`;

      if (svgRoot && typeof svgRoot.querySelector === 'function') {
        const defs = (() => {
          let d = svgRoot.querySelector('defs');
          if (!d) {
            d = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svgRoot.insertBefore(d, svgRoot.firstChild);
          }
          return d;
        })();

        let filterEl = defs.querySelector(`#${CSS.escape(filterId)}`);
        if (!filterEl) {
          filterEl = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
          filterEl.setAttribute('id', filterId);
          filterEl.setAttribute('x', '-30%');
          filterEl.setAttribute('y', '-30%');
          filterEl.setAttribute('width', '160%');
          filterEl.setAttribute('height', '160%');
          filterEl.setAttribute('color-interpolation-filters', 'sRGB');

          const opacityMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
          opacityMatrix.setAttribute('type', 'matrix');
          opacityMatrix.setAttribute('data-role', 'opacity');
          opacityMatrix.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.35 0');
          opacityMatrix.setAttribute('result', 'opacity');

          const brightnessContrast = document.createElementNS('http://www.w3.org/2000/svg', 'feComponentTransfer');
          brightnessContrast.setAttribute('in', 'opacity');
          brightnessContrast.setAttribute('result', 'bc');
          const r = document.createElementNS('http://www.w3.org/2000/svg', 'feFuncR');
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'feFuncG');
          const b = document.createElementNS('http://www.w3.org/2000/svg', 'feFuncB');
          r.setAttribute('type', 'linear');
          g.setAttribute('type', 'linear');
          b.setAttribute('type', 'linear');
          r.setAttribute('slope', '1.2');
          g.setAttribute('slope', '1.2');
          b.setAttribute('slope', '1.2');
          r.setAttribute('intercept', '0.05');
          g.setAttribute('intercept', '0.05');
          b.setAttribute('intercept', '0.05');
          brightnessContrast.appendChild(r);
          brightnessContrast.appendChild(g);
          brightnessContrast.appendChild(b);

          const saturate = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
          saturate.setAttribute('type', 'saturate');
          saturate.setAttribute('values', '1.3');
          saturate.setAttribute('in', 'bc');
          saturate.setAttribute('result', 'sat');

          // const hueRotate = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
          // hueRotate.setAttribute('type', 'hueRotate');
          // hueRotate.setAttribute('values', '120');
          // hueRotate.setAttribute('in', 'sat');
          // hueRotate.setAttribute('result', 'hue');

          const baseBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
          baseBlur.setAttribute('in', 'sat');
          baseBlur.setAttribute('stdDeviation', '1.2');
          baseBlur.setAttribute('result', 'b');

          const dropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
          dropShadow.setAttribute('in', 'b');
          dropShadow.setAttribute('dx', '0');
          dropShadow.setAttribute('dy', '0');
          dropShadow.setAttribute('stdDeviation', '2');
          dropShadow.setAttribute('flood-color', glowColor);
          dropShadow.setAttribute('flood-opacity', '0.6');
          dropShadow.setAttribute('result', 'shadow');

          const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
          const mergeShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
          mergeShadow.setAttribute('in', 'shadow');
          const mergeGraphic = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
          mergeGraphic.setAttribute('in', 'sat');
          merge.appendChild(mergeShadow);
          merge.appendChild(mergeGraphic);

          filterEl.appendChild(opacityMatrix);
          filterEl.appendChild(brightnessContrast);
          filterEl.appendChild(saturate);
          // filterEl.appendChild(hueRotate);
          filterEl.appendChild(baseBlur);
          filterEl.appendChild(dropShadow);
          filterEl.appendChild(merge);
          defs.appendChild(filterEl);
        }

        if (filterEl) {
          const opacityMatrixEl = filterEl.querySelector('feColorMatrix[data-role="opacity"]')
            || filterEl.querySelector('feColorMatrix[type="matrix"]');
          if (opacityMatrixEl) {
            opacityMatrixEl.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.35 0');
          }
          const dropShadowEl = filterEl.querySelector('feDropShadow');
          if (dropShadowEl) {
            dropShadowEl.setAttribute('flood-color', glowColor);
          }
        }

        if (element.style) {
          element.style.filter = '';
        }
        if (typeof element.setAttribute === 'function') {
          element.setAttribute('filter', `url(#${filterId})`);
        }
        return;
      }

      const filterValue = `brightness(1.15) contrast(1.2) saturate(1.3) drop-shadow(0 0 2px ${glowColor})`;
      if (element.style) {
        element.style.filter = filterValue;
      }
    };

    const config = this.card.config || {};
    const flashState = viewState && viewState.headlightFlash ? viewState.headlightFlash : null;
    const flashEnabled = Boolean(flashState && flashState.enabled);
    const car1Charging = Boolean(flashEnabled && flashState && flashState.car1 && flashState.car1.charging);
    const car2Charging = Boolean(flashEnabled && flashState && flashState.car2 && flashState.car2.charging);
    const defaultGlow = 0.5;
    const car1GlowPercentRaw = Number.isFinite(parseFloat(config.car1_glow_brightness))
      ? parseFloat(config.car1_glow_brightness)
      : 50;
    const car2GlowPercentRaw = Number.isFinite(parseFloat(config.car2_glow_brightness))
      ? parseFloat(config.car2_glow_brightness)
      : 50;
    const car1GlowPercent = car1GlowPercentRaw <= 1 ? car1GlowPercentRaw * 100 : car1GlowPercentRaw;
    const car2GlowPercent = car2GlowPercentRaw <= 1 ? car2GlowPercentRaw * 100 : car2GlowPercentRaw;
    const car1Glow = Math.min(Math.max(car1GlowPercent / 100, 0), 1);
    const car2Glow = Math.min(Math.max(car2GlowPercent / 100, 0), 1);

    elements.forEach((element) => {
      if (!element || typeof element.getAttribute !== 'function') return;
      const rawEffect = element.getAttribute('data-car-effect') || element.getAttribute('data-effect-car');
      const effectValue = rawEffect ? String(rawEffect).trim() : '';
      if (!effectValue) return;
      const color = effectValue;
      const effectKey = effectValue.toLowerCase();
      const glowColor = effectKey === 'car1' ? '#00F5FF' : (effectKey === 'car2' ? '#FFB000' : 'cyan');
      let intensity = defaultGlow;
      if (effectKey === 'car1') intensity = car1Glow;
      if (effectKey === 'car2') intensity = car2Glow;
      applyGlowFilter(element, color, `car-effect-${effectValue}`, intensity, glowColor);
      const isCharging = (effectKey === 'car1' && car1Charging) || (effectKey === 'car2' && car2Charging);
      if (element.style && !isCharging) {
        element.style.opacity = String(Math.min(Math.max(Number(intensity) || 0, 0), 1));
      }
      if (element.style && element.style.animation) {
        element.style.animation = '';
      }
      if (element.tagName === 'g') {
        const paths = element.querySelectorAll('path');
        paths.forEach((path) => {
          applyGlowFilter(path, color, `car-effect-${effectValue}`, intensity, glowColor);
          if (path && path.style && !isCharging) {
            path.style.opacity = String(Math.min(Math.max(Number(intensity) || 0, 0), 1));
          }
          if (path && path.style && path.style.animation) {
            path.style.animation = '';
          }
        });
      }
    });
  }

  _activateHeadlightFlash(carKey, nodes) {
    if (!nodes || !nodes.length) {
      return;
    }
    if (!this.headlightAnimations) {
      this.headlightAnimations = new Map();
    }

    const existing = this.headlightAnimations.get(carKey);
    const nodesChanged = !existing || !this._areSameHeadlightNodes(existing.nodes, nodes);
    const effectNodes = this._getCarEffectElements(carKey);
    const effectChanged = !existing || !this._areSameHeadlightNodes(existing.effectNodes || [], effectNodes);

    if (existing && !nodesChanged && !effectChanged && existing.timeline) {
      this._logHeadlightDebug(`${carKey} headlights resume`, { nodeCount: nodes.length });
      existing.timeline.play();
      return;
    }
    if (existing && !nodesChanged && !effectChanged) {
      return;
    }

    if (existing) {
      this._teardownHeadlightFlash(carKey);
    }

    const entry = { nodes: nodes.slice(), effectNodes: effectNodes.slice(), timeline: null };
    this.headlightAnimations.set(carKey, entry);
    this._logHeadlightDebug(`${carKey} headlights activate`, { nodeCount: nodes.length });

    this._ensureGsap()
      .then((gsap) => {
        const current = this.headlightAnimations.get(carKey);
        if (!gsap || !current || current !== entry) {
          return;
        }
        const useHeadlightFilters = Boolean(HEADLIGHT_FILTERS_ENABLED);
        current.nodes.forEach((node) => this._prepareHeadlightNode(node, useHeadlightFilters));
        if (current.effectNodes && current.effectNodes.length) {
          current.effectNodes.forEach((node) => this._prepareCarEffectFlashNode(node));
        }
        const initialStyles = { opacity: 0 };
        if (useHeadlightFilters) {
          initialStyles.filter = '';
          initialStyles.mixBlendMode = 'screen';
        } else {
          initialStyles.filter = '';
          initialStyles.mixBlendMode = '';
        }
        gsap.set(current.nodes, initialStyles);
        if (current.effectNodes && current.effectNodes.length) {
          gsap.set(current.effectNodes, { opacity: 0 });
        }
        const timeline = gsap.timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } });
        const brightenStep = {
          duration: 0.5,
          opacity: 1
        };
        timeline.to(current.nodes, brightenStep);
        if (current.effectNodes && current.effectNodes.length) {
          timeline.to(current.effectNodes, { duration: 0.5, opacity: 1 }, 0);
        }
        const peakHoldStep = {
          duration: 0.5
        };
        timeline.to({}, peakHoldStep);
        const dimStep = {
          duration: 0.5,
          opacity: 0
        };
        timeline.to(current.nodes, dimStep);
        if (current.effectNodes && current.effectNodes.length) {
          timeline.to(current.effectNodes, { duration: 0.5, opacity: 0 }, '<');
        }
        const idleStep = {
          duration: 0.5
        };
        timeline.to({}, idleStep);
        current.timeline = timeline;
        this._logHeadlightDebug(`${carKey} headlights timeline started`, { nodeCount: current.nodes.length });
      })
      .catch((error) => {
        console.warn('Advanced Energy Card: Unable to animate headlights', error);
        this._teardownHeadlightFlash(carKey);
      });
  }

  _prepareHeadlightNode(node, useFilters = false) {
    if (!node || !node.style) {
      return;
    }
    this._moveHeadlightNodeToOverlay(node);
    if (useFilters) {
      this._ensureHeadlightSvgFilter(node.ownerSVGElement || null);
    }
    if (node.dataset && node.dataset.advancedHeadlightOpacity === undefined) {
      node.dataset.advancedHeadlightOpacity = node.style.opacity || '';
    }
    if (node.dataset && node.dataset.advancedHeadlightFilter === undefined) {
      node.dataset.advancedHeadlightFilter = node.style.filter || '';
    }
    if (node.dataset && node.dataset.advancedHeadlightFilterAttr === undefined) {
      node.dataset.advancedHeadlightFilterAttr = node.getAttribute('filter') || '';
    }
    if (node.dataset && node.dataset.advancedHeadlightBlend === undefined) {
      node.dataset.advancedHeadlightBlend = node.style.mixBlendMode || '';
    }
    if (node.dataset && node.dataset.advancedHeadlightPointer === undefined) {
      node.dataset.advancedHeadlightPointer = node.style.pointerEvents || '';
    }
    if (node.dataset && node.dataset.advancedHeadlightWillChange === undefined) {
      node.dataset.advancedHeadlightWillChange = node.style.willChange || '';
    }
    node.style.pointerEvents = 'none';
    node.style.filter = '';
    node.style.willChange = 'opacity';
    if (useFilters) {
      try {
        node.setAttribute('filter', HEADLIGHT_SVG_FILTER_URL);
      } catch (e) {
        // ignore filter assignment errors
      }
    } else {
      try {
        node.removeAttribute('filter');
      } catch (e) {
        // ignore removal errors
      }
    }
  }

  _ensureHeadlightSvgFilter(svgElement) {
    if (!svgElement || typeof svgElement.querySelector !== 'function') {
      return null;
    }
    const escapeFn = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (v) => v;
    let filterEl = null;
    try {
      filterEl = svgElement.querySelector(`#${escapeFn(HEADLIGHT_SVG_FILTER_ID)}`);
    } catch (e) {
      filterEl = svgElement.querySelector(`#${HEADLIGHT_SVG_FILTER_ID}`);
    }
    if (filterEl) {
      return filterEl;
    }
    let defs = svgElement.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svgElement.insertBefore(defs, svgElement.firstChild);
    }
    filterEl = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filterEl.setAttribute('id', HEADLIGHT_SVG_FILTER_ID);
    filterEl.setAttribute('x', '-50%');
    filterEl.setAttribute('y', '-50%');
    filterEl.setAttribute('width', '200%');
    filterEl.setAttribute('height', '200%');
    filterEl.setAttribute('color-interpolation-filters', 'sRGB');
    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('in', 'SourceGraphic');
    blur.setAttribute('stdDeviation', String(HEADLIGHT_SVG_FILTER_STD_DEV));
    blur.setAttribute('result', 'blur');
    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const mergeBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeBlur.setAttribute('in', 'blur');
    const mergeSource = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeSource.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mergeBlur);
    merge.appendChild(mergeSource);
    filterEl.appendChild(blur);
    filterEl.appendChild(merge);
    defs.appendChild(filterEl);
    return filterEl;
  }

  _resetHeadlightNode(node) {
    if (!node || !node.style) {
      return;
    }
    if (node.dataset && node.dataset.advancedHeadlightOpacity !== undefined) {
      node.style.opacity = node.dataset.advancedHeadlightOpacity || '';
      delete node.dataset.advancedHeadlightOpacity;
    } else if (node.style.opacity) {
      node.style.opacity = '';
    }
    if (node.dataset && node.dataset.advancedHeadlightFilter !== undefined) {
      node.style.filter = node.dataset.advancedHeadlightFilter || '';
      delete node.dataset.advancedHeadlightFilter;
    } else if (node.style.filter) {
      node.style.filter = '';
    }
    if (node.dataset && node.dataset.advancedHeadlightFilterAttr !== undefined) {
      const prevAttr = node.dataset.advancedHeadlightFilterAttr;
      if (prevAttr) {
        node.setAttribute('filter', prevAttr);
      } else {
        node.removeAttribute('filter');
      }
      delete node.dataset.advancedHeadlightFilterAttr;
    } else {
      node.removeAttribute('filter');
    }
    if (node.dataset && node.dataset.advancedHeadlightBlend !== undefined) {
      node.style.mixBlendMode = node.dataset.advancedHeadlightBlend || '';
      delete node.dataset.advancedHeadlightBlend;
    } else if (node.style.mixBlendMode) {
      node.style.mixBlendMode = '';
    }
    if (node.dataset && node.dataset.advancedHeadlightPointer !== undefined) {
      node.style.pointerEvents = node.dataset.advancedHeadlightPointer || '';
      delete node.dataset.advancedHeadlightPointer;
    } else if (node.style.pointerEvents) {
      node.style.pointerEvents = '';
    }
    if (node.dataset && node.dataset.advancedHeadlightWillChange !== undefined) {
      node.style.willChange = node.dataset.advancedHeadlightWillChange || '';
      delete node.dataset.advancedHeadlightWillChange;
    } else if (node.style.willChange) {
      node.style.willChange = '';
    }
    if (this.headlightOrigins && this.headlightOrigins.has(node)) {
      const origin = this.headlightOrigins.get(node);
      try {
        if (origin && origin.parent && origin.parent.isConnected) {
          origin.parent.insertBefore(node, origin.nextSibling || null);
        }
      } catch (e) {
        // ignore reparent errors
      }
      this.headlightOrigins.delete(node);
    }
  }

  _prepareCarEffectFlashNode(node) {
    if (!node || !node.style) {
      return;
    }
    if (node.dataset && node.dataset.advancedCarEffectOpacity === undefined) {
      node.dataset.advancedCarEffectOpacity = node.style.opacity || '';
    }
    if (node.dataset && node.dataset.advancedCarEffectAnimation === undefined) {
      node.dataset.advancedCarEffectAnimation = node.style.animation || '';
    }
    if (node.dataset && node.dataset.advancedCarEffectWillChange === undefined) {
      node.dataset.advancedCarEffectWillChange = node.style.willChange || '';
    }
    node.style.willChange = 'opacity';
    node.style.animation = 'none';
  }

  _resetCarEffectFlashNode(node) {
    if (!node || !node.style) {
      return;
    }
    if (node.dataset && node.dataset.advancedCarEffectOpacity !== undefined) {
      node.style.opacity = node.dataset.advancedCarEffectOpacity || '';
      delete node.dataset.advancedCarEffectOpacity;
    } else if (node.style.opacity) {
      node.style.opacity = '';
    }
    if (node.dataset && node.dataset.advancedCarEffectAnimation !== undefined) {
      node.style.animation = node.dataset.advancedCarEffectAnimation || '';
      delete node.dataset.advancedCarEffectAnimation;
    } else if (node.style.animation) {
      node.style.animation = '';
    }
    if (node.dataset && node.dataset.advancedCarEffectWillChange !== undefined) {
      node.style.willChange = node.dataset.advancedCarEffectWillChange || '';
      delete node.dataset.advancedCarEffectWillChange;
    } else if (node.style.willChange) {
      node.style.willChange = '';
    }
  }

  _moveHeadlightNodeToOverlay(node) {
    if (!node || !node.ownerSVGElement) {
      return;
    }
    const overlay = this._ensureHeadlightOverlay(node.ownerSVGElement);
    if (!overlay || node.parentElement === overlay) {
      return;
    }
    if (!this.headlightOrigins) {
      this.headlightOrigins = new Map();
    }
    if (!this.headlightOrigins.has(node)) {
      this.headlightOrigins.set(node, { parent: node.parentElement, nextSibling: node.nextSibling });
    }
    try {
      overlay.appendChild(node);
    } catch (e) {
      // ignore append issues
    }
  }

  _ensureHeadlightOverlay(svgElement) {
    if (!svgElement || typeof document === 'undefined') {
      return null;
    }
    const existing = svgElement.__advancedHeadlightOverlay;
    if (existing && existing.isConnected) {
      return existing;
    }
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlay.setAttribute('data-role', 'car-headlight-overlay');
    overlay.style.pointerEvents = 'none';
    overlay.style.mixBlendMode = 'screen';
    try {
      svgElement.appendChild(overlay);
    } catch (e) {
      return null;
    }
    svgElement.__advancedHeadlightOverlay = overlay;
    return overlay;
  }

  _teardownHeadlightFlash(carKey) {
    if (!this.headlightAnimations || !this.headlightAnimations.size) {
      return;
    }
    const entry = this.headlightAnimations.get(carKey);
    if (!entry) {
      return;
    }
    this._logHeadlightDebug(`${carKey} headlights teardown`, { nodeCount: entry.nodes ? entry.nodes.length : 0 });
    if (entry.timeline && typeof entry.timeline.kill === 'function') {
      entry.timeline.kill();
    }
    if (entry.nodes && entry.nodes.length) {
      entry.nodes.forEach((node) => this._resetHeadlightNode(node));
    }
    if (entry.effectNodes && entry.effectNodes.length) {
      entry.effectNodes.forEach((node) => this._resetCarEffectFlashNode(node));
    }
    this.headlightAnimations.delete(carKey);
  }

  _teardownAllHeadlightAnimations() {
    if (!this.headlightAnimations || !this.headlightAnimations.size) {
      return;
    }
    Array.from(this.headlightAnimations.keys()).forEach((key) => this._teardownHeadlightFlash(key));
  }

  _areSameHeadlightNodes(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  _logHeadlightDebug(message, payload) {
    if (!HEADLIGHT_DEBUG_LOGGING_ENABLED) {
      return;
    }
    if (typeof console === 'undefined' || !console || typeof console.debug !== 'function') {
      return;
    }
    try {
      console.debug(`[Advanced][headlights] ${message}`, payload);
    } catch (e) {
      // ignore logging errors
    }
  }
}
