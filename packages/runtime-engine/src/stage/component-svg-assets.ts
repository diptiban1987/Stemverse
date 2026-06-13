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
      <stop offset="0%" stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </linearGradient>
    <linearGradient id="esp-antenna" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E0E0E0"/>
      <stop offset="100%" stop-color="#9E9E9E"/>
    </linearGradient>
    <linearGradient id="gold-pin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFD54F"/>
      <stop offset="100%" stop-color="#F9A825"/>
    </linearGradient>
    <filter id="esp-shadow" x="-4%" y="-2%" width="108%" height="104%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- PCB Board -->
  <rect x="50" y="10" width="200" height="530" rx="6" fill="url(#esp-pcb)" filter="url(#esp-shadow)" stroke="#0A3D91" stroke-width="1.5"/>
  <!-- Solder mask texture -->
  <rect x="55" y="15" width="190" height="520" rx="4" fill="none" stroke="#1976D2" stroke-width="0.5" opacity="0.4"/>
  <!-- WiFi Antenna Module -->
  <rect x="80" y="20" width="140" height="100" rx="3" fill="url(#esp-antenna)" stroke="#757575" stroke-width="1"/>
  <line x1="90" y1="30" x2="210" y2="30" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="90" y1="45" x2="210" y2="45" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="90" y1="60" x2="210" y2="60" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="90" y1="75" x2="210" y2="75" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="90" y1="90" x2="210" y2="90" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="90" y1="105" x2="210" y2="105" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="110" y1="25" x2="110" y2="115" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="140" y1="25" x2="140" y2="115" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="170" y1="25" x2="170" y2="115" stroke="#BDBDBD" stroke-width="0.5"/>
  <line x1="200" y1="25" x2="200" y2="115" stroke="#BDBDBD" stroke-width="0.5"/>
  <text x="150" y="70" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#616161" font-weight="bold">ESP-WROOM-32</text>
  <!-- ESP32 Chip (under antenna shield) -->
  <rect x="115" y="130" width="70" height="70" rx="2" fill="#212121" stroke="#424242" stroke-width="1"/>
  <circle cx="120" cy="135" r="3" fill="#555"/>
  <text x="150" y="170" text-anchor="middle" font-family="monospace" font-size="7" fill="#9E9E9E">ESP32</text>
  <!-- Micro-USB Port -->
  <rect x="120" y="490" width="60" height="25" rx="3" fill="#B0BEC5" stroke="#78909C" stroke-width="1.5"/>
  <rect x="130" y="495" width="40" height="15" rx="2" fill="#37474F"/>
  <text x="150" y="530" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#BBDEFB">USB</text>
  <!-- EN Button -->
  <rect x="65" y="430" width="25" height="14" rx="2" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="1"/>
  <rect x="70" y="433" width="15" height="8" rx="1" fill="#F5F5F5"/>
  <text x="77" y="460" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#BBDEFB">EN</text>
  <!-- BOOT Button -->
  <rect x="210" y="430" width="25" height="14" rx="2" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="1"/>
  <rect x="215" y="433" width="15" height="8" rx="1" fill="#F5F5F5"/>
  <text x="222" y="460" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#BBDEFB">BOOT</text>
  <!-- Power LED -->
  <circle cx="90" y="220" r="4" fill="#F44336" opacity="0.9"/>
  <circle cx="90" cy="220" r="2" fill="#FF8A80"/>
  <!-- Left Pin Row (15 pins) -->
  <g id="esp-left-pins">
    ${Array.from({length: 15}, (_, i) => {
      const y = 140 + i * 24;
      return `<rect x="30" y="${y}" width="25" height="8" rx="1" fill="url(#gold-pin)" stroke="#F57F17" stroke-width="0.5"/>`;
    }).join('\n    ')}
  </g>
  <!-- Right Pin Row (15 pins) -->
  <g id="esp-right-pins">
    ${Array.from({length: 15}, (_, i) => {
      const y = 140 + i * 24;
      return `<rect x="245" y="${y}" width="25" height="8" rx="1" fill="url(#gold-pin)" stroke="#F57F17" stroke-width="0.5"/>`;
    }).join('\n    ')}
  </g>
  <!-- Pin Labels Left -->
  <text x="46" y="148" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">3V3</text>
  <text x="46" y="172" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">GND</text>
  <text x="46" y="196" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D15</text>
  <text x="46" y="220" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D2</text>
  <text x="46" y="244" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D4</text>
  <text x="46" y="268" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D16</text>
  <text x="46" y="292" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D17</text>
  <text x="46" y="316" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D5</text>
  <text x="46" y="340" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D18</text>
  <text x="46" y="364" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D19</text>
  <text x="46" y="388" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D21</text>
  <text x="46" y="412" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D3</text>
  <text x="46" y="436" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D1</text>
  <text x="46" y="460" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D22</text>
  <text x="46" y="484" font-family="monospace" font-size="6" fill="#BBDEFB" text-anchor="end">D23</text>
  <!-- Pin Labels Right -->
  <text x="254" y="148" font-family="monospace" font-size="6" fill="#BBDEFB">VIN</text>
  <text x="254" y="172" font-family="monospace" font-size="6" fill="#BBDEFB">GND</text>
  <text x="254" y="196" font-family="monospace" font-size="6" fill="#BBDEFB">D13</text>
  <text x="254" y="220" font-family="monospace" font-size="6" fill="#BBDEFB">D12</text>
  <text x="254" y="244" font-family="monospace" font-size="6" fill="#BBDEFB">D14</text>
  <text x="254" y="268" font-family="monospace" font-size="6" fill="#BBDEFB">D27</text>
  <text x="254" y="292" font-family="monospace" font-size="6" fill="#BBDEFB">D26</text>
  <text x="254" y="316" font-family="monospace" font-size="6" fill="#BBDEFB">D25</text>
  <text x="254" y="340" font-family="monospace" font-size="6" fill="#BBDEFB">D33</text>
  <text x="254" y="364" font-family="monospace" font-size="6" fill="#BBDEFB">D32</text>
  <text x="254" y="388" font-family="monospace" font-size="6" fill="#BBDEFB">D35</text>
  <text x="254" y="412" font-family="monospace" font-size="6" fill="#BBDEFB">D34</text>
  <text x="254" y="436" font-family="monospace" font-size="6" fill="#BBDEFB">VN</text>
  <text x="254" y="460" font-family="monospace" font-size="6" fill="#BBDEFB">VP</text>
  <text x="254" y="484" font-family="monospace" font-size="6" fill="#BBDEFB">EN</text>
  <!-- Board Label -->
  <text x="150" y="415" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#E3F2FD" font-weight="bold">ESP32 DevKit V1</text>
