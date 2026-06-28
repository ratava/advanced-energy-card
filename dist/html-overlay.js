/**
 * HTML Overlay Manager
 * Renders one or more card values as HTML elements positioned over the background SVG,
 * reproducing the SVG text's perspective skew via CSS transforms.
 *
 * Spike implementation: only grid-current-power is wired up.
 * Gated behind config flag `grid_current_html_overlay: true` (default OFF).
 * When OFF the card behaves byte-for-byte as without this module.
 */
export class HtmlOverlayManager {
  constructor(card) {
    this.card = card;
  }

  /**
   * Apply the current viewState to the HTML overlay field(s).
   * Called immediately after TextBindingsManager.apply() on every render cycle.
   * @param {object} viewState
   */
  apply(viewState) {
    // Resolve flag from viewState (preferred) or fall back to live config.
    const flagOn = (viewState && viewState.gridCurrentHtmlOverlay === true)
      || (this.card.config && this.card.config.grid_current_html_overlay === true);

    const refs = this.card._domRefs;

    // --- Overlay container visibility ---
    const overlayContainer = refs && refs.htmlOverlay;
    if (overlayContainer) {
      overlayContainer.style.display = flagOn ? 'block' : 'none';
    }

    // --- Hide / restore the SVG text node ---
    // We reach into backgroundSvg rather than caching the SVG text node itself so
    // that after an SVG reload the reference is always fresh.
    try {
      const bgSvg = refs && refs.backgroundSvg;
      if (bgSvg) {
        const svgText = bgSvg.querySelector('[data-role="grid-current-power"]');
        if (svgText) {
          svgText.style.opacity = flagOn ? '0' : '';
        }
      }
    } catch (e) {
      // defensive — never throw from an apply() path
    }

    if (!flagOn) {
      return;
    }

    // --- Populate the HTML field element ---
    const fieldEl = refs && refs.gridCurrentOverlay;
    if (!fieldEl) {
      return;
    }

    const gcp = viewState && viewState.gridCurrentPower;
    if (!gcp) {
      return;
    }

    // Text content
    const text = (gcp.text != null) ? String(gcp.text) : '';
    if (fieldEl.textContent !== text) {
      fieldEl.textContent = text;
    }

    // Color
    const fill = (typeof gcp.fill === 'string' && gcp.fill) ? gcp.fill : '';
    if (fieldEl.style.color !== fill) {
      fieldEl.style.color = fill;
    }

    // Font size — viewState stores it as an SVG font-size number (px in SVG user units).
    // The SVG is 800 user units wide; it scales to fill the card width, so 1 SVG unit
    // renders as (cardWidth/800)px. We reproduce that scaling with container-query width
    // units: 1cqw = 1% of the overlay container width (= card width, see .html-overlay
    // container-type:inline-size), so (fontSize/800*100)cqw == fontSize SVG units in px.
    // Keyed off width (not height) so it stays correct even if the card is letterboxed.
    const fontSize = (gcp.fontSize != null && !isNaN(Number(gcp.fontSize)))
      ? Number(gcp.fontSize)
      : null;
    if (fontSize != null) {
      const cqw = (fontSize / 800 * 100).toFixed(4) + 'cqw';
      if (fieldEl.style.fontSize !== cqw) {
        fieldEl.style.fontSize = cqw;
      }
    }

    // Visibility — mirrors how SVG text nodes are hidden (opacity/display)
    const visible = gcp.visible !== false;
    const wantDisplay = visible ? 'inline-block' : 'none';
    if (fieldEl.style.display !== wantDisplay) {
      fieldEl.style.display = wantDisplay;
    }
  }
}
