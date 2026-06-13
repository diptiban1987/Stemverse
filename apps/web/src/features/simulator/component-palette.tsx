'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  Clock,
  Cpu,
  Radar,
  Monitor,
  Cog,
  Zap,
  CircuitBoard,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { useSimulatorStore } from './simulator-store';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ComponentPaletteProps {
  onComponentDrag: (assetId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component catalog                                                  */
/* ------------------------------------------------------------------ */

interface PaletteComponent {
  assetId: string;
  displayName: string;
  category: Category;
}

type Category = 'Boards' | 'Sensors' | 'Displays' | 'Actuators' | 'Power' | 'Basic' | 'Communication';

const CATEGORIES: { id: Category; icon: LucideIcon }[] = [
  { id: 'Boards', icon: Cpu },
  { id: 'Sensors', icon: Radar },
  { id: 'Displays', icon: Monitor },
  { id: 'Actuators', icon: Cog },
  { id: 'Power', icon: Zap },
  { id: 'Basic', icon: CircuitBoard },
  { id: 'Communication', icon: Wifi },
];

const COMPONENTS: PaletteComponent[] = [
  // Boards
  { assetId: 'esp32_devkit_v1', displayName: 'ESP32 DevKit', category: 'Boards' },
  { assetId: 'arduino_uno_r3', displayName: 'Arduino Uno', category: 'Boards' },
  { assetId: 'arduino_nano', displayName: 'Arduino Nano', category: 'Boards' },
  // Sensors
  { assetId: 'hc_sr04', displayName: 'HC-SR04', category: 'Sensors' },
  { assetId: 'ir_sensor', displayName: 'IR Sensor', category: 'Sensors' },
  { assetId: 'mq2_sensor', displayName: 'MQ-2 Gas', category: 'Sensors' },
  { assetId: 'dht11_sensor', displayName: 'DHT11', category: 'Sensors' },
  // Displays
  { assetId: 'oled_ssd1306', displayName: 'OLED SSD1306', category: 'Displays' },
  { assetId: 'lcd_1602', displayName: 'LCD 1602', category: 'Displays' },
  // Actuators
  { assetId: 'sg90_servo', displayName: 'SG90 Servo', category: 'Actuators' },
  { assetId: 'relay_module', displayName: 'Relay Module', category: 'Actuators' },
  { assetId: 'buzzer', displayName: 'Buzzer', category: 'Actuators' },
  // Power
  { assetId: 'breadboard_830', displayName: 'Breadboard 830', category: 'Power' },
  { assetId: 'breadboard_400', displayName: 'Breadboard 400', category: 'Power' },
  { assetId: 'breadboard_mini', displayName: 'Breadboard Mini', category: 'Power' },
  // Basic
  { assetId: 'led_generic', displayName: 'LED', category: 'Basic' },
  { assetId: 'resistor_generic', displayName: 'Resistor', category: 'Basic' },
  { assetId: 'potentiometer', displayName: 'Potentiometer', category: 'Basic' },
  { assetId: 'push_button', displayName: 'Push Button', category: 'Basic' },
];

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_COLORS: Record<Category, string> = {
  Boards: 'bg-blue-500/20 text-blue-400',
  Sensors: 'bg-amber-500/20 text-amber-400',
  Displays: 'bg-violet-500/20 text-violet-400',
  Actuators: 'bg-emerald-500/20 text-emerald-400',
  Power: 'bg-yellow-500/20 text-yellow-400',
  Basic: 'bg-slate-500/20 text-slate-400',
  Communication: 'bg-cyan-500/20 text-cyan-400',
};

const CATEGORY_CIRCLE: Record<Category, string> = {
  Boards: 'bg-blue-500',
  Sensors: 'bg-amber-500',
  Displays: 'bg-violet-500',
  Actuators: 'bg-emerald-500',
  Power: 'bg-yellow-500',
  Basic: 'bg-slate-500',
  Communication: 'bg-cyan-500',
};

/* ------------------------------------------------------------------ */
/*  Filters                                                            */
/* ------------------------------------------------------------------ */

type FilterMode = 'all' | 'favorites' | 'recent' | Category;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ComponentPalette({ onComponentDrag }: ComponentPaletteProps) {
  const isPaletteOpen = useSimulatorStore((s) => s.isPaletteOpen);
  const setPaletteOpen = useSimulatorStore((s) => s.setPaletteOpen);
  const favorites = useSimulatorStore((s) => s.favorites);
  const recentComponents = useSimulatorStore((s) => s.recentComponents);
  const toggleFavorite = useSimulatorStore((s) => s.toggleFavorite);
  const addRecent = useSimulatorStore((s) => s.addRecent);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');

  /* ── Filtered components ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = COMPONENTS;

    // Category or special filter
    if (activeFilter === 'favorites') {
      list = list.filter((c) => favorites.includes(c.assetId));
    } else if (activeFilter === 'recent') {
      const order = new Map(recentComponents.map((id, i) => [id, i]));
      list = list
        .filter((c) => order.has(c.assetId))
        .sort((a, b) => (order.get(a.assetId) ?? 0) - (order.get(b.assetId) ?? 0));
    } else if (activeFilter !== 'all') {
      list = list.filter((c) => c.category === activeFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.assetId.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q),
      );
    }

    return list;
  }, [activeFilter, favorites, recentComponents, search]);

  /* ── Collapsed state ────────────────────────────────────────────── */
  if (!isPaletteOpen) {
    return (
      <div className="flex flex-col items-center border-r border-border bg-card/50 backdrop-blur-md py-3 px-1.5">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="p-1.5 rounded-lg text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200"
          aria-label="Open component palette"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  /* ── Open state ─────────────────────────────────────────────────── */
  return (
    <aside className="w-72 flex flex-col bg-card/50 backdrop-blur-md border-r border-border transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Components</h2>
        <button
          type="button"
          onClick={() => setPaletteOpen(false)}
          className="p-1 rounded-md text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200"
          aria-label="Collapse component palette"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components…"
            className="w-full rounded-lg border border-border/50 bg-background/60 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
            aria-label="Search components"
          />
        </div>
      </div>

      {/* Special filters row */}
      <div className="flex items-center gap-1 px-3 pb-1.5">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
            activeFilter === 'all'
              ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
              : 'text-muted hover:bg-primary/10'
          }`}
          aria-label="Show all components"
          aria-pressed={activeFilter === 'all'}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('favorites')}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
            activeFilter === 'favorites'
              ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
              : 'text-muted hover:bg-primary/10'
          }`}
          aria-label="Show favorites"
          aria-pressed={activeFilter === 'favorites'}
        >
          <Star className="h-3 w-3" /> Fav
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('recent')}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
            activeFilter === 'recent'
              ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
              : 'text-muted hover:bg-primary/10'
          }`}
          aria-label="Show recent components"
          aria-pressed={activeFilter === 'recent'}
        >
          <Clock className="h-3 w-3" /> Recent
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 overflow-x-auto px-3 pb-2 scrollbar-hide">
        {CATEGORIES.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveFilter(id)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
              activeFilter === id
                ? `${CATEGORY_COLORS[id]} ring-1 ring-current/20`
                : 'text-muted hover:bg-primary/10'
            }`}
            aria-label={`Filter ${id}`}
            aria-pressed={activeFilter === id}
          >
            <Icon className="h-3 w-3" />
            {id}
          </button>
        ))}
      </div>

      {/* Component grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filtered.length === 0 ? (
          <p className="mt-6 text-center text-xs text-muted/60">No matching components</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((comp) => {
              const isFav = favorites.includes(comp.assetId);
              return (
                <div
                  key={comp.assetId}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-stemverse-asset', comp.assetId);
                    e.dataTransfer.effectAllowed = 'copy';
                    addRecent(comp.assetId);
                    onComponentDrag(comp.assetId);
                  }}
                  className="group relative rounded-xl border border-border/50 bg-background/60 p-2.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-grab active:cursor-grabbing"
                  role="button"
                  aria-label={`Drag ${comp.displayName} component`}
                >
                  {/* Favorite toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(comp.assetId);
                    }}
                    className="absolute top-1.5 right-1.5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    aria-label={isFav ? `Remove ${comp.displayName} from favorites` : `Add ${comp.displayName} to favorites`}
                  >
                    <Star
                      className={`h-3 w-3 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-muted hover:text-amber-400'}`}
                    />
                  </button>

                  {/* Icon circle */}
                  <div
                    className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${CATEGORY_CIRCLE[comp.category]} text-white text-xs font-bold`}
                  >
                    {comp.displayName.charAt(0)}
                  </div>

                  {/* Display name */}
                  <p className="text-center text-[10px] font-medium text-foreground leading-tight truncate">
                    {comp.displayName}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
