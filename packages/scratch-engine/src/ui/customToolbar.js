import { refreshIcons } from './icons';

const CATEGORY_COLORS = {
  Motion: '#4C97FF', Looks: '#9966FF', Sound: '#CF63CF',
  Events: '#FFBF00', Control: '#FFAB19', Sensing: '#5CB1D6',
  Operators: '#59C059', Variables: '#FF8C1A', 'My Blocks': '#FF6680',
  Logic: '#4C97FF', Loops: '#9966FF', Math: '#59C059',
  Text: '#FF8C1A', Lists: '#CC5B22', 'ESP32 Core': '#5CB1D6',
  Inputs: '#59C059', Sensors: '#FF8C1A', Actuators: '#00A69C',
  Displays: '#3D8BF5', Motors: '#FF4D4D', 'Comms & IoT': '#10B981',
  Dabble: '#6366F1', Functions: '#FF6680',
  // ESP32 subcategories
  Program: '#5CB1D6', Pins: '#5CB1D6',
  'Tactile Switch': '#59C059', 'Slide Switch': '#59C059', 'Touch & Hall': '#59C059',
  Ultrasonic: '#FF8C1A', PIR: '#FF8C1A', IR: '#FF8C1A', Rain: '#FF8C1A', LDR: '#FF8C1A',
  DHT: '#FF8C1A', Generic: '#FF8C1A', 'Hall Module': '#FF8C1A', MPU6050: '#FF8C1A', 'Heart Rate': '#FF8C1A',
  Servo: '#00A69C', Relay: '#00A69C', LED: '#00A69C', Notification: '#00A69C', Music: '#00A69C',
  LCD: '#3D8BF5',
  L298N: '#FF4D4D', 'Generic Motor': '#FF4D4D',
  'Serial / Bluetooth': '#10B981', Camera: '#10B981', 'Storage / Logger': '#10B981',
  'WiFi / Network': '#10B981', 'HTTP Client': '#10B981', MQTT: '#10B981',
  'Blynk IoT': '#00bcd4', 'ThingSpeak': '#8bc34a',
  'Virtual Pins': '#00bcd4', Notifications: '#00bcd4', Widgets: '#00bcd4', Timer: '#00bcd4',
  Setup: '#6366F1', Gamepad: '#6366F1', 'Phone Sensors': '#6366F1', 'Color Detector': '#6366F1',
  'Fire & Safety': '#FF8C1A',
  Buzzer: '#00A69C', 'Water Pump': '#00A69C',
  NeoPixel: '#3D8BF5',
};

const CATEGORY_ICONS = {
  Motion: 'move', Looks: 'eye', Sound: 'volume-2',
  Events: 'zap', Control: 'refresh-cw', Sensing: 'crosshair',
  Operators: 'sigma', Variables: 'box', 'My Blocks': 'puzzle',
  Logic: 'git-branch', Loops: 'repeat', Math: 'calculator',
  Text: 'type', Lists: 'list', 'ESP32 Core': 'cpu',
  Inputs: 'toggle-left', Sensors: 'activity', Actuators: 'zap-off',
  Displays: 'monitor', Motors: 'wind', 'Comms & IoT': 'wifi',
  Dabble: 'gamepad-2', Functions: 'puzzle',
  // ESP32 subcategories
  Program: 'play', Pins: 'plug',
  'Tactile Switch': 'toggle-left', 'Slide Switch': 'toggle-right', 'Touch & Hall': 'hand',
  Ultrasonic: 'move-horizontal', PIR: 'eye', IR: 'radio', Rain: 'cloud-rain', LDR: 'sun',
  DHT: 'thermometer', Generic: 'menu', 'Hall Module': 'magnet', MPU6050: 'gyroscope', 'Heart Rate': 'heart-pulse',
  Servo: 'rotate-cw', Relay: 'power', LED: 'lightbulb', Notification: 'bell', Music: 'music',
  LCD: 'monitor',
  L298N: 'wind', 'Generic Motor': 'fan',
  'Serial / Bluetooth': 'bluetooth', Camera: 'camera', 'Storage / Logger': 'hard-drive',
  'WiFi / Network': 'wifi', 'HTTP Client': 'globe', MQTT: 'radio-tower',
  'Blynk IoT': 'cloud', 'ThingSpeak': 'bar-chart-2',
  'Virtual Pins': 'git-commit', Notifications: 'bell-ring', Widgets: 'layout-dashboard', Timer: 'timer',
  Setup: 'settings', Gamepad: 'gamepad-2', 'Phone Sensors': 'smartphone', 'Color Detector': 'palette',
  'Fire & Safety': 'flame',
  Buzzer: 'volume-2', 'Water Pump': 'droplets',
  NeoPixel: 'lightbulb',
};

