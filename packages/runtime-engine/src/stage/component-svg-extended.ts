// ============================================================================
// Phase C – Extended Component SVG Assets
// ============================================================================
// Provides inline SVG data URIs for Phase C components (sensors, actuators, displays).
// ============================================================================



// ─── Helper ────────────────────────────────────────────────────────────────────
function svgToDataUri(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ── BMP280 Barometer ──────────────────────────────────────────────────────────
const BMP280_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120">
  <defs>
    <linearGradient id="bmp-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1565C0"/><stop offset="100%" stop-color="#0D47A1"/></linearGradient>
    <linearGradient id="bmp-pin" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFF176"/><stop offset="50%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></linearGradient>
  </defs>
  <rect x="5" y="5" width="130" height="90" rx="4" fill="url(#bmp-pcb)" stroke="#0A3A7A" stroke-width="1.5"/>
  <rect x="15" y="10" width="110" height="70" rx="2" fill="none" stroke="#42A5F5" stroke-width="0.5" opacity="0.3"/>
  <circle cx="15" cy="15" r="4" fill="none" stroke="#42A5F5" stroke-width="0.8"/>
  <rect x="45" y="25" width="30" height="30" rx="2" fill="#1A1A2E" stroke="#333" stroke-width="0.8"/>
  <circle cx="48" cy="28" r="1.5" fill="#666"/>
  <text x="60" y="45" text-anchor="middle" font-family="monospace" font-size="6" fill="#AAA">BMP</text>
  <text x="60" y="52" text-anchor="middle" font-family="monospace" font-size="5" fill="#888">280</text>
  <text x="70" y="18" font-family="monospace" font-size="7" fill="#E3F2FD" font-weight="bold">BMP280</text>
  <rect x="20" y="95" width="8" height="20" rx="1" fill="url(#bmp-pin)"/><text x="24" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">VCC</text>
  <rect x="42" y="95" width="8" height="20" rx="1" fill="url(#bmp-pin)"/><text x="46" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">GND</text>
  <rect x="64" y="95" width="8" height="20" rx="1" fill="url(#bmp-pin)"/><text x="68" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">SDA</text>
  <rect x="86" y="95" width="8" height="20" rx="1" fill="url(#bmp-pin)"/><text x="90" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">SCL</text>
</svg>`;

// ── BME280 Environmental ──────────────────────────────────────────────────────
const BME280_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120">
  <defs>
    <linearGradient id="bme-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7B1FA2"/><stop offset="100%" stop-color="#4A148C"/></linearGradient>
    <linearGradient id="bme-pin" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFF176"/><stop offset="50%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></linearGradient>
  </defs>
  <rect x="5" y="5" width="130" height="90" rx="4" fill="url(#bme-pcb)" stroke="#38006b" stroke-width="1.5"/>
  <circle cx="15" cy="15" r="4" fill="none" stroke="#CE93D8" stroke-width="0.8"/>
  <rect x="45" y="22" width="32" height="32" rx="3" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="1"/>
  <rect x="50" y="27" width="22" height="22" rx="1" fill="#BDBDBD"/>
  <circle cx="61" cy="38" r="4" fill="#9E9E9E"/>
  <text x="70" y="18" font-family="monospace" font-size="7" fill="#F3E5F5" font-weight="bold">BME280</text>
  <text x="61" y="68" text-anchor="middle" font-family="monospace" font-size="5" fill="#CE93D8">T/P/H</text>
  <rect x="20" y="95" width="8" height="20" rx="1" fill="url(#bme-pin)"/><text x="24" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">VCC</text>
  <rect x="42" y="95" width="8" height="20" rx="1" fill="url(#bme-pin)"/><text x="46" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">GND</text>
  <rect x="64" y="95" width="8" height="20" rx="1" fill="url(#bme-pin)"/><text x="68" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">SDA</text>
  <rect x="86" y="95" width="8" height="20" rx="1" fill="url(#bme-pin)"/><text x="90" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">SCL</text>
</svg>`;

// ── DS18B20 Temperature Probe ─────────────────────────────────────────────────
const DS18B20_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160">
  <defs>
    <linearGradient id="ds-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#BDBDBD"/><stop offset="50%" stop-color="#9E9E9E"/><stop offset="100%" stop-color="#757575"/></linearGradient>
  </defs>
  <rect x="30" y="5" width="40" height="80" rx="20" fill="url(#ds-body)" stroke="#616161" stroke-width="1.5"/>
  <ellipse cx="50" cy="85" rx="20" ry="5" fill="#757575"/>
  <text x="50" y="50" text-anchor="middle" font-family="monospace" font-size="7" fill="#333" font-weight="bold">DS18</text>
  <text x="50" y="60" text-anchor="middle" font-family="monospace" font-size="7" fill="#333" font-weight="bold">B20</text>
  <line x1="35" y1="85" x2="20" y2="145" stroke="#F44336" stroke-width="3" stroke-linecap="round"/>
  <line x1="50" y1="85" x2="50" y2="150" stroke="#333" stroke-width="3" stroke-linecap="round"/>
  <line x1="65" y1="85" x2="80" y2="145" stroke="#FFEB3B" stroke-width="3" stroke-linecap="round"/>
  <text x="12" y="155" font-family="monospace" font-size="6" fill="#F44336">VCC</text>
  <text x="42" y="158" font-family="monospace" font-size="6" fill="#666">GND</text>
  <text x="72" y="155" font-family="monospace" font-size="6" fill="#F9A825">DAT</text>
</svg>`;

// ── Soil Moisture Sensor ──────────────────────────────────────────────────────
const SOIL_MOISTURE_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200">
  <defs>
    <linearGradient id="soil-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1565C0"/><stop offset="100%" stop-color="#0D47A1"/></linearGradient>
    <linearGradient id="soil-probe" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></linearGradient>
  </defs>
  <rect x="10" y="5" width="100" height="50" rx="3" fill="url(#soil-pcb)" stroke="#0A3A7A" stroke-width="1"/>
  <text x="60" y="25" text-anchor="middle" font-family="monospace" font-size="7" fill="#E3F2FD" font-weight="bold">SOIL</text>
  <text x="60" y="35" text-anchor="middle" font-family="monospace" font-size="5" fill="#90CAF9">MOISTURE</text>
  <rect x="25" y="55" width="12" height="130" rx="2" fill="url(#soil-probe)" stroke="#E65100" stroke-width="0.8"/>
  <rect x="83" y="55" width="12" height="130" rx="2" fill="url(#soil-probe)" stroke="#E65100" stroke-width="0.8"/>
  <line x1="31" y1="55" x2="31" y2="185" stroke="#FFA726" stroke-width="0.5" stroke-dasharray="4,4"/>
  <line x1="89" y1="55" x2="89" y2="185" stroke="#FFA726" stroke-width="0.5" stroke-dasharray="4,4"/>
</svg>`;

// ── Water Level Sensor ────────────────────────────────────────────────────────
const WATER_LEVEL_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200">
  <defs>
    <linearGradient id="wl-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2E7D32"/><stop offset="100%" stop-color="#1B5E20"/></linearGradient>
  </defs>
  <rect x="15" y="5" width="70" height="190" rx="3" fill="url(#wl-pcb)" stroke="#1B5E20" stroke-width="1"/>
  <text x="50" y="20" text-anchor="middle" font-family="monospace" font-size="6" fill="#C8E6C9" font-weight="bold">WATER</text>
  ${Array.from({length: 10}, (_, i) => `<rect x="25" y="${30 + i*15}" width="50" height="3" rx="1" fill="#FFD54F" opacity="0.8"/>`).join('\n  ')}
  ${Array.from({length: 9}, (_, i) => `<rect x="30" y="${38 + i*15}" width="40" height="3" rx="1" fill="#FFD54F" opacity="0.8"/>`).join('\n  ')}
</svg>`;

// ── MPU6050 IMU ───────────────────────────────────────────────────────────────
const MPU6050_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120">
  <defs>
    <linearGradient id="mpu-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6A1B9A"/><stop offset="100%" stop-color="#4A148C"/></linearGradient>
    <linearGradient id="mpu-pin" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFF176"/><stop offset="50%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></linearGradient>
  </defs>
  <rect x="5" y="5" width="130" height="90" rx="4" fill="url(#mpu-pcb)" stroke="#38006b" stroke-width="1.5"/>
  <rect x="40" y="20" width="40" height="40" rx="2" fill="#1A1A2E" stroke="#444" stroke-width="1"/>
  <circle cx="45" cy="25" r="1.5" fill="#777"/>
  <text x="60" y="43" text-anchor="middle" font-family="monospace" font-size="6" fill="#AAA">MPU</text>
  <text x="60" y="52" text-anchor="middle" font-family="monospace" font-size="5" fill="#888">6050</text>
  <text x="100" y="30" font-family="monospace" font-size="6" fill="#CE93D8">X</text>
  <text x="100" y="42" font-family="monospace" font-size="6" fill="#CE93D8">Y</text>
  <text x="100" y="54" font-family="monospace" font-size="6" fill="#CE93D8">Z</text>
  <text x="70" y="18" font-family="monospace" font-size="7" fill="#F3E5F5" font-weight="bold">MPU6050</text>
  <rect x="12" y="95" width="7" height="20" rx="1" fill="url(#mpu-pin)"/><text x="15" y="92" text-anchor="middle" font-family="monospace" font-size="4" fill="#FFF176">VCC</text>
  <rect x="27" y="95" width="7" height="20" rx="1" fill="url(#mpu-pin)"/><text x="30" y="92" text-anchor="middle" font-family="monospace" font-size="4" fill="#FFF176">GND</text>
  <rect x="42" y="95" width="7" height="20" rx="1" fill="url(#mpu-pin)"/><text x="45" y="92" text-anchor="middle" font-family="monospace" font-size="4" fill="#FFF176">SCL</text>
  <rect x="57" y="95" width="7" height="20" rx="1" fill="url(#mpu-pin)"/><text x="60" y="92" text-anchor="middle" font-family="monospace" font-size="4" fill="#FFF176">SDA</text>
</svg>`;

// ── GPS NEO-6M ────────────────────────────────────────────────────────────────
const GPS_NEO6M_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 160">
  <defs>
    <linearGradient id="gps-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2E7D32"/><stop offset="100%" stop-color="#1B5E20"/></linearGradient>
    <linearGradient id="gps-ant" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F5F5F5"/><stop offset="100%" stop-color="#BDBDBD"/></linearGradient>
    <linearGradient id="gps-pin" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFF176"/><stop offset="50%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></linearGradient>
  </defs>
  <rect x="5" y="5" width="170" height="130" rx="4" fill="url(#gps-pcb)" stroke="#1B5E20" stroke-width="1.5"/>
  <rect x="25" y="15" width="80" height="80" rx="3" fill="url(#gps-ant)" stroke="#9E9E9E" stroke-width="1"/>
  <line x1="35" y1="25" x2="95" y2="85" stroke="#E0E0E0" stroke-width="0.5"/>
  <line x1="95" y1="25" x2="35" y2="85" stroke="#E0E0E0" stroke-width="0.5"/>
  <text x="65" y="58" text-anchor="middle" font-family="monospace" font-size="8" fill="#9E9E9E">ANT</text>
  <rect x="115" y="30" width="45" height="35" rx="2" fill="#1A1A2E" stroke="#333" stroke-width="0.8"/>
  <text x="137" y="50" text-anchor="middle" font-family="monospace" font-size="5" fill="#AAA">NEO</text>
  <text x="137" y="58" text-anchor="middle" font-family="monospace" font-size="5" fill="#AAA">6M</text>
  <circle cx="130" y="80" r="3" fill="#F44336" opacity="0.8"/>
  <text x="137" cy="82" font-family="monospace" font-size="4" fill="#C8E6C9">LED</text>
  <text x="90" y="115" text-anchor="middle" font-family="monospace" font-size="8" fill="#C8E6C9" font-weight="bold">GPS NEO-6M</text>
  <rect x="30" y="135" width="8" height="20" rx="1" fill="url(#gps-pin)"/><text x="34" y="132" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">VCC</text>
  <rect x="60" y="135" width="8" height="20" rx="1" fill="url(#gps-pin)"/><text x="64" y="132" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">GND</text>
  <rect x="90" y="135" width="8" height="20" rx="1" fill="url(#gps-pin)"/><text x="94" y="132" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">TX</text>
  <rect x="120" y="135" width="8" height="20" rx="1" fill="url(#gps-pin)"/><text x="124" y="132" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">RX</text>
</svg>`;

// ── Compass HMC5883L ──────────────────────────────────────────────────────────
const COMPASS_HMC_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 120">
  <defs>
    <linearGradient id="hmc-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6A1B9A"/><stop offset="100%" stop-color="#4A148C"/></linearGradient>
    <linearGradient id="hmc-pin" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFF176"/><stop offset="50%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></linearGradient>
  </defs>
  <rect x="5" y="5" width="120" height="90" rx="4" fill="url(#hmc-pcb)" stroke="#38006b" stroke-width="1.5"/>
  <rect x="35" y="20" width="35" height="35" rx="2" fill="#1A1A2E" stroke="#444" stroke-width="1"/>
  <text x="52" y="42" text-anchor="middle" font-family="monospace" font-size="6" fill="#AAA">HMC</text>
  <text x="95" y="30" text-anchor="middle" font-family="monospace" font-size="12" fill="#F44336" font-weight="bold">N</text>
  <polygon points="95,35 90,50 95,45 100,50" fill="#F44336" opacity="0.7"/>
  <text x="65" y="18" font-family="monospace" font-size="6" fill="#F3E5F5" font-weight="bold">HMC5883L</text>
  <rect x="15" y="95" width="8" height="20" rx="1" fill="url(#hmc-pin)"/><text x="19" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">VCC</text>
  <rect x="38" y="95" width="8" height="20" rx="1" fill="url(#hmc-pin)"/><text x="42" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">GND</text>
  <rect x="61" y="95" width="8" height="20" rx="1" fill="url(#hmc-pin)"/><text x="65" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">SDA</text>
  <rect x="84" y="95" width="8" height="20" rx="1" fill="url(#hmc-pin)"/><text x="88" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">SCL</text>
</svg>`;

// ── LDR Light Sensor ──────────────────────────────────────────────────────────
const LDR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 120">
  <defs>
    <radialGradient id="ldr-face" cx="50%" cy="40%"><stop offset="0%" stop-color="#FF8F00"/><stop offset="60%" stop-color="#E65100"/><stop offset="100%" stop-color="#BF360C"/></radialGradient>
  </defs>
  <line x1="25" y1="70" x2="25" y2="115" stroke="#9E9E9E" stroke-width="3" stroke-linecap="round"/>
  <line x1="55" y1="70" x2="55" y2="115" stroke="#9E9E9E" stroke-width="3" stroke-linecap="round"/>
  <circle cx="40" cy="40" r="30" fill="url(#ldr-face)" stroke="#8D6E63" stroke-width="2"/>
  <path d="M 25 30 Q 30 25 35 30 Q 40 35 45 30 Q 50 25 55 30" fill="none" stroke="#4E342E" stroke-width="1.5" opacity="0.6"/>
  <path d="M 25 40 Q 30 35 35 40 Q 40 45 45 40 Q 50 35 55 40" fill="none" stroke="#4E342E" stroke-width="1.5" opacity="0.6"/>
  <path d="M 25 50 Q 30 45 35 50 Q 40 55 45 50 Q 50 45 55 50" fill="none" stroke="#4E342E" stroke-width="1.5" opacity="0.6"/>
  <circle cx="40" cy="40" r="30" fill="none" stroke="#FFA000" stroke-width="0.5" opacity="0.4"/>
  <text x="40" y="5" text-anchor="middle" font-family="monospace" font-size="7" fill="#FF8F00" font-weight="bold">LDR</text>
</svg>`;

// ── Color Sensor TCS34725 ─────────────────────────────────────────────────────
const COLOR_SENSOR_TCS_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 120">
  <defs>
    <linearGradient id="tcs-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1565C0"/><stop offset="100%" stop-color="#0D47A1"/></linearGradient>
    <linearGradient id="tcs-pin" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFF176"/><stop offset="50%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></linearGradient>
  </defs>
  <rect x="5" y="5" width="120" height="90" rx="4" fill="url(#tcs-pcb)" stroke="#0A3A7A" stroke-width="1.5"/>
  <rect x="30" y="20" width="30" height="30" rx="2" fill="#1A1A2E" stroke="#444" stroke-width="1"/>
  <circle cx="45" cy="35" r="8" fill="#E0E0E0" opacity="0.6"/>
  <circle cx="45" cy="35" r="4" fill="#90CAF9" opacity="0.4"/>
  <circle cx="80" cy="30" r="5" fill="#FFF" stroke="#CCC" stroke-width="0.5"/>
  <text x="80" y="33" text-anchor="middle" font-family="monospace" font-size="4" fill="#999">LED</text>
  <text x="65" y="18" font-family="monospace" font-size="6" fill="#E3F2FD" font-weight="bold">TCS34725</text>
  <rect x="10" y="60" width="15" height="6" rx="1" fill="#F44336" opacity="0.7"/>
  <rect x="30" y="60" width="15" height="6" rx="1" fill="#4CAF50" opacity="0.7"/>
  <rect x="50" y="60" width="15" height="6" rx="1" fill="#2196F3" opacity="0.7"/>
  <rect x="15" y="95" width="8" height="20" rx="1" fill="url(#tcs-pin)"/><text x="19" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">VCC</text>
  <rect x="38" y="95" width="8" height="20" rx="1" fill="url(#tcs-pin)"/><text x="42" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">GND</text>
  <rect x="61" y="95" width="8" height="20" rx="1" fill="url(#tcs-pin)"/><text x="65" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">SDA</text>
  <rect x="84" y="95" width="8" height="20" rx="1" fill="url(#tcs-pin)"/><text x="88" y="92" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">SCL</text>
</svg>`;

// ── Gas Sensor MQ ─────────────────────────────────────────────────────────────
const GAS_SENSOR_MQ_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180">
  <defs>
    <linearGradient id="mq-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1565C0"/><stop offset="100%" stop-color="#0D47A1"/></linearGradient>
    <linearGradient id="mq-can" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E0E0E0"/><stop offset="50%" stop-color="#BDBDBD"/><stop offset="100%" stop-color="#9E9E9E"/></linearGradient>
  </defs>
  <rect x="10" y="60" width="140" height="100" rx="4" fill="url(#mq-pcb)" stroke="#0A3A7A" stroke-width="1.5"/>
  <circle cx="80" cy="50" r="40" fill="url(#mq-can)" stroke="#757575" stroke-width="2"/>
  <circle cx="80" cy="50" r="30" fill="none" stroke="#9E9E9E" stroke-width="0.8" stroke-dasharray="3,3"/>
  <circle cx="80" cy="50" r="20" fill="#616161"/>
  <text x="80" y="54" text-anchor="middle" font-family="monospace" font-size="8" fill="#E0E0E0" font-weight="bold">MQ</text>
  <text x="80" y="110" text-anchor="middle" font-family="monospace" font-size="7" fill="#E3F2FD" font-weight="bold">MQ SENSOR</text>
  <circle cx="130" cy="130" r="6" fill="#455A64" stroke="#90A4AE" stroke-width="0.5"/>
  <line x1="130" y1="126" x2="130" y2="128" stroke="#FFF" stroke-width="1"/>
</svg>`;

// ── Flame Sensor ──────────────────────────────────────────────────────────────
const FLAME_SENSOR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <linearGradient id="flame-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1565C0"/><stop offset="100%" stop-color="#0D47A1"/></linearGradient>
  </defs>
  <rect x="10" y="40" width="100" height="100" rx="4" fill="url(#flame-pcb)" stroke="#0A3A7A" stroke-width="1.5"/>
  <rect x="40" y="10" width="30" height="40" rx="4" fill="#1A1A2E" stroke="#333" stroke-width="1"/>
  <ellipse cx="55" cy="25" rx="8" ry="10" fill="#111" stroke="#444" stroke-width="0.5"/>
  <text x="55" y="28" text-anchor="middle" font-family="monospace" font-size="5" fill="#666">IR</text>
  <circle cx="85" cy="60" r="4" fill="#F44336" opacity="0.8"/>
  <circle cx="85" cy="75" r="4" fill="#4CAF50" opacity="0.8"/>
  <text x="60" y="100" text-anchor="middle" font-family="monospace" font-size="7" fill="#E3F2FD" font-weight="bold">FLAME</text>
  <text x="60" y="115" text-anchor="middle" font-family="monospace" font-size="5" fill="#90CAF9">SENSOR</text>
</svg>`;

// ── Sound Sensor ──────────────────────────────────────────────────────────────
const SOUND_SENSOR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="snd-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1565C0"/><stop offset="100%" stop-color="#0D47A1"/></linearGradient>
    <radialGradient id="snd-mic"><stop offset="0%" stop-color="#E0E0E0"/><stop offset="80%" stop-color="#9E9E9E"/><stop offset="100%" stop-color="#757575"/></radialGradient>
  </defs>
  <rect x="5" y="5" width="110" height="110" rx="4" fill="url(#snd-pcb)" stroke="#0A3A7A" stroke-width="1.5"/>
  <circle cx="45" cy="45" r="18" fill="url(#snd-mic)" stroke="#616161" stroke-width="1.5"/>
  <circle cx="45" cy="45" r="4" fill="#424242"/>
  <rect x="70" y="30" width="25" height="15" rx="2" fill="#1A1A2E" stroke="#333" stroke-width="0.5"/>
  <text x="82" y="41" text-anchor="middle" font-family="monospace" font-size="5" fill="#888">OP</text>
  <circle cx="85" cy="60" r="5" fill="#455A64" stroke="#90A4AE" stroke-width="0.5"/>
  <text x="60" y="85" text-anchor="middle" font-family="monospace" font-size="7" fill="#E3F2FD" font-weight="bold">SOUND</text>
  <text x="60" y="98" text-anchor="middle" font-family="monospace" font-size="5" fill="#90CAF9">SENSOR</text>
</svg>`;

// ── PIR Motion Sensor ─────────────────────────────────────────────────────────
const PIR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 160">
  <defs>
    <linearGradient id="pir-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2E7D32"/><stop offset="100%" stop-color="#1B5E20"/></linearGradient>
    <radialGradient id="pir-dome" cx="50%" cy="40%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="50%" stop-color="#F5F5F5"/><stop offset="100%" stop-color="#E0E0E0"/></radialGradient>
    <linearGradient id="pir-pin" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFF176"/><stop offset="50%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></linearGradient>
  </defs>
  <rect x="15" y="60" width="110" height="80" rx="6" fill="url(#pir-pcb)" stroke="#1B5E20" stroke-width="1.5"/>
  <circle cx="70" cy="50" r="40" fill="url(#pir-dome)" stroke="#BDBDBD" stroke-width="2"/>
  <circle cx="70" cy="50" r="25" fill="none" stroke="#E0E0E0" stroke-width="0.5"/>
  <circle cx="70" cy="50" r="15" fill="none" stroke="#E0E0E0" stroke-width="0.5"/>
  <circle cx="70" cy="50" r="5" fill="#EEEEEE" stroke="#BDBDBD" stroke-width="0.3"/>
  <text x="70" y="115" text-anchor="middle" font-family="monospace" font-size="7" fill="#C8E6C9" font-weight="bold">PIR</text>
  <text x="70" y="128" text-anchor="middle" font-family="monospace" font-size="5" fill="#81C784">HC-SR501</text>
  <rect x="30" y="140" width="8" height="18" rx="1" fill="url(#pir-pin)"/><text x="34" y="138" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">VCC</text>
  <rect x="56" y="140" width="8" height="18" rx="1" fill="url(#pir-pin)"/><text x="60" y="138" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">OUT</text>
  <rect x="82" y="140" width="8" height="18" rx="1" fill="url(#pir-pin)"/><text x="86" y="138" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">GND</text>
</svg>`;

// ── Touch Sensor TTP223 ───────────────────────────────────────────────────────
const TOUCH_SENSOR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
  <defs>
    <linearGradient id="tch-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1565C0"/><stop offset="100%" stop-color="#0D47A1"/></linearGradient>
    <radialGradient id="tch-pad"><stop offset="0%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></radialGradient>
  </defs>
  <rect x="5" y="5" width="90" height="90" rx="4" fill="url(#tch-pcb)" stroke="#0A3A7A" stroke-width="1.5"/>
  <circle cx="50" cy="40" r="22" fill="url(#tch-pad)" stroke="#E65100" stroke-width="1"/>
  <circle cx="50" cy="40" r="16" fill="none" stroke="#FFA726" stroke-width="0.5"/>
  <text x="50" y="44" text-anchor="middle" font-family="monospace" font-size="8" fill="#5D4037" font-weight="bold">TOUCH</text>
  <rect x="30" y="68" width="20" height="12" rx="2" fill="#1A1A2E" stroke="#333" stroke-width="0.5"/>
  <text x="40" y="77" text-anchor="middle" font-family="monospace" font-size="4" fill="#888">TTP223</text>
  <text x="50" y="18" font-family="monospace" font-size="6" fill="#E3F2FD" font-weight="bold">TOUCH</text>
</svg>`;

// ── DC Motor ──────────────────────────────────────────────────────────────────
const DC_MOTOR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 160">
  <defs>
    <linearGradient id="dcm-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E0E0E0"/><stop offset="30%" stop-color="#BDBDBD"/><stop offset="70%" stop-color="#9E9E9E"/><stop offset="100%" stop-color="#757575"/></linearGradient>
    <linearGradient id="dcm-end" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></linearGradient>
  </defs>
  <rect x="40" y="30" width="100" height="80" rx="40" fill="url(#dcm-body)" stroke="#616161" stroke-width="2"/>
  <ellipse cx="40" cy="70" rx="10" ry="40" fill="#757575" stroke="#616161" stroke-width="1"/>
  <rect x="140" y="60" width="35" height="6" rx="2" fill="#9E9E9E" stroke="#757575" stroke-width="1"/>
  <circle cx="170" cy="63" r="4" fill="#BDBDBD"/>
  <text x="90" y="75" text-anchor="middle" font-family="monospace" font-size="10" fill="#424242" font-weight="bold">DC</text>
  <rect x="55" y="115" width="12" height="15" rx="1" fill="url(#dcm-end)"/><text x="61" y="140" text-anchor="middle" font-family="monospace" font-size="6" fill="#F44336">M+</text>
  <rect x="85" y="115" width="12" height="15" rx="1" fill="url(#dcm-end)"/><text x="91" y="140" text-anchor="middle" font-family="monospace" font-size="6" fill="#333">M-</text>
</svg>`;

// ── Stepper Motor ─────────────────────────────────────────────────────────────
const STEPPER_MOTOR_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180">
  <defs>
    <linearGradient id="stp-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#90A4AE"/><stop offset="100%" stop-color="#546E7A"/></linearGradient>
    <linearGradient id="stp-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1565C0"/><stop offset="100%" stop-color="#0D47A1"/></linearGradient>
  </defs>
  <rect x="5" y="20" width="80" height="80" rx="4" fill="url(#stp-body)" stroke="#37474F" stroke-width="2"/>
  <circle cx="45" cy="60" r="20" fill="#78909C" stroke="#546E7A" stroke-width="1"/>
  <circle cx="45" cy="60" r="8" fill="#455A64"/>
  <rect x="85" y="5" width="110" height="100" rx="3" fill="url(#stp-pcb)" stroke="#0A3A7A" stroke-width="1"/>
  <text x="140" y="25" text-anchor="middle" font-family="monospace" font-size="7" fill="#E3F2FD" font-weight="bold">ULN2003</text>
  <circle cx="100" cy="45" r="3" fill="#F44336" opacity="0.8"/>
  <circle cx="112" cy="45" r="3" fill="#FF9800" opacity="0.8"/>
  <circle cx="124" cy="45" r="3" fill="#FFEB3B" opacity="0.8"/>
  <circle cx="136" cy="45" r="3" fill="#4CAF50" opacity="0.8"/>
  <text x="140" y="75" text-anchor="middle" font-family="monospace" font-size="6" fill="#90CAF9">STEPPER</text>
  <text x="140" y="90" text-anchor="middle" font-family="monospace" font-size="5" fill="#64B5F6">DRIVER</text>
</svg>`;

// ── RGB LED ───────────────────────────────────────────────────────────────────
const RGB_LED_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 140">
  <defs>
    <radialGradient id="rgb-dome" cx="50%" cy="35%"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/><stop offset="60%" stop-color="#F5F5F5" stop-opacity="0.7"/><stop offset="100%" stop-color="#E0E0E0" stop-opacity="0.5"/></radialGradient>
  </defs>
  <rect x="22" y="50" width="36" height="20" rx="2" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1"/>
  <ellipse cx="40" cy="35" rx="22" ry="30" fill="url(#rgb-dome)" stroke="#BDBDBD" stroke-width="1.5"/>
  <circle cx="33" cy="35" r="4" fill="#F44336" opacity="0.4"/>
  <circle cx="40" cy="30" r="4" fill="#4CAF50" opacity="0.4"/>
  <circle cx="47" cy="35" r="4" fill="#2196F3" opacity="0.4"/>
  <line x1="20" y1="70" x2="20" y2="130" stroke="#F44336" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="33" y1="70" x2="33" y2="135" stroke="#9E9E9E" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="47" y1="70" x2="47" y2="130" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="60" y1="70" x2="60" y2="125" stroke="#2196F3" stroke-width="2.5" stroke-linecap="round"/>
  <text x="16" y="140" font-family="monospace" font-size="6" fill="#F44336">R</text>
  <text x="29" y="140" font-family="monospace" font-size="5" fill="#666">GND</text>
  <text x="44" y="140" font-family="monospace" font-size="6" fill="#4CAF50">G</text>
  <text x="57" y="140" font-family="monospace" font-size="6" fill="#2196F3">B</text>
  <text x="40" y="10" text-anchor="middle" font-family="monospace" font-size="7" fill="#9C27B0" font-weight="bold">RGB</text>
</svg>`;

// ── NeoPixel Strip ────────────────────────────────────────────────────────────
const NEOPIXEL_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60">
  <defs>
    <linearGradient id="neo-bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#212121"/><stop offset="100%" stop-color="#333"/></linearGradient>
  </defs>
  <rect x="0" y="10" width="240" height="40" rx="3" fill="url(#neo-bg)" stroke="#444" stroke-width="1"/>
  ${[0,1,2,3].map(i => `<rect x="${15 + i*58}" y="15" width="30" height="30" rx="2" fill="#1A1A1A" stroke="#555" stroke-width="0.8"/><rect x="${19 + i*58}" y="19" width="22" height="22" rx="1" fill="#F5F5F5" opacity="0.9"/>`).join('\n  ')}
  <text x="10" y="8" font-family="monospace" font-size="6" fill="#4CAF50">DIN</text>
  <text x="120" y="8" text-anchor="middle" font-family="monospace" font-size="7" fill="#7C4DFF" font-weight="bold">WS2812B NEOPIXEL</text>
</svg>`;

// ── TFT ILI9341 Display ───────────────────────────────────────────────────────
const TFT_ILI9341_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 300">
  <defs>
    <linearGradient id="tft-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C62828"/><stop offset="100%" stop-color="#B71C1C"/></linearGradient>
    <linearGradient id="tft-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#111"/><stop offset="100%" stop-color="#1A1A2E"/></linearGradient>
    <linearGradient id="tft-pin" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFF176"/><stop offset="50%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#F9A825"/></linearGradient>
  </defs>
  <rect x="5" y="5" width="210" height="260" rx="4" fill="url(#tft-pcb)" stroke="#8E0000" stroke-width="1.5"/>
  <rect x="15" y="15" width="190" height="200" rx="2" fill="url(#tft-screen)" stroke="#333" stroke-width="1"/>
  <text x="110" y="100" text-anchor="middle" font-family="monospace" font-size="12" fill="#333">TFT 320x240</text>
  <text x="110" y="120" text-anchor="middle" font-family="monospace" font-size="8" fill="#444">ILI9341</text>
  <text x="110" y="240" text-anchor="middle" font-family="monospace" font-size="8" fill="#FFCDD2" font-weight="bold">2.4" TFT SPI</text>
  <rect x="165" y="225" width="35" height="25" rx="2" fill="#424242" stroke="#666" stroke-width="0.5"/>
  <text x="182" y="241" text-anchor="middle" font-family="monospace" font-size="5" fill="#999">SD</text>
  ${[0,1,2,3,4,5,6].map(i => `<rect x="${20 + i*27}" y="265" width="7" height="18" rx="1" fill="url(#tft-pin)"/>`).join('\n  ')}
  <text x="110" y="295" text-anchor="middle" font-family="monospace" font-size="5" fill="#FFF176">VCC GND CS DC MOSI SCK RST</text>
</svg>`;

// ─── Convert to data URIs ────────────────────────────────────────────────────
const BMP280_SVG = svgToDataUri(BMP280_RAW);
const BME280_SVG = svgToDataUri(BME280_RAW);
const DS18B20_SVG = svgToDataUri(DS18B20_RAW);
const SOIL_MOISTURE_SVG = svgToDataUri(SOIL_MOISTURE_RAW);
const WATER_LEVEL_SVG = svgToDataUri(WATER_LEVEL_RAW);
const MPU6050_SVG = svgToDataUri(MPU6050_RAW);
const GPS_NEO6M_SVG = svgToDataUri(GPS_NEO6M_RAW);
const COMPASS_HMC_SVG = svgToDataUri(COMPASS_HMC_RAW);
const LDR_SVG = svgToDataUri(LDR_RAW);
const COLOR_SENSOR_TCS_SVG = svgToDataUri(COLOR_SENSOR_TCS_RAW);
const GAS_SENSOR_MQ_SVG = svgToDataUri(GAS_SENSOR_MQ_RAW);
const FLAME_SENSOR_SVG = svgToDataUri(FLAME_SENSOR_RAW);
const SOUND_SENSOR_SVG = svgToDataUri(SOUND_SENSOR_RAW);
const PIR_SVG = svgToDataUri(PIR_RAW);
const TOUCH_SENSOR_SVG = svgToDataUri(TOUCH_SENSOR_RAW);
const DC_MOTOR_SVG = svgToDataUri(DC_MOTOR_RAW);
const STEPPER_MOTOR_SVG = svgToDataUri(STEPPER_MOTOR_RAW);
const RGB_LED_SVG = svgToDataUri(RGB_LED_RAW);
const NEOPIXEL_SVG = svgToDataUri(NEOPIXEL_RAW);
const TFT_ILI9341_SVG = svgToDataUri(TFT_ILI9341_RAW);

// ─── Extended Component SVG Map ──────────────────────────────────────────────
export const EXTENDED_COMPONENT_SVG_MAP: Record<string, string> = {
  'BMP280': BMP280_SVG,
  'BME280': BME280_SVG,
  'DS18B20': DS18B20_SVG,
  'SOIL_MOISTURE': SOIL_MOISTURE_SVG,
  'WATER_LEVEL': WATER_LEVEL_SVG,
  'MPU6050': MPU6050_SVG,
  'GPS_NEO6M': GPS_NEO6M_SVG,
  'COMPASS_HMC': COMPASS_HMC_SVG,
  'LDR': LDR_SVG,
  'COLOR_SENSOR_TCS': COLOR_SENSOR_TCS_SVG,
  'GAS_SENSOR_MQ': GAS_SENSOR_MQ_SVG,
  'FLAME_SENSOR': FLAME_SENSOR_SVG,
  'SOUND_SENSOR': SOUND_SENSOR_SVG,
  'PIR': PIR_SVG,
  'TOUCH_SENSOR': TOUCH_SENSOR_SVG,
  'DC_MOTOR': DC_MOTOR_SVG,
  'STEPPER_MOTOR': STEPPER_MOTOR_SVG,
  'RGB_LED': RGB_LED_SVG,
  'NEOPIXEL': NEOPIXEL_SVG,
  'TFT_ILI9341': TFT_ILI9341_SVG,
};
