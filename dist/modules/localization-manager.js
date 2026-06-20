/**
 * Localization Manager
 * Centralizes all translation strings and provides clean i18n API
 * Supports: en, it, de, fr, nl (+ extensible for more languages)
 */
export class LocalizationManager {
  constructor(language = 'en') {
    this.language = this._normalizeLanguage(language);
    this._initTranslations();
  }

  /**
   * Normalize language code to supported language
   * @param {string} lang - Language code (e.g., 'en', 'en-US', 'it-IT')
   * @returns {string} Normalized language code
   */
  _normalizeLanguage(lang) {
    if (!lang || typeof lang !== 'string') return 'en';
    const normalized = lang.toLowerCase().split('-')[0];
    const supported = ['en', 'it', 'de', 'fr', 'nl', 'es'];
    return supported.includes(normalized) ? normalized : 'en';
  }

  /**
   * Initialize all translation dictionaries
   * @private
   */
  _initTranslations() {
    this.translations = {
      // Solar/PV Labels
      daily_yield: {
        en: 'DAILY YIELD',
        it: 'PRODUZIONE OGGI',
        de: 'TAGESERTRAG',
        es: 'PRODUCCIÓN DIARIA'
      },
      exporting: {
        en: 'EXPORTING',
        it: 'ESPORTAZIONE',
        de: 'EXPORTIEREN',
        fr: 'EXPORTATION',
        nl: 'EXPORTEREN',
        es: 'EXPORTANDO'
      },
      importing: {
        en: 'IMPORTING',
        it: 'IMPORTAZIONE',
        de: 'IMPORTIEREN',
        fr: 'IMPORTATION',
        nl: 'IMPORTEREN',
        es: 'IMPORTANDO'
      },
      charging: {
        en: 'CHARGING',
        it: 'RICARICA',
        de: 'LADEN',
        fr: 'CHARGE',
        nl: 'OPLADEN',
        es: 'CARGANDO'
      },
      discharging: {
        en: 'DISCHARGING',
        it: 'SCARICA',
        de: 'ENTLADEN',
        fr: 'DÉCHARGE',
        nl: 'ONTLADEN',
        es: 'DESCARGANDO'
      },
      standby: {
        en: 'STANDBY',
        it: 'STANDBY',
        de: 'BEREITSCHAFT',
        fr: 'VEILLE',
        nl: 'STANDBY',
        es: 'ESPERA'
      },

      // Grid Labels
      grid_current_power: {
        en: 'Current Grid Power:',
        it: 'Potenza di rete corrente:',
        de: 'Aktuelle Netzleistung:',
        fr: 'Puissance réseau actuelle :',
        nl: 'Huidig netvermogen:',
        es: 'Potencia de Red Actual:'
      },
      grid_daily_export: {
        en: 'Daily Grid Export:',
        it: 'Export rete giornaliero:',
        de: 'Netzexport (Tag):',
        fr: 'Export réseau (jour) :',
        nl: 'Net-export (dag):',
        es: 'Exportación Diaria de Red:'
      },
      grid_daily_import: {
        en: 'Daily Grid Import:',
        it: 'Import rete giornaliero:',
        de: 'Netzimport (Tag):',
        fr: 'Import réseau (jour) :',
        nl: 'Net-import (dag):',
        es: 'Importación Diaria de Red:'
      },

      // House & Appliances
      house_load: {
        en: 'House:',
        it: 'Casa:',
        de: 'Haus:',
        fr: 'Maison :',
        nl: 'Huis:',
        es: 'Casa:'
      },
      washing_machine: {
        en: 'Washer:',
        it: 'Lavatrice:',
        de: 'Waschmaschine:',
        fr: 'Lave-linge :',
        nl: 'Wasmachine:',
        es: 'Lavadora:'
      },
      dishwasher: {
        en: 'Dishwasher:',
        es: 'Lavavajillas:'
      },
      dryer: {
        en: 'Dryer:',
        it: 'Asciugatrice:',
        de: 'Trockner:',
        fr: 'Sèche-linge :',
        nl: 'Droger:',
        es: 'Secadora:'
      },
      refrigerator: {
        en: 'Fridge:',
        it: 'Frigo:',
        de: 'Kühlschrank:',
        fr: 'Réfrigérateur :',
        nl: 'Koelkast:',
        es: 'Nevera:'
      },
      heat_pump: {
        en: 'Heat Pump/AC:',
        it: 'Pompa di calore/Clima:',
        de: 'Wärmepumpe/Klima:',
        fr: 'PAC/Clim :',
        nl: 'Warmtepomp/AC:',
        es: 'Bomba de Calor/AC:'
      },
      hot_water: {
        en: 'Hot Water:',
        es: 'Agua Caliente:'
      },
      pool: {
        en: 'Pool:',
        it: 'Piscina:',
        de: 'Pool:',
        fr: 'Piscine :',
        nl: 'Zwembad:',
        es: 'Piscina:'
      },

      // Popup Full Labels (for popup overlays)
      washing_machine_full: {
        en: 'Washing Machine',
        it: 'Lavatrice',
        de: 'Waschmaschine',
        fr: 'Lave-linge',
        nl: 'Wasmachine',
        es: 'Lavadora'
      },
      dishwasher_full: {
        en: 'Dish Washer',
        it: 'Lavastoviglie',
        de: 'Geschirrspüler',
        fr: 'Lave-vaisselle',
        nl: 'Vaatwasser',
        es: 'Lavavajillas'
      },
      dryer_full: {
        en: 'Dryer',
        it: 'Asciugatrice',
        de: 'Trockner',
        fr: 'Sèche-linge',
        nl: 'Droger',
        es: 'Secadora'
      },
      refrigerator_full: {
        en: 'Refrigerator',
        it: 'Frigorifero',
        de: 'Kühlschrank',
        fr: 'Réfrigérateur',
        nl: 'Koelkast',
        es: 'Refrigerador'
      },
      heat_pump_full: {
        en: 'Heat Pump/AC',
        it: 'Pompa di calore/Clima',
        de: 'Wärmepumpe/Klima',
        fr: 'PAC/Clim',
        nl: 'Warmtepomp/AC',
        es: 'Bomba de Calor/AC'
      },
      pool_full: {
        en: 'Pool',
        it: 'Piscina',
        de: 'Pool',
        fr: 'Piscine',
        nl: 'Zwembad',
        es: 'Piscina'
      },
      freezer_full: {
        en: 'Freezer',
        it: 'Congelatore',
        de: 'Gefrierschrank',
        fr: 'Congélateur',
        nl: 'Vriezer',
        es: 'Congelador'
      },

      // Car Popup Labels
      car_power_full: {
        en: 'Power',
        it: 'Potenza',
        de: 'Leistung',
        fr: 'Puissance',
        nl: 'Vermogen',
        es: 'Potencia'
      },
      car_soc_full: {
        en: 'Battery Level',
        it: 'Livello Batteria',
        de: 'Akkustand',
        fr: 'Niveau de Batterie',
        nl: 'Batterijniveau',
        es: 'Nivel de Bateria'
      },
      car_range_full: {
        en: 'Range',
        it: 'Autonomia',
        de: 'Reichweite',
        fr: 'Autonomie',
        nl: 'Bereik',
        es: 'Autonomia'
      },
      car_charging_state_full: {
        en: 'Charging State',
        it: 'Stato di Ricarica',
        de: 'Ladestatus',
        fr: 'Etat de Charge',
        nl: 'Laadstatus',
        es: 'Estado de Carga'
      },
      car_hvac_status_full: {
        en: 'HVAC Status',
        it: 'Stato HVAC',
        de: 'Klimastatus',
        fr: 'Etat HVAC',
        nl: 'HVAC-status',
        es: 'Estado HVAC'
      },
      car_outside_temp_full: {
        en: 'Outside Temperature',
        it: 'Temperatura Esterna',
        de: 'Aussentemperatur',
        fr: 'Temperature Exterieure',
        nl: 'Buitentemperatuur',
        es: 'Temperatura Exterior'
      },
      car_inside_temp_full: {
        en: 'Inside Temperature',
        it: 'Temperatura Interna',
        de: 'Innentemperatur',
        fr: 'Temperature Interieure',
        nl: 'Binnentemperatuur',
        es: 'Temperatura Interior'
      },
      car_ac_temp_full: {
        en: 'AC Temperature',
        it: 'Temperatura AC',
        de: 'AC-Temperatur',
        fr: 'Temperature Climatisation',
        nl: 'AC-temperatuur',
        es: 'Temperatura AC'
      },
      climate_full: {
        en: 'Climate Control',
        it: 'Climatizzazione',
        de: 'Klimasteuerung',
        fr: 'Controle Climatisation',
        nl: 'Klimaatbediening',
        es: 'Control Climatico'
      },
      hvac_mode_off: {
        en: 'Off',
        it: 'Spento',
        de: 'Aus',
        fr: 'Arret',
        nl: 'Uit',
        es: 'Apagado'
      },
      hvac_mode_heat: {
        en: 'Heat',
        it: 'Riscalda',
        de: 'Heizen',
        fr: 'Chauffage',
        nl: 'Verwarmen',
        es: 'Calor'
      },
      hvac_mode_cool: {
        en: 'Cool',
        it: 'Raffredda',
        de: 'Kuehlen',
        fr: 'Refroidissement',
        nl: 'Koelen',
        es: 'Frio'
      },
      hvac_mode_heat_cool: {
        en: 'Heat/Cool',
        it: 'Auto',
        de: 'Auto',
        fr: 'Auto',
        nl: 'Auto',
        es: 'Auto'
      },
      hvac_mode_auto: {
        en: 'Auto',
        it: 'Automatico',
        de: 'Automatik',
        fr: 'Automatique',
        nl: 'Automatisch',
        es: 'Automatico'
      },
      hvac_mode_dry: {
        en: 'Dry',
        it: 'Deumidifica',
        de: 'Trocknen',
        fr: 'Deshumidification',
        nl: 'Drogen',
        es: 'Seco'
      },
      hvac_mode_fan_only: {
        en: 'Fan',
        it: 'Ventola',
        de: 'Luefter',
        fr: 'Ventilateur',
        nl: 'Ventilator',
        es: 'Ventilador'
      },

      // Battery Popup Labels
      battery_1: {
        en: 'Battery 1',
        it: 'Batteria 1',
        de: 'Batterie 1',
        fr: 'Batterie 1',
        nl: 'Batterij 1',
        es: 'Batería 1'
      },
      battery_2: {
        en: 'Battery 2',
        it: 'Batteria 2',
        de: 'Batterie 2',
        fr: 'Batterie 2',
        nl: 'Batterij 2',
        es: 'Batería 2'
      },
      battery_3: {
        en: 'Battery 3',
        it: 'Batteria 3',
        de: 'Batterie 3',
        fr: 'Batterie 3',
        nl: 'Batterij 3',
        es: 'Batería 3'
      },
      battery_4: {
        en: 'Battery 4',
        it: 'Batteria 4',
        de: 'Batterie 4',
        fr: 'Batterie 4',
        nl: 'Batterij 4',
        es: 'Batería 4'
      },
      battery_datetime: {
        en: 'Full/Discharged Date/Time:',
        it: 'Data/Ora Carica/Scarica:',
        de: 'Voll/Entladen Datum/Zeit:',
        fr: 'Date/Heure Pleine/Déchargée:',
        nl: 'Vol/Ontladen Datum/Tijd:',
        es: 'Fecha/Hora Carga/Descarga:'
      },
      battery_timeuntil: {
        en: 'Full/Discharged in:',
        it: 'Carica/Scarica in:',
        de: 'Voll/Entladen in:',
        fr: 'Pleine/Déchargée dans:',
        nl: 'Vol/Ontladen over:',
        es: 'Carga/Descarga en:'
      },
      battery_sensors: {
        en: 'Battery Sensors',
        it: 'Sensori Batteria',
        de: 'Batteriesensoren',
        fr: 'Capteurs de Batterie',
        nl: 'Batterijsensoren',
        es: 'Sensores de Batería'
      },
      not_configured: {
        en: 'Not configured',
        it: 'Non configurato',
        de: 'Nicht konfiguriert',
        fr: 'Non configuré',
        nl: 'Niet geconfigureerd',
        es: 'No configurado'
      }
    };
  }

