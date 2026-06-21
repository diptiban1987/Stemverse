// ============================================================================
// Phase 19D – Component SVG Assets
// ============================================================================
// Provides high-fidelity inline SVG data URIs for every electronic component
// rendered on the virtual breadboard stage.  No external dependencies.
//
// Public API
// ----------
//   getComponentSvg(componentType: string): string
//   getBreadboardSvg(assetId: string): string
//   getAllComponentSvgAssets(): Map<string, string>
// ============================================================================

// ─── Helper ────────────────────────────────────────────────────────────────────
function svgToDataUri(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ─── SVG Raw Strings ───────────────────────────────────────────────────────────

// ── ESP32 DevKit V1 ─────────────────────────────────────────────────────────
const ESP32_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 550">
  <defs>
    <linearGradient id="esp-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1976D2"/>
      <stop offset="50%" stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </linearGradient>
    <linearGradient id="esp-antenna" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F0F0F0"/>
      <stop offset="30%" stop-color="#E0E0E0"/>
      <stop offset="100%" stop-color="#9E9E9E"/>
    </linearGradient>
    <linearGradient id="esp-antenna-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#BDBDBD"/>
      <stop offset="100%" stop-color="#757575"/>
    </linearGradient>
    <linearGradient id="gold-pin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFF176"/>
      <stop offset="25%" stop-color="#FFD54F"/>
      <stop offset="75%" stop-color="#FFCA28"/>
      <stop offset="100%" stop-color="#F9A825"/>
    </linearGradient>
    <linearGradient id="esp-usb-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E0E0E0"/>
      <stop offset="15%" stop-color="#D0D0D0"/>
      <stop offset="50%" stop-color="#B0BEC5"/>
      <stop offset="85%" stop-color="#90A4AE"/>
      <stop offset="100%" stop-color="#78909C"/>
    </linearGradient>
    <linearGradient id="esp-vreg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#333"/>
      <stop offset="100%" stop-color="#111"/>
    </linearGradient>
    <radialGradient id="esp-cap" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#6D4C41"/>
      <stop offset="100%" stop-color="#3E2723"/>
    </radialGradient>
    <pattern id="esp-solder-mask" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="none"/>
      <circle cx="6" cy="6" r="0.4" fill="#1E88E5" opacity="0.25"/>
    </pattern>
    <pattern id="esp-copper-trace" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="none"/>
      <line x1="0" y1="20" x2="40" y2="20" stroke="#1A5BA8" stroke-width="0.3" opacity="0.15"/>
      <line x1="20" y1="0" x2="20" y2="40" stroke="#1A5BA8" stroke-width="0.3" opacity="0.15"/>
    </pattern>
    <filter id="esp-shadow" x="-4%" y="-2%" width="108%" height="104%">
      <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <filter id="esp-inner-shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
      <feOffset dx="0" dy="1" result="offset"/>
      <feComposite in="offset" in2="SourceGraphic" operator="atop" result="comp"/>
    </filter>
  </defs>
  <!-- PCB Board -->
  <rect x="50" y="10" width="200" height="530" rx="6" fill="url(#esp-pcb)" filter="url(#esp-shadow)" stroke="#0A3D91" stroke-width="1.5"/>
  <!-- Solder mask texture overlay -->
  <rect x="50" y="10" width="200" height="530" rx="6" fill="url(#esp-solder-mask)"/>
  <!-- Copper trace pattern -->
  <rect x="55" y="130" width="190" height="360" rx="3" fill="url(#esp-copper-trace)"/>
  <!-- PCB edge bevel highlight -->
  <rect x="50" y="10" width="200" height="3" rx="2" fill="#2196F3" opacity="0.25"/>
  <!-- Inner solder mask border -->
  <rect x="55" y="15" width="190" height="520" rx="4" fill="none" stroke="#1976D2" stroke-width="0.5" opacity="0.35"/>
  <!-- Mounting holes -->
  <circle cx="62" cy="22" r="4" fill="none" stroke="#90CAF9" stroke-width="1" opacity="0.5"/>
  <circle cx="238" cy="22" r="4" fill="none" stroke="#90CAF9" stroke-width="1" opacity="0.5"/>
  <circle cx="62" cy="528" r="4" fill="none" stroke="#90CAF9" stroke-width="1" opacity="0.5"/>
  <circle cx="238" cy="528" r="4" fill="none" stroke="#90CAF9" stroke-width="1" opacity="0.5"/>
  <!-- ═══ ESP-WROOM-32 Module ═══ -->
  <!-- Module metal shield -->
  <rect x="75" y="20" width="150" height="130" rx="3" fill="url(#esp-antenna)" stroke="#757575" stroke-width="1.2"/>
  <!-- Shield edge bevel -->
  <rect x="75" y="20" width="150" height="4" rx="2" fill="#FFFFFF" opacity="0.2"/>
  <rect x="75" y="146" width="150" height="4" rx="2" fill="#616161" opacity="0.3"/>
  <!-- Antenna area (PCB trace antenna extends beyond shield) -->
  <rect x="100" y="20" width="100" height="55" rx="2" fill="none" stroke="#BDBDBD" stroke-width="0.6"/>
  <!-- Antenna meander trace pattern -->
  <line x1="108" y1="28" x2="192" y2="28" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="108" y1="36" x2="192" y2="36" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="108" y1="44" x2="192" y2="44" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="108" y1="52" x2="192" y2="52" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="108" y1="60" x2="192" y2="60" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="108" y1="68" x2="192" y2="68" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="120" y1="22" x2="120" y2="73" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="140" y1="22" x2="140" y2="73" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="160" y1="22" x2="160" y2="73" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="180" y1="22" x2="180" y2="73" stroke="#BDBDBD" stroke-width="0.5"/>
  <!-- Shield ground pads -->
  <rect x="78" y="80" width="6" height="3" rx="0.5" fill="#BDBDBD"/>
  <rect x="78" y="100" width="6" height="3" rx="0.5" fill="#BDBDBD"/>
  <rect x="78" y="120" width="6" height="3" rx="0.5" fill="#BDBDBD"/>
  <rect x="216" y="80" width="6" height="3" rx="0.5" fill="#BDBDBD"/>
  <rect x="216" y="100" width="6" height="3" rx="0.5" fill="#BDBDBD"/>
  <rect x="216" y="120" width="6" height="3" rx="0.5" fill="#BDBDBD"/>
  <!-- Module silkscreen text -->
  <text x="150" y="95" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#616161" font-weight="bold" letter-spacing="0.5">ESP-WROOM-32</text>
  <text x="150" y="108" text-anchor="middle" font-family="monospace" font-size="5.5" fill="#888" letter-spacing="0.3">FCC ID: 2AC7Z</text>
  <!-- Pin 1 dot on module -->
  <circle cx="85" cy="142" r="2.5" fill="#888"/>
  <!-- ═══ QFN chip inside (visible thru shield text area) ═══ -->
  <rect x="120" y="115" width="60" height="30" rx="1" fill="#1A1A1A" stroke="#333" stroke-width="0.5"/>
  <circle cx="125" cy="120" r="2" fill="#444"/>
  <text x="150" y="134" text-anchor="middle" font-family="monospace" font-size="6" fill="#666">ESP32-D0WDQ6</text>
  <!-- ═══ Crystal Oscillator (40MHz) ═══ -->
  <rect x="85" y="160" width="22" height="10" rx="2" fill="#C0CA33" stroke="#9E9D24" stroke-width="0.6"/>
  <text x="96" y="168" text-anchor="middle" font-family="monospace" font-size="4.5" fill="#33691E" font-weight="bold">40MHz</text>
  <!-- ═══ Decoupling Capacitors ═══ -->
  <rect x="118" y="162" width="8" height="5" rx="1" fill="#795548" stroke="#5D4037" stroke-width="0.3"/>
  <rect x="130" y="162" width="8" height="5" rx="1" fill="#795548" stroke="#5D4037" stroke-width="0.3"/>
  <rect x="142" y="162" width="8" height="5" rx="1" fill="#795548" stroke="#5D4037" stroke-width="0.3"/>
  <!-- ═══ Voltage Regulator (AMS1117-3.3) ═══ -->
  <rect x="175" y="156" width="30" height="18" rx="1" fill="url(#esp-vreg)" stroke="#444" stroke-width="0.8"/>
  <rect x="175" y="156" width="30" height="4" rx="1" fill="#444" opacity="0.5"/>
  <rect x="183" y="174" width="14" height="4" rx="0.5" fill="#B0BEC5"/>
  <text x="190" y="168" text-anchor="middle" font-family="monospace" font-size="4" fill="#999">AMS1117</text>
  <text x="190" y="173" text-anchor="middle" font-family="monospace" font-size="3.5" fill="#888">3.3V</text>
  <!-- ═══ CP2102 USB-UART Bridge ═══ -->
  <rect x="105" y="470" width="30" height="20" rx="1" fill="#1A1A1A" stroke="#333" stroke-width="0.6"/>
  <circle cx="110" cy="475" r="1.5" fill="#444"/>
  <text x="120" y="483" text-anchor="middle" font-family="monospace" font-size="4" fill="#777">CP2102</text>
  <!-- ═══ Micro-USB Port (3D) ═══ -->
  <!-- USB outer shell -->
  <rect x="118" y="498" width="64" height="22" rx="3" fill="url(#esp-usb-body)" stroke="#607D8B" stroke-width="1.2"/>
  <!-- USB top bevel highlight -->
  <rect x="119" y="498" width="62" height="4" rx="2" fill="#FFFFFF" opacity="0.18"/>
  <!-- USB inner cavity -->
  <rect x="125" y="502" width="50" height="14" rx="2" fill="#263238" stroke="#37474F" stroke-width="0.8"/>
  <!-- USB contact pins inside -->
  <rect x="132" y="506" width="36" height="6" rx="1" fill="#37474F"/>
  <rect x="136" y="507" width="5" height="4" rx="0.5" fill="#FFD54F" opacity="0.6"/>
  <rect x="144" y="507" width="5" height="4" rx="0.5" fill="#FFD54F" opacity="0.6"/>
  <rect x="152" y="507" width="5" height="4" rx="0.5" fill="#FFD54F" opacity="0.6"/>
  <rect x="160" y="507" width="5" height="4" rx="0.5" fill="#FFD54F" opacity="0.6"/>
  <!-- USB bottom shadow -->
  <rect x="120" y="518" width="60" height="2" rx="1" fill="#546E7A" opacity="0.4"/>
  <!-- USB mounting tabs -->
  <rect x="116" y="501" width="4" height="16" rx="1" fill="#90A4AE" stroke="#78909C" stroke-width="0.5"/>
  <rect x="180" y="501" width="4" height="16" rx="1" fill="#90A4AE" stroke="#78909C" stroke-width="0.5"/>
  <text x="150" y="535" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#90CAF9" letter-spacing="1">MICRO USB</text>
  <!-- ═══ EN Button ═══ -->
  <rect x="63" y="430" width="28" height="16" rx="2" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="1"/>
  <rect x="63" y="430" width="28" height="3" rx="1" fill="#FFFFFF" opacity="0.2"/>
  <rect x="68" y="433" width="18" height="10" rx="1.5" fill="#FAFAFA" stroke="#BDBDBD" stroke-width="0.5"/>
  <text x="77" y="460" text-anchor="middle" font-family="Arial,sans-serif" font-size="6.5" fill="#90CAF9" font-weight="bold">EN</text>
  <!-- ═══ BOOT Button ═══ -->
  <rect x="209" y="430" width="28" height="16" rx="2" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="1"/>
  <rect x="209" y="430" width="28" height="3" rx="1" fill="#FFFFFF" opacity="0.2"/>
  <rect x="214" y="433" width="18" height="10" rx="1.5" fill="#FAFAFA" stroke="#BDBDBD" stroke-width="0.5"/>
  <text x="223" y="460" text-anchor="middle" font-family="Arial,sans-serif" font-size="6.5" fill="#90CAF9" font-weight="bold">BOOT</text>
  <!-- ═══ Power LED (Red) ═══ -->
  <circle cx="90" cy="210" r="4.5" fill="#F44336" opacity="0.3"/>
  <circle cx="90" cy="210" r="3" fill="#F44336" opacity="0.85"/>
  <circle cx="90" cy="210" r="1.5" fill="#FF8A80"/>
  <circle cx="88" cy="208" r="0.8" fill="#FFFFFF" opacity="0.5"/>
  <text x="90" y="202" text-anchor="middle" font-family="monospace" font-size="4.5" fill="#90CAF9">PWR</text>
  <!-- ═══ User LED (Blue, GPIO2) ═══ -->
  <circle cx="110" cy="210" r="3" fill="#2196F3" opacity="0.7"/>
  <circle cx="110" cy="210" r="1.5" fill="#90CAF9"/>
  <text x="110" y="202" text-anchor="middle" font-family="monospace" font-size="4.5" fill="#90CAF9">IO2</text>
  <!-- ═══ Left Pin Row (15 pins) ═══ -->
  <g id="esp-left-pins">
    ${Array.from({length: 15}, (_, i) => {
      const y = 140 + i * 24;
      return `<rect x="30" y="${y}" width="25" height="8" rx="1" fill="url(#gold-pin)" stroke="#F57F17" stroke-width="0.5"/><rect x="30" y="${y}" width="25" height="2" rx="0.5" fill="#FFFFFF" opacity="0.15"/>`;
    }).join('\n    ')}
  </g>
  <!-- ═══ Right Pin Row (15 pins) ═══ -->
  <g id="esp-right-pins">
    ${Array.from({length: 15}, (_, i) => {
      const y = 140 + i * 24;
      return `<rect x="245" y="${y}" width="25" height="8" rx="1" fill="url(#gold-pin)" stroke="#F57F17" stroke-width="0.5"/><rect x="245" y="${y}" width="25" height="2" rx="0.5" fill="#FFFFFF" opacity="0.15"/>`;
    }).join('\n    ')}
  </g>
  <!-- Pin Labels Left (silkscreen style) -->
  <text x="46" y="148" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end" font-weight="bold">3V3</text>
  <text x="46" y="172" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">GND</text>
  <text x="46" y="196" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">D15</text>
  <text x="46" y="220" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">D2</text>
  <text x="46" y="244" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">D4</text>
  <text x="46" y="268" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">RX2</text>
  <text x="46" y="292" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">TX2</text>
  <text x="46" y="316" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">D5</text>
  <text x="46" y="340" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">D18</text>
  <text x="46" y="364" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">D19</text>
  <text x="46" y="388" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">D21</text>
  <text x="46" y="412" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">RX0</text>
  <text x="46" y="436" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">TX0</text>
  <text x="46" y="460" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">D22</text>
  <text x="46" y="484" font-family="monospace" font-size="6" fill="#E3F2FD" text-anchor="end">D23</text>
  <!-- Pin Labels Right (silkscreen style) -->
  <text x="254" y="148" font-family="monospace" font-size="6" fill="#E3F2FD" font-weight="bold">VIN</text>
  <text x="254" y="172" font-family="monospace" font-size="6" fill="#E3F2FD">GND</text>
  <text x="254" y="196" font-family="monospace" font-size="6" fill="#E3F2FD">D13</text>
  <text x="254" y="220" font-family="monospace" font-size="6" fill="#E3F2FD">D12</text>
  <text x="254" y="244" font-family="monospace" font-size="6" fill="#E3F2FD">D14</text>
  <text x="254" y="268" font-family="monospace" font-size="6" fill="#E3F2FD">D27</text>
  <text x="254" y="292" font-family="monospace" font-size="6" fill="#E3F2FD">D26</text>
  <text x="254" y="316" font-family="monospace" font-size="6" fill="#E3F2FD">D25</text>
  <text x="254" y="340" font-family="monospace" font-size="6" fill="#E3F2FD">D33</text>
  <text x="254" y="364" font-family="monospace" font-size="6" fill="#E3F2FD">D32</text>
  <text x="254" y="388" font-family="monospace" font-size="6" fill="#E3F2FD">D35</text>
  <text x="254" y="412" font-family="monospace" font-size="6" fill="#E3F2FD">D34</text>
  <text x="254" y="436" font-family="monospace" font-size="6" fill="#E3F2FD">SVN</text>
  <text x="254" y="460" font-family="monospace" font-size="6" fill="#E3F2FD">SVP</text>
  <text x="254" y="484" font-family="monospace" font-size="6" fill="#E3F2FD">EN</text>
  <!-- ═══ Board Silkscreen Label ═══ -->
  <text x="150" y="400" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#E3F2FD" font-weight="bold" letter-spacing="0.8">ESP32 DevKit V1</text>
  <text x="150" y="414" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" fill="#90CAF9" letter-spacing="0.5">DOIT · 30-pin</text>
  <!-- PCB bottom bevel -->
  <rect x="50" y="537" width="200" height="3" rx="2" fill="#0A3D91" opacity="0.4"/>
</svg>`;

// ── Arduino Uno R3 ──────────────────────────────────────────────────────────
const ARDUINO_UNO_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350">
  <defs>
    <linearGradient id="uno-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00897B"/>
      <stop offset="40%" stop-color="#00796B"/>
      <stop offset="100%" stop-color="#00695C"/>
    </linearGradient>
    <linearGradient id="uno-usb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E8E8E8"/>
      <stop offset="15%" stop-color="#D5D5D5"/>
      <stop offset="50%" stop-color="#C0C0C0"/>
      <stop offset="85%" stop-color="#A0A0A0"/>
      <stop offset="100%" stop-color="#909090"/>
    </linearGradient>
    <linearGradient id="uno-usb-inner" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#78909C"/>
      <stop offset="100%" stop-color="#37474F"/>
    </linearGradient>
    <linearGradient id="uno-barrel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#555"/>
      <stop offset="30%" stop-color="#424242"/>
      <stop offset="100%" stop-color="#1A1A1A"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFF176"/>
      <stop offset="25%" stop-color="#FFD54F"/>
      <stop offset="75%" stop-color="#FFCA28"/>
      <stop offset="100%" stop-color="#F9A825"/>
    </linearGradient>
    <linearGradient id="uno-vreg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#333"/>
      <stop offset="100%" stop-color="#111"/>
    </linearGradient>
    <linearGradient id="uno-dip-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#333"/>
      <stop offset="50%" stop-color="#212121"/>
      <stop offset="100%" stop-color="#1A1A1A"/>
    </linearGradient>
    <pattern id="uno-solder-mask" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="14" height="14" fill="none"/>
      <circle cx="7" cy="7" r="0.4" fill="#009688" opacity="0.2"/>
    </pattern>
    <pattern id="uno-copper" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
      <rect width="50" height="50" fill="none"/>
      <line x1="0" y1="25" x2="50" y2="25" stroke="#00695C" stroke-width="0.3" opacity="0.12"/>
      <line x1="25" y1="0" x2="25" y2="50" stroke="#00695C" stroke-width="0.3" opacity="0.12"/>
    </pattern>
    <filter id="uno-shadow" x="-3%" y="-3%" width="106%" height="106%">
      <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.3"/>
    </filter>
    <radialGradient id="uno-cap" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#6D4C41"/>
      <stop offset="100%" stop-color="#3E2723"/>
    </radialGradient>
  </defs>
  <!-- PCB Board with realistic teal Arduino color -->
  <rect x="10" y="10" width="480" height="330" rx="8" fill="url(#uno-pcb)" filter="url(#uno-shadow)" stroke="#004D40" stroke-width="1.5"/>
  <!-- Solder mask texture -->
  <rect x="10" y="10" width="480" height="330" rx="8" fill="url(#uno-solder-mask)"/>
  <!-- Copper trace hints -->
  <rect x="60" y="50" width="400" height="260" fill="url(#uno-copper)"/>
  <!-- PCB edge highlight -->
  <rect x="10" y="10" width="480" height="3" rx="4" fill="#26A69A" opacity="0.25"/>
  <!-- Mounting holes with copper annular rings -->
  <circle cx="30" cy="30" r="8" fill="none" stroke="#80CBC4" stroke-width="1" opacity="0.5"/>
  <circle cx="30" cy="30" r="5" fill="none" stroke="#B2DFDB" stroke-width="1.5"/>
  <circle cx="30" cy="310" r="8" fill="none" stroke="#80CBC4" stroke-width="1" opacity="0.5"/>
  <circle cx="30" cy="310" r="5" fill="none" stroke="#B2DFDB" stroke-width="1.5"/>
  <circle cx="460" cy="30" r="8" fill="none" stroke="#80CBC4" stroke-width="1" opacity="0.5"/>
  <circle cx="460" cy="30" r="5" fill="none" stroke="#B2DFDB" stroke-width="1.5"/>
  <circle cx="460" cy="310" r="8" fill="none" stroke="#80CBC4" stroke-width="1" opacity="0.5"/>
  <circle cx="460" cy="310" r="5" fill="none" stroke="#B2DFDB" stroke-width="1.5"/>
  <!-- ═══ USB-B Port (3D metallic) ═══ -->
  <!-- USB outer shell -->
  <rect x="5" y="95" width="60" height="50" rx="3" fill="url(#uno-usb)" stroke="#78909C" stroke-width="1.5"/>
  <!-- USB top bevel -->
  <rect x="6" y="95" width="58" height="5" rx="2" fill="#FFFFFF" opacity="0.15"/>
  <!-- USB inner cavity -->
  <rect x="12" y="102" width="45" height="36" rx="2" fill="url(#uno-usb-inner)" stroke="#455A64" stroke-width="0.8"/>
  <!-- USB contact block inside -->
  <rect x="18" y="112" width="33" height="16" rx="1.5" fill="#546E7A"/>
  <!-- USB pins inside -->
  <rect x="22" y="114" width="4" height="12" rx="0.5" fill="#FFD54F" opacity="0.5"/>
  <rect x="30" y="114" width="4" height="12" rx="0.5" fill="#FFD54F" opacity="0.5"/>
  <rect x="38" y="114" width="4" height="12" rx="0.5" fill="#FFD54F" opacity="0.5"/>
  <rect x="46" y="114" width="4" height="12" rx="0.5" fill="#FFD54F" opacity="0.5"/>
  <!-- USB mounting tabs -->
  <rect x="8" y="98" width="5" height="8" rx="1" fill="#B0BEC5"/>
  <rect x="8" y="134" width="5" height="8" rx="1" fill="#B0BEC5"/>
  <!-- USB bottom shadow -->
  <rect x="7" y="143" width="56" height="2" rx="1" fill="#78909C" opacity="0.4"/>
  <text x="37" y="155" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" fill="#B2DFDB" letter-spacing="0.5">USB-B</text>
  <!-- ═══ DC Barrel Jack (3D) ═══ -->
  <rect x="5" y="205" width="50" height="36" rx="3" fill="url(#uno-barrel)" stroke="#616161" stroke-width="1.2"/>
  <rect x="5" y="205" width="50" height="4" rx="2" fill="#666" opacity="0.3"/>
  <circle cx="30" cy="223" r="9" fill="#2A2A2A" stroke="#555" stroke-width="1.2"/>
  <circle cx="30" cy="223" r="5" fill="#1A1A1A" stroke="#444" stroke-width="0.5"/>
  <circle cx="30" cy="223" r="2" fill="#111"/>
  <circle cx="27" cy="220" r="1" fill="#555" opacity="0.4"/>
  <text x="30" y="250" text-anchor="middle" font-family="monospace" font-size="5" fill="#B2DFDB">DC 7-12V</text>
  <!-- ═══ ATmega328P DIP-28 Chip ═══ -->
  <rect x="185" y="115" width="100" height="40" rx="2" fill="url(#uno-dip-body)" stroke="#424242" stroke-width="1"/>
  <!-- Chip top highlight -->
  <rect x="185" y="115" width="100" height="5" rx="1" fill="#444" opacity="0.3"/>
  <!-- Pin 1 notch -->
  <ellipse cx="195" cy="135" rx="5" ry="5" fill="#2A2A2A" stroke="#444" stroke-width="0.5"/>
  <!-- Chip text -->
  <text x="240" y="132" text-anchor="middle" font-family="monospace" font-size="6.5" fill="#B0B0B0" font-weight="bold">ATmega328P</text>
  <text x="240" y="142" text-anchor="middle" font-family="monospace" font-size="4.5" fill="#888">PU · 1822</text>
  <!-- DIP chip pins (14 per side) -->
  ${Array.from({length: 14}, (_, i) => {
    const x = 190 + i * 6.5;
    return `<rect x="${x}" y="${108}" width="3" height="8" rx="0.3" fill="#B0BEC5" stroke="#90A4AE" stroke-width="0.2"/>
    <rect x="${x}" y="${155}" width="3" height="8" rx="0.3" fill="#B0BEC5" stroke="#90A4AE" stroke-width="0.2"/>`;
  }).join('\n  ')}
  <!-- ═══ Crystal Oscillator (16MHz) ═══ -->
  <rect x="300" y="120" width="24" height="12" rx="3" fill="#C0CA33" stroke="#9E9D24" stroke-width="0.8"/>
  <rect x="300" y="120" width="24" height="3" rx="1.5" fill="#DCE775" opacity="0.3"/>
  <text x="312" y="130" text-anchor="middle" font-family="monospace" font-size="5" fill="#33691E" font-weight="bold">16MHz</text>
  <!-- Crystal loading caps -->
  <rect x="300" y="136" width="6" height="4" rx="0.8" fill="url(#uno-cap)"/>
  <rect x="318" y="136" width="6" height="4" rx="0.8" fill="url(#uno-cap)"/>
  <!-- ═══ ATmega16U2 (USB controller) ═══ -->
  <rect x="80" y="80" width="30" height="20" rx="1" fill="#1A1A1A" stroke="#333" stroke-width="0.6"/>
  <circle cx="85" cy="85" r="1.5" fill="#444"/>
  <text x="95" y="93" text-anchor="middle" font-family="monospace" font-size="4" fill="#777">16U2</text>
  <!-- ═══ Voltage Regulator (NCP1117) ═══ -->
  <rect x="75" y="245" width="30" height="22" rx="1" fill="url(#uno-vreg)" stroke="#444" stroke-width="0.8"/>
  <rect x="75" y="245" width="30" height="4" rx="0.5" fill="#444" opacity="0.4"/>
  <!-- Heatsink tab -->
  <rect x="82" y="267" width="16" height="5" rx="0.5" fill="#B0BEC5" stroke="#90A4AE" stroke-width="0.4"/>
  <text x="90" y="259" text-anchor="middle" font-family="monospace" font-size="3.5" fill="#999">NCP1117</text>
  <!-- 5V regulator -->
  <rect x="112" y="248" width="20" height="16" rx="1" fill="#1A1A1A" stroke="#333" stroke-width="0.5"/>
  <rect x="117" y="264" width="10" height="3" rx="0.5" fill="#B0BEC5"/>
  <text x="122" y="259" text-anchor="middle" font-family="monospace" font-size="3.5" fill="#999">LM7805</text>
  <!-- ═══ Decoupling Capacitors ═══ -->
  <rect x="155" y="252" width="7" height="5" rx="1" fill="url(#uno-cap)"/>
  <rect x="166" y="252" width="7" height="5" rx="1" fill="url(#uno-cap)"/>
  <!-- Electrolytic cap near barrel jack -->
  <circle cx="60" cy="190" r="6" fill="#111" stroke="#444" stroke-width="1"/>
  <circle cx="60" cy="190" r="4" fill="none" stroke="#333" stroke-width="0.5"/>
  <text x="60" y="182" text-anchor="middle" font-family="monospace" font-size="3.5" fill="#B2DFDB">47µF</text>
  <!-- Another electrolytic cap -->
  <circle cx="60" cy="170" r="4" fill="#111" stroke="#444" stroke-width="0.8"/>
  <text x="60" y="164" text-anchor="middle" font-family="monospace" font-size="3" fill="#B2DFDB">100µF</text>
  <!-- ═══ Reset Button ═══ -->
  <rect x="138" y="58" width="22" height="16" rx="2" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="1"/>
  <rect x="138" y="58" width="22" height="3" rx="1" fill="#FFFFFF" opacity="0.2"/>
  <rect x="142" y="62" width="14" height="9" rx="1.5" fill="#FAFAFA" stroke="#BDBDBD" stroke-width="0.5"/>
  <text x="149" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-size="5.5" fill="#B2DFDB" font-weight="bold">RESET</text>
  <!-- ═══ Power LED (Green) ═══ -->
  <circle cx="115" cy="288" r="4.5" fill="#4CAF50" opacity="0.25"/>
  <circle cx="115" cy="288" r="3" fill="#4CAF50" opacity="0.9"/>
  <circle cx="115" cy="288" r="1.5" fill="#A5D6A7"/>
  <circle cx="113" cy="286" r="0.7" fill="#FFFFFF" opacity="0.5"/>
  <text x="115" y="301" text-anchor="middle" font-family="monospace" font-size="5" fill="#B2DFDB" font-weight="bold">ON</text>
  <!-- ═══ LED 13 (Yellow) ═══ -->
  <circle cx="145" cy="288" r="4.5" fill="#FFC107" opacity="0.2"/>
  <circle cx="145" cy="288" r="3" fill="#FFC107" opacity="0.85"/>
  <circle cx="145" cy="288" r="1.5" fill="#FFE082"/>
  <circle cx="143" cy="286" r="0.7" fill="#FFFFFF" opacity="0.4"/>
  <text x="145" y="301" text-anchor="middle" font-family="monospace" font-size="5" fill="#B2DFDB" font-weight="bold">L</text>
  <!-- ═══ TX/RX LEDs ═══ -->
  <circle cx="100" cy="78" r="3.5" fill="#F44336" opacity="0.2"/>
  <circle cx="100" cy="78" r="2.5" fill="#F44336" opacity="0.85"/>
  <circle cx="100" cy="78" r="1" fill="#FF8A80"/>
  <text x="100" y="72" text-anchor="middle" font-family="monospace" font-size="5" fill="#B2DFDB" font-weight="bold">TX</text>
  <circle cx="120" cy="78" r="3.5" fill="#4CAF50" opacity="0.2"/>
  <circle cx="120" cy="78" r="2.5" fill="#4CAF50" opacity="0.85"/>
  <circle cx="120" cy="78" r="1" fill="#A5D6A7"/>
  <text x="120" y="72" text-anchor="middle" font-family="monospace" font-size="5" fill="#B2DFDB" font-weight="bold">RX</text>
  <!-- ═══ ICSP Header ═══ -->
  <g transform="translate(370,125)">
    <rect x="0" y="0" width="20" height="14" rx="1.5" fill="#00695C" stroke="#B2DFDB" stroke-width="0.6"/>
    ${[0,7,14].map(x => [0,9].map(y => `<circle cx="${x+3}" cy="${y+2.5}" r="1.8" fill="url(#gold)" stroke="#F57F17" stroke-width="0.2"/>`).join('')).join('\n    ')}
    <text x="10" y="24" text-anchor="middle" font-family="monospace" font-size="5" fill="#B2DFDB" font-weight="bold">ICSP</text>
  </g>
  <!-- ═══ Digital Pin Headers (D0-D13) ═══ -->
  <rect x="160" y="12" width="290" height="18" rx="2" fill="#1A1A1A" stroke="#424242" stroke-width="0.8"/>
  <rect x="160" y="12" width="290" height="3" rx="1" fill="#333" opacity="0.3"/>
  ${Array.from({length: 14}, (_, i) => {
    const x = 170 + i * 20;
    return `<rect x="${x}" y="15" width="10" height="12" rx="1" fill="url(#gold)" stroke="#F57F17" stroke-width="0.3"/><rect x="${x}" y="15" width="10" height="3" rx="0.5" fill="#FFFFFF" opacity="0.12"/>
    <text x="${x+5}" y="42" text-anchor="middle" font-family="monospace" font-size="5" fill="#B2DFDB" font-weight="bold">${i}</text>`;
  }).join('\n  ')}
  <text x="170" y="9" font-family="monospace" font-size="4.5" fill="#80CBC4">DIGITAL (PWM~)</text>
  <!-- ═══ Analog Pin Headers (A0-A5) ═══ -->
  <rect x="160" y="320" width="140" height="18" rx="2" fill="#1A1A1A" stroke="#424242" stroke-width="0.8"/>
  <rect x="160" y="320" width="140" height="3" rx="1" fill="#333" opacity="0.3"/>
  ${Array.from({length: 6}, (_, i) => {
    const x = 170 + i * 20;
    return `<rect x="${x}" y="323" width="10" height="12" rx="1" fill="url(#gold)" stroke="#F57F17" stroke-width="0.3"/><rect x="${x}" y="323" width="10" height="3" rx="0.5" fill="#FFFFFF" opacity="0.12"/>
    <text x="${x+5}" y="316" text-anchor="middle" font-family="monospace" font-size="5" fill="#B2DFDB" font-weight="bold">A${i}</text>`;
  }).join('\n  ')}
  <text x="170" y="349" font-family="monospace" font-size="4.5" fill="#80CBC4">ANALOG IN</text>
  <!-- ═══ Power Pin Headers ═══ -->
  <rect x="70" y="320" width="80" height="18" rx="2" fill="#1A1A1A" stroke="#424242" stroke-width="0.8"/>
  <rect x="70" y="320" width="80" height="3" rx="1" fill="#333" opacity="0.3"/>
  <text x="78" y="316" font-family="monospace" font-size="5" fill="#B2DFDB" font-weight="bold">5V</text>
  <text x="95" y="316" font-family="monospace" font-size="5" fill="#B2DFDB" font-weight="bold">3V3</text>
  <text x="113" y="316" font-family="monospace" font-size="5" fill="#B2DFDB">RST</text>
  <text x="130" y="316" font-family="monospace" font-size="5" fill="#B2DFDB">GND</text>
  <text x="145" y="316" font-family="monospace" font-size="5" fill="#B2DFDB" font-weight="bold">VIN</text>
  <text x="100" y="349" font-family="monospace" font-size="4.5" fill="#80CBC4">POWER</text>
  <!-- ═══ Board Silkscreen Labels ═══ -->
  <text x="280" y="195" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#E0F2F1" font-weight="bold" letter-spacing="1">Arduino UNO</text>
  <text x="280" y="212" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#B2DFDB" letter-spacing="0.5">R3</text>
  <text x="280" y="228" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#80CBC4" font-style="italic">Made in Italy</text>
  <!-- Arduino Logo (infinity symbol in circle) -->
  <circle cx="420" cy="275" r="20" fill="none" stroke="#B2DFDB" stroke-width="1.5"/>
  <circle cx="420" cy="275" r="18" fill="none" stroke="#80CBC4" stroke-width="0.5" opacity="0.5"/>
  <text x="420" y="280" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#B2DFDB" font-weight="bold">∞</text>
  <text x="420" y="300" text-anchor="middle" font-family="Arial,sans-serif" font-size="5" fill="#80CBC4">arduino.cc</text>
  <!-- PCB bottom edge -->
  <rect x="10" y="337" width="480" height="3" rx="4" fill="#004D40" opacity="0.4"/>
</svg>`;

// ── Arduino Nano ────────────────────────────────────────────────────────────
const ARDUINO_NANO_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 180">
  <defs>
    <linearGradient id="nano-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1976D2"/>
      <stop offset="50%" stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </linearGradient>
    <linearGradient id="nano-gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFF176"/>
      <stop offset="25%" stop-color="#FFD54F"/>
      <stop offset="75%" stop-color="#FFCA28"/>
      <stop offset="100%" stop-color="#F9A825"/>
    </linearGradient>
    <linearGradient id="nano-usb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E0E0E0"/>
      <stop offset="15%" stop-color="#D0D0D0"/>
      <stop offset="50%" stop-color="#B0BEC5"/>
      <stop offset="85%" stop-color="#90A4AE"/>
      <stop offset="100%" stop-color="#78909C"/>
    </linearGradient>
    <linearGradient id="nano-vreg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#333"/>
      <stop offset="100%" stop-color="#111"/>
    </linearGradient>
    <pattern id="nano-solder" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="none"/>
      <circle cx="5" cy="5" r="0.35" fill="#1E88E5" opacity="0.2"/>
    </pattern>
    <pattern id="nano-trace" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
      <rect width="30" height="30" fill="none"/>
      <line x1="0" y1="15" x2="30" y2="15" stroke="#1A5BA8" stroke-width="0.25" opacity="0.12"/>
      <line x1="15" y1="0" x2="15" y2="30" stroke="#1A5BA8" stroke-width="0.25" opacity="0.12"/>
    </pattern>
    <radialGradient id="nano-cap" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#6D4C41"/>
      <stop offset="100%" stop-color="#3E2723"/>
    </radialGradient>
    <filter id="nano-shadow" x="-3%" y="-4%" width="106%" height="108%">
      <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- PCB Board -->
  <rect x="10" y="20" width="430" height="140" rx="5" fill="url(#nano-pcb)" filter="url(#nano-shadow)" stroke="#0A3D91" stroke-width="1.2"/>
  <!-- Solder mask texture -->
  <rect x="10" y="20" width="430" height="140" rx="5" fill="url(#nano-solder)"/>
  <!-- Copper trace pattern -->
  <rect x="50" y="30" width="380" height="120" fill="url(#nano-trace)"/>
  <!-- PCB edge highlight -->
  <rect x="10" y="20" width="430" height="2.5" rx="3" fill="#2196F3" opacity="0.2"/>
  <!-- ═══ Mini-USB Port (3D) ═══ -->
  <!-- USB outer shell -->
  <rect x="5" y="62" width="40" height="36" rx="2.5" fill="url(#nano-usb)" stroke="#607D8B" stroke-width="1"/>
  <!-- USB top bevel -->
  <rect x="6" y="62" width="38" height="4" rx="1.5" fill="#FFFFFF" opacity="0.15"/>
  <!-- USB inner cavity -->
  <rect x="10" y="68" width="30" height="24" rx="1.5" fill="#263238" stroke="#37474F" stroke-width="0.6"/>
  <!-- USB contact pins -->
  <rect x="14" y="73" width="22" height="14" rx="1" fill="#37474F"/>
  <rect x="16" y="75" width="3" height="10" rx="0.5" fill="#FFD54F" opacity="0.5"/>
  <rect x="22" y="75" width="3" height="10" rx="0.5" fill="#FFD54F" opacity="0.5"/>
  <rect x="28" y="75" width="3" height="10" rx="0.5" fill="#FFD54F" opacity="0.5"/>
  <rect x="34" y="75" width="3" height="10" rx="0.5" fill="#FFD54F" opacity="0.5"/>
  <!-- USB mounting tabs -->
  <rect x="3" y="65" width="3" height="10" rx="0.8" fill="#90A4AE"/>
  <rect x="3" y="85" width="3" height="10" rx="0.8" fill="#90A4AE"/>
  <!-- USB bottom shadow -->
  <rect x="7" y="96" width="36" height="2" rx="0.8" fill="#607D8B" opacity="0.35"/>
  <text x="25" y="106" text-anchor="middle" font-family="Arial,sans-serif" font-size="5.5" fill="#90CAF9" letter-spacing="0.5">MINI USB</text>
  <!-- ═══ FT232RL / CH340 USB-UART Bridge ═══ -->
  <rect x="55" y="70" width="22" height="22" rx="1" fill="#1A1A1A" stroke="#333" stroke-width="0.5"/>
  <circle cx="60" cy="75" r="1.2" fill="#444"/>
  <text x="66" y="84" text-anchor="middle" font-family="monospace" font-size="3.5" fill="#777">CH340</text>
  <!-- ═══ TQFP ATmega328P Chip ═══ -->
  <rect x="180" y="52" width="64" height="64" rx="2" fill="#212121" stroke="#424242" stroke-width="1"/>
  <!-- Chip top highlight -->
  <rect x="180" y="52" width="64" height="4" rx="1" fill="#333" opacity="0.3"/>
  <!-- Pin 1 dot -->
  <circle cx="188" cy="60" r="2.5" fill="#3A3A3A" stroke="#555" stroke-width="0.3"/>
  <!-- Chip label -->
  <text x="212" y="82" text-anchor="middle" font-family="monospace" font-size="5.5" fill="#A0A0A0" font-weight="bold">ATmega</text>
  <text x="212" y="90" text-anchor="middle" font-family="monospace" font-size="5.5" fill="#A0A0A0" font-weight="bold">328P-AU</text>
  <text x="212" y="100" text-anchor="middle" font-family="monospace" font-size="3.5" fill="#888">1842</text>
  <!-- TQFP pins (all 4 sides, 8 per side) -->
  ${Array.from({length: 8}, (_, i) => `<rect x="${185 + i * 6}" y="${44}" width="2.5" height="9" rx="0.3" fill="#B0BEC5" stroke="#90A4AE" stroke-width="0.15"/>
  <rect x="${185 + i * 6}" y="${116}" width="2.5" height="9" rx="0.3" fill="#B0BEC5" stroke="#90A4AE" stroke-width="0.15"/>
  <rect x="${172}" y="${57 + i * 7}" width="9" height="2.5" rx="0.3" fill="#B0BEC5" stroke="#90A4AE" stroke-width="0.15"/>
  <rect x="${244}" y="${57 + i * 7}" width="9" height="2.5" rx="0.3" fill="#B0BEC5" stroke="#90A4AE" stroke-width="0.15"/>`).join('\n  ')}
  <!-- ═══ Crystal Oscillator (16MHz) ═══ -->
  <rect x="263" y="68" width="18" height="10" rx="2" fill="#C0CA33" stroke="#9E9D24" stroke-width="0.6"/>
  <rect x="263" y="68" width="18" height="3" rx="1" fill="#DCE775" opacity="0.25"/>
  <text x="272" y="76" text-anchor="middle" font-family="monospace" font-size="4" fill="#33691E" font-weight="bold">16M</text>
  <!-- Crystal loading capacitors -->
  <rect x="263" y="82" width="5" height="3" rx="0.6" fill="url(#nano-cap)"/>
  <rect x="276" y="82" width="5" height="3" rx="0.6" fill="url(#nano-cap)"/>
  <!-- ═══ Voltage Regulator ═══ -->
  <rect x="290" y="72" width="18" height="14" rx="1" fill="url(#nano-vreg)" stroke="#444" stroke-width="0.6"/>
  <rect x="296" y="86" width="6" height="3" rx="0.5" fill="#B0BEC5"/>
  <text x="299" y="82" text-anchor="middle" font-family="monospace" font-size="3" fill="#999">5V REG</text>
  <!-- ═══ Decoupling Capacitors ═══ -->
  <rect x="148" y="72" width="6" height="4" rx="0.8" fill="url(#nano-cap)"/>
  <rect x="158" y="72" width="6" height="4" rx="0.8" fill="url(#nano-cap)"/>
  <rect x="148" y="92" width="6" height="4" rx="0.8" fill="url(#nano-cap)"/>
  <!-- ═══ Reset Button ═══ -->
  <rect x="92" y="70" width="18" height="14" rx="1.5" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="0.8"/>
  <rect x="92" y="70" width="18" height="3" rx="1" fill="#FFFFFF" opacity="0.2"/>
  <rect x="95" y="73" width="12" height="8" rx="1" fill="#FAFAFA" stroke="#BDBDBD" stroke-width="0.4"/>
  <text x="101" y="66" text-anchor="middle" font-family="monospace" font-size="5" fill="#90CAF9" font-weight="bold">RST</text>
  <!-- ═══ Power LED (Green) ═══ -->
  <circle cx="120" cy="130" r="3.5" fill="#4CAF50" opacity="0.25"/>
  <circle cx="120" cy="130" r="2.5" fill="#4CAF50" opacity="0.9"/>
  <circle cx="120" cy="130" r="1.2" fill="#A5D6A7"/>
  <circle cx="119" cy="129" r="0.6" fill="#FFFFFF" opacity="0.5"/>
  <text x="120" y="124" text-anchor="middle" font-family="monospace" font-size="4" fill="#90CAF9">PWR</text>
  <!-- ═══ LED 13 (Yellow) ═══ -->
  <circle cx="140" cy="130" r="3.5" fill="#FFC107" opacity="0.2"/>
  <circle cx="140" cy="130" r="2.5" fill="#FFC107" opacity="0.85"/>
  <circle cx="140" cy="130" r="1.2" fill="#FFE082"/>
  <circle cx="139" cy="129" r="0.6" fill="#FFFFFF" opacity="0.4"/>
  <text x="140" y="124" text-anchor="middle" font-family="monospace" font-size="4" fill="#90CAF9">L</text>
  <!-- ═══ TX/RX LEDs ═══ -->
  <circle cx="120" cy="45" r="2.5" fill="#F44336" opacity="0.7"/>
  <circle cx="120" cy="45" r="1" fill="#FF8A80"/>
  <text x="120" y="40" text-anchor="middle" font-family="monospace" font-size="3.5" fill="#90CAF9">TX</text>
  <circle cx="135" cy="45" r="2.5" fill="#4CAF50" opacity="0.7"/>
  <circle cx="135" cy="45" r="1" fill="#A5D6A7"/>
  <text x="135" y="40" text-anchor="middle" font-family="monospace" font-size="3.5" fill="#90CAF9">RX</text>
  <!-- ═══ ICSP Header (2x3) ═══ -->
  <g transform="translate(320,55)">
    <rect x="0" y="0" width="14" height="10" rx="1" fill="#0D47A1" stroke="#90CAF9" stroke-width="0.4"/>
    ${[0,5,10].map(x => [0,6].map(y => `<circle cx="${x+2}" cy="${y+2}" r="1.2" fill="url(#nano-gold)" stroke="#F57F17" stroke-width="0.15"/>`).join('')).join('\n    ')}
    <text x="7" y="18" text-anchor="middle" font-family="monospace" font-size="4" fill="#90CAF9">ICSP</text>
  </g>
  <!-- ═══ Top Pin Row (15 pins) ═══ -->
  ${Array.from({length: 15}, (_, i) => {
    const x = 60 + i * 24;
    return `<rect x="${x}" y="8" width="10" height="16" rx="1" fill="url(#nano-gold)" stroke="#F57F17" stroke-width="0.3"/><rect x="${x}" y="8" width="10" height="3" rx="0.5" fill="#FFFFFF" opacity="0.12"/>`;
  }).join('\n  ')}
  <!-- ═══ Bottom Pin Row (15 pins) ═══ -->
  ${Array.from({length: 15}, (_, i) => {
    const x = 60 + i * 24;
    return `<rect x="${x}" y="156" width="10" height="16" rx="1" fill="url(#nano-gold)" stroke="#F57F17" stroke-width="0.3"/><rect x="${x}" y="156" width="10" height="3" rx="0.5" fill="#FFFFFF" opacity="0.12"/>`;
  }).join('\n  ')}
  <!-- Top Pin Labels (silkscreen style) -->
  <text x="65" y="6" font-family="monospace" font-size="5" fill="#E3F2FD" font-weight="bold">D1/TX</text>
  <text x="89" y="6" font-family="monospace" font-size="5" fill="#E3F2FD" font-weight="bold">D0/RX</text>
  <text x="113" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">RST</text>
  <text x="137" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">GND</text>
  <text x="161" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D2</text>
  <text x="185" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D3~</text>
  <text x="209" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D4</text>
  <text x="233" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D5~</text>
  <text x="257" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D6~</text>
  <text x="281" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D7</text>
  <text x="305" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D8</text>
  <text x="329" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D9~</text>
  <text x="353" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D10~</text>
  <text x="377" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D11~</text>
  <text x="401" y="6" font-family="monospace" font-size="5" fill="#E3F2FD">D12</text>
  <!-- Bottom Pin Labels -->
  <text x="65" y="178" font-family="monospace" font-size="5" fill="#E3F2FD" font-weight="bold">VIN</text>
  <text x="89" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">GND</text>
  <text x="113" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">RST</text>
  <text x="137" y="178" font-family="monospace" font-size="5" fill="#E3F2FD" font-weight="bold">5V</text>
  <text x="161" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">A7</text>
  <text x="185" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">A6</text>
  <text x="209" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">A5</text>
  <text x="233" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">A4</text>
  <text x="257" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">A3</text>
  <text x="281" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">A2</text>
  <text x="305" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">A1</text>
  <text x="329" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">A0</text>
  <text x="353" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">REF</text>
  <text x="377" y="178" font-family="monospace" font-size="5" fill="#E3F2FD" font-weight="bold">3V3</text>
  <text x="401" y="178" font-family="monospace" font-size="5" fill="#E3F2FD">D13</text>
  <!-- ═══ Board Silkscreen Labels ═══ -->
  <text x="330" y="95" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#E3F2FD" font-weight="bold" letter-spacing="0.8">Arduino Nano</text>
  <text x="330" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" fill="#90CAF9" letter-spacing="0.3">V3.0 · ATmega328P</text>
  <!-- PCB bottom edge -->
  <rect x="10" y="157.5" width="430" height="2.5" rx="3" fill="#0A3D91" opacity="0.35"/>
</svg>`;

// ── HC-SR04 Ultrasonic Sensor ───────────────────────────────────────────────
const HC_SR04_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 200">
  <defs>
    <linearGradient id="hc-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1976D2"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </linearGradient>
    <radialGradient id="hc-transducer" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#F5F5F5"/>
      <stop offset="60%" stop-color="#BDBDBD"/>
      <stop offset="100%" stop-color="#9E9E9E"/>
    </radialGradient>
    <filter id="hc-shadow" x="-4%" y="-4%" width="108%" height="108%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- PCB -->
  <rect x="10" y="50" width="240" height="140" rx="5" fill="url(#hc-pcb)" filter="url(#hc-shadow)" stroke="#0A3D91" stroke-width="1.2"/>
  <!-- Left Ultrasonic Transducer -->
  <circle cx="75" cy="110" r="40" fill="url(#hc-transducer)" stroke="#757575" stroke-width="2"/>
  <circle cx="75" cy="110" r="30" fill="none" stroke="#BDBDBD" stroke-width="0.5"/>
  <circle cx="75" cy="110" r="20" fill="none" stroke="#BDBDBD" stroke-width="0.5"/>
  <circle cx="75" cy="110" r="10" fill="none" stroke="#BDBDBD" stroke-width="0.5"/>
  <circle cx="75" cy="110" r="3" fill="#9E9E9E"/>
  <!-- Right Ultrasonic Transducer -->
  <circle cx="185" cy="110" r="40" fill="url(#hc-transducer)" stroke="#757575" stroke-width="2"/>
  <circle cx="185" cy="110" r="30" fill="none" stroke="#BDBDBD" stroke-width="0.5"/>
  <circle cx="185" cy="110" r="20" fill="none" stroke="#BDBDBD" stroke-width="0.5"/>
  <circle cx="185" cy="110" r="10" fill="none" stroke="#BDBDBD" stroke-width="0.5"/>
  <circle cx="185" cy="110" r="3" fill="#9E9E9E"/>
  <!-- Crystal Oscillator -->
  <rect x="115" y="155" width="30" height="14" rx="2" fill="#C0CA33" stroke="#9E9D24" stroke-width="0.5"/>
  <text x="130" y="164" text-anchor="middle" font-family="monospace" font-size="5" fill="#33691E">XTAL</text>
  <!-- IC Chip -->
  <rect x="115" y="60" width="30" height="20" rx="1" fill="#212121" stroke="#424242" stroke-width="0.5"/>
  <!-- 4 Pin Header -->
  <rect x="90" y="185" width="80" height="12" rx="1" fill="#212121" stroke="#424242" stroke-width="0.5"/>
  <rect x="98" y="182" width="8" height="18" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <rect x="114" y="182" width="8" height="18" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <rect x="130" y="182" width="8" height="18" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <rect x="146" y="182" width="8" height="18" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <!-- Pin Labels -->
  <text x="102" y="178" text-anchor="middle" font-family="monospace" font-size="6" fill="#BBDEFB">VCC</text>
  <text x="118" y="178" text-anchor="middle" font-family="monospace" font-size="6" fill="#BBDEFB">TRIG</text>
  <text x="134" y="178" text-anchor="middle" font-family="monospace" font-size="6" fill="#BBDEFB">ECHO</text>
  <text x="150" y="178" text-anchor="middle" font-family="monospace" font-size="6" fill="#BBDEFB">GND</text>
  <!-- Board Label -->
  <text x="130" y="95" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#E3F2FD" font-weight="bold">HC-SR04</text>
</svg>`;

// ── SG90 Micro Servo ────────────────────────────────────────────────────────
const SG90_SERVO_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 200">
  <defs>
    <linearGradient id="servo-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#42A5F5"/>
      <stop offset="50%" stop-color="#1E88E5"/>
      <stop offset="100%" stop-color="#1565C0"/>
    </linearGradient>
    <linearGradient id="servo-horn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FAFAFA"/>
      <stop offset="100%" stop-color="#E0E0E0"/>
    </linearGradient>
    <filter id="servo-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Mounting tabs -->
  <rect x="15" y="75" width="30" height="10" rx="2" fill="#1565C0" stroke="#0D47A1" stroke-width="0.5"/>
  <circle cx="25" cy="80" r="3" fill="none" stroke="#0D47A1" stroke-width="0.8"/>
  <rect x="175" y="75" width="30" height="10" rx="2" fill="#1565C0" stroke="#0D47A1" stroke-width="0.5"/>
  <circle cx="195" cy="80" r="3" fill="none" stroke="#0D47A1" stroke-width="0.8"/>
  <!-- Main Body -->
  <rect x="40" y="35" width="140" height="80" rx="5" fill="url(#servo-body)" filter="url(#servo-shadow)" stroke="#0D47A1" stroke-width="1.5"/>
  <!-- Body detail lines -->
  <line x1="50" y1="45" x2="170" y2="45" stroke="#2196F3" stroke-width="0.5" opacity="0.5"/>
  <line x1="50" y1="105" x2="170" y2="105" stroke="#1565C0" stroke-width="0.5" opacity="0.5"/>
  <!-- Gear shaft housing -->
  <circle cx="160" cy="35" r="15" fill="#1976D2" stroke="#0D47A1" stroke-width="1.5"/>
  <circle cx="160" cy="35" r="8" fill="#1565C0" stroke="#0D47A1" stroke-width="1"/>
  <circle cx="160" cy="35" r="3" fill="#FFC107" stroke="#F9A825" stroke-width="0.5"/>
  <!-- Horn / Output arm -->
  <rect x="140" y="5" width="40" height="10" rx="4" fill="url(#servo-horn)" stroke="#BDBDBD" stroke-width="1"/>
  <circle cx="160" cy="10" r="4" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="0.8"/>
  <circle cx="175" cy="10" r="2" fill="none" stroke="#BDBDBD" stroke-width="0.5"/>
  <circle cx="148" cy="10" r="2" fill="none" stroke="#BDBDBD" stroke-width="0.5"/>
  <!-- Label on body -->
  <text x="100" y="65" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#E3F2FD" font-weight="bold">SG90</text>
  <text x="100" y="80" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#BBDEFB">9g Servo</text>
  <!-- Label sticker -->
  <rect x="55" y="55" width="85" height="30" rx="2" fill="#E3F2FD" opacity="0.15"/>
  <!-- Wire Cable -->
  <rect x="90" y="115" width="30" height="20" rx="2" fill="#424242" stroke="#333" stroke-width="0.5"/>
  <!-- 3 Wires -->
  <line x1="95" y1="135" x2="95" y2="195" stroke="#FF6F00" stroke-width="3" stroke-linecap="round"/>
  <line x1="105" y1="135" x2="105" y2="195" stroke="#D32F2F" stroke-width="3" stroke-linecap="round"/>
  <line x1="115" y1="135" x2="115" y2="195" stroke="#5D4037" stroke-width="3" stroke-linecap="round"/>
  <!-- Wire Labels -->
  <text x="95" y="192" text-anchor="middle" font-family="monospace" font-size="6" fill="#FF6F00">SIG</text>
  <text x="105" y="192" text-anchor="middle" font-family="monospace" font-size="6" fill="#D32F2F">VCC</text>
  <text x="115" y="192" text-anchor="middle" font-family="monospace" font-size="6" fill="#5D4037">GND</text>
</svg>`;

// ── LED 5mm ─────────────────────────────────────────────────────────────────
const LED_5MM_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 110">
  <defs>
    <!-- Dome: opaque 3D red epoxy with strong shading -->
    <radialGradient id="led-dome" cx="38%" cy="28%" r="60%">
      <stop offset="0%" stop-color="#FF6B6B"/>
      <stop offset="30%" stop-color="#EF4444"/>
      <stop offset="60%" stop-color="#DC2626"/>
      <stop offset="85%" stop-color="#B91C1C"/>
      <stop offset="100%" stop-color="#7F1D1D"/>
    </radialGradient>
    <!-- Dome edge: subtle dark stroke gradient for depth -->
    <linearGradient id="led-dome-edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#991B1B"/>
      <stop offset="100%" stop-color="#450A0A"/>
    </linearGradient>
    <!-- Cylindrical body below dome -->
    <linearGradient id="led-body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#991B1B"/>
      <stop offset="15%" stop-color="#DC2626"/>
      <stop offset="40%" stop-color="#EF4444"/>
      <stop offset="60%" stop-color="#DC2626"/>
      <stop offset="85%" stop-color="#B91C1C"/>
      <stop offset="100%" stop-color="#7F1D1D"/>
    </linearGradient>
    <!-- Internal die/chip anvil -->
    <linearGradient id="led-die" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FCA5A5" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#EF4444" stop-opacity="0.2"/>
    </linearGradient>
    <!-- Metallic rim/flange -->
    <linearGradient id="led-rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E5E7EB"/>
      <stop offset="20%" stop-color="#D1D5DB"/>
      <stop offset="50%" stop-color="#9CA3AF"/>
      <stop offset="80%" stop-color="#D1D5DB"/>
      <stop offset="100%" stop-color="#6B7280"/>
    </linearGradient>
    <!-- Wire lead metallic -->
    <linearGradient id="led-lead" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#9CA3AF"/>
      <stop offset="30%" stop-color="#D1D5DB"/>
      <stop offset="50%" stop-color="#E5E7EB"/>
      <stop offset="70%" stop-color="#D1D5DB"/>
      <stop offset="100%" stop-color="#6B7280"/>
    </linearGradient>
    <filter id="led-shadow" x="-15%" y="-5%" width="130%" height="120%">
      <feDropShadow dx="1" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity="0.25"/>
    </filter>
    <filter id="led-inner-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="0.8"/>
    </filter>
    <!-- Cathode flat edge clip -->
    <clipPath id="led-flat-clip">
      <rect x="0" y="0" width="45" height="110"/>
    </clipPath>
  </defs>

  <!-- === Wire Leads === -->
  <!-- Anode lead (longer, left) -->
  <line x1="22" y1="68" x2="22" y2="108" stroke="url(#led-lead)" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Cathode lead (shorter, right) -->
  <line x1="38" y1="68" x2="38" y2="98" stroke="url(#led-lead)" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Lead end caps -->
  <ellipse cx="22" cy="108" rx="1.2" ry="0.6" fill="#9CA3AF"/>
  <ellipse cx="38" cy="98" rx="1.2" ry="0.6" fill="#9CA3AF"/>

  <!-- === Metallic Rim/Flange === -->
  <rect x="14" y="56" width="32" height="10" rx="2" fill="url(#led-rim)" stroke="#6B7280" stroke-width="0.6" filter="url(#led-shadow)"/>
  <!-- Rim top bevel highlight -->
  <rect x="15" y="56" width="30" height="2.5" rx="1.2" fill="white" opacity="0.2"/>
  <!-- Rim bottom shadow -->
  <rect x="15" y="63" width="30" height="1.5" rx="0.8" fill="#374151" opacity="0.15"/>

  <!-- === Cylindrical body (below dome, above rim) === -->
  <rect x="16" y="44" width="28" height="13" rx="1" fill="url(#led-body)" stroke="url(#led-dome-edge)" stroke-width="0.5"/>

  <!-- === Dome (bullet shape — ellipse with flat bottom) === -->
  <ellipse cx="30" cy="32" rx="14" ry="22" fill="url(#led-dome)" stroke="url(#led-dome-edge)" stroke-width="0.8" filter="url(#led-shadow)"/>

  <!-- Cathode flat edge (right side, clipped) -->
  <rect x="42" y="18" width="4" height="38" fill="url(#led-dome-edge)" opacity="0.5" rx="0.5"/>

  <!-- === Internal die/anvil (visible through translucent epoxy) === -->
  <rect x="24" y="36" width="12" height="8" rx="1.5" fill="url(#led-die)" stroke="#FCA5A5" stroke-width="0.3" stroke-opacity="0.4"/>
  <!-- Bond wire from die to lead -->
  <path d="M28 44 Q28 48 22 56" fill="none" stroke="#D1D5DB" stroke-width="0.4" opacity="0.35"/>
  <path d="M32 44 Q32 48 38 56" fill="none" stroke="#D1D5DB" stroke-width="0.4" opacity="0.35"/>

  <!-- === Specular highlights (3D glass effect) === -->
  <!-- Primary highlight (top-left dome) -->
  <ellipse cx="24" cy="20" rx="4.5" ry="10" fill="white" opacity="0.4" transform="rotate(-18,24,20)"/>
  <!-- Sharp specular dot -->
  <ellipse cx="25" cy="16" rx="2" ry="3.5" fill="white" opacity="0.55" transform="rotate(-12,25,16)"/>
  <!-- Right edge reflection -->
  <ellipse cx="39" cy="30" rx="1.5" ry="8" fill="white" opacity="0.08" transform="rotate(5,39,30)"/>
  <!-- Bottom dome highlight -->
  <ellipse cx="30" cy="48" rx="8" ry="2" fill="white" opacity="0.06"/>

  <!-- === Pin polarity markers === -->
  <text x="16" y="106" font-family="Inter,system-ui,sans-serif" font-size="5.5" fill="#6B7280" font-weight="600">+</text>
  <text x="40" y="96" font-family="Inter,system-ui,sans-serif" font-size="5.5" fill="#6B7280" font-weight="600">−</text>
</svg>`;

// ── Resistor ────────────────────────────────────────────────────────────────
const RESISTOR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <defs>
    <!-- Cylindrical body gradient (3D round effect: highlight on top) -->
    <linearGradient id="res-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FAEBD7"/>
      <stop offset="15%" stop-color="#F5E6CB"/>
      <stop offset="35%" stop-color="#ECD9B5"/>
      <stop offset="55%" stop-color="#E0CDA0"/>
      <stop offset="75%" stop-color="#D4C090"/>
      <stop offset="100%" stop-color="#C8B480"/>
    </linearGradient>
    <!-- Body end cap gradient for 3D taper -->
    <radialGradient id="res-cap" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ECD9B5"/>
      <stop offset="100%" stop-color="#C8B480"/>
    </radialGradient>
    <!-- Wire lead metallic gradient -->
    <linearGradient id="res-wire" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C0C0C0"/>
      <stop offset="30%" stop-color="#E0E0E0"/>
      <stop offset="70%" stop-color="#B0B0B0"/>
      <stop offset="100%" stop-color="#909090"/>
    </linearGradient>
    <filter id="res-shadow" x="-3%" y="-10%" width="106%" height="130%">
      <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity="0.20"/>
    </filter>
    <!-- Top highlight for cylinder -->
    <linearGradient id="res-highlight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Left lead wire -->
  <line x1="3" y1="30" x2="52" y2="30" stroke="url(#res-wire)" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Right lead wire -->
  <line x1="148" y1="30" x2="197" y2="30" stroke="url(#res-wire)" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Lead wire end dots -->
  <circle cx="3" cy="30" r="1.2" fill="#888"/>
  <circle cx="197" cy="30" r="1.2" fill="#888"/>
  <!-- Resistor body (3D cylinder) -->
  <rect x="50" y="11" width="100" height="38" rx="8" fill="url(#res-body)" filter="url(#res-shadow)" stroke="#B0A070" stroke-width="1.2"/>
  <!-- Top highlight stripe for 3D roundness -->
  <rect x="52" y="12" width="96" height="12" rx="6" fill="url(#res-highlight)"/>
  <!-- Left end cap taper -->
  <ellipse cx="50" cy="30" rx="4" ry="19" fill="url(#res-cap)" stroke="#B0A070" stroke-width="0.6"/>
  <!-- Right end cap taper -->
  <ellipse cx="150" cy="30" rx="4" ry="19" fill="url(#res-cap)" stroke="#B0A070" stroke-width="0.6"/>
  <!-- Band 1 - Brown (1) -->
  <rect x="65" y="11" width="9" height="38" rx="1.5" fill="#795548" stroke="#5D4037" stroke-width="0.3"/>
  <rect x="65" y="11" width="9" height="10" rx="1" fill="#8D6E63" opacity="0.4"/>
  <!-- Band 2 - Black (0) -->
  <rect x="82" y="11" width="9" height="38" rx="1.5" fill="#212121" stroke="#111" stroke-width="0.3"/>
  <rect x="82" y="11" width="9" height="10" rx="1" fill="#424242" opacity="0.35"/>
  <!-- Band 3 - Red (×100) = 1kΩ -->
  <rect x="99" y="11" width="9" height="38" rx="1.5" fill="#F44336" stroke="#C62828" stroke-width="0.3"/>
  <rect x="99" y="11" width="9" height="10" rx="1" fill="#EF9A9A" opacity="0.35"/>
  <!-- Band 4 - Gold (±5%) — spaced further right -->
  <rect x="126" y="11" width="9" height="38" rx="1.5" fill="#FFD54F" stroke="#F9A825" stroke-width="0.3"/>
  <rect x="126" y="11" width="9" height="10" rx="1" fill="#FFF9C4" opacity="0.35"/>
  <!-- Bottom shadow on body -->
  <rect x="52" y="40" width="96" height="6" rx="3" fill="#000" opacity="0.06"/>
  <!-- Value label -->
  <text x="100" y="57" text-anchor="middle" font-family="monospace" font-size="7" fill="#666" font-weight="bold">1kΩ ±5%</text>
</svg>`;

// ── LCD1602 ─────────────────────────────────────────────────────────────────
const LCD1602_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <defs>
    <linearGradient id="lcd-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2E7D32"/>
      <stop offset="100%" stop-color="#1B5E20"/>
    </linearGradient>
    <linearGradient id="lcd-bezel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E0E0E0"/>
      <stop offset="100%" stop-color="#9E9E9E"/>
    </linearGradient>
    <linearGradient id="lcd-screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1B5E20"/>
      <stop offset="100%" stop-color="#2E7D32"/>
    </linearGradient>
    <filter id="lcd-shadow" x="-3%" y="-3%" width="106%" height="106%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- PCB -->
  <rect x="10" y="10" width="380" height="180" rx="5" fill="url(#lcd-pcb)" filter="url(#lcd-shadow)" stroke="#1B5E20" stroke-width="1.5"/>
  <!-- Mounting holes -->
  <circle cx="25" cy="25" r="5" fill="none" stroke="#A5D6A7" stroke-width="1"/>
  <circle cx="375" cy="25" r="5" fill="none" stroke="#A5D6A7" stroke-width="1"/>
  <circle cx="25" cy="175" r="5" fill="none" stroke="#A5D6A7" stroke-width="1"/>
  <circle cx="375" cy="175" r="5" fill="none" stroke="#A5D6A7" stroke-width="1"/>
  <!-- Metal Bezel -->
  <rect x="30" y="30" width="340" height="120" rx="3" fill="url(#lcd-bezel)" stroke="#757575" stroke-width="1.5"/>
  <!-- Display Window -->
  <rect x="50" y="45" width="300" height="85" rx="2" fill="url(#lcd-screen)" stroke="#1B5E20" stroke-width="1"/>
  <!-- Character grid hint – Row 1 -->
  ${Array.from({length: 16}, (_, i) => {
    const x = 60 + i * 18;
    return `<rect x="${x}" y="55" width="14" height="18" rx="1" fill="#33691E" opacity="0.6"/>`;
  }).join('\n  ')}
  <!-- Character grid hint – Row 2 -->
  ${Array.from({length: 16}, (_, i) => {
    const x = 60 + i * 18;
    return `<rect x="${x}" y="85" width="14" height="18" rx="1" fill="#33691E" opacity="0.6"/>`;
  }).join('\n  ')}
  <!-- Sample display text -->
  <text x="70" y="70" font-family="monospace" font-size="12" fill="#76FF03" opacity="0.9">Hello, World!</text>
  <text x="70" y="100" font-family="monospace" font-size="12" fill="#76FF03" opacity="0.9">LCD 16x2</text>
  <!-- 16-pin Header -->
  <rect x="40" y="168" width="260" height="14" rx="1.5" fill="#212121" stroke="#424242" stroke-width="0.5"/>
  ${Array.from({length: 16}, (_, i) => {
    const x = 46 + i * 16;
    return `<rect x="${x}" y="165" width="7" height="18" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>`;
  }).join('\n  ')}
  <!-- Pin Labels -->
  <text x="49" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">VSS</text>
  <text x="65" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">VDD</text>
  <text x="81" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">V0</text>
  <text x="97" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">RS</text>
  <text x="113" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">RW</text>
  <text x="129" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">E</text>
  <text x="145" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">D0</text>
  <text x="161" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">D1</text>
  <text x="177" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">D2</text>
  <text x="193" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">D3</text>
  <text x="209" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">D4</text>
  <text x="225" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">D5</text>
  <text x="241" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">D6</text>
  <text x="257" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">D7</text>
  <text x="273" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">A</text>
  <text x="289" y="160" text-anchor="middle" font-family="monospace" font-size="4" fill="#A5D6A7">K</text>
  <!-- Board label -->
  <text x="350" y="170" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#A5D6A7" font-weight="bold">LCD1602</text>
</svg>`;

// ── OLED SSD1306 ────────────────────────────────────────────────────────────
const OLED_SSD1306_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 140">
  <defs>
    <linearGradient id="oled-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#263238"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
    <linearGradient id="oled-screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#111111"/>
    </linearGradient>
    <filter id="oled-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <filter id="oled-glow">
      <feGaussianBlur stdDeviation="0.5"/>
    </filter>
  </defs>
  <!-- PCB -->
  <rect x="5" y="5" width="140" height="130" rx="4" fill="url(#oled-pcb)" filter="url(#oled-shadow)" stroke="#37474F" stroke-width="1"/>
  <!-- Mounting holes -->
  <circle cx="15" cy="15" r="3" fill="none" stroke="#455A64" stroke-width="0.8"/>
  <circle cx="135" cy="15" r="3" fill="none" stroke="#455A64" stroke-width="0.8"/>
  <!-- OLED Glass Panel -->
  <rect x="15" y="20" width="120" height="75" rx="2" fill="url(#oled-screen)" stroke="#333" stroke-width="1"/>
  <!-- Active display area -->
  <rect x="20" y="25" width="110" height="65" rx="1" fill="#050505"/>
  <!-- Sample OLED content (white pixels on black) -->
  <text x="75" y="48" text-anchor="middle" font-family="monospace" font-size="10" fill="#FFFFFF" filter="url(#oled-glow)">SSD1306</text>
  <text x="75" y="65" text-anchor="middle" font-family="monospace" font-size="7" fill="#42A5F5" filter="url(#oled-glow)">128×64 OLED</text>
  <line x1="25" y1="72" x2="125" y2="72" stroke="#42A5F5" stroke-width="0.5" opacity="0.6"/>
  <text x="75" y="82" text-anchor="middle" font-family="monospace" font-size="6" fill="#4CAF50" filter="url(#oled-glow)">I2C: 0x3C</text>
  <!-- FPC cable ribbon (connecting screen to PCB) -->
  <rect x="35" y="95" width="80" height="5" rx="1" fill="#424242"/>
  <!-- Driver IC -->
  <rect x="55" y="103" width="40" height="12" rx="1" fill="#1a1a1a" stroke="#333" stroke-width="0.5"/>
  <text x="75" y="112" text-anchor="middle" font-family="monospace" font-size="5" fill="#555">SSD1306</text>
  <!-- 4-Pin I2C Header -->
  <rect x="35" y="120" width="80" height="12" rx="1.5" fill="#212121" stroke="#333" stroke-width="0.5"/>
  <rect x="42" y="118" width="8" height="16" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <rect x="58" y="118" width="8" height="16" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <rect x="74" y="118" width="8" height="16" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <rect x="90" y="118" width="8" height="16" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <!-- Pin Labels -->
  <text x="46" y="116" text-anchor="middle" font-family="monospace" font-size="5" fill="#78909C">GND</text>
  <text x="62" y="116" text-anchor="middle" font-family="monospace" font-size="5" fill="#78909C">VCC</text>
  <text x="78" y="116" text-anchor="middle" font-family="monospace" font-size="5" fill="#78909C">SCL</text>
  <text x="94" y="116" text-anchor="middle" font-family="monospace" font-size="5" fill="#78909C">SDA</text>
</svg>`;

// ── Relay Module ────────────────────────────────────────────────────────────
const RELAY_MODULE_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
  <defs>
    <linearGradient id="relay-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2E7D32"/>
      <stop offset="100%" stop-color="#1B5E20"/>
    </linearGradient>
    <linearGradient id="relay-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#42A5F5"/>
      <stop offset="100%" stop-color="#1565C0"/>
    </linearGradient>
    <filter id="relay-shadow" x="-4%" y="-4%" width="108%" height="108%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- PCB -->
  <rect x="5" y="5" width="190" height="140" rx="4" fill="url(#relay-pcb)" filter="url(#relay-shadow)" stroke="#1B5E20" stroke-width="1.2"/>
  <!-- Mounting holes -->
  <circle cx="15" cy="15" r="3.5" fill="none" stroke="#A5D6A7" stroke-width="0.8"/>
  <circle cx="185" cy="15" r="3.5" fill="none" stroke="#A5D6A7" stroke-width="0.8"/>
  <circle cx="15" cy="135" r="3.5" fill="none" stroke="#A5D6A7" stroke-width="0.8"/>
  <circle cx="185" cy="135" r="3.5" fill="none" stroke="#A5D6A7" stroke-width="0.8"/>
  <!-- Relay Body -->
  <rect x="55" y="20" width="90" height="65" rx="3" fill="url(#relay-body)" stroke="#0D47A1" stroke-width="1.5"/>
  <!-- Relay label -->
  <text x="100" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#E3F2FD" font-weight="bold">SONGLE</text>
  <text x="100" y="60" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#BBDEFB">SRD-05VDC</text>
  <text x="100" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" fill="#BBDEFB">10A 250VAC</text>
  <!-- Relay contact pins -->
  <rect x="60" y="85" width="4" height="8" fill="#B0BEC5"/>
  <rect x="80" y="85" width="4" height="8" fill="#B0BEC5"/>
  <rect x="100" y="85" width="4" height="8" fill="#B0BEC5"/>
  <rect x="120" y="85" width="4" height="8" fill="#B0BEC5"/>
  <rect x="136" y="85" width="4" height="8" fill="#B0BEC5"/>
  <!-- Screw Terminals (high-voltage side) -->
  <rect x="25" y="95" width="150" height="22" rx="2" fill="#1565C0" stroke="#0D47A1" stroke-width="1"/>
  <!-- Terminal screws -->
  <circle cx="50" cy="106" r="6" fill="#42A5F5" stroke="#1976D2" stroke-width="1"/>
  <line x1="47" y1="103" x2="53" y2="109" stroke="#0D47A1" stroke-width="1"/>
  <circle cx="100" cy="106" r="6" fill="#42A5F5" stroke="#1976D2" stroke-width="1"/>
  <line x1="97" y1="103" x2="103" y2="109" stroke="#0D47A1" stroke-width="1"/>
  <circle cx="150" cy="106" r="6" fill="#42A5F5" stroke="#1976D2" stroke-width="1"/>
  <line x1="147" y1="103" x2="153" y2="109" stroke="#0D47A1" stroke-width="1"/>
  <!-- Terminal labels -->
  <text x="50" y="124" text-anchor="middle" font-family="monospace" font-size="6" fill="#A5D6A7">COM</text>
  <text x="100" y="124" text-anchor="middle" font-family="monospace" font-size="6" fill="#A5D6A7">NO</text>
  <text x="150" y="124" text-anchor="middle" font-family="monospace" font-size="6" fill="#A5D6A7">NC</text>
  <!-- Indicator LED -->
  <circle cx="30" cy="55" r="4" fill="#F44336" opacity="0.85"/>
  <circle cx="30" cy="55" r="2" fill="#FF8A80"/>
  <text x="30" y="68" text-anchor="middle" font-family="monospace" font-size="5" fill="#A5D6A7">LED</text>
  <!-- Signal transistor -->
  <rect x="30" y="30" width="12" height="10" rx="1" fill="#212121" stroke="#424242" stroke-width="0.5"/>
  <!-- Control pin header -->
  <rect x="55" y="132" width="90" height="12" rx="1.5" fill="#212121" stroke="#424242" stroke-width="0.5"/>
  <rect x="65" y="130" width="7" height="16" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <rect x="85" y="130" width="7" height="16" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <rect x="105" y="130" width="7" height="16" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <rect x="125" y="130" width="7" height="16" rx="1" fill="#FFD54F" stroke="#F57F17" stroke-width="0.3"/>
  <!-- Control pin labels -->
  <text x="30" y="145" text-anchor="middle" font-family="monospace" font-size="5" fill="#A5D6A7">VCC GND IN</text>
</svg>`;

// ── Push Button (Tactile Switch) ────────────────────────────────────────────
const PUSH_BUTTON_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <defs>
    <!-- Base body gradient -->
    <linearGradient id="btn-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#333333"/>
      <stop offset="20%" stop-color="#2A2A2A"/>
      <stop offset="80%" stop-color="#1A1A1A"/>
      <stop offset="100%" stop-color="#111111"/>
    </linearGradient>
    <!-- Button cap 3D bevel gradient -->
    <radialGradient id="btn-cap" cx="40%" cy="35%" r="55%">
      <stop offset="0%" stop-color="#FF6659"/>
      <stop offset="30%" stop-color="#F44336"/>
      <stop offset="65%" stop-color="#D32F2F"/>
      <stop offset="100%" stop-color="#B71C1C"/>
    </radialGradient>
    <!-- Button cap top highlight -->
    <linearGradient id="btn-highlight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <!-- Pin metallic gradient -->
    <linearGradient id="btn-pin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#B0B0B0"/>
      <stop offset="40%" stop-color="#D8D8D8"/>
      <stop offset="100%" stop-color="#909090"/>
    </linearGradient>
    <filter id="btn-shadow" x="-10%" y="-5%" width="120%" height="120%">
      <feDropShadow dx="1.5" dy="2.5" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Pin legs (4 corners) -->
  <rect x="12" y="68" width="4" height="12" rx="0.5" fill="url(#btn-pin)" stroke="#777" stroke-width="0.3"/>
  <rect x="64" y="68" width="4" height="12" rx="0.5" fill="url(#btn-pin)" stroke="#777" stroke-width="0.3"/>
  <rect x="12" y="0" width="4" height="12" rx="0.5" fill="url(#btn-pin)" stroke="#777" stroke-width="0.3"/>
  <rect x="64" y="0" width="4" height="12" rx="0.5" fill="url(#btn-pin)" stroke="#777" stroke-width="0.3"/>
  <!-- Square base body -->
  <rect x="8" y="12" width="64" height="56" rx="4" fill="url(#btn-base)" filter="url(#btn-shadow)" stroke="#444" stroke-width="1.5"/>
  <!-- Base edge bevel (top) -->
  <rect x="10" y="13" width="60" height="4" rx="2" fill="#444" opacity="0.5"/>
  <!-- Circular button cap platform -->
  <circle cx="40" cy="40" r="20" fill="#C62828" stroke="#8E0000" stroke-width="1.2"/>
  <!-- 3D button cap with bevel -->
  <circle cx="40" cy="39" r="16" fill="url(#btn-cap)" stroke="#B71C1C" stroke-width="0.8"/>
  <!-- Top highlight on cap -->
  <ellipse cx="37" cy="33" rx="10" ry="7" fill="url(#btn-highlight)"/>
  <!-- Specular dot -->
  <ellipse cx="34" cy="32" rx="3" ry="2" fill="#FFFFFF" opacity="0.35"/>
  <!-- Inner cross/plus marking on cap -->
  <line x1="40" y1="31" x2="40" y2="47" stroke="#B71C1C" stroke-width="1" opacity="0.4"/>
  <line x1="32" y1="39" x2="48" y2="39" stroke="#B71C1C" stroke-width="1" opacity="0.4"/>
</svg>`;

// ── Potentiometer (Trimpot) ─────────────────────────────────────────────────
const POTENTIOMETER_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90">
  <defs>
    <!-- Body gradient (blue/teal trimpot) -->
    <linearGradient id="pot-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#29B6F6"/>
      <stop offset="25%" stop-color="#0288D1"/>
      <stop offset="75%" stop-color="#01579B"/>
      <stop offset="100%" stop-color="#004D73"/>
    </linearGradient>
    <!-- Knob metallic gradient -->
    <radialGradient id="pot-knob" cx="38%" cy="32%" r="55%">
      <stop offset="0%" stop-color="#F5F5F5"/>
      <stop offset="25%" stop-color="#E0E0E0"/>
      <stop offset="55%" stop-color="#BDBDBD"/>
      <stop offset="80%" stop-color="#9E9E9E"/>
      <stop offset="100%" stop-color="#757575"/>
    </radialGradient>
    <!-- Shaft slot gradient -->
    <linearGradient id="pot-slot" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#616161"/>
      <stop offset="100%" stop-color="#424242"/>
    </linearGradient>
    <!-- Pin metallic -->
    <linearGradient id="pot-pin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#B0B0B0"/>
      <stop offset="40%" stop-color="#E0E0E0"/>
      <stop offset="100%" stop-color="#888"/>
    </linearGradient>
    <filter id="pot-shadow" x="-8%" y="-5%" width="116%" height="115%">
      <feDropShadow dx="1.5" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.30"/>
    </filter>
  </defs>
  <!-- 3 pins at bottom -->
  <rect x="15" y="72" width="4" height="18" rx="0.5" fill="url(#pot-pin)" stroke="#777" stroke-width="0.3"/>
  <rect x="38" y="72" width="4" height="18" rx="0.5" fill="url(#pot-pin)" stroke="#777" stroke-width="0.3"/>
  <rect x="61" y="72" width="4" height="18" rx="0.5" fill="url(#pot-pin)" stroke="#777" stroke-width="0.3"/>
  <!-- Pin labels -->
  <text x="17" y="85" font-family="monospace" font-size="5" fill="#888" text-anchor="middle">1</text>
  <text x="40" y="85" font-family="monospace" font-size="5" fill="#888" text-anchor="middle">W</text>
  <text x="63" y="85" font-family="monospace" font-size="5" fill="#888" text-anchor="middle">3</text>
  <!-- Circular body (top-down view) -->
  <circle cx="40" cy="38" r="34" fill="url(#pot-body)" filter="url(#pot-shadow)" stroke="#01579B" stroke-width="1.5"/>
  <!-- Body edge bevel highlight -->
  <ellipse cx="36" cy="18" rx="22" ry="10" fill="#FFFFFF" opacity="0.08"/>
  <!-- Registration mark / notch -->
  <circle cx="40" cy="8" r="2" fill="#004D73" stroke="#003D5C" stroke-width="0.5"/>
  <!-- Value text on body -->
  <text x="40" y="60" text-anchor="middle" font-family="monospace" font-size="6" fill="#B3E5FC" font-weight="bold">10K</text>
  <!-- Center metal shaft/knob -->
  <circle cx="40" cy="36" r="14" fill="url(#pot-knob)" stroke="#616161" stroke-width="1.2"/>
  <!-- Knob edge ring -->
  <circle cx="40" cy="36" r="11.5" fill="none" stroke="#BDBDBD" stroke-width="0.4"/>
  <!-- Screwdriver slot -->
  <rect x="37" y="28" width="6" height="16" rx="1" fill="url(#pot-slot)" stroke="#333" stroke-width="0.4"/>
  <!-- Knob specular highlight -->
  <ellipse cx="36" cy="30" rx="6" ry="4" fill="#FFFFFF" opacity="0.22"/>
  <ellipse cx="35" cy="29" rx="3" ry="2" fill="#FFFFFF" opacity="0.15"/>
</svg>`;

// ── Buzzer (Piezo) ──────────────────────────────────────────────────────────
const BUZZER_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90">
  <defs>
    <!-- Cylindrical body gradient -->
    <radialGradient id="buz-body" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#424242"/>
      <stop offset="40%" stop-color="#333333"/>
      <stop offset="80%" stop-color="#212121"/>
      <stop offset="100%" stop-color="#111111"/>
    </radialGradient>
    <!-- Top face gradient -->
    <radialGradient id="buz-top" cx="42%" cy="38%" r="55%">
      <stop offset="0%" stop-color="#4A4A4A"/>
      <stop offset="50%" stop-color="#333333"/>
      <stop offset="100%" stop-color="#1A1A1A"/>
    </radialGradient>
    <!-- Pin metallic -->
    <linearGradient id="buz-pin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#B0B0B0"/>
      <stop offset="40%" stop-color="#D8D8D8"/>
      <stop offset="100%" stop-color="#909090"/>
    </linearGradient>
    <filter id="buz-shadow" x="-10%" y="-5%" width="120%" height="118%">
      <feDropShadow dx="1.5" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Two pins -->
  <rect x="28" y="72" width="3.5" height="18" rx="0.5" fill="url(#buz-pin)" stroke="#777" stroke-width="0.3"/>
  <rect x="48" y="72" width="3.5" height="18" rx="0.5" fill="url(#buz-pin)" stroke="#777" stroke-width="0.3"/>
  <!-- Pin labels -->
  <text x="30" y="86" font-family="monospace" font-size="6" fill="#E53935" font-weight="bold" text-anchor="middle">+</text>
  <text x="50" y="86" font-family="monospace" font-size="6" fill="#888" font-weight="bold" text-anchor="middle">−</text>
  <!-- Cylindrical body (side ring for depth) -->
  <circle cx="40" cy="40" r="32" fill="url(#buz-body)" filter="url(#buz-shadow)" stroke="#111" stroke-width="1.5"/>
  <!-- Body rim edge -->
  <circle cx="40" cy="40" r="30" fill="none" stroke="#4A4A4A" stroke-width="0.6"/>
  <!-- Top face -->
  <circle cx="40" cy="39" r="27" fill="url(#buz-top)" stroke="#333" stroke-width="0.5"/>
  <!-- Sound hole pattern (concentric circles) -->
  <circle cx="40" cy="38" r="18" fill="none" stroke="#555" stroke-width="0.6"/>
  <circle cx="40" cy="38" r="14" fill="none" stroke="#555" stroke-width="0.6"/>
  <circle cx="40" cy="38" r="10" fill="none" stroke="#555" stroke-width="0.6"/>
  <circle cx="40" cy="38" r="6" fill="none" stroke="#555" stroke-width="0.6"/>
  <circle cx="40" cy="38" r="2.5" fill="#555" stroke="#444" stroke-width="0.3"/>
  <!-- Sound holes (dots on rings) -->
  <circle cx="40" cy="20" r="1.2" fill="#1A1A1A"/>
  <circle cx="52" cy="24" r="1.2" fill="#1A1A1A"/>
  <circle cx="56" cy="38" r="1.2" fill="#1A1A1A"/>
  <circle cx="52" cy="52" r="1.2" fill="#1A1A1A"/>
  <circle cx="40" cy="56" r="1.2" fill="#1A1A1A"/>
  <circle cx="28" cy="52" r="1.2" fill="#1A1A1A"/>
  <circle cx="24" cy="38" r="1.2" fill="#1A1A1A"/>
  <circle cx="28" cy="24" r="1.2" fill="#1A1A1A"/>
  <!-- + polarity marking -->
  <text x="28" y="68" font-family="Arial,sans-serif" font-size="10" fill="#E0E0E0" font-weight="bold">+</text>
  <!-- Top specular highlight -->
  <ellipse cx="34" cy="28" rx="8" ry="5" fill="#FFFFFF" opacity="0.08"/>
</svg>`;

// ── IR Obstacle Sensor Module ───────────────────────────────────────────────
const IR_SENSOR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
  <defs>
    <linearGradient id="ir-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </linearGradient>
    <radialGradient id="ir-led" cx="40%" cy="35%" r="55%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#E0E0E0" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#B0B0B0" stop-opacity="0.5"/>
    </radialGradient>
    <radialGradient id="ir-recv" cx="40%" cy="35%" r="55%">
      <stop offset="0%" stop-color="#424242"/>
      <stop offset="100%" stop-color="#1A1A1A"/>
    </radialGradient>
    <filter id="ir-shadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- PCB Board -->
  <rect x="5" y="5" width="110" height="55" rx="3" fill="url(#ir-pcb)" filter="url(#ir-shadow)" stroke="#0A3D91" stroke-width="1"/>
  <!-- Solder mask -->
  <rect x="8" y="8" width="104" height="49" rx="2" fill="none" stroke="#1976D2" stroke-width="0.5" opacity="0.3"/>
  <!-- IR LED (white, left) -->
  <circle cx="30" cy="25" r="10" fill="url(#ir-led)" stroke="#9E9E9E" stroke-width="1"/>
  <ellipse cx="28" cy="21" rx="3" ry="4" fill="#FFF" opacity="0.4"/>
  <!-- IR Receiver (dark, right) -->
  <circle cx="70" cy="25" r="10" fill="url(#ir-recv)" stroke="#616161" stroke-width="1"/>
  <ellipse cx="68" cy="21" rx="3" ry="4" fill="#555" opacity="0.3"/>
  <!-- Potentiometer (blue trim pot) -->
  <rect x="88" y="15" width="18" height="18" rx="2" fill="#1976D2" stroke="#0D47A1" stroke-width="0.8"/>
  <circle cx="97" cy="24" r="4" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="0.5"/>
  <line x1="97" y1="20" x2="97" y2="24" stroke="#666" stroke-width="1.5"/>
  <!-- Pin headers (3 pins at bottom) -->
  <rect x="20" y="55" width="6" height="18" rx="1" fill="#FFD54F" stroke="#F9A825" stroke-width="0.5"/>
  <rect x="37" y="55" width="6" height="18" rx="1" fill="#FFD54F" stroke="#F9A825" stroke-width="0.5"/>
  <rect x="54" y="55" width="6" height="18" rx="1" fill="#FFD54F" stroke="#F9A825" stroke-width="0.5"/>
  <!-- Pin labels -->
  <text x="23" y="78" font-family="monospace" font-size="5" fill="#666" text-anchor="middle">VCC</text>
  <text x="40" y="78" font-family="monospace" font-size="5" fill="#666" text-anchor="middle">GND</text>
  <text x="57" y="78" font-family="monospace" font-size="5" fill="#666" text-anchor="middle">OUT</text>
  <!-- Component label -->
  <text x="60" y="48" text-anchor="middle" font-family="monospace" font-size="6" fill="#90CAF9" font-weight="bold">IR SENSOR</text>
</svg>`;

// ── MQ-2 Gas Sensor Module ──────────────────────────────────────────────────
const MQ2_SENSOR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
  <defs>
    <linearGradient id="mq-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D32F2F"/>
      <stop offset="100%" stop-color="#B71C1C"/>
    </linearGradient>
    <radialGradient id="mq-can" cx="45%" cy="35%" r="55%">
      <stop offset="0%" stop-color="#E0E0E0"/>
      <stop offset="40%" stop-color="#BDBDBD"/>
      <stop offset="80%" stop-color="#9E9E9E"/>
      <stop offset="100%" stop-color="#757575"/>
    </radialGradient>
    <radialGradient id="mq-mesh" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F5F5F5" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#9E9E9E" stop-opacity="0.1"/>
    </radialGradient>
    <filter id="mq-shadow" x="-5%" y="-3%" width="110%" height="110%">
      <feDropShadow dx="1.5" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- PCB Board -->
  <rect x="10" y="50" width="80" height="60" rx="3" fill="url(#mq-pcb)" filter="url(#mq-shadow)" stroke="#8B0000" stroke-width="1"/>
  <!-- Mounting holes -->
  <circle cx="18" cy="58" r="3" fill="none" stroke="#FFCDD2" stroke-width="0.8"/>
  <circle cx="82" cy="58" r="3" fill="none" stroke="#FFCDD2" stroke-width="0.8"/>
  <!-- Metallic sensor can (cylinder top-view) -->
  <circle cx="50" cy="45" r="28" fill="url(#mq-can)" stroke="#616161" stroke-width="1.5"/>
  <!-- Mesh top -->
  <circle cx="50" cy="45" r="20" fill="url(#mq-mesh)" stroke="#BDBDBD" stroke-width="0.8"/>
  <!-- Mesh holes pattern -->
  <circle cx="50" cy="45" r="2" fill="#888"/>
  <circle cx="44" cy="39" r="1.5" fill="#999"/>
  <circle cx="56" cy="39" r="1.5" fill="#999"/>
  <circle cx="44" cy="51" r="1.5" fill="#999"/>
  <circle cx="56" cy="51" r="1.5" fill="#999"/>
  <circle cx="50" cy="36" r="1.5" fill="#999"/>
  <circle cx="50" cy="54" r="1.5" fill="#999"/>
  <circle cx="40" cy="45" r="1.5" fill="#999"/>
  <circle cx="60" cy="45" r="1.5" fill="#999"/>
  <!-- Specular highlight -->
  <ellipse cx="43" cy="36" rx="6" ry="8" fill="#FFF" opacity="0.15" transform="rotate(-20,43,36)"/>
  <!-- Pin headers (4 pins at bottom) -->
  <rect x="18" y="105" width="5" height="14" rx="1" fill="#FFD54F" stroke="#F9A825" stroke-width="0.4"/>
  <rect x="33" y="105" width="5" height="14" rx="1" fill="#FFD54F" stroke="#F9A825" stroke-width="0.4"/>
  <rect x="54" y="105" width="5" height="14" rx="1" fill="#FFD54F" stroke="#F9A825" stroke-width="0.4"/>
  <rect x="72" y="105" width="5" height="14" rx="1" fill="#FFD54F" stroke="#F9A825" stroke-width="0.4"/>
  <!-- Labels -->
  <text x="50" y="98" text-anchor="middle" font-family="monospace" font-size="6" fill="#FFCDD2" font-weight="bold">MQ-2</text>
</svg>`;

// ── DHT11 Temperature & Humidity Sensor ─────────────────────────────────────
const DHT11_SENSOR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 110">
  <defs>
    <linearGradient id="dht-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#42A5F5"/>
      <stop offset="30%" stop-color="#1E88E5"/>
      <stop offset="100%" stop-color="#1565C0"/>
    </linearGradient>
    <linearGradient id="dht-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#64B5F6" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#1565C0" stop-opacity="0"/>
    </linearGradient>
    <filter id="dht-shadow" x="-5%" y="-3%" width="110%" height="110%">
      <feDropShadow dx="1.5" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- Main blue housing -->
  <rect x="8" y="5" width="64" height="72" rx="4" fill="url(#dht-body)" filter="url(#dht-shadow)" stroke="#0D47A1" stroke-width="1.2"/>
  <!-- Top face gradient overlay -->
  <rect x="10" y="7" width="60" height="20" rx="3" fill="url(#dht-face)"/>
  <!-- Humidity sensor window (oval mesh) -->
  <rect x="18" y="15" width="44" height="30" rx="3" fill="#0D47A1" stroke="#1565C0" stroke-width="0.8"/>
  <!-- Ventilation grid pattern -->
  <line x1="22" y1="20" x2="58" y2="20" stroke="#1976D2" stroke-width="0.8"/>
  <line x1="22" y1="25" x2="58" y2="25" stroke="#1976D2" stroke-width="0.8"/>
  <line x1="22" y1="30" x2="58" y2="30" stroke="#1976D2" stroke-width="0.8"/>
  <line x1="22" y1="35" x2="58" y2="35" stroke="#1976D2" stroke-width="0.8"/>
  <line x1="22" y1="40" x2="58" y2="40" stroke="#1976D2" stroke-width="0.8"/>
  <!-- Model label -->
  <text x="40" y="62" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#E3F2FD" font-weight="bold">DHT11</text>
  <!-- Pin leads (3 active + 1 NC) -->
  <line x1="20" y1="77" x2="20" y2="105" stroke="#C0C0C0" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="33" y1="77" x2="33" y2="105" stroke="#C0C0C0" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="47" y1="77" x2="47" y2="105" stroke="#C0C0C0" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="60" y1="77" x2="60" y2="105" stroke="#C0C0C0" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Pin end caps -->
  <circle cx="20" cy="105" r="1.3" fill="#A0A0A0"/>
  <circle cx="33" cy="105" r="1.3" fill="#A0A0A0"/>
  <circle cx="47" cy="105" r="1.3" fill="#A0A0A0"/>
  <circle cx="60" cy="105" r="1.3" fill="#A0A0A0"/>
  <!-- Pin labels -->
  <text x="20" y="98" text-anchor="middle" font-family="monospace" font-size="5" fill="#666">VCC</text>
  <text x="33" y="98" text-anchor="middle" font-family="monospace" font-size="5" fill="#666">DAT</text>
  <text x="47" y="98" text-anchor="middle" font-family="monospace" font-size="5" fill="#666">NC</text>
  <text x="60" y="98" text-anchor="middle" font-family="monospace" font-size="5" fill="#666">GND</text>
</svg>`;

// ── Breadboard 830 ──────────────────────────────────────────────────────────
const BREADBOARD_830_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 200">
  <defs>
    <linearGradient id="bb-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF8E1"/>
      <stop offset="100%" stop-color="#F5F0E0"/>
    </linearGradient>
    <filter id="bb-shadow" x="-1%" y="-2%" width="102%" height="104%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <!-- Main body -->
  <rect x="5" y="5" width="620" height="190" rx="4" fill="url(#bb-body)" filter="url(#bb-shadow)" stroke="#D7CCC8" stroke-width="1.5"/>
  <!-- Top power rail (+) -->
  <rect x="15" y="12" width="600" height="18" rx="2" fill="#FFF3E0"/>
  <line x1="15" y1="12" x2="615" y2="12" stroke="#F44336" stroke-width="1.5"/>
  <text x="10" y="25" font-family="monospace" font-size="8" fill="#F44336" font-weight="bold">+</text>
  ${Array.from({length: 63}, (_, i) => {
    const x = 22 + i * 9.4;
    return `<circle cx="${x}" cy="21" r="2" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="0.3"/>`;
  }).join('\n  ')}
  <!-- Top power rail (−) -->
  <rect x="15" y="30" width="600" height="18" rx="2" fill="#E3F2FD"/>
  <line x1="15" y1="48" x2="615" y2="48" stroke="#1976D2" stroke-width="1.5"/>
  <text x="10" y="43" font-family="monospace" font-size="8" fill="#1976D2" font-weight="bold">−</text>
  ${Array.from({length: 63}, (_, i) => {
    const x = 22 + i * 9.4;
    return `<circle cx="${x}" cy="39" r="2" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="0.3"/>`;
  }).join('\n  ')}
  <!-- Top terminal area (rows A-E) -->
  <rect x="15" y="52" width="600" height="48" rx="2" fill="#FAFAF5"/>
  ${['A','B','C','D','E'].map((row, ri) => {
    const y = 57 + ri * 9;
    return `<text x="10" y="${y + 4}" font-family="monospace" font-size="5" fill="#9E9E9E">${row}</text>` +
      Array.from({length: 63}, (_, ci) => {
        const x = 22 + ci * 9.4;
        return `<circle cx="${x}" cy="${y}" r="1.8" fill="#BDBDBD" stroke="#9E9E9E" stroke-width="0.2"/>`;
      }).join('');
  }).join('\n  ')}
  <!-- Center divider gap -->
  <rect x="15" y="100" width="600" height="6" rx="1" fill="#E8E0D0"/>
  <line x1="15" y1="103" x2="615" y2="103" stroke="#D7CCC8" stroke-width="0.5" stroke-dasharray="2,2"/>
  <!-- Column numbers -->
  ${Array.from({length: 63}, (_, i) => {
    if ((i + 1) % 5 === 0 || i === 0) {
      const x = 22 + i * 9.4;
      return `<text x="${x}" y="102" text-anchor="middle" font-family="monospace" font-size="4" fill="#9E9E9E">${i + 1}</text>`;
    }
    return '';
  }).filter(Boolean).join('\n  ')}
  <!-- Bottom terminal area (rows F-J) -->
  <rect x="15" y="106" width="600" height="48" rx="2" fill="#FAFAF5"/>
  ${['F','G','H','I','J'].map((row, ri) => {
    const y = 111 + ri * 9;
    return `<text x="10" y="${y + 4}" font-family="monospace" font-size="5" fill="#9E9E9E">${row}</text>` +
      Array.from({length: 63}, (_, ci) => {
        const x = 22 + ci * 9.4;
        return `<circle cx="${x}" cy="${y}" r="1.8" fill="#BDBDBD" stroke="#9E9E9E" stroke-width="0.2"/>`;
      }).join('');
  }).join('\n  ')}
  <!-- Bottom power rail (+) -->
  <rect x="15" y="157" width="600" height="18" rx="2" fill="#FFF3E0"/>
  <line x1="15" y1="157" x2="615" y2="157" stroke="#F44336" stroke-width="1.5"/>
  <text x="10" y="170" font-family="monospace" font-size="8" fill="#F44336" font-weight="bold">+</text>
  ${Array.from({length: 63}, (_, i) => {
    const x = 22 + i * 9.4;
    return `<circle cx="${x}" cy="166" r="2" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="0.3"/>`;
  }).join('\n  ')}
  <!-- Bottom power rail (−) -->
  <rect x="15" y="175" width="600" height="18" rx="2" fill="#E3F2FD"/>
  <line x1="15" y1="193" x2="615" y2="193" stroke="#1976D2" stroke-width="1.5"/>
  <text x="10" y="188" font-family="monospace" font-size="8" fill="#1976D2" font-weight="bold">−</text>
  ${Array.from({length: 63}, (_, i) => {
    const x = 22 + i * 9.4;
    return `<circle cx="${x}" cy="184" r="2" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="0.3"/>`;
  }).join('\n  ')}
</svg>`;

// ── Breadboard 400 ──────────────────────────────────────────────────────────
const BREADBOARD_400_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 200">
  <defs>
    <linearGradient id="bb4-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF8E1"/>
      <stop offset="100%" stop-color="#F5F0E0"/>
    </linearGradient>
    <filter id="bb4-shadow" x="-2%" y="-2%" width="104%" height="104%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <!-- Main body -->
  <rect x="5" y="5" width="320" height="190" rx="4" fill="url(#bb4-body)" filter="url(#bb4-shadow)" stroke="#D7CCC8" stroke-width="1.5"/>
  <!-- Top power rail (+) -->
  <rect x="15" y="12" width="300" height="18" rx="2" fill="#FFF3E0"/>
  <line x1="15" y1="12" x2="315" y2="12" stroke="#F44336" stroke-width="1.5"/>
  <text x="10" y="25" font-family="monospace" font-size="8" fill="#F44336" font-weight="bold">+</text>
  ${Array.from({length: 30}, (_, i) => {
    const x = 22 + i * 9.6;
    return `<circle cx="${x}" cy="21" r="2" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="0.3"/>`;
  }).join('\n  ')}
  <!-- Top power rail (−) -->
  <rect x="15" y="30" width="300" height="18" rx="2" fill="#E3F2FD"/>
  <line x1="15" y1="48" x2="315" y2="48" stroke="#1976D2" stroke-width="1.5"/>
  <text x="10" y="43" font-family="monospace" font-size="8" fill="#1976D2" font-weight="bold">−</text>
  ${Array.from({length: 30}, (_, i) => {
    const x = 22 + i * 9.6;
    return `<circle cx="${x}" cy="39" r="2" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="0.3"/>`;
  }).join('\n  ')}
  <!-- Top terminal area (rows A-E) -->
  <rect x="15" y="52" width="300" height="48" rx="2" fill="#FAFAF5"/>
  ${['A','B','C','D','E'].map((row, ri) => {
    const y = 57 + ri * 9;
    return `<text x="10" y="${y + 4}" font-family="monospace" font-size="5" fill="#9E9E9E">${row}</text>` +
      Array.from({length: 30}, (_, ci) => {
        const x = 22 + ci * 9.6;
        return `<circle cx="${x}" cy="${y}" r="1.8" fill="#BDBDBD" stroke="#9E9E9E" stroke-width="0.2"/>`;
      }).join('');
  }).join('\n  ')}
  <!-- Center divider -->
  <rect x="15" y="100" width="300" height="6" rx="1" fill="#E8E0D0"/>
  <!-- Bottom terminal area (rows F-J) -->
  <rect x="15" y="106" width="300" height="48" rx="2" fill="#FAFAF5"/>
  ${['F','G','H','I','J'].map((row, ri) => {
    const y = 111 + ri * 9;
    return `<text x="10" y="${y + 4}" font-family="monospace" font-size="5" fill="#9E9E9E">${row}</text>` +
      Array.from({length: 30}, (_, ci) => {
        const x = 22 + ci * 9.6;
        return `<circle cx="${x}" cy="${y}" r="1.8" fill="#BDBDBD" stroke="#9E9E9E" stroke-width="0.2"/>`;
      }).join('');
  }).join('\n  ')}
  <!-- Bottom power rail (+) -->
  <rect x="15" y="157" width="300" height="18" rx="2" fill="#FFF3E0"/>
  <line x1="15" y1="157" x2="315" y2="157" stroke="#F44336" stroke-width="1.5"/>
  <text x="10" y="170" font-family="monospace" font-size="8" fill="#F44336" font-weight="bold">+</text>
  ${Array.from({length: 30}, (_, i) => {
    const x = 22 + i * 9.6;
    return `<circle cx="${x}" cy="166" r="2" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="0.3"/>`;
  }).join('\n  ')}
  <!-- Bottom power rail (−) -->
  <rect x="15" y="175" width="300" height="18" rx="2" fill="#E3F2FD"/>
  <line x1="15" y1="193" x2="315" y2="193" stroke="#1976D2" stroke-width="1.5"/>
  <text x="10" y="188" font-family="monospace" font-size="8" fill="#1976D2" font-weight="bold">−</text>
  ${Array.from({length: 30}, (_, i) => {
    const x = 22 + i * 9.6;
    return `<circle cx="${x}" cy="184" r="2" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="0.3"/>`;
  }).join('\n  ')}
</svg>`;

// ── Breadboard Mini ─────────────────────────────────────────────────────────
const BREADBOARD_MINI_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 120">
  <defs>
    <linearGradient id="bbm-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F5F5F5"/>
    </linearGradient>
    <filter id="bbm-shadow" x="-3%" y="-3%" width="106%" height="106%">
      <feDropShadow dx="1" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <!-- Main body -->
  <rect x="5" y="5" width="160" height="110" rx="4" fill="url(#bbm-body)" filter="url(#bbm-shadow)" stroke="#E0E0E0" stroke-width="1.5"/>
  <!-- Top terminal area (rows A-E) -->
  <rect x="12" y="10" width="146" height="44" rx="2" fill="#FAFAFA"/>
  ${['A','B','C','D','E'].map((row, ri) => {
    const y = 16 + ri * 8;
    return `<text x="8" y="${y + 3}" font-family="monospace" font-size="4" fill="#BDBDBD">${row}</text>` +
      Array.from({length: 17}, (_, ci) => {
        const x = 18 + ci * 8.4;
        return `<circle cx="${x}" cy="${y}" r="1.6" fill="#BDBDBD" stroke="#9E9E9E" stroke-width="0.2"/>`;
      }).join('');
  }).join('\n  ')}
  <!-- Center divider gap -->
  <rect x="12" y="54" width="146" height="5" rx="1" fill="#EEEEEE"/>
  <!-- Bottom terminal area (rows F-J) -->
  <rect x="12" y="59" width="146" height="44" rx="2" fill="#FAFAFA"/>
  ${['F','G','H','I','J'].map((row, ri) => {
    const y = 65 + ri * 8;
    return `<text x="8" y="${y + 3}" font-family="monospace" font-size="4" fill="#BDBDBD">${row}</text>` +
      Array.from({length: 17}, (_, ci) => {
        const x = 18 + ci * 8.4;
        return `<circle cx="${x}" cy="${y}" r="1.6" fill="#BDBDBD" stroke="#9E9E9E" stroke-width="0.2"/>`;
      }).join('');
  }).join('\n  ')}
  <!-- Column numbers at bottom -->
  ${Array.from({length: 17}, (_, i) => {
    if ((i + 1) % 5 === 0 || i === 0) {
      const x = 18 + i * 8.4;
      return `<text x="${x}" y="110" text-anchor="middle" font-family="monospace" font-size="4" fill="#BDBDBD">${i + 1}</text>`;
    }
    return '';
  }).filter(Boolean).join('\n  ')}
</svg>`;

// ─── Convert raw SVGs to data URIs ─────────────────────────────────────────

const ESP32_SVG = svgToDataUri(ESP32_RAW);
const ARDUINO_UNO_SVG = svgToDataUri(ARDUINO_UNO_RAW);
const ARDUINO_NANO_SVG = svgToDataUri(ARDUINO_NANO_RAW);
const HC_SR04_SVG = svgToDataUri(HC_SR04_RAW);
const SG90_SERVO_SVG = svgToDataUri(SG90_SERVO_RAW);
const LED_5MM_SVG = svgToDataUri(LED_5MM_RAW);
const RESISTOR_SVG = svgToDataUri(RESISTOR_RAW);
const LCD1602_SVG = svgToDataUri(LCD1602_RAW);
const OLED_SSD1306_SVG = svgToDataUri(OLED_SSD1306_RAW);
const RELAY_MODULE_SVG = svgToDataUri(RELAY_MODULE_RAW);
const PUSH_BUTTON_SVG = svgToDataUri(PUSH_BUTTON_RAW);
const POTENTIOMETER_SVG = svgToDataUri(POTENTIOMETER_RAW);
const BUZZER_SVG = svgToDataUri(BUZZER_RAW);
const BREADBOARD_830_SVG = svgToDataUri(BREADBOARD_830_RAW);
const BREADBOARD_400_SVG = svgToDataUri(BREADBOARD_400_RAW);
const BREADBOARD_MINI_SVG = svgToDataUri(BREADBOARD_MINI_RAW);
const IR_SENSOR_SVG = svgToDataUri(IR_SENSOR_RAW);
const MQ2_SENSOR_SVG = svgToDataUri(MQ2_SENSOR_RAW);
const DHT11_SENSOR_SVG = svgToDataUri(DHT11_SENSOR_RAW);

// ─── Component SVG Map ─────────────────────────────────────────────────────

const COMPONENT_SVG_MAP: Record<string, string> = {
  'ESP32': ESP32_SVG,
  'ARDUINO_UNO': ARDUINO_UNO_SVG,
  'ARDUINO_NANO': ARDUINO_NANO_SVG,
  'ULTRASONIC': HC_SR04_SVG,
  'SERVO': SG90_SERVO_SVG,
  'LED': LED_5MM_SVG,
  'RESISTOR': RESISTOR_SVG,
  'LCD': LCD1602_SVG,
  'OLED': OLED_SSD1306_SVG,
  'RELAY': RELAY_MODULE_SVG,
  'PUSH_BUTTON': PUSH_BUTTON_SVG,
  'POTENTIOMETER': POTENTIOMETER_SVG,
  'BUZZER': BUZZER_SVG,
  'IR_SENSOR': IR_SENSOR_SVG,
  'MQ2_SENSOR': MQ2_SENSOR_SVG,
  'DHT11': DHT11_SENSOR_SVG,
};

const BREADBOARD_SVG_MAP: Record<string, string> = {
  'breadboard_830': BREADBOARD_830_SVG,
  'breadboard_400': BREADBOARD_400_SVG,
  'breadboard_mini': BREADBOARD_MINI_SVG,
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get SVG data URI for a component type.
 *
 * @param componentType - One of the keys in `COMPONENT_SVG_MAP`
 *        (e.g. `'ESP32'`, `'ARDUINO_UNO'`, `'LED_5MM'`)
 * @returns The `data:image/svg+xml;charset=utf-8,...` URI string,
 *          or an empty string if the component type is unknown.
 */
export function getComponentSvg(componentType: string): string {
  return COMPONENT_SVG_MAP[componentType] ?? '';
}

/**
 * Get SVG data URI for a breadboard asset.
 *
 * @param assetId - One of `'BREADBOARD_830'`, `'BREADBOARD_400'`, `'BREADBOARD_MINI'`
 * @returns The `data:image/svg+xml;charset=utf-8,...` URI string,
 *          or an empty string if the asset ID is unknown.
 */
export function getBreadboardSvg(assetId: string): string {
  return BREADBOARD_SVG_MAP[assetId] ?? '';
}

/**
 * Get all component SVG assets as a Map (includes both components and breadboards).
 *
 * @returns A `Map<string, string>` mapping asset keys to their data URIs.
 */
export function getAllComponentSvgAssets(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(COMPONENT_SVG_MAP)) {
    map.set(key, value);
  }
  for (const [key, value] of Object.entries(BREADBOARD_SVG_MAP)) {
    map.set(key, value);
  }
  return map;
}
