'use client';

import { useState, useMemo, useCallback, useRef, type DragEvent } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Package,
  Star,
  ChevronLeft,
  X,
} from 'lucide-react';
import { useSimulatorStore } from './simulator-store';
import {
  getComponentSvg,
  getBreadboardSvg,
} from '@stemverse/runtime-engine';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ComponentCatalogProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component description catalog                                      */
/* ------------------------------------------------------------------ */

const COMPONENT_DESCRIPTIONS: Record<string, string> = {
  arduino_uno_r3: 'ATmega328P, 14 digital I/O',
  esp32_devkit_v1: 'Wi-Fi + BLE, dual-core MCU',
  arduino_nano: 'Compact ATmega328P board',
  breadboard_830: '830-point solderless board',
  breadboard_400: '400-point half-size board',
  breadboard_mini: '170-point mini breadboard',
  hc_sr04: 'Ultrasonic distance 2–400 cm',
  dht11_sensor: 'Temperature & humidity',
  mq2_gas_sensor: 'Smoke & gas detection',
  ir_sensor_module: 'Infrared obstacle detector',
  oled_ssd1306: '0.96″ 128×64 OLED I²C',
  lcd1602: '16×2 character LCD display',
  sg90_servo: '180° micro servo motor',
  relay_module: '5V single-channel relay',
  buzzer_passive: 'Piezoelectric buzzer module',
  led_generic: '5mm LED — any color',
  resistor_generic: 'Through-hole resistor',
  push_button_tactile: 'Momentary tactile switch',
  potentiometer_10k: '10kΩ rotary potentiometer',
};

/* ------------------------------------------------------------------ */
/*  SVG asset ID → SVG map key mapping                                 */
/* ------------------------------------------------------------------ */

const ASSET_TO_SVG_KEY: Record<string, string> = {
  arduino_uno_r3: 'ARDUINO_UNO',
  esp32_devkit_v1: 'ESP32',
  arduino_nano: 'ARDUINO_NANO',
  hc_sr04: 'ULTRASONIC',
  dht11_sensor: 'DHT11',
  mq2_gas_sensor: 'MQ2_SENSOR',
  ir_sensor_module: 'IR_SENSOR',
  oled_ssd1306: 'OLED',
  lcd1602: 'LCD',
  sg90_servo: 'SERVO',
  relay_module: 'RELAY',
  buzzer_passive: 'BUZZER',
  led_generic: 'LED',
  resistor_generic: 'RESISTOR',
  push_button_tactile: 'PUSH_BUTTON',
  potentiometer_10k: 'POTENTIOMETER',
};

const BREADBOARD_IDS = new Set(['breadboard_830', 'breadboard_400', 'breadboard_mini']);

function getComponentThumbnail(assetId: string): string {
  // Try breadboard SVGs first
  if (BREADBOARD_IDS.has(assetId)) {
    const svg = getBreadboardSvg(assetId);
    if (svg) return svg;
  }
  // Try component SVGs
  const svgKey = ASSET_TO_SVG_KEY[assetId];
  if (svgKey) {
    const svg = getComponentSvg(svgKey);
    if (svg) return svg;
  }
  return '';
}

/* ------------------------------------------------------------------ */
/*  Categories & component catalog data                                */
/* ------------------------------------------------------------------ */

interface CatalogEntry {
  assetId: string;
  displayName: string;
  description: string;
}