</svg>`;

// ── Arduino Uno R3 ──────────────────────────────────────────────────────────
const ARDUINO_UNO_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350">
  <defs>
    <linearGradient id="uno-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1976D2"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </linearGradient>
    <linearGradient id="uno-usb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#CFD8DC"/>
      <stop offset="100%" stop-color="#90A4AE"/>
    </linearGradient>
    <linearGradient id="uno-barrel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#424242"/>
      <stop offset="100%" stop-color="#212121"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFD54F"/>
      <stop offset="100%" stop-color="#F9A825"/>
    </linearGradient>
    <filter id="uno-shadow" x="-3%" y="-3%" width="106%" height="106%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- PCB Board -->
  <rect x="10" y="10" width="480" height="330" rx="8" fill="url(#uno-pcb)" filter="url(#uno-shadow)" stroke="#0A3D91" stroke-width="1.5"/>
  <!-- Mounting holes -->
  <circle cx="30" cy="30" r="7" fill="none" stroke="#BBDEFB" stroke-width="1.5"/>
  <circle cx="30" cy="310" r="7" fill="none" stroke="#BBDEFB" stroke-width="1.5"/>
  <circle cx="460" cy="30" r="7" fill="none" stroke="#BBDEFB" stroke-width="1.5"/>
  <circle cx="460" cy="310" r="7" fill="none" stroke="#BBDEFB" stroke-width="1.5"/>
  <!-- USB-B Port -->
  <rect x="10" y="100" width="55" height="40" rx="3" fill="url(#uno-usb)" stroke="#78909C" stroke-width="1.5"/>
  <rect x="15" y="107" width="40" height="26" rx="2" fill="#546E7A"/>
  <text x="37" y="123" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#CFD8DC">USB-B</text>
  <!-- DC Barrel Jack -->
  <rect x="10" y="210" width="45" height="30" rx="3" fill="url(#uno-barrel)" stroke="#616161" stroke-width="1"/>
  <circle cx="32" cy="225" r="7" fill="#333" stroke="#555" stroke-width="1"/>
  <circle cx="32" cy="225" r="3" fill="#212121"/>
  <!-- ATmega328P DIP Chip -->
  <rect x="190" y="120" width="90" height="35" rx="2" fill="#212121" stroke="#424242" stroke-width="1"/>
  <ellipse cx="200" cy="137" rx="4" ry="4" fill="#333"/>
  <text x="235" y="140" text-anchor="middle" font-family="monospace" font-size="7" fill="#9E9E9E">ATmega328P</text>
  <!-- DIP chip pins -->
  ${Array.from({length: 14}, (_, i) => {
    const x = 195 + i * 6;
    return `<rect x="${x}" y="${113}" width="3" height="8" fill="#B0BEC5"/>
    <rect x="${x}" y="${155}" width="3" height="8" fill="#B0BEC5"/>`;
  }).join('\n  ')}
  <!-- Crystal Oscillator -->
  <rect x="300" y="125" width="20" height="10" rx="2" fill="#C0CA33" stroke="#9E9D24" stroke-width="0.5"/>
  <text x="310" y="133" text-anchor="middle" font-family="monospace" font-size="5" fill="#33691E">16MHz</text>
  <!-- Voltage Regulator -->
  <rect x="80" y="250" width="25" height="20" rx="1" fill="#212121" stroke="#424242" stroke-width="0.5"/>
  <rect x="85" y="270" width="15" height="3" fill="#B0BEC5"/>
  <!-- Reset Button -->
  <rect x="140" y="60" width="20" height="14" rx="2" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="1"/>
  <rect x="144" y="63" width="12" height="8" rx="1" fill="#FAFAFA"/>
  <text x="150" y="56" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" fill="#BBDEFB">RESET</text>
  <!-- Power LED -->
  <circle cx="115" cy="290" r="4" fill="#4CAF50" opacity="0.9"/>
  <circle cx="115" cy="290" r="2" fill="#A5D6A7"/>
  <text x="115" y="303" text-anchor="middle" font-family="monospace" font-size="5" fill="#BBDEFB">ON</text>
  <!-- LED 13 -->
  <circle cx="145" cy="290" r="4" fill="#FFC107" opacity="0.8"/>
  <circle cx="145" cy="290" r="2" fill="#FFE082"/>
  <text x="145" y="303" text-anchor="middle" font-family="monospace" font-size="5" fill="#BBDEFB">L</text>
  <!-- TX/RX LEDs -->
  <circle cx="100" cy="80" r="3" fill="#F44336" opacity="0.8"/>
  <text x="100" y="73" text-anchor="middle" font-family="monospace" font-size="5" fill="#BBDEFB">TX</text>
  <circle cx="120" cy="80" r="3" fill="#4CAF50" opacity="0.8"/>
  <text x="120" y="73" text-anchor="middle" font-family="monospace" font-size="5" fill="#BBDEFB">RX</text>
  <!-- ICSP Header -->
  <g transform="translate(370,130)">
    <rect x="0" y="0" width="18" height="12" rx="1" fill="#1565C0" stroke="#BBDEFB" stroke-width="0.5"/>
    ${[0,6,12].map(x => [0,8].map(y => `<circle cx="${x+3}" cy="${y+2}" r="1.5" fill="url(#gold)"/>`).join('')).join('\n    ')}
    <text x="9" y="22" text-anchor="middle" font-family="monospace" font-size="5" fill="#BBDEFB">ICSP</text>
  </g>
  <!-- Digital Pin Headers (D0-D13) -->
  <rect x="160" y="12" width="290" height="18" rx="2" fill="#212121" stroke="#424242" stroke-width="0.5"/>
  ${Array.from({length: 14}, (_, i) => {
    const x = 170 + i * 20;
    return `<rect x="${x}" y="15" width="10" height="12" rx="1" fill="url(#gold)" stroke="#F57F17" stroke-width="0.3"/>
    <text x="${x+5}" y="42" text-anchor="middle" font-family="monospace" font-size="5" fill="#BBDEFB">${i}</text>`;
  }).join('\n  ')}
  <!-- Analog Pin Headers (A0-A5) -->
  <rect x="160" y="320" width="140" height="18" rx="2" fill="#212121" stroke="#424242" stroke-width="0.5"/>
  ${Array.from({length: 6}, (_, i) => {
    const x = 170 + i * 20;
    return `<rect x="${x}" y="323" width="10" height="12" rx="1" fill="url(#gold)" stroke="#F57F17" stroke-width="0.3"/>
    <text x="${x+5}" y="316" text-anchor="middle" font-family="monospace" font-size="5" fill="#BBDEFB">A${i}</text>`;
  }).join('\n  ')}
  <!-- Power Pin Headers -->
  <rect x="70" y="320" width="80" height="18" rx="2" fill="#212121" stroke="#424242" stroke-width="0.5"/>
  <text x="78" y="316" font-family="monospace" font-size="5" fill="#BBDEFB">5V</text>
  <text x="98" y="316" font-family="monospace" font-size="5" fill="#BBDEFB">3V3</text>
  <text x="118" y="316" font-family="monospace" font-size="5" fill="#BBDEFB">GND</text>
  <text x="138" y="316" font-family="monospace" font-size="5" fill="#BBDEFB">VIN</text>
  <!-- Board Label -->
  <text x="250" y="200" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#E3F2FD" font-weight="bold">Arduino Uno R3</text>
  <text x="250" y="218" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#90CAF9">Made in Italy</text>
  <!-- Arduino Logo Circle -->
  <circle cx="420" cy="280" r="18" fill="none" stroke="#BBDEFB" stroke-width="1.5"/>
  <text x="420" y="284" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#BBDEFB" font-weight="bold">∞</text>
</svg>`;

