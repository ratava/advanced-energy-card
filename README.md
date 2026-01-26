# Advanced Energy Card

![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)  
![Version](https://img.shields.io/badge/version-1.0.21-blue.svg)

Advanced Energy Card repository is [https://github.com/ratava/advanced-energy-card](https://github.com/ratava/advanced-energy-card).

[Advanced Energy Card Background](images/advanced-day.png)

Support Brent ratava ![Donate Brent Wesley @ratava](https://github.com/user-attachments/assets/b603f494-a142-4bb0-893f-aaafd5d19dfd)

## Overview (EN)

Advanced Energy Card is a Home Assistant custom Lovelace card that renders animated energy flows, aggregates PV strings and batteries, and surfaces optional EV charging metrics in a cinematic layout. Advanced Energy Card is the heart of what is Lumina Energy Card and is what should have been version 2.0 of Lumina.

### Key Features (EN)

- New futuristic house with a completely redesigned graphics system, allowing for more functionality  
- New guided Initial Configuration
- Up to six PV sensors with two arrays supported per string or totalized inputs
- Up to four battery systems with SOC, power, and battery‑level visualization for four batteries. (2 per inverter if using 2 inverters)
- Additional battery information displayed in the battery popup
- Dynamic display of windmill power and up to two EVs with state of charge and power consumption or return
- Animated grid, load, PV, battery, and EV flows with dynamic color based on thresholds and selectable animation styles
- Configurable grid animation threshold (default 100 W) to suppress low‑level import/export chatter
- Adjustable animation speed multiplier (-3× to 3×, default 1×, pause/reverse supported) and per‑flow visibility thresholds
- Daily energy production badge
- Daily import and export totals
- Swimming pool power consumption now shown on the main graphic and can now be hidden if not in use
- Heat pump/AC power and Hot Water System consumption now shown
- Washing Machine, Dryer, Refrigerator, Dishwasher now included in popup
- Load warning/critical color overrides and a configurable low‑SOC threshold for the battery liquid fill
- Font selection, font size, and text color available for all displayed entities
- Update interval slider (0–60 s, default 5 s) with optional real‑time refresh when set to 0
- Popup information displays for House, Solar, Battery, Grid, and Inverter  
- Each has six slots for entities with name overrides and font‑color overrides.
- Popup entries can be clicked to show the HA Entity.
- Many new features coming, with support for more items

### Installation (EN)

#### HACS (EN)

1. Open HACS in Home Assistant and choose **Frontend**.
2. Use the three-dot menu → **Custom repositories**.
3. Enter `https://github.com/ratava/advanced-energy-card`, pick **Dashboard**, and click **Add**.
4. Locate **Advanced Energy Card** under Frontend and click **Install**.
5. Restart Home Assistant if prompted.

#### Manual Installation (EN)

1. Download all files from `dist/` from the [latest release](https://github.com/ratava/advanced-energy-card/releases).
2. Copy the files to `/config/www/community/advanced-energy-card/`.
3. Add the Lovelace resource:

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Restart Home Assistant to load the resource.

### Configuration (EN)

1. Edit your dashboard and click **Add Card**.
2. Search for **Advanced Energy Card**.
3. Fill in the fields using the entity pickers and switches.
4. Adjust the **Update Interval** slider to control refresh cadence.

## Initial Configuration (EN)

- Follow the questions in Initial Configuration Menu. It will cover most configurations of the base sensors
- Many other options have been added including a fully restructured menu.

## Panoramica (IT)

Advanced Energy Card è una scheda Lovelace personalizzata per Home Assistant che visualizza flussi energetici animati, aggrega stringhe FV e batterie e mostra metriche opzionali di ricarica EV in un layout cinematografico. Advanced Energy Card è il cuore di Lumina Energy Card e ciò che avrebbe dovuto essere la versione 2.0 di Lumina.

### Funzionalità principali (IT)

- Nuova casa futuristica con un sistema grafico completamente ridisegnato, per più funzionalità  
- Nuova configurazione guidata iniziale
- Fino a sei sensori FV con due array supportati per stringa o totali
- Fino a quattro batterie con SOC, potenza e visualizzazione del livello (2 per inverter se usi 2 inverter)
- Informazioni aggiuntive sulle batterie nel popup batterie
- Visualizzazione dinamica della potenza eolica e fino a due EV con SOC e consumo/restituzione
- Flussi animati di rete, carico, FV, batterie ed EV con colore dinamico in base a soglie
- Soglia configurabile della rete (default 100 W) per ridurre il rumore a basso livello
- Moltiplicatore velocità animazione regolabile (-3× a 3×, 0 pausa, negativi invertiti) e soglie per flussi
- Badge produzione giornaliera
- Totali giornalieri import/export
- Consumo piscina mostrato nella grafica principale
- Consumo pompa di calore/AC e acqua calda mostrato
- Lavatrice, asciugatrice, frigorifero, lavastoviglie inclusi nel popup
- Colori di avviso/critico per il carico e soglia SOC bassa per il riempimento batteria
- Scelta font, dimensione e colore del testo per tutte le entità
- Slider intervallo aggiornamento (0–60 s, default 5 s) con aggiornamento reale a 0
- Popup per Casa, Solare, Batteria, Rete e Inverter
- Ogni popup ha sei slot con override del nome e colori
- Le righe del popup sono cliccabili per aprire l’entità HA

### Installazione (IT)

#### HACS (IT)

1. Apri HACS in Home Assistant e scegli **Frontend**.
2. Menu a tre punti → **Repository personalizzati**.
3. Inserisci `https://github.com/ratava/advanced-energy-card`, scegli **Dashboard** e fai **Add**.
4. Trova **Advanced Energy Card** in Frontend e fai **Install**.
5. Riavvia Home Assistant se richiesto.

#### Installazione manuale (IT)

1. Scarica tutti i file da `dist/` dall’ultima release.
2. Copia i file in `/config/www/community/advanced-energy-card/`.
3. Aggiungi la risorsa Lovelace:

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Riavvia Home Assistant.

### Configurazione (IT)

1. Modifica la dashboard e fai **Add Card**.
2. Cerca **Advanced Energy Card**.
3. Compila i campi con i selettori entità e gli switch.
4. Regola **Update Interval** per la frequenza di aggiornamento.

## Configurazione iniziale (IT)

- Segui le domande nel menu di configurazione iniziale: copre la maggior parte dei sensori base.
- Sono state aggiunte molte altre opzioni con un menu completamente ristrutturato.

## Überblick (DE)

Advanced Energy Card ist eine benutzerdefinierte Lovelace-Karte für Home Assistant, die animierte Energieflüsse darstellt, PV‑Strings und Batterien aggregiert und optionale EV‑Lademetriken in einem cineastischen Layout zeigt. Advanced Energy Card ist das Herz von Lumina Energy Card und hätte Version 2.0 von Lumina sein sollen.

### Hauptfunktionen (DE)

- Neues futuristisches Haus mit komplett überarbeitetem Grafiksystem für mehr Funktionalität  
- Neue geführte Erstkonfiguration
- Bis zu sechs PV‑Sensoren mit zwei Arrays pro String oder Summensensoren
- Bis zu vier Batteriesysteme mit SOC, Leistung und Füllstand (2 pro Wechselrichter bei 2 Wechselrichtern)
- Zusätzliche Batterieinformationen im Batterie‑Popup
- Dynamische Anzeige von Windkraft und bis zu zwei EVs mit SOC und Leistung
- Animierte Netz‑, Last‑, PV‑, Batterie‑ und EV‑Flüsse mit dynamischen Farben anhand von Schwellen
- Konfigurierbare Netz‑Schwelle (Standard 100 W) zur Unterdrückung von Kleinstflüssen
- Einstellbarer Animationsfaktor (-3× bis 3×, 0 Pause, negative Werte rückwärts) und Schwellen pro Fluss
- Badge für Tagesproduktion
- Tages‑Import/Export‑Summen
- Pool‑Verbrauch in der Hauptgrafik
- Verbrauch von Wärmepumpe/AC und Warmwasser wird angezeigt
- Waschmaschine, Trockner, Kühlschrank, Geschirrspüler im Popup enthalten
- Warn-/Kritisch‑Farben für Last und SOC‑Schwelle für niedrigen Batteriefüllstand
- Schriftart, Schriftgröße und Textfarbe für alle angezeigten Entitäten
- Update‑Intervall‑Regler (0–60 s, Standard 5 s) mit Echtzeit‑Update bei 0
- Popups für Haus, Solar, Batterie, Netz und Wechselrichter
- Jeder Popup‑Bereich mit sechs Slots, Namens‑Overrides und Farben
- Popup‑Einträge sind anklickbar und öffnen die HA‑Entität

### Installation (DE)

#### HACS (DE)

1. Öffne HACS in Home Assistant und wähle **Frontend**.
2. Drei‑Punkt‑Menü → **Custom repositories**.
3. `https://github.com/ratava/advanced-energy-card` eintragen, **Dashboard** wählen, **Add**.
4. **Advanced Energy Card** unter Frontend finden und **Install**.
5. Home Assistant ggf. neu starten.

#### Manuelle Installation (DE)

1. Alle Dateien aus `dist/` der neuesten Release herunterladen.
2. Dateien nach `/config/www/community/advanced-energy-card/` kopieren.
3. Lovelace‑Ressource hinzufügen:

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Home Assistant neu starten.

### Konfiguration (DE)

1. Dashboard bearbeiten und **Add Card**.
2. **Advanced Energy Card** suchen.
3. Felder mit Entitäts‑Pickern und Schaltern ausfüllen.
4. **Update Interval** für die Aktualisierung anpassen.

## Erstkonfiguration (DE)

- Beantworte die Fragen im Menü „Initial Configuration“; es deckt die meisten Basissensoren ab.
- Viele weitere Optionen wurden hinzugefügt, inklusive vollständig überarbeitetem Menü.

## Présentation (FR)

Advanced Energy Card est une carte Lovelace personnalisée pour Home Assistant qui affiche des flux d’énergie animés, agrège les strings PV et les batteries, et expose des métriques EV optionnelles dans une mise en page cinématique. Advanced Energy Card est le cœur de Lumina Energy Card et aurait dû être la version 2.0 de Lumina.

### Points forts (FR)

- Nouvelle maison futuriste avec un système graphique entièrement repensé, offrant plus de fonctionnalités  
- Nouvelle configuration initiale guidée
- Jusqu’à six capteurs PV avec deux arrays par string ou totalisés
- Jusqu’à quatre batteries avec SOC, puissance et niveau (2 par onduleur si 2 onduleurs)
- Infos batterie supplémentaires dans le popup batterie
- Affichage dynamique de l’éolienne et jusqu’à deux EV (SOC et puissance)
- Flux animés réseau, charge, PV, batterie et EV avec couleurs dynamiques selon les seuils
- Seuil réseau configurable (100 W par défaut) pour éviter le bruit à faible niveau
- Vitesse d’animation réglable (-3× à 3×, 0 pause, négatifs inversés) et seuils par flux
- Badge de production quotidienne
- Totaux import/export journaliers
- Consommation de piscine affichée sur le graphique principal
- Consommation PAC/AC et eau chaude affichée
- Lave‑linge, sèche‑linge, réfrigérateur, lave‑vaisselle inclus dans le popup
- Couleurs d’alerte/critique pour la charge et seuil SOC bas pour le remplissage batterie
- Police, taille et couleur de texte pour toutes les entités affichées
- Curseur d’intervalle (0–60 s, défaut 5 s) avec rafraîchissement temps réel à 0
- Popups Maison, Solaire, Batterie, Réseau et Onduleur
- Chaque popup a six emplacements avec noms et couleurs personnalisables
- Les entrées du popup sont cliquables pour ouvrir l’entité HA

### Installation (FR)

#### HACS (FR)

1. Ouvrez HACS dans Home Assistant et choisissez **Frontend**.
2. Menu à trois points → **Custom repositories**.
3. Saisissez `https://github.com/ratava/advanced-energy-card`, choisissez **Dashboard**, puis **Add**.
4. Trouvez **Advanced Energy Card** sous Frontend et cliquez **Install**.
5. Redémarrez Home Assistant si demandé.

#### Installation manuelle (FR)

1. Téléchargez tous les fichiers de `dist/` depuis la dernière release.
2. Copiez les fichiers dans `/config/www/community/advanced-energy-card/`.
3. Ajoutez la ressource Lovelace :

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Redémarrez Home Assistant.

### Configuration (FR)

1. Modifiez votre tableau de bord et cliquez **Add Card**.
2. Recherchez **Advanced Energy Card**.
3. Remplissez les champs via les sélecteurs d’entités et interrupteurs.
4. Ajustez **Update Interval** pour la cadence de rafraîchissement.

## Configuration initiale (FR)

- Suivez les questions du menu de configuration initiale ; il couvre l’essentiel des capteurs de base.
- De nombreuses autres options ont été ajoutées, avec un menu entièrement restructuré.

## Overzicht (NL)

Advanced Energy Card is een aangepaste Lovelace‑kaart voor Home Assistant die geanimeerde energiestromen weergeeft, PV‑strings en batterijen bundelt en optionele EV‑laadstatistieken toont in een cinematografische layout. Advanced Energy Card is het hart van Lumina Energy Card en had versie 2.0 van Lumina moeten zijn.

### Belangrijkste functies (NL)

- Nieuw futuristisch huis met volledig herontworpen graphicsysteem voor meer functionaliteit  
- Nieuwe begeleide initiële configuratie
- Tot zes PV‑sensoren met twee arrays per string of totalen
- Tot vier batterijen met SOC, vermogen en vulling (2 per omvormer bij 2 omvormers)
- Extra batterij‑informatie in de batterij‑popup
- Dynamische weergave van windmolenvermogen en tot twee EV’s met SOC en vermogen
- Geanimeerde net‑, load‑, PV‑, batterij‑ en EV‑stromen met dynamische kleuren op basis van drempels
- Configureerbare netdrempel (standaard 100 W) om ruis te beperken
- Instelbare animatiesnelheid (-3× tot 3×, 0 pauze, negatieven omgekeerd) en drempels per flow
- Dagproductie‑badge
- Dagelijkse import/export‑totalen
- Zwembadverbruik zichtbaar in de hoofdgrafiek
- Verbruik van warmtepomp/AC en warm water zichtbaar
- Wasmachine, droger, koelkast en vaatwasser opgenomen in de popup
- Waarschuwing/kritiek‑kleuren voor load en lage SOC‑drempel voor batterijvulling
- Lettertype, grootte en tekstkleur voor alle weergegeven entiteiten
- Update‑intervalschuif (0–60 s, standaard 5 s) met realtime update bij 0
- Popups voor Huis, Zonne‑energie, Batterij, Net en Omvormer
- Elke popup heeft zes slots met naam‑ en kleur‑overrides
- Popup‑regels zijn klikbaar om de HA‑entiteit te openen

### Installatie (NL)

#### HACS (NL)

1. Open HACS in Home Assistant en kies **Frontend**.
2. Drie‑punt‑menu → **Custom repositories**.
3. Voer `https://github.com/ratava/advanced-energy-card` in, kies **Dashboard**, klik **Add**.
4. Zoek **Advanced Energy Card** onder Frontend en klik **Install**.
5. Herstart Home Assistant indien gevraagd.

#### Handmatige installatie (NL)

1. Download alle bestanden uit `dist/` van de nieuwste release.
2. Kopieer de bestanden naar `/config/www/community/advanced-energy-card/`.
3. Voeg de Lovelace‑resource toe:

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Herstart Home Assistant.

### Configuratie (NL)

1. Bewerk je dashboard en klik **Add Card**.
2. Zoek **Advanced Energy Card**.
3. Vul de velden in met entiteitskiezers en schakelaars.
4. Pas **Update Interval** aan voor de update‑cadans.

## Initiële configuratie (NL)

- Volg de vragen in het menu Initial Configuration; dit dekt de meeste basis‑sensoren.
- Veel andere opties zijn toegevoegd, inclusief een volledig herbouwd menu.


| Option                               | Type    | Default                                                           | Notes                                                                                                                                             |
| ------------------------------------ | ------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card_title`                         | string  | —                                                                 | Optional header text; blank keeps the title hidden.                                                                                               |
| `title_render_mode`                  | string  | `html`                                                            | How the title is rendered: `html` (recommended) or `svg` (legacy).                                                                                |
| `title_text_color`                   | string  | —                                                                 | Optional override for title text color (hex).                                                                                                     |
| `title_bg_color`                     | string  | —                                                                 | Optional override for the title background rectangle (hex).                                                                                       |
| `font_family`                        | string  | `sans-serif`                                                      | Font family for the card text (CSS font-family).                                                                                                  |
| `odometer_font_family`               | string  | —                                                                 | Optional alternate font used by odometer-styled animated numbers; falls back to `font_family` when unset.                                         |
| `background_day`                     | string  | `/local/community/advanced-energy-card/advanced-modern-day.svg`   | Day background (used when `day_night_mode` is `day` or in `auto` during daytime).                                                                 |
| `background_night`                   | string  | `/local/community/advanced-energy-card/advanced-modern-night.svg` | Night background (used when `day_night_mode` is `night` or in `auto` during nighttime).                                                           |
| `language`                           | string  | `en`                                                              | Supported editor languages: `en`, `it`, `de`, `fr`, `nl`.                                                                                         |
| `display_unit`                       | string  | `kW`                                                              | Display values in `W` or `kW`.                                                                                                                    |
| `update_interval`                    | number  | `30`                                                              | Refresh cadence (0–60 s, step 5; 0 disables throttling).                                                                                          |
| `animation_speed_factor`             | number  | `1`                                                               | Flow animation multiplier (-3–3, 0 pauses, negatives reverse).                                                                                    |
| `animation_style`                    | string  | `dashes`                                                          | Day animation style. Flow motif (`dashes`, `dashes_glow`, `fluid_flow`, `dots`, `arrows`).                                                        |
| `night_animation_style`              | string  | `dashes`                                                          | Night animation style (same options as `animation_style`). When blank/unset, falls back to `animation_style`.                                     |
| `dashes_glow_intensity`              | number  | `1`                                                               | Glow intensity for `dashes_glow` style (0–3).                                                                                                     |
| `flow_stroke_width`                  | number  | `3`                                                               | Stroke width (px) for `dashes`/`dashes_glow`/`dots`/`arrows`.                                                                                     |
| `fluid_flow_stroke_width`            | number  | `4`                                                               | Stroke width (px) for `fluid_flow`.                                                                                                               |
| `fluid_flow_outer_glow`              | boolean | `false`                                                           | Adds an outer glow effect for `fluid_flow`.                                                                                                       |
| `day_night_mode`                     | string  | `day`                                                             | Selects Day/Night: `day`, `night`, or `auto` (auto follows `sun.sun`).                                                                            |
| `night_mode`                         | boolean | `false`                                                           | Legacy boolean night mode (deprecated). Prefer `day_night_mode`.                                                                                  |
| `header_font_size`                   | number  | `16`                                                              | Typography for the header (12–32 px).                                                                                                             |
| `daily_label_font_size`              | number  | `12`                                                              | Typography for the daily label (8–24 px).                                                                                                         |
| `daily_value_font_size`              | number  | `20`                                                              | Typography for the daily total (12–32 px).                                                                                                        |
| `pv_font_size`                       | number  | `16`                                                              | Typography for PV text (12–28 px).                                                                                                                |
| `battery_soc_font_size`              | number  | `20`                                                              | Typography for the SOC label (12–32 px).                                                                                                          |
| `battery_power_font_size`            | number  | `14`                                                              | Typography for the battery wattage (10–28 px).                                                                                                    |
| `load_font_size`                     | number  | `15`                                                              | Typography for the load text (10–28 px).                                                                                                          |
| `inv1_power_font_size`               | number  | `15`                                                              | Font size for the INV 1 power line (10–28 px). Defaults to `load_font_size`.                                                                      |
| `inv2_power_font_size`               | number  | `15`                                                              | Font size for the INV 2 power line (10–28 px). Defaults to `load_font_size`.                                                                      |
| `grid_font_size`                     | number  | `15`                                                              | Typography for the grid text (10–28 px).                                                                                                          |
| `grid_daily_font_size`               | number  | `15`                                                              | Font size for the daily import/export totals (defaults to `grid_font_size`).                                                                      |
| `grid_current_odometer`              | boolean | `false`                                                           | Enables the odometer animation on the live grid value.                                                                                            |
| `grid_current_odometer_duration`     | number  | `350`                                                             | Duration (ms) for the grid odometer animation (50–2000).                                                                                          |
| `heat_pump_font_size`                | number  | `16`                                                              | Typography for the heat pump readout (10–28 px).                                                                                                  |
| `pool_font_size`                     | number  | `16`                                                              | Typography for the pool readout (10–28 px).                                                                                                       |
| `hot_water_font_size`                | number  | `8`                                                               | Typography for the hot water readout (10–28 px).                                                                                                  |
| `washing_machine_font_size`          | number  | `16`                                                              | Typography for the washer label/power (inherits `heat_pump_font_size` when unset).                                                                |
| `dishwasher_font_size`               | number  | `8`                                                               | Typography for the dish washer label/power (10–28 px).                                                                                            |
| `dryer_font_size`                    | number  | `16`                                                              | Typography for the dryer label/power (inherits `heat_pump_font_size` when unset).                                                                 |
| `refrigerator_font_size`             | number  | `16`                                                              | Typography for the refrigerator label/power (inherits `heat_pump_font_size` when unset).                                                          |
| `car_power_font_size`                | number  | `15`                                                              | Typography for Car 1 power (10–28 px).                                                                                                            |
| `car2_power_font_size`               | number  | `15`                                                              | Typography for Car 2 power (10–28 px, falls back to Car 1 value).                                                                                 |
| `car_soc_font_size`                  | number  | `12`                                                              | Typography for Car 1 SOC (8–24 px).                                                                                                               |
| `car2_soc_font_size`                 | number  | `12`                                                              | Typography for Car 2 SOC (8–24 px, falls back to Car 1 value).                                                                                    |
| `car_name_font_size`                 | number  | `15`                                                              | Typography for Car 1 name label (px).                                                                                                             |
| `car2_name_font_size`                | number  | `15`                                                              | Typography for Car 2 name label (px).                                                                                                             |
| `car1_label`                         | string  | —                                                                 | Optional label override for Car 1 (display name).                                                                                                 |
| `car2_label`                         | string  | —                                                                 | Optional label override for Car 2 (display name).                                                                                                 |
| `sensor_pv_total`                    | entity  | —                                                                 | Optional aggregate PV production sensor. Provide either this sensor **or** at least one PV string.                                                |
| `sensor_pv1` .. `sensor_pv6`         | entity  | —                                                                 | PV string sensors for Array 1. When no total is given, at least one string is required and all configured strings are summed to produce PV TOTAL. |
| `sensor_daily`                       | entity  | —                                                                 | Daily production sensor (required).                                                                                                               |
| `sensor_bat1_soc`                    | entity  | —                                                                 | Battery SOC sensor (required only when a battery is displayed).                                                                                   |
| `sensor_bat1_power`                  | entity  | —                                                                 | Combined net power sensor for Battery 1. Provide this or both split sensors below.                                                                |
| `sensor_bat1_charge_power`           | entity  | —                                                                 | Battery 1 charging sensor (positive values, W or kW). Use with `sensor_bat1_discharge_power` when no combined sensor exists.                      |
| `sensor_bat1_discharge_power`        | entity  | —                                                                 | Battery 1 discharging sensor (positive values).                                                                                                   |
| `sensor_bat2_soc`                    | entity  | —                                                                 | Optional Battery 2 SOC sensor.                                                                                                                    |
| `sensor_bat2_power`                  | entity  | —                                                                 | Combined net power sensor for Battery 2. Provide this or both split sensors below.                                                                |
| `sensor_bat2_charge_power`           | entity  | —                                                                 | Battery 2 charging sensor (positive values).                                                                                                      |
| `sensor_bat2_discharge_power`        | entity  | —                                                                 | Battery 2 discharging sensor (positive values).                                                                                                   |
| `sensor_bat3_soc`                    | entity  | —                                                                 | Optional Battery 3 SOC sensor.                                                                                                                    |
| `sensor_bat3_power`                  | entity  | —                                                                 | Combined net power sensor for Battery 3. Provide this or both split sensors below.                                                                |
| `sensor_bat3_charge_power`           | entity  | —                                                                 | Battery 3 charging sensor (positive values).                                                                                                      |
| `sensor_bat3_discharge_power`        | entity  | —                                                                 | Battery 3 discharging sensor (positive values).                                                                                                   |
| `sensor_bat4_soc`                    | entity  | —                                                                 | Optional Battery 4 SOC sensor.                                                                                                                    |
| `sensor_bat4_power`                  | entity  | —                                                                 | Combined net power sensor for Battery 4. Provide this or both split sensors below.                                                                |
| `sensor_bat4_charge_power`           | entity  | —                                                                 | Battery 4 charging sensor (positive values).                                                                                                      |
| `sensor_bat4_discharge_power`        | entity  | —                                                                 | Battery 4 discharging sensor (positive values).                                                                                                   |
| `sensor_home_load`                   | entity  | —                                                                 | Home load/consumption sensor (required).                                                                                                          |
| `sensor_grid_power`                  | entity  | —                                                                 | Net grid sensor (required unless import/export pair supplied).                                                                                    |
| `sensor_grid_import`                 | entity  | —                                                                 | Optional import-only sensor (positive values).                                                                                                    |
| `sensor_grid_export`                 | entity  | —                                                                 | Optional export-only sensor (positive values).                                                                                                    |
| `sensor_grid_import_daily`           | entity  | —                                                                 | Optional cumulative daily grid import sensor.                                                                                                     |
| `sensor_grid_export_daily`           | entity  | —                                                                 | Optional cumulative daily grid export sensor.                                                                                                     |
| `sensor_grid2_power`                 | entity  | —                                                                 | Optional second grid net power sensor.                                                                                                            |
| `sensor_grid2_import`                | entity  | —                                                                 | Optional second grid import-only sensor (positive values).                                                                                        |
| `sensor_grid2_export`                | entity  | —                                                                 | Optional second grid export-only sensor (positive values).                                                                                        |
| `sensor_grid2_import_daily`          | entity  | —                                                                 | Optional cumulative daily import for grid 2.                                                                                                      |
| `sensor_grid2_export_daily`          | entity  | —                                                                 | Optional cumulative daily export for grid 2.                                                                                                      |
| `show_daily_grid`                    | boolean | `false`                                                           | Shows the daily import/export totals above the live grid value.                                                                                   |
| `show_grid_flow_label`               | boolean | `true`                                                            | Prepends “Importing/Exporting” before the grid value.                                                                                             |
| `sensor_heat_pump_consumption`       | entity  | —                                                                 | Heat pump sensor; unlocks the orange flow and swaps the background.                                                                               |
| `sensor_hot_water_consumption`       | entity  | —                                                                 | Hot water heating load sensor (drives the hot water label).                                                                                       |
| `sensor_pool_consumption`            | entity  | —                                                                 | Optional pool consumption sensor; enables the pool branch/label when present.                                                                     |
| `sensor_washing_machine_consumption` | entity  | —                                                                 | Optional washing machine consumption sensor that drives the washer label.                                                                         |
| `sensor_dishwasher_consumption`      | entity  | —                                                                 | Optional dish washer consumption sensor.                                                                                                          |
| `sensor_dryer_consumption`           | entity  | —                                                                 | Optional dryer consumption sensor.                                                                                                                |
| `sensor_refrigerator_consumption`    | entity  | —                                                                 | Optional refrigerator consumption sensor.                                                                                                         |
| `sensor_windmill_total`              | entity  | —                                                                 | Optional windmill total generation sensor.                                                                                                        |
| `sensor_windmill_daily`              | entity  | —                                                                 | Optional windmill daily generation sensor.                                                                                                        |
| `sensor_car_power`                   | entity  | —                                                                 | Optional Car 1 charging power sensor.                                                                                                             |
| `sensor_car_soc`                     | entity  | —                                                                 | Optional Car 1 SOC sensor.                                                                                                                        |
| `sensor_car2_power`                  | entity  | —                                                                 | Optional Car 2 charging power sensor.                                                                                                             |
| `sensor_car2_soc`                    | entity  | —                                                                 | Optional Car 2 SOC sensor.                                                                                                                        |
| `show_car_soc`                       | boolean | `false`                                                           | Toggle the Car 1 panel (power + SOC).                                                                                                             |
| `show_car2`                          | boolean | `false`                                                           | Toggle the Car 2 panel when sensors exist.                                                                                                        |
| `car_flow_color`                     | string  | `#00FFFF`                                                         | EV flow animation colour.                                                                                                                         |
| `car1_color`                         | string  | `#FFFFFF`                                                         | Car 1 power text colour.                                                                                                                          |
| `car2_color`                         | string  | `#FFFFFF`                                                         | Car 2 power text colour.                                                                                                                          |
| `car_pct_color`                      | string  | `#00FFFF`                                                         | Car 1 SOC text colour.                                                                                                                            |
| `car2_pct_color`                     | string  | `#00FFFF`                                                         | Car 2 SOC text colour.                                                                                                                            |
| `car1_name_color`                    | string  | `#FFFFFF`                                                         | Car 1 name label colour.                                                                                                                          |
| `car2_name_color`                    | string  | `#FFFFFF`                                                         | Car 2 name label colour.                                                                                                                          |
| `pv_primary_color`                   | string  | `#0080ff`                                                         | PV 1 flow animation colour.                                                                                                                       |
| `pv_secondary_color`                 | string  | `#80ffff`                                                         | PV 2 flow animation colour.                                                                                                                       |
| `pv_tot_color`                       | string  | `#00FFFF`                                                         | PV TOTAL text/line colour.                                                                                                                        |
| `load_flow_color`                    | string  | `#0080ff`                                                         | Home load flow animation colour.                                                                                                                  |
| `load_text_color`                    | string  | `#FFFFFF`                                                         | Home load text colour when thresholds are inactive.                                                                                               |
| `load_threshold_warning`             | number  | —                                                                 | Load warning threshold (W or kW based on the display unit).                                                                                       |
| `load_warning_color`                 | string  | `#ff8000`                                                         | Load warning colour.                                                                                                                              |
| `load_threshold_critical`            | number  | —                                                                 | Load critical threshold (W or kW based on the display unit).                                                                                      |
| `load_critical_color`                | string  | `#ff0000`                                                         | Load critical colour.                                                                                                                             |
| `battery_soc_color`                  | string  | `#FFFFFF`                                                         | Battery SOC percentage text colour.                                                                                                               |
| `battery_charge_color`               | string  | `#00FFFF`                                                         | Battery charge flow colour.                                                                                                                       |
| `battery_discharge_color`            | string  | `#FFFFFF`                                                         | Battery discharge flow colour.                                                                                                                    |
| `grid_import_color`                  | string  | `#FF3333`                                                         | Grid import flow colour.                                                                                                                          |
| `grid_export_color`                  | string  | `#00ff00`                                                         | Grid export flow colour.                                                                                                                          |
| `grid2_import_color`                 | string  | `#FF3333`                                                         | Grid 2 import flow colour.                                                                                                                        |
| `grid2_export_color`                 | string  | `#00ff00`                                                         | Grid 2 export flow colour.                                                                                                                        |
| `heat_pump_flow_color`               | string  | `#FFA500`                                                         | Flow colour for the dedicated heat pump conduit.                                                                                                  |
| `heat_pump_text_color`               | string  | `#FFA500`                                                         | Text colour for the heat pump wattage label.                                                                                                      |
| `pool_flow_color`                    | string  | `#0080ff`                                                         | Pool flow colour.                                                                                                                                 |
| `pool_text_color`                    | string  | `#FFFFFF`                                                         | Pool text colour.                                                                                                                                 |
| `hot_water_text_color`               | string  | `#FFFFFF`                                                         | Hot water text colour.                                                                                                                            |
| `washing_machine_text_color`         | string  | `#FFFFFF`                                                         | Washer text colour (defaults to the load text colour when unset).                                                                                 |
| `dishwasher_text_color`              | string  | `#FFFFFF`                                                         | Dish washer text colour (defaults to the load text colour when unset).                                                                            |
| `dryer_text_color`                   | string  | `#FFFFFF`                                                         | Dryer text colour (defaults to the load text colour when unset).                                                                                  |
| `refrigerator_text_color`            | string  | `#FFFFFF`                                                         | Refrigerator text colour (defaults to the load text colour when unset).                                                                           |
| `windmill_flow_color`                | string  | `#00FFFF`                                                         | Windmill flow colour.                                                                                                                             |
| `windmill_text_color`                | string  | `#FFFFFF`                                                         | Windmill text colour.                                                                                                                             |
| `windmill_power_font_size`           | number  | `16`                                                              | Font size for windmill power readout (px).                                                                                                        |
| `battery_fill_high_color`            | string  | `#00ffff`                                                         | Battery liquid fill colour above the low threshold.                                                                                               |
| `battery_fill_low_color`             | string  | `#ff0000`                                                         | Battery liquid fill colour at or below the low threshold.                                                                                         |
| `battery_fill_low_threshold`         | number  | `25`                                                              | SOC percentage that flips to the low fill colour.                                                                                                 |
| `battery_fill_opacity`               | number  | `1`                                                               | Opacity for the battery liquid fill (0–1).                                                                                                        |
| `grid_activity_threshold`            | number  | `100`                                                             | Minimum absolute grid power (W) before flows animate.                                                                                             |
| `grid_power_only`                    | boolean | `false`                                                           | Forces a direct grid→house flow (hides inverter/battery flows).                                                                                   |
| `grid_threshold_warning`             | number  | —                                                                 | Trigger warning colour when grid magnitude meets this value.                                                                                      |
| `grid_warning_color`                 | string  | `#ff8000`                                                         | Grid warning colour.                                                                                                                              |
| `grid_threshold_critical`            | number  | —                                                                 | Trigger critical colour when magnitude meets this value.                                                                                          |
| `grid_critical_color`                | string  | `#ff0000`                                                         | Grid critical colour.                                                                                                                             |
| `grid2_threshold_warning`            | number  | —                                                                 | Trigger warning colour when Grid 2 magnitude meets this value.                                                                                    |
| `grid2_warning_color`                | string  | `#ff8000`                                                         | Grid 2 warning colour.                                                                                                                            |
| `grid2_threshold_critical`           | number  | —                                                                 | Trigger critical colour when Grid 2 magnitude meets this value.                                                                                   |
| `grid2_critical_color`               | string  | `#ff0000`                                                         | Grid 2 critical colour.                                                                                                                           |
| `invert_grid`                        | boolean | `false`                                                           | Flip grid polarity if import/export are reversed.                                                                                                 |
| `invert_battery`                     | boolean | `false`                                                           | Flip battery polarity and swap charge/discharge hues.                                                                                             |
| `invert_bat1`                        | boolean | `false`                                                           | Override only Battery 1 polarity when its sensors are reversed.                                                                                   |
| `invert_bat2`                        | boolean | `false`                                                           | Override only Battery 2 polarity when its sensors are reversed.                                                                                   |
| `invert_bat3`                        | boolean | `false`                                                           | Override only Battery 3 polarity when its sensors are reversed.                                                                                   |


> **Battery sensor requirement (EN):** For each battery (`bat1`..`bat4`) supply either the combined `sensor_batX_power` **or** both `sensor_batX_charge_power` and `sensor_batX_discharge_power`. Readings may be in W or kW; the card handles conversions automatically.

### Grid Flow Routing (EN)

The card now selects the grid animation path automatically:

- When a PV total (`sensor_pv_total`) or at least one Array 1 string sensor exists, imports and exports animate along the inverter conduit just like before.
- If `sensor_pv_total` and all Array 1 string slots are left blank, the card assumes you're running directly from the grid: the animation shifts to the house branch, the grid arrow points at the home, and PV-only UI (Daily Yield badge + PV popup) stays hidden.
- When `grid_power_only` is enabled, the card always uses the direct grid→house path and hides inverter/battery flows, even if PV sensors are configured.

The legacy grid→house toggle has been removed, so delete any `grid_flow_mode` entries from your YAML. Detection now happens every render and `grid_activity_threshold` still governs when the animation starts.

### Popups (Editor Options)

The card provides five editable popup groups (PV, House, Battery, Grid, Inverter). Each popup exposes up to six entity slots, optional custom names, per-line colour pickers, and font-size controls.  
The entities specfied in here will not have any conversions done to them other tha the name override if you specify one. This has been done delibertly so it is more flexible.  
It is not only sensors that can be specifed in the popups. Text based entities can be displayed (e.g. alerts). If you have a sensor that needs its units converted. Please use  
a helper to display it.

- PV Popup
  - `sensor_popup_pv_1` .. `sensor_popup_pv_6`: entity selectors for PV popup lines.
  - `sensor_popup_pv_1_name` .. `sensor_popup_pv_6_name`: optional custom names (falls back to entity name).
  - `sensor_popup_pv_1_color` .. `sensor_popup_pv_6_color`: per-line colour pickers (default `#80ffff`).
  - `sensor_popup_pv_1_font_size` .. `sensor_popup_pv_6_font_size`: per-line font-size (px) (default `14`).
  - Clickable areas are the Daily PV Yield box and the Solar Panels. Click to toggle the PV popup; clicking the popup closes it.
- House Popup
  - `sensor_popup_house_1` .. `sensor_popup_house_6`: entity selectors for House popup lines.
  - `sensor_popup_house_1_name` .. `sensor_popup_house_6_name`: optional custom names.
  - `sensor_popup_house_1_color` .. `sensor_popup_house_6_color`: per-line colour pickers (default `#80ffff`).
  - `sensor_popup_house_1_font_size` .. `sensor_popup_house_6_font_size`: per-line font-size (px) (default `14`).
  - When configured, the House popup also auto-includes: Heat Pump/AC, Pool, Washing Machine, Dryer, Dish Washer, and Refrigerator (using the popup slot styling).
  - House clickable area is the House; click to toggle the House popup and click the popup to close.
- Battery Popup
  - `sensor_popup_bat_1` .. `sensor_popup_bat_6`: entity selectors for Battery popup lines.
  - `sensor_popup_bat_1_name` .. `sensor_popup_bat_6_name`: optional custom names.
  - `sensor_popup_bat_1_color` .. `sensor_popup_bat_6_color`: per-line colour pickers (default `#80ffff`).
  - `sensor_popup_bat_1_font_size` .. `sensor_popup_bat_6_font_size`: per-line font-size (px) (default `16`).
  - Battery clickable areads is the battery image. Click to toggle the Battery popup; clicking the popup closes it.
- Grid Popup
  - `sensor_popup_grid_1` .. `sensor_popup_grid_6`: entity selectors for Grid popup lines.
  - `sensor_popup_grid_1_name` .. `sensor_popup_grid_6_name`: optional custom names.
  - `sensor_popup_grid_1_color` .. `sensor_popup_grid_6_color`: per-line colour pickers (default `#80ffff`).
  - `sensor_popup_grid_1_font_size` .. `sensor_popup_grid_6_font_size`: per-line font-size (px) (default `16`).
  - Grid clickable area is the Grid section; click to toggle the Grid popup and click the popup to close.
- Inverter Popup
  - `sensor_popup_inverter_1` .. `sensor_popup_inverter_6`: entity selectors for Inverter popup lines.
  - `sensor_popup_inverter_1_name` .. `sensor_popup_inverter_6_name`: optional custom names.
  - `sensor_popup_inverter_1_color` .. `sensor_popup_inverter_6_color`: per-line colour pickers (default `#80ffff`).
  - `sensor_popup_inverter_1_font_size` .. `sensor_popup_inverter_6_font_size`: per-line font-size (px) (default `16`).
  - Inverter clickable area is the Inverter section; click to toggle the Inverter popup and click the popup to close.

### Additional Array 2 & Options (EN)


| Option                                            | Type     | Default   | Notes                                                                                                                                      |
| ------------------------------------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `sensor_pv_total_secondary`                       | entity   | —         | Optional second inverter total (PV2). When provided it is added to PV TOT and drives the secondary PV flow.                                |
| `sensor_pv_array2_1` .. `sensor_pv_array2_6`      | entities | —         | Up to six per-string sensors for Array 2. Used for aggregation when no total is provided; per-string values can be shown via the PV popup. |
| `sensor_daily_array2`                             | entity   | —         | Daily production sensor for Array 2; combined daily yield = `sensor_daily` + `sensor_daily_array2`.                                        |
| `sensor_home_load_secondary`                      | entity   | —         | Optional home load sensor tied to inverter 2; required for HOUSE TOT / INV 2 lines when Array 2 is active.                                 |
| `pv_tot_color`                                    | string   | `#00FFFF` | Overrides the PV TOT line/text colour (also affects string inheritance when set).                                                          |
| `house_total_color` / `inv1_color` / `inv2_color` | string   | —         | Per-line colour overrides for HOUSE TOT, INV 1 and INV 2 flows.                                                                            |
| `invert_battery`                                  | boolean  | `false`   | Swaps charge/discharge polarity, colours, and animation direction.                                                                         |


Car colours & fonts: `car1_name_color`, `car2_name_color`, `car1_color`, `car2_color`, `car2_pct_color`, `car_name_font_size`, `car2_name_font_size` — new colour and name-font-size controls for Car 1 and Car 2 (power and SOC font sizes remain available as `car_power_font_size`, `car2_power_font_size`, `car_soc_font_size`, `car2_soc_font_size`).

Notes:

- When Array 2 is active the PV flow mapping is: `pv1` → Array 1 (primary), `pv2` → Array 2 (secondary). The PV TOT line shows the combined production where applicable.
- Individual PV strings are no longer rendered on the main card; use the PV popup (`sensor_popup_pv_1` .. `sensor_popup_pv_6`) to show per-string sensors if desired.

© 2025 ratava, ratava, and contributors. Released under the MIT License.