  /**
   * Get translation for a key
   * @param {string} key - Translation key
   * @param {string} fallback - Optional fallback text
   * @returns {string} Translated text
   */
  t(key, fallback = null) {
    const dict = this.translations[key];
    if (!dict) {
      return fallback || key;
    }
    return dict[this.language] || dict['en'] || fallback || key;
  }

  /**
   * Get translations for static text roles (SVG labels)
   * Returns object compatible with existing STATIC_TEXT_TRANSLATIONS format
   * @returns {Object} Role-based translations
   */
  getStaticTextTranslations() {
    return {
      'grid-current-power-label': this.translations.grid_current_power,
      'grid-current-power-text': this.translations.grid_current_power,
      'grid-daily-export-label': this.translations.grid_daily_export,
      'grid-daily-export-text': this.translations.grid_daily_export,
      'grid-daily-import-label': this.translations.grid_daily_import,
      'grid-daily-import-text': this.translations.grid_daily_import,
      'daily-grid-export-label': this.translations.grid_daily_export,
      'daily-grid-import-label': this.translations.grid_daily_import,
      'house-load-label': this.translations.house_load,
      'washing-machine-power-label': { ...this.translations.washing_machine, linkTo: 'washing-machine-power' },
      'washing-machine-power-text': { ...this.translations.washing_machine, linkTo: 'washing-machine-power' },
      'washing-machine-power': { ...this.translations.washing_machine, linkTo: 'washing-machine-power' },
      'dishwasher-power-label': { ...this.translations.dishwasher, linkTo: 'dishwasher-power' },
      'dishwasher-power-text': { ...this.translations.dishwasher, linkTo: 'dishwasher-power' },
      'dryer-power-label': { ...this.translations.dryer, linkTo: 'dryer-power' },
      'dryer-power-text': { ...this.translations.dryer, linkTo: 'dryer-power' },
      'refrigerator-power-label': { ...this.translations.refrigerator, linkTo: 'refrigerator-power' },
      'refrigerator-power-text': { ...this.translations.refrigerator, linkTo: 'refrigerator-power' },
      'freezer-power-label': { ...this.translations.freezer, linkTo: 'freezer-power' },
      'freezer-power-text': { ...this.translations.freezer, linkTo: 'freezer-power' },
      'heat-pump-power-label': { ...this.translations.heat_pump, linkTo: 'heat-pump-power' },
      'heat-pump-power-text': { ...this.translations.heat_pump, linkTo: 'heat-pump-power' },
      'hot-water-power-label': { ...this.translations.hot_water, linkTo: 'hot-water-power' },
      'hot-water-power-text': { ...this.translations.hot_water, linkTo: 'hot-water-power' },
      'pool-power-label': { ...this.translations.pool, linkTo: 'pool-power' },
      'pool-power-text': { ...this.translations.pool, linkTo: 'pool-power' }
    };
  }

  /**
   * Change active language
   * @param {string} language - New language code
   */
  setLanguage(language) {
    this.language = this._normalizeLanguage(language);
  }

  /**
   * Get list of supported languages
   * @returns {string[]} Array of supported language codes
   */
  static getSupportedLanguages() {
    return ['en', 'it', 'de', 'fr', 'nl', 'es'];
  }
}
