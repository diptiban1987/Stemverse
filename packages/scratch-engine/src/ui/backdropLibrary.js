// built-in backdrop library — colors, gradients, and svg scenes
const svg = (raw) => `data:image/svg+xml,${encodeURIComponent(raw)}`;

export const BACKDROP_LIBRARY = [
  {
    name: 'White',
    type: 'color',
    value: '#ffffff',
  },
  {
    name: 'Blue Sky',
    type: 'gradient',
    value: 'linear-gradient(180deg, #87CEEB 0%, #E0F7FA 100%)',
  },
  {
    name: 'Sunset',
    type: 'gradient',
    value: 'linear-gradient(180deg, #2C3E50 0%, #E74C3C 40%, #F39C12 70%, #F1C40F 100%)',
  },
  {
    name: 'Night Sky',
    type: 'gradient',
    value: 'linear-gradient(180deg, #0C0C2E 0%, #1a1a4e 50%, #2C3E6B 100%)',
  },
  {
    name: 'Ocean',
    type: 'gradient',
    value: 'linear-gradient(180deg, #1A5276 0%, #2980B9 40%, #3498DB 70%, #85C1E9 100%)',
  },
  {
    name: 'Forest',
    type: 'gradient',
    value: 'linear-gradient(180deg, #87CEEB 0%, #76D7C4 30%, #27AE60 60%, #1E8449 100%)',
  },
  {
    name: 'Space',
    type: 'svg',
    value: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
  <rect width="480" height="360" fill="#0a0a2e"/>
  <circle cx="60" cy="40" r="1.5" fill="white" opacity="0.9"/>
  <circle cx="140" cy="80" r="1" fill="white" opacity="0.7"/>
  <circle cx="200" cy="30" r="2" fill="white" opacity="0.8"/>
  <circle cx="300" cy="60" r="1.2" fill="white" opacity="0.6"/>
  <circle cx="380" cy="90" r="1.8" fill="white" opacity="0.9"/>
  <circle cx="420" cy="40" r="1" fill="white" opacity="0.5"/>
  <circle cx="100" cy="160" r="1.5" fill="white" opacity="0.7"/>
  <circle cx="240" cy="140" r="2" fill="white" opacity="0.8"/>
  <circle cx="340" cy="180" r="1" fill="white" opacity="0.6"/>
  <circle cx="450" cy="150" r="1.8" fill="white" opacity="0.9"/>
  <circle cx="50" cy="260" r="1.2" fill="white" opacity="0.7"/>
  <circle cx="180" cy="280" r="1.5" fill="white" opacity="0.5"/>
  <circle cx="280" cy="300" r="2" fill="white" opacity="0.8"/>
  <circle cx="400" cy="260" r="1" fill="white" opacity="0.7"/>
  <circle cx="460" cy="320" r="1.5" fill="white" opacity="0.6"/>
  <circle cx="320" cy="240" r="1.2" fill="white" opacity="0.9"/>
  <circle cx="160" cy="200" r="1" fill="white" opacity="0.8"/>
  <circle cx="80" cy="320" r="1.5" fill="white" opacity="0.7"/>
  <circle cx="220" cy="200" r="1.8" fill="white" opacity="0.6"/>
  <circle cx="360" cy="320" r="1" fill="white" opacity="0.5"/>
  <circle cx="120" cy="120" r="1.2" fill="#FFD700" opacity="0.8"/>
  <circle cx="350" cy="130" r="1.5" fill="#FFD700" opacity="0.6"/>
</svg>`),
  },
  {
    name: 'Desert',
    type: 'svg',
    value: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
  <rect width="480" height="360" fill="#87CEEB"/>
  <rect y="200" width="480" height="160" fill="#EDC9AF"/>
  <circle cx="380" cy="80" r="40" fill="#F1C40F" opacity="0.9"/>
  <path d="M0,220 Q60,180 120,220 Q180,190 240,220 Q300,185 360,220 Q420,195 480,220 L480,360 L0,360Z" fill="#D4A574"/>
  <path d="M0,260 Q80,230 160,260 Q240,235 320,260 Q400,240 480,260 L480,360 L0,360Z" fill="#C49A6C"/>
  <ellipse cx="100" cy="180" rx="3" ry="30" fill="#27AE60"/>
  <ellipse cx="100" cy="150" rx="14" ry="10" fill="#2ECC71"/>
  <ellipse cx="90" cy="160" rx="10" ry="8" fill="#27AE60"/>
  <ellipse cx="110" cy="158" rx="10" ry="8" fill="#27AE60"/>
</svg>`),
  },
  {
    name: 'Underwater',
    type: 'svg',
    value: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
  <defs>
    <linearGradient id="uw" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A5276"/>
      <stop offset="100%" stop-color="#0B2545"/>
    </linearGradient>
  </defs>
  <rect width="480" height="360" fill="url(#uw)"/>
  <ellipse cx="80" cy="340" rx="30" ry="8" fill="#27AE60" opacity="0.5"/>
  <ellipse cx="200" cy="350" rx="40" ry="10" fill="#1E8449" opacity="0.4"/>
  <ellipse cx="380" cy="345" rx="35" ry="9" fill="#27AE60" opacity="0.5"/>
  <path d="M70,360 Q70,300 75,280 Q80,260 85,280 Q90,300 90,360" fill="#27AE60" opacity="0.6"/>
  <path d="M190,360 Q190,290 198,270 Q206,290 206,360" fill="#2ECC71" opacity="0.5"/>
  <path d="M370,360 Q372,310 378,290 Q384,310 386,360" fill="#27AE60" opacity="0.6"/>
  <circle cx="100" cy="100" r="8" fill="white" opacity="0.08"/>
  <circle cx="260" cy="200" r="12" fill="white" opacity="0.06"/>
  <circle cx="400" cy="140" r="6" fill="white" opacity="0.08"/>
  <circle cx="160" cy="300" r="10" fill="white" opacity="0.05"/>
</svg>`),
  },
  {
    name: 'Gym',
    type: 'svg',
    value: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
  <rect width="480" height="360" fill="#F5F0E8"/>
  <rect y="280" width="480" height="80" fill="#D4A574"/>
  <rect y="280" width="480" height="4" fill="#C49A6C"/>
  <line x1="0" y1="180" x2="480" y2="180" stroke="#ddd" stroke-width="1"/>
  <rect x="60" y="120" width="360" height="8" rx="4" fill="#7F8C8D"/>
  <rect x="40" y="100" width="16" height="48" rx="3" fill="#2C3E50"/>
  <rect x="404" y="100" width="16" height="48" rx="3" fill="#2C3E50"/>
  <rect x="32" y="108" width="8" height="32" rx="2" fill="#E74C3C"/>
  <rect x="420" y="108" width="8" height="32" rx="2" fill="#E74C3C"/>
</svg>`),
  },
];