// ── Arduino Nano ────────────────────────────────────────────────────────────
const ARDUINO_NANO_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 180">
  <defs>
    <linearGradient id="nano-pcb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </linearGradient>
    <linearGradient id="nano-gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFD54F"/>
      <stop offset="100%" stop-color="#F9A825"/>
    </linearGradient>
    <filter id="nano-shadow" x="-3%" y="-4%" width="106%" height="108%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- PCB -->
  <rect x="10" y="20" width="430" height="140" rx="5" fill="url(#nano-pcb)" filter="url(#nano-shadow)" stroke="#0A3D91" stroke-width="1.2"/>
  <!-- Mini-USB Port -->
  <rect x="10" y="65" width="35" height="30" rx="2" fill="#B0BEC5" stroke="#78909C" stroke-width="1"/>
  <rect x="14" y="70" width="25" height="20" rx="1.5" fill="#546E7A"/>
  <text x="27" y="100" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" fill="#BBDEFB">USB</text>
  <!-- TQFP ATmega328 Chip -->
  <rect x="180" y="55" width="60" height="60" rx="2" fill="#212121" stroke="#424242" stroke-width="1"/>
  <circle cx="188" cy="62" r="3" fill="#333"/>
  <text x="210" y="88" text-anchor="middle" font-family="monospace" font-size="6" fill="#9E9E9E">328P</text>
  <!-- TQFP pins (all 4 sides) -->
  ${Array.from({length: 8}, (_, i) => `<rect x="${185 + i * 6}" y="${48}" width="2" height="8" fill="#B0BEC5"/>
  <rect x="${185 + i * 6}" y="${115}" width="2" height="8" fill="#B0BEC5"/>
  <rect x="${173}" y="${60 + i * 6}" width="8" height="2" fill="#B0BEC5"/>
  <rect x="${240}" y="${60 + i * 6}" width="8" height="2" fill="#B0BEC5"/>`).join('\n  ')}
  <!-- Crystal -->
  <rect x="265" y="70" width="16" height="8" rx="1.5" fill="#C0CA33" stroke="#9E9D24" stroke-width="0.5"/>
  <!-- Reset Button -->
  <rect x="70" y="72" width="16" height="12" rx="1.5" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="0.8"/>
  <rect x="73" y="75" width="10" height="6" rx="1" fill="#FAFAFA"/>
  <text x="78" y="68" text-anchor="middle" font-family="monospace" font-size="5" fill="#BBDEFB">RST</text>
  <!-- Power LED -->
  <circle cx="115" cy="130" r="3" fill="#4CAF50" opacity="0.9"/>
  <circle cx="115" cy="130" r="1.5" fill="#A5D6A7"/>
  <!-- LED 13 -->
  <circle cx="135" cy="130" r="3" fill="#FFC107" opacity="0.8"/>
  <circle cx="135" cy="130" r="1.5" fill="#FFE082"/>
  <!-- Top Pin Row (15 pins) -->
  ${Array.from({length: 15}, (_, i) => {
    const x = 60 + i * 24;
    return `<rect x="${x}" y="8" width="10" height="16" rx="1" fill="url(#nano-gold)" stroke="#F57F17" stroke-width="0.3"/>`;
  }).join('\n  ')}
  <!-- Bottom Pin Row (15 pins) -->
  ${Array.from({length: 15}, (_, i) => {
    const x = 60 + i * 24;
    return `<rect x="${x}" y="156" width="10" height="16" rx="1" fill="url(#nano-gold)" stroke="#F57F17" stroke-width="0.3"/>`;
  }).join('\n  ')}
  <!-- Top Pin Labels -->
  <text x="65" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D1</text>
  <text x="89" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D0</text>
  <text x="113" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">RST</text>
  <text x="137" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">GND</text>
  <text x="161" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D2</text>
  <text x="185" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D3</text>
  <text x="209" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D4</text>
  <text x="233" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D5</text>
  <text x="257" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D6</text>
  <text x="281" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D7</text>
  <text x="305" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D8</text>
  <text x="329" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D9</text>
  <text x="353" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D10</text>
  <text x="377" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D11</text>
  <text x="401" y="6" font-family="monospace" font-size="5" fill="#BBDEFB">D12</text>
  <!-- Board Label -->
  <text x="320" y="98" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#E3F2FD" font-weight="bold">Arduino Nano</text>
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
const LED_5MM_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100">
  <defs>
    <radialGradient id="led-dome" cx="50%" cy="35%" r="50%">
      <stop offset="0%" stop-color="#FF5252" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#F44336" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#D32F2F" stop-opacity="0.65"/>
    </radialGradient>
    <radialGradient id="led-glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#FFCDD2" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#FF5252" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="led-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E0E0E0"/>
      <stop offset="100%" stop-color="#9E9E9E"/>
    </linearGradient>
    <filter id="led-shadow">
      <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.2"/>
    </filter>
  </defs>
  <!-- Glow effect -->
  <circle cx="30" cy="28" r="25" fill="url(#led-glow)"/>
  <!-- LED Dome -->
  <ellipse cx="30" cy="30" rx="16" ry="22" fill="url(#led-dome)" filter="url(#led-shadow)" stroke="#C62828" stroke-width="0.5"/>
  <!-- Highlight reflection -->
  <ellipse cx="24" cy="22" rx="5" ry="8" fill="#FFFFFF" opacity="0.3" transform="rotate(-15,24,22)"/>
  <!-- LED Base / Rim -->
  <rect x="14" y="48" width="32" height="8" rx="2" fill="url(#led-base)" stroke="#757575" stroke-width="0.5"/>
  <!-- Flat cathode edge indicator -->
  <line x1="42" y1="50" x2="42" y2="55" stroke="#757575" stroke-width="1.5"/>
  <!-- Anode leg (longer) -->
  <line x1="24" y1="56" x2="24" y2="98" stroke="#9E9E9E" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Cathode leg (shorter) -->
  <line x1="36" y1="56" x2="36" y2="90" stroke="#9E9E9E" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Labels -->
  <text x="20" y="96" font-family="monospace" font-size="5" fill="#757575">+</text>
  <text x="38" y="88" font-family="monospace" font-size="5" fill="#757575">−</text>
