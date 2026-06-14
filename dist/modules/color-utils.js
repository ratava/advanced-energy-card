/**
 * Color manipulation utilities
 * Provides consistent color resolution and manipulation across the card
 */
export class ColorUtils {
  /**
   * Resolve color from config with fallback
   * @param {string|null|undefined} configValue - Color value from configuration
   * @param {string} fallback - Fallback color if config value is empty
   * @returns {string} Resolved color value
   */
  static resolve(configValue, fallback) {
    const value = (configValue === null || configValue === undefined) ? '' : String(configValue).trim();
    return value || fallback;
  }

  /**
   * Convert color to rgba with specified alpha channel
   * @param {string} color - Color in any CSS format (#hex, rgb, rgba, named)
   * @param {number} alpha - Alpha value (0-1)
   * @returns {string} Color in rgba format
   */
  static withAlpha(color, alpha) {
    if (!color) {
      return `rgba(0, 255, 255, ${alpha})`;
    }

    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const fullHex = hex.length === 3
        ? hex.split('').map((c) => c + c).join('')
        : hex.padEnd(6, '0');
      const r = parseInt(fullHex.slice(0, 2), 16);
      const g = parseInt(fullHex.slice(2, 4), 16);
      const b = parseInt(fullHex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Handle rgb/rgba colors
    const match = color.match(/rgba?\(([^)]+)\)/i);
    if (match) {
      const parts = match[1].split(',').map((part) => part.trim());
      const [r, g, b] = parts;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Return as-is if format not recognized
    return color;
  }

  /**
   * Interpolate between two colors based on a percentage
   * @param {string} color1 - Starting color
   * @param {string} color2 - Ending color
   * @param {number} percent - Interpolation percentage (0-100)
   * @returns {string} Interpolated color in rgb format
   */
  static interpolate(color1, color2, percent) {
    const rgb1 = this._toRgb(color1);
    const rgb2 = this._toRgb(color2);
    const factor = Math.max(0, Math.min(100, percent)) / 100;
    
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Convert color to RGB object
   * @private
   * @param {string} color - Color in any CSS format
   * @returns {{r: number, g: number, b: number}} RGB values
   */
  static _toRgb(color) {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const fullHex = hex.length === 3
        ? hex.split('').map((c) => c + c).join('')
        : hex.padEnd(6, '0');
      return {
        r: parseInt(fullHex.slice(0, 2), 16),
        g: parseInt(fullHex.slice(2, 4), 16),
        b: parseInt(fullHex.slice(4, 6), 16)
      };
    }

    // Handle rgb/rgba colors
    const match = color.match(/rgba?\(([^)]+)\)/i);
    if (match) {
      const parts = match[1].split(',').map((part) => parseInt(part.trim(), 10));
      return { r: parts[0], g: parts[1], b: parts[2] };
    }

    // Default to cyan if format not recognized
    return { r: 0, g: 255, b: 255 };
  }
}