function enhanceToolbox() {
  const categories = document.querySelectorAll('.blocklyToolboxCategory');
  categories.forEach((cat) => {
    if (cat.tgDone) return;
    const label = cat.querySelector('.blocklyToolboxCategoryLabel');
    if (!label) return;
    const name = label.textContent.trim();
    const color = CATEGORY_COLORS[name];
    if (!color) { cat.tgDone = true; return; }

    cat.style.setProperty('--cat-color', color);

    const iconName = CATEGORY_ICONS[name];
    if (iconName) {
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', iconName);
      icon.className = 'tg-cat-icon';
      try {
        label.parentNode.insertBefore(icon, label);
      } catch (e) {
        // fallback: skip icon
      }
    }

    const old = cat.querySelector('[id^="color-"]');
    if (old) old.remove();
    cat.tgDone = true;
  });
  try { refreshIcons(); } catch (e) {}
}

// ── Accordion Behavior ──────────────────────────────────
// When a top-level category is clicked, collapse all other
// expanded category groups so only one is open at a time.

let _accordionInstalled = false;

function installAccordion() {
  if (_accordionInstalled) return;
  const toolboxDiv = document.querySelector('.blocklyToolboxDiv, .blocklyToolbox');
  if (!toolboxDiv) return;
  _accordionInstalled = true;

  // Use event delegation on the entire toolbox
  toolboxDiv.addEventListener('pointerdown', () => {
    // Defer to next frame so Blockly has time to update classes
    requestAnimationFrame(() => {
      collapseOtherGroups();
    });
  });

  // Also observe class changes via MutationObserver for keyboard/API selection
  const obs = new MutationObserver(() => {
    requestAnimationFrame(() => {
      collapseOtherGroups();
    });
  });
  obs.observe(toolboxDiv, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
  });
}

function collapseOtherGroups() {
  // Find all top-level categories (direct children of the root container)
  const allCategories = document.querySelectorAll(
    '.blocklyToolboxContents > .blocklyToolboxCategory'
  );

  allCategories.forEach((cat) => {
    const group = cat.nextElementSibling;
    if (!group || !group.classList.contains('blocklyToolboxCategoryGroup')) return;

    const isSelected = cat.classList.contains('blocklyToolboxSelected');
    // Also check if any child inside this group is selected
    const hasSelectedChild = group.querySelector('.blocklyToolboxSelected');

    if (isSelected || hasSelectedChild) {
      // This group should be open
      group.style.display = '';
      group.classList.add('tg-accordion-open');
      group.classList.remove('tg-accordion-closed');
    } else {
      // Collapse this group
      group.style.display = 'none';
      group.classList.add('tg-accordion-closed');
      group.classList.remove('tg-accordion-open');
    }
  });
}

export function addCustomToolbar() {
  enhanceToolbox();
  installAccordion();
  const toolbox = document.querySelector('.blocklyToolbox, .blocklyToolboxDiv');
  if (toolbox && !toolbox._tgWatch) {
    let timer;
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        obs.disconnect();
        enhanceToolbox();
        installAccordion();
        obs.observe(toolbox, { childList: true, subtree: true });
      }, 50);
    });
    obs.observe(toolbox, { childList: true, subtree: true });
    toolbox._tgWatch = obs;
  }
}