</svg>`;

// ── Resistor ────────────────────────────────────────────────────────────────
const RESISTOR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <defs>
    <linearGradient id="res-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5E6CB"/>
      <stop offset="30%" stop-color="#E8D5B0"/>
      <stop offset="100%" stop-color="#D4C4A0"/>
    </linearGradient>
    <filter id="res-shadow">
      <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <!-- Left lead -->
  <line x1="5" y1="30" x2="50" y2="30" stroke="#9E9E9E" stroke-width="2" stroke-linecap="round"/>
  <!-- Right lead -->
  <line x1="150" y1="30" x2="195" y2="30" stroke="#9E9E9E" stroke-width="2" stroke-linecap="round"/>
  <!-- Resistor body -->
  <rect x="50" y="12" width="100" height="36" rx="6" fill="url(#res-body)" filter="url(#res-shadow)" stroke="#B0A080" stroke-width="1"/>
  <!-- Band 1 - Brown (1) -->
  <rect x="64" y="12" width="8" height="36" rx="1" fill="#795548"/>
  <!-- Band 2 - Black (0) -->
  <rect x="82" y="12" width="8" height="36" rx="1" fill="#212121"/>
  <!-- Band 3 - Red (×100) = 10×100 = 1kΩ -->
  <rect x="100" y="12" width="8" height="36" rx="1" fill="#F44336"/>
  <!-- Band 4 - Gold (±5%) -->
  <rect x="130" y="12" width="8" height="36" rx="1" fill="#FFD54F"/>
  <!-- Value label -->
  <text x="100" y="55" text-anchor="middle" font-family="monospace" font-size="7" fill="#757575">1kΩ ±5%</text>
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
const BREADBOARD_830_SVG = svgToDataUri(BREADBOARD_830_RAW);
const BREADBOARD_400_SVG = svgToDataUri(BREADBOARD_400_RAW);
const BREADBOARD_MINI_SVG = svgToDataUri(BREADBOARD_MINI_RAW);

// ─── Component SVG Map ─────────────────────────────────────────────────────

const COMPONENT_SVG_MAP: Record<string, string> = {
  'ESP32': ESP32_SVG,
  'ARDUINO_UNO': ARDUINO_UNO_SVG,
  'ARDUINO_NANO': ARDUINO_NANO_SVG,
  'HC_SR04': HC_SR04_SVG,
  'SG90_SERVO': SG90_SERVO_SVG,
  'LED_5MM': LED_5MM_SVG,
  'RESISTOR': RESISTOR_SVG,
  'LCD1602': LCD1602_SVG,
  'OLED_SSD1306': OLED_SSD1306_SVG,
  'RELAY_MODULE': RELAY_MODULE_SVG,
};

const BREADBOARD_SVG_MAP: Record<string, string> = {
  'BREADBOARD_830': BREADBOARD_830_SVG,
  'BREADBOARD_400': BREADBOARD_400_SVG,
  'BREADBOARD_MINI': BREADBOARD_MINI_SVG,
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
