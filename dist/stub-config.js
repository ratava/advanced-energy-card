import { SEED_DEFAULTS } from './constants.js';

// Option A: general settings at top level; all profile-scoped settings nested in _profiles.
export const STUB_CONFIG = {
  // General settings (always at top level, never inside _profiles)
  language: 'en',
  background: '/local/community/advanced-energy-card/tech.svg',
  day_night_mode: 'day',
  night_mode: false,
  display_unit: 'kW',
  update_interval: 5,
  initial_configuration: true,
  enable_echo_alive: false,
  animation_speed_factor: 1,
  animation_style: 'dashes',
  night_animation_style: 'dashes',
  dashes_glow_intensity: 1,
  flow_stroke_width: 2,
  fluid_flow_stroke_width: 3,
  arrow_scale: 1,
  card_height_offset: '',
  sun_moon_display: 'off',
  sun_moon_arc_color: '',
  sun_moon_arc_stroke_width: '',
  sun_moon_sunrise_label: '',
  sun_moon_sunset_label: '',
  sun_moon_label_color: '',
  sun_moon_label_font_size: '',

  // Profile storage (Option A: profile-scoped settings always nested here)
  _profiles: { tech: { ...SEED_DEFAULTS.tech } },
  _profile_basis: {},
};
