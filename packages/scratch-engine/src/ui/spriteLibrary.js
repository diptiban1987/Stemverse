// built-in sprite library with inline svg data uris
const svg = (raw) => `data:image/svg+xml,${encodeURIComponent(raw)}`;

export const SPRITE_LIBRARY = [
  {
    name: 'Cat',
    category: 'Animals',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g fill="none" stroke="#000" stroke-width="1.5">
    <ellipse cx="48" cy="56" rx="28" ry="24" fill="#FFAB19"/>
    <circle cx="48" cy="32" r="20" fill="#FFAB19"/>
    <polygon points="32,18 24,2 38,14" fill="#FFAB19" stroke="#000"/>
    <polygon points="33,16 28,6 37,14" fill="#FF8C6B" stroke="none"/>
    <polygon points="64,18 72,2 58,14" fill="#FFAB19" stroke="#000"/>
    <polygon points="63,16 68,6 59,14" fill="#FF8C6B" stroke="none"/>
    <ellipse cx="40" cy="30" rx="4" ry="5" fill="white"/>
    <ellipse cx="56" cy="30" rx="4" ry="5" fill="white"/>
    <circle cx="41" cy="31" r="2" fill="#000"/>
    <circle cx="57" cy="31" r="2" fill="#000"/>
    <ellipse cx="48" cy="36" rx="2.5" ry="1.5" fill="#FF6B6B"/>
    <path d="M44,38 Q48,42 52,38" stroke="#000" fill="none" stroke-width="1"/>
    <line x1="20" y1="34" x2="36" y2="36" stroke="#000" stroke-width="0.8"/>
    <line x1="20" y1="38" x2="36" y2="38" stroke="#000" stroke-width="0.8"/>
    <line x1="60" y1="36" x2="76" y2="34" stroke="#000" stroke-width="0.8"/>
    <line x1="60" y1="38" x2="76" y2="38" stroke="#000" stroke-width="0.8"/>
    <ellipse cx="36" cy="78" rx="8" ry="5" fill="#FFAB19"/>
    <ellipse cx="60" cy="78" rx="8" ry="5" fill="#FFAB19"/>
    <path d="M72,60 Q85,50 80,38" stroke="#FFAB19" fill="none" stroke-width="5"/>
    <path d="M72,60 Q85,50 80,38" stroke="#000" fill="none" stroke-width="1.5"/>
  </g>
</svg>`),
  },
  {
    name: 'Dog',
    category: 'Animals',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g fill="none" stroke="#6B4226" stroke-width="1.5">
    <ellipse cx="48" cy="58" rx="26" ry="22" fill="#C68642"/>
    <circle cx="48" cy="34" r="18" fill="#C68642"/>
    <ellipse cx="30" cy="24" rx="10" ry="14" fill="#8B5E3C" stroke="#6B4226"/>
    <ellipse cx="66" cy="24" rx="10" ry="14" fill="#8B5E3C" stroke="#6B4226"/>
    <ellipse cx="41" cy="32" rx="3.5" ry="4" fill="white"/>
    <ellipse cx="55" cy="32" rx="3.5" ry="4" fill="white"/>
    <circle cx="42" cy="33" r="2" fill="#000"/>
    <circle cx="56" cy="33" r="2" fill="#000"/>
    <ellipse cx="48" cy="39" rx="4" ry="3" fill="#3D2B1F"/>
    <path d="M44,42 Q48,46 52,42" stroke="#6B4226" fill="none" stroke-width="1.2"/>
    <ellipse cx="48" cy="50" rx="10" ry="8" fill="#F5DEB3" stroke="none"/>
    <ellipse cx="36" cy="78" rx="7" ry="5" fill="#C68642"/>
    <ellipse cx="60" cy="78" rx="7" ry="5" fill="#C68642"/>
    <path d="M74,54 Q88,42 82,32" stroke="#C68642" fill="none" stroke-width="5"/>
  </g>
</svg>`),
  },
  {
    name: 'Penguin',
    category: 'Animals',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g stroke="#1a1a1a" stroke-width="1.2">
    <ellipse cx="48" cy="54" rx="24" ry="30" fill="#2C3E50"/>
    <ellipse cx="48" cy="58" rx="16" ry="22" fill="#ECF0F1"/>
    <circle cx="48" cy="30" r="16" fill="#2C3E50"/>
    <ellipse cx="41" cy="28" rx="3" ry="3.5" fill="white"/>
    <ellipse cx="55" cy="28" rx="3" ry="3.5" fill="white"/>
    <circle cx="41.5" cy="28.5" r="1.8" fill="#000"/>
    <circle cx="55.5" cy="28.5" r="1.8" fill="#000"/>
    <polygon points="48,33 44,38 52,38" fill="#F39C12" stroke="#E67E22"/>
    <ellipse cx="36" cy="80" rx="8" ry="4" fill="#F39C12" stroke="#E67E22"/>
    <ellipse cx="60" cy="80" rx="8" ry="4" fill="#F39C12" stroke="#E67E22"/>
    <path d="M24,50 Q16,60 22,70" stroke="#2C3E50" fill="#2C3E50" stroke-width="3"/>
    <path d="M72,50 Q80,60 74,70" stroke="#2C3E50" fill="#2C3E50" stroke-width="3"/>
  </g>
</svg>`),
  },
  {
    name: 'Butterfly',
    category: 'Animals',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g stroke="#333" stroke-width="1">
    <ellipse cx="30" cy="36" rx="18" ry="16" fill="#E74C3C" opacity="0.85"/>
    <ellipse cx="66" cy="36" rx="18" ry="16" fill="#E74C3C" opacity="0.85"/>
    <ellipse cx="32" cy="58" rx="14" ry="12" fill="#F39C12" opacity="0.8"/>
    <ellipse cx="64" cy="58" rx="14" ry="12" fill="#F39C12" opacity="0.8"/>
    <circle cx="30" cy="34" r="4" fill="#FFF" opacity="0.5"/>
    <circle cx="66" cy="34" r="4" fill="#FFF" opacity="0.5"/>
    <ellipse cx="48" cy="50" rx="3.5" ry="18" fill="#333"/>
    <circle cx="48" cy="30" r="3" fill="#333"/>
    <path d="M48,27 Q42,14 38,10" stroke="#333" fill="none" stroke-width="1.2"/>
    <path d="M48,27 Q54,14 58,10" stroke="#333" fill="none" stroke-width="1.2"/>
    <circle cx="38" cy="10" r="2" fill="#333"/>
    <circle cx="58" cy="10" r="2" fill="#333"/>
  </g>
</svg>`),
  },
  {
    name: 'Robot',
    category: 'Fantasy',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g stroke="#555" stroke-width="1.5">
    <rect x="28" y="30" width="40" height="32" rx="6" fill="#7F8C8D"/>
    <rect x="32" y="62" width="32" height="20" rx="4" fill="#95A5A6"/>
    <rect x="22" y="36" width="8" height="20" rx="3" fill="#95A5A6"/>
    <rect x="66" y="36" width="8" height="20" rx="3" fill="#95A5A6"/>
    <rect x="32" y="20" width="32" height="14" rx="6" fill="#BDC3C7"/>
    <rect x="42" y="12" width="12" height="10" rx="3" fill="#7F8C8D"/>
    <circle cx="48" cy="10" r="3" fill="#E74C3C"/>
    <rect x="40" cy="24" width="6" height="6" rx="1" fill="#3498DB"/>
    <rect x="50" cy="24" width="6" height="6" rx="1" fill="#3498DB"/>
    <rect x="40" y="24" width="6" height="6" rx="1" fill="#3498DB"/>
    <rect x="50" y="24" width="6" height="6" rx="1" fill="#3498DB"/>
    <rect x="42" y="42" width="12" height="4" rx="2" fill="#2C3E50"/>
    <line x1="44" y1="42" x2="44" y2="46" stroke="#95A5A6" stroke-width="1"/>
    <line x1="48" y1="42" x2="48" y2="46" stroke="#95A5A6" stroke-width="1"/>
    <line x1="52" y1="42" x2="52" y2="46" stroke="#95A5A6" stroke-width="1"/>
    <rect x="36" y="82" width="10" height="8" rx="2" fill="#7F8C8D"/>
    <rect x="50" y="82" width="10" height="8" rx="2" fill="#7F8C8D"/>
  </g>
</svg>`),
  },
  {
    name: 'Star',
    category: 'Things',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <polygon points="48,8 56,36 86,36 62,54 70,84 48,66 26,84 34,54 10,36 40,36"
    fill="#F1C40F" stroke="#F39C12" stroke-width="2"/>
  <polygon points="48,18 54,36 72,36 58,48 62,68 48,56 34,68 38,48 24,36 42,36"
    fill="#FDDA44" stroke="none" opacity="0.6"/>
</svg>`),
  },
  {
    name: 'Ball',
    category: 'Things',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="34" fill="#E74C3C" stroke="#C0392B" stroke-width="2"/>
  <path d="M20,32 Q48,24 76,32" stroke="white" fill="none" stroke-width="3"/>
  <path d="M20,64 Q48,72 76,64" stroke="white" fill="none" stroke-width="3"/>
  <line x1="48" y1="14" x2="48" y2="82" stroke="white" stroke-width="3"/>
  <circle cx="38" cy="38" r="6" fill="white" opacity="0.25"/>
</svg>`),
  },
  {
    name: 'Rocket',
    category: 'Things',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g stroke="#333" stroke-width="1.2">
    <path d="M48,8 C34,28 32,56 36,72 L60,72 C64,56 62,28 48,8Z" fill="#ECF0F1"/>
    <circle cx="48" cy="40" r="8" fill="#3498DB"/>
    <circle cx="48" cy="40" r="4" fill="#2980B9"/>
    <path d="M36,54 Q24,64 28,78 L36,68Z" fill="#E74C3C"/>
    <path d="M60,54 Q72,64 68,78 L60,68Z" fill="#E74C3C"/>
    <path d="M40,72 L40,84 Q48,92 56,84 L56,72Z" fill="#F39C12"/>
    <path d="M44,72 L44,80 Q48,86 52,80 L52,72Z" fill="#F1C40F"/>
    <ellipse cx="48" cy="14" rx="4" ry="6" fill="#E74C3C"/>
  </g>
</svg>`),
  },
  {
    name: 'Tree',
    category: 'Nature',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g stroke="#2D5016" stroke-width="1">
    <rect x="42" y="62" width="12" height="24" rx="2" fill="#8B5E3C" stroke="#6B4226"/>
    <polygon points="48,8 20,42 76,42" fill="#27AE60"/>
    <polygon points="48,22 24,52 72,52" fill="#2ECC71"/>
    <polygon points="48,34 28,62 68,62" fill="#27AE60"/>
    <circle cx="38" cy="36" r="3" fill="#E74C3C"/>
    <circle cx="56" cy="44" r="2.5" fill="#F39C12"/>
    <circle cx="44" cy="52" r="2" fill="#E74C3C"/>
  </g>
</svg>`),
  },
  {
    name: 'Fish',
    category: 'Animals',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g stroke="#1a6b8a" stroke-width="1.2">
    <ellipse cx="44" cy="48" rx="28" ry="18" fill="#3498DB"/>
    <polygon points="72,48 88,34 88,62" fill="#2980B9"/>
    <ellipse cx="44" cy="48" rx="22" ry="14" fill="#5DADE2" stroke="none"/>
    <circle cx="34" cy="44" r="4" fill="white"/>
    <circle cx="35" cy="44" r="2" fill="#000"/>
    <path d="M44,36 Q50,32 56,36" stroke="#1a6b8a" fill="none" stroke-width="1"/>
    <path d="M44,60 Q50,64 56,60" stroke="#1a6b8a" fill="none" stroke-width="1"/>
    <path d="M48,38 L54,42" stroke="#2471A3" stroke-width="0.8"/>
    <path d="M48,50 L54,54" stroke="#2471A3" stroke-width="0.8"/>
    <path d="M48,44 L56,48" stroke="#2471A3" stroke-width="0.8"/>
  </g>
</svg>`),
  },
  {
    name: 'Ghost',
    category: 'Fantasy',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g stroke="#bbb" stroke-width="1">
    <path d="M24,50 C24,26 72,26 72,50 L72,80 L64,72 L56,80 L48,72 L40,80 L32,72 L24,80Z" fill="white"/>
    <ellipse cx="38" cy="44" rx="5" ry="6" fill="#333"/>
    <ellipse cx="58" cy="44" rx="5" ry="6" fill="#333"/>
    <circle cx="40" cy="42" r="2" fill="white"/>
    <circle cx="60" cy="42" r="2" fill="white"/>
    <ellipse cx="48" cy="56" rx="5" ry="3" fill="#ddd" stroke="none"/>
  </g>
</svg>`),
  },
  {
    name: 'Car',
    category: 'Things',
    svg: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g stroke="#333" stroke-width="1.2">
    <rect x="12" y="44" width="72" height="22" rx="6" fill="#E74C3C"/>
    <path d="M28,44 L34,26 L62,26 L68,44" fill="#C0392B"/>
    <rect x="36" y="28" width="12" height="14" rx="2" fill="#AED6F1" stroke="#5DADE2"/>
    <rect x="52" y="28" width="12" height="14" rx="2" fill="#AED6F1" stroke="#5DADE2"/>
    <circle cx="28" cy="66" r="8" fill="#2C3E50"/>
    <circle cx="28" cy="66" r="4" fill="#7F8C8D"/>
    <circle cx="68" cy="66" r="8" fill="#2C3E50"/>
    <circle cx="68" cy="66" r="4" fill="#7F8C8D"/>
    <rect x="14" y="48" width="8" height="4" rx="2" fill="#F1C40F"/>
    <rect x="74" y="48" width="8" height="4" rx="2" fill="#F1C40F"/>
  </g>
</svg>`),
  },
];