interface CategoryDef {
  id: string;
  label: string;
  emoji: string;
  color: string;
  glowColor: string;
  bgColor: string;
  borderColor: string;
  components: CatalogEntry[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: 'boards',
    label: 'Boards',
    emoji: '🔌',
    color: 'text-blue-400',
    glowColor: 'shadow-blue-500/20',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    components: [
      { assetId: 'arduino_uno_r3', displayName: 'Arduino Uno R3', description: COMPONENT_DESCRIPTIONS.arduino_uno_r3 },
      { assetId: 'esp32_devkit_v1', displayName: 'ESP32 DevKit V1', description: COMPONENT_DESCRIPTIONS.esp32_devkit_v1 },
      { assetId: 'arduino_nano', displayName: 'Arduino Nano', description: COMPONENT_DESCRIPTIONS.arduino_nano },
    ],
  },
  {
    id: 'breadboards',
    label: 'Breadboards',
    emoji: '🔧',
    color: 'text-yellow-400',
    glowColor: 'shadow-yellow-500/20',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    components: [
      { assetId: 'breadboard_830', displayName: 'Breadboard 830', description: COMPONENT_DESCRIPTIONS.breadboard_830 },
      { assetId: 'breadboard_400', displayName: 'Breadboard 400', description: COMPONENT_DESCRIPTIONS.breadboard_400 },
      { assetId: 'breadboard_mini', displayName: 'Breadboard Mini', description: COMPONENT_DESCRIPTIONS.breadboard_mini },
    ],
  },
  {
    id: 'sensors',
    label: 'Sensors',
    emoji: '📡',
    color: 'text-amber-400',
    glowColor: 'shadow-amber-500/20',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    components: [
      { assetId: 'hc_sr04', displayName: 'HC-SR04', description: COMPONENT_DESCRIPTIONS.hc_sr04 },
      { assetId: 'dht11_sensor', displayName: 'DHT11 Sensor', description: COMPONENT_DESCRIPTIONS.dht11_sensor },
      { assetId: 'mq2_gas_sensor', displayName: 'MQ-2 Gas Sensor', description: COMPONENT_DESCRIPTIONS.mq2_gas_sensor },
      { assetId: 'ir_sensor_module', displayName: 'IR Sensor', description: COMPONENT_DESCRIPTIONS.ir_sensor_module },
    ],
  },
  {
    id: 'displays',
    label: 'Displays',
    emoji: '🖥️',
    color: 'text-violet-400',
    glowColor: 'shadow-violet-500/20',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    components: [
      { assetId: 'oled_ssd1306', displayName: 'OLED SSD1306', description: COMPONENT_DESCRIPTIONS.oled_ssd1306 },
      { assetId: 'lcd1602', displayName: 'LCD 1602', description: COMPONENT_DESCRIPTIONS.lcd1602 },
    ],
  },
  {
    id: 'actuators',
    label: 'Actuators',
    emoji: '⚡',
    color: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/20',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    components: [
      { assetId: 'sg90_servo', displayName: 'SG90 Servo', description: COMPONENT_DESCRIPTIONS.sg90_servo },
      { assetId: 'relay_module', displayName: 'Relay Module', description: COMPONENT_DESCRIPTIONS.relay_module },
      { assetId: 'buzzer_passive', displayName: 'Buzzer', description: COMPONENT_DESCRIPTIONS.buzzer_passive },
    ],
  },
  {
    id: 'passive',
    label: 'Passive',
    emoji: '🔴',
    color: 'text-rose-400',
    glowColor: 'shadow-rose-500/20',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    components: [
      { assetId: 'led_generic', displayName: 'LED', description: COMPONENT_DESCRIPTIONS.led_generic },
      { assetId: 'resistor_generic', displayName: 'Resistor', description: COMPONENT_DESCRIPTIONS.resistor_generic },
    ],
  },
  {
    id: 'input',
    label: 'Input',
    emoji: '🎛️',
    color: 'text-cyan-400',
    glowColor: 'shadow-cyan-500/20',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    components: [
      { assetId: 'push_button_tactile', displayName: 'Push Button', description: COMPONENT_DESCRIPTIONS.push_button_tactile },
      { assetId: 'potentiometer_10k', displayName: 'Potentiometer', description: COMPONENT_DESCRIPTIONS.potentiometer_10k },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Fallback SVG icon builder                                          */
/* ------------------------------------------------------------------ */

function FallbackIcon({ color }: { name?: string; color: string }) {
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-lg ${color.replace('text-', 'bg-').replace('400', '500/20')}`}
    >
      <Package className={`h-6 w-6 ${color}`} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ComponentCard                                                       */
/* ------------------------------------------------------------------ */

interface ComponentCardProps {
  entry: CatalogEntry;
  categoryColor: string;
  onDragStart: (e: DragEvent<HTMLDivElement>, assetId: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (assetId: string) => void;
}

function ComponentCard({
  entry,
  categoryColor,
  onDragStart,
  isFavorite,
  onToggleFavorite,
}: ComponentCardProps) {
  const thumbnail = getComponentThumbnail(entry.assetId);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, entry.assetId)}
      className="group relative flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03]
                 px-3 py-2.5 cursor-grab
                 transition-all duration-200 ease-out
                 hover:border-white/[0.15] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-white/[0.02]
                 hover:scale-[1.02]
                 active:scale-[0.98] active:cursor-grabbing"
      role="button"
      aria-label={`Drag ${entry.displayName} component`}
      id={`catalog-card-${entry.assetId}`}
    >
      {/* Thumbnail */}
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800/60 ring-1 ring-white/[0.06] overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={entry.displayName}
            className="h-10 w-10 object-contain"
            draggable={false}
          />
        ) : (
          <FallbackIcon name={entry.displayName} color={categoryColor} />
        )}
        {/* Subtle corner shine */}
        <div className="absolute -top-px -right-px h-3 w-3 rounded-bl-lg bg-gradient-to-bl from-white/10 to-transparent" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-slate-200 group-hover:text-white transition-colors duration-150">
          {entry.displayName}
        </p>
        <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500 group-hover:text-slate-400 transition-colors duration-150">
          {entry.description}
        </p>
      </div>

      {/* Favorite */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggleFavorite(entry.assetId);
        }}
        className="shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200
                   hover:bg-white/10"
        aria-label={
          isFavorite
            ? `Remove ${entry.displayName} from favorites`
            : `Add ${entry.displayName} to favorites`
        }
      >
        <Star
          className={`h-3.5 w-3.5 transition-colors duration-200 ${
            isFavorite
              ? 'fill-amber-400 text-amber-400'
              : 'text-slate-600 hover:text-amber-400'
          }`}
        />
      </button>

      {/* Hover glow edge */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ring-1 ring-inset ring-white/[0.08]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CategorySection (accordion)                                        */
/* ------------------------------------------------------------------ */

interface CategorySectionProps {
  category: CategoryDef;
  isOpen: boolean;
  onToggle: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, assetId: string) => void;
  favorites: string[];
  onToggleFavorite: (assetId: string) => void;
  filteredComponents?: CatalogEntry[];
}

function CategorySection({
  category,
  isOpen,
  onToggle,
  onDragStart,
  favorites,
  onToggleFavorite,
  filteredComponents,
}: CategorySectionProps) {
  const components = filteredComponents ?? category.components;

  if (components.length === 0) return null;

  return (
    <div className="mb-1">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2
                    text-left transition-all duration-200
                    hover:bg-white/[0.04] ${isOpen ? 'bg-white/[0.02]' : ''}`}
        aria-expanded={isOpen}
        aria-controls={`category-${category.id}`}
        id={`category-header-${category.id}`}
      >
        <span className="text-base leading-none">{category.emoji}</span>
        <span className={`flex-1 text-xs font-semibold tracking-wide uppercase ${category.color}`}>
          {category.label}
        </span>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/[0.06] px-1.5 text-[10px] font-medium text-slate-500">
          {components.length}
        </span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 transition-transform duration-200" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-500 transition-transform duration-200" />
        )}
      </button>

      {/* Content */}
      <div
        id={`category-${category.id}`}
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-2">
          {components.map((comp) => (
            <ComponentCard
              key={comp.assetId}
              entry={comp}
              categoryColor={category.color}
              onDragStart={onDragStart}
              isFavorite={favorites.includes(comp.assetId)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ComponentCatalog — Main Export                                      */
/* ------------------------------------------------------------------ */

export function ComponentCatalog({ collapsed, onToggle }: ComponentCatalogProps) {
  const isPaletteOpen = useSimulatorStore((s) => s.isPaletteOpen);
  const setPaletteOpen = useSimulatorStore((s) => s.setPaletteOpen);
  const favorites = useSimulatorStore((s) => s.favorites);

  const toggleFavorite = useSimulatorStore((s) => s.toggleFavorite);
  const addRecent = useSimulatorStore((s) => s.addRecent);

  // Use prop-based collapse or store-based
  const isOpen = collapsed !== undefined ? !collapsed : isPaletteOpen;
  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle();
    } else {
      setPaletteOpen(!isOpen);
    }
  }, [onToggle, setPaletteOpen, isOpen]);

  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(CATEGORIES.map((c) => c.id)),
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── Toggle a single category ─────────────────────────────────── */
  const toggleCategory = useCallback((catId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  }, []);

  /* ── Search filtering ─────────────────────────────────────────── */
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return null; // null = show all

    const q = search.toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      components: cat.components.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.assetId.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          cat.label.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.components.length > 0);
  }, [search]);

  /* ── Total component count ────────────────────────────────────── */
  const totalCount = useMemo(() => {
    if (filteredCategories) {
      return filteredCategories.reduce((n, c) => n + c.components.length, 0);
    }
    return CATEGORIES.reduce((n, c) => n + c.components.length, 0);
  }, [filteredCategories]);

  /* ── Drag handler ─────────────────────────────────────────────── */
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, assetId: string) => {
      e.dataTransfer.setData('application/x-stemverse-asset', assetId);
      e.dataTransfer.effectAllowed = 'copy';
      addRecent(assetId);
    },
    [addRecent],
  );

  /* ── Collapsed state ───────────────────────────────────────────── */
  if (!isOpen) {
    return (
      <div className="flex flex-col items-center border-r border-white/[0.06] bg-slate-900/80 backdrop-blur-xl py-4 px-1.5 gap-2">
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-slate-400
                     hover:bg-white/[0.1] hover:text-white transition-all duration-200
                     hover:shadow-lg hover:shadow-blue-500/10"
          aria-label="Open component catalog"
          id="catalog-toggle-open"
        >
          <Package className="h-4 w-4" />
        </button>

        {/* Vertical label */}
        <div className="mt-2 flex flex-col items-center gap-0.5">
          {'CATALOG'.split('').map((char, i) => (
            <span
              key={i}
              className="text-[9px] font-bold tracking-widest text-slate-600 select-none"
            >
              {char}
            </span>
          ))}
        </div>
      </div>
    );
  }

  /* ── Expanded state ────────────────────────────────────────────── */
  const categoriesToRender = filteredCategories ?? CATEGORIES;

  return (
    <aside
      className="flex w-[280px] flex-col border-r border-white/[0.06] bg-slate-900/95 backdrop-blur-xl
                 transition-all duration-300 ease-out"
      id="component-catalog-panel"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 ring-1 ring-white/[0.08]">
          <Package className="h-3.5 w-3.5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-100 tracking-tight">Components</h2>
          <p className="text-[10px] text-slate-500 leading-none mt-0.5">
            {totalCount} available
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500
                     hover:bg-white/[0.06] hover:text-slate-300 transition-all duration-200"
          aria-label="Collapse component catalog"
          id="catalog-toggle-close"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components..."
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-9 pr-8 py-2
                       text-xs text-slate-200 placeholder:text-slate-600
                       focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/30
                       focus:bg-white/[0.05]
                       transition-all duration-200"
            aria-label="Search components"
            id="catalog-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center
                         rounded-full bg-white/[0.08] text-slate-500 hover:text-slate-300 hover:bg-white/[0.15]
                         transition-all duration-150"
              aria-label="Clear search"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Category accordion list ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/50">
        {categoriesToRender.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
              <Search className="h-6 w-6 text-slate-600" />
            </div>
            <p className="text-center text-xs text-slate-500">
              No components match<br />
              <span className="font-semibold text-slate-400">&quot;{search}&quot;</span>
            </p>
          </div>
        ) : (
          categoriesToRender.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              isOpen={search.trim() ? true : openCategories.has(cat.id)}
              onToggle={() => toggleCategory(cat.id)}
              onDragStart={handleDragStart}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              filteredComponents={
                filteredCategories
                  ? cat.components
                  : undefined
              }
            />
          ))
        )}
      </div>

      {/* ── Footer hint ────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.04] px-4 py-2.5">
        <p className="text-[10px] text-slate-600 text-center leading-relaxed">
          Drag components to the canvas to build your circuit
        </p>
      </div>
    </aside>
  );
}
