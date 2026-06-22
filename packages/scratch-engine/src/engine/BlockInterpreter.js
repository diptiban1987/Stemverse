// Block Interpreter 

import eventBus, { Events } from './EventBus.js';

class Thread {
  constructor(sprite, topBlock, interpreter) {
    this.sprite = sprite;
    this.topBlock = topBlock;
    this.interpreter = interpreter;
    this.running = false;
    this._cancelled = false;
  }

  async run() {
    this.running = true;
    this._cancelled = false;
    try {
      await this._executeBlock(this.topBlock);
    } catch (e) {
      if (e.message !== 'THREAD_STOPPED') {
        console.error('Thread error:', e);
      }
    }
    this.running = false;
  }

  stop() {
    this._cancelled = true;
    this.running = false;
  }

  _checkCancelled() {
    if (this._cancelled) throw new Error('THREAD_STOPPED');
  }

  async _executeBlock(block) {
    let current = block;
    while (current) {
      this._checkCancelled();
      await this._dispatch(current);
      current = current.getNextBlock();
    }
  }

  _evalValue(block, inputName, defaultValue) {
    const input = block.getInput(inputName);
    if (!input) return defaultValue;

    const targetBlock = input.connection?.targetBlock();
    if (!targetBlock) return defaultValue;

    return this._evalReporter(targetBlock);
  }

  _evalReporter(block) {
    if (!block) return '';

    const type = block.type;

    if (type === 'math_number') return Number(block.getFieldValue('NUM')) || 0;
    if (type === 'text') return block.getFieldValue('TEXT') || '';
    if (type === 'logic_boolean') return block.getFieldValue('BOOL') === 'TRUE';

    if (type === 'x_position') return this.sprite.x;
    if (type === 'y_position') return this.sprite.y;
    if (type === 'direction_reporter') return this.sprite.direction;

    if (type === 'mouse_x') return this.interpreter.renderer?.mouseX || 0;
    if (type === 'mouse_y') return this.interpreter.renderer?.mouseY || 0;
    if (type === 'answer_block') return this.interpreter.answer || '';
    if (type === 'key_pressed') {
      const key = block.getFieldValue('KEY');
      return this.interpreter.keysDown.has(key);
    }
    if (type === 'touching') {
      const menu = block.getFieldValue('TOUCHMENU');
      if (menu === '_edge_') return this.sprite.isTouchingEdge();
      if (menu === '_mouse_') {
        const mx = this.interpreter.renderer?.mouseX || 0;
        const my = this.interpreter.renderer?.mouseY || 0;
        const dx = this.sprite.x - mx;
        const dy = this.sprite.y - my;
        return Math.sqrt(dx*dx + dy*dy) < 30 * (this.sprite.size / 100);
      }
      return false;
    }

    if (type === 'math_arithmetic') {
      const a = this._evalValue(block, 'A', 0);
      const b = this._evalValue(block, 'B', 0);
      const op = block.getFieldValue('OP');
      switch (op) {
        case 'ADD': return a + b;
        case 'MINUS': return a - b;
        case 'MULTIPLY': return a * b;
        case 'DIVIDE': return b !== 0 ? a / b : 0;
        case 'POWER': return Math.pow(a, b);
        default: return 0;
      }
    }
    if (type === 'math_random_int') {
      const from = this._evalValue(block, 'FROM', 1);
      const to = this._evalValue(block, 'TO', 10);
      return Math.floor(Math.random() * (to - from + 1)) + from;
    }
    if (type === 'math_modulo') {
      const dividend = this._evalValue(block, 'DIVIDEND', 0);
      const divisor = this._evalValue(block, 'DIVISOR', 1);
      return divisor !== 0 ? dividend % divisor : 0;
    }
    if (type === 'math_round') {
      const num = this._evalValue(block, 'NUM', 0);
      return Math.round(num);
    }

    if (type === 'logic_compare') {
      const a = this._evalValue(block, 'A', 0);
      const b = this._evalValue(block, 'B', 0);
      const op = block.getFieldValue('OP');
      switch (op) {
        case 'EQ': return a == b;
        case 'NEQ': return a != b;
        case 'LT': return a < b;
        case 'LTE': return a <= b;
        case 'GT': return a > b;
        case 'GTE': return a >= b;
        default: return false;
      }
    }
    if (type === 'logic_operation') {
      const a = this._evalValue(block, 'A', false);
      const b = this._evalValue(block, 'B', false);
      const op = block.getFieldValue('OP');
      return op === 'AND' ? a && b : a || b;
    }
    if (type === 'logic_negate') {
      return !this._evalValue(block, 'BOOL', false);
    }

    if (type === 'text_join') {
      let result = '';
      let i = 0;
      while (block.getInput('ADD' + i)) {
        result += this._evalValue(block, 'ADD' + i, '');
        i++;
      }
      return result;
    }
    if (type === 'text_length') {
      const val = this._evalValue(block, 'VALUE', '');
      return String(val).length;
    }
    if (type === 'text_letter') {
      const str = String(this._evalValue(block, 'STRING', ''));
      const idx = this._evalValue(block, 'LETTER', 1);
      return str[idx - 1] || '';
    }
    if (type === 'text_contains') {
      const str = String(this._evalValue(block, 'STRING1', ''));
      const sub = String(this._evalValue(block, 'STRING2', ''));
      return str.indexOf(sub) !== -1;
    }

    if (type === 'math_op') {
      const op = block.getFieldValue('OP');
      const num = this._evalValue(block, 'NUM', 0);
      switch (op) {
        case 'FLOOR': return Math.floor(num);
        case 'CEILING': return Math.ceil(num);
        case 'SQRT': return Math.sqrt(Math.abs(num));
        case 'SIN': return Math.sin(num * Math.PI / 180);
        case 'COS': return Math.cos(num * Math.PI / 180);
        case 'TAN': return Math.tan(num * Math.PI / 180);
        case 'ASIN': return Math.asin(Math.max(-1, Math.min(1, num))) * 180 / Math.PI;
        case 'ACOS': return Math.acos(Math.max(-1, Math.min(1, num))) * 180 / Math.PI;
        case 'ATAN': return Math.atan(num) * 180 / Math.PI;
        case 'LN': return Math.log(num);
        case 'LOG': return Math.log10(num);
        case 'EXP': return Math.exp(num);
        case 'ABS': return Math.abs(num);
        default: return 0;
      }
    }
    if (type === 'math_modulo') {
      const dividend = this._evalValue(block, 'DIVIDEND', 0);
      const divisor = this._evalValue(block, 'DIVISOR', 1);
      return divisor !== 0 ? dividend % divisor : 0;
    }
    if (type === 'math_random_int') {
      const from = this._evalValue(block, 'FROM', 1);
      const to = this._evalValue(block, 'TO', 10);
      return Math.floor(Math.random() * (to - from + 1)) + from;
    }

    if (type === 'sensing_timer') return this.interpreter.timer || 0;
    if (type === 'sensing_days_since_2000') {
      const start = new Date(2000, 0, 1);
      return (Date.now() - start.getTime()) / 86400000;
    }
    if (type === 'sensing_current_date_time') {
      const field = block.getFieldValue('FIELD');
      const d = new Date();
      switch (field) {
        case 'YEAR': return d.getFullYear();
        case 'MONTH': return d.getMonth() + 1;
        case 'DAY_OF_MONTH': return d.getDate();
        case 'DAY_OF_WEEK': return d.getDay() || 7;
        case 'HOUR': return d.getHours();
        case 'MINUTE': return d.getMinutes();
        case 'SECOND': return d.getSeconds();
        default: return 0;
      }
    }
    if (type === 'sensing_of') {
      const obj = block.getFieldValue('OBJECT');
      const prop = block.getFieldValue('PROPERTY');
      return `${obj}.${prop}`;
    }
    if (type === 'sensing_distanceto') {
      const menu = block.getFieldValue('TO');
      const s = this.interpreter.spriteStore.getSpriteByName(menu);
      if (s && this.sprite) {
        const dx = this.sprite.x - s.x;
        const dy = this.sprite.y - s.y;
        return Math.sqrt(dx*dx + dy*dy);
      }
      return 0;
    }

    if (type === 'variables_get') {
      const varName = block.getFieldValue('VAR');
      return this.interpreter.variables[varName] ?? 0;
    }

    return '';
  }

  async _dispatch(block) {
    const type = block.type;
    const sprite = this.sprite;

    switch (type) {
      
      case 'move_steps':
        sprite.moveSteps(this._evalValue(block, 'STEPS', 10));
        await this._yieldFrame();
        break;

      case 'turn_right':
        sprite.turnRight(this._evalValue(block, 'DEGREES', 15));
        break;

      case 'turn_left':
        sprite.turnLeft(this._evalValue(block, 'DEGREES', 15));
        break;

      case 'if_on_edge_bounce':
        sprite.bounceOffEdge();
        break;

      case 'set_rotation_style':
        sprite.setRotationStyle(block.getFieldValue('STYLE') || 'all around');
        break;

      case 'go_to_block': {
        const menu = block.getFieldValue('TO');
        if (menu === '_mouse_') {
          sprite.goToXY(this.interpreter.renderer?.mouseX || 0, this.interpreter.renderer?.mouseY || 0);
        } else if (menu === '_random_') {
          sprite.goToXY(Math.random() * 480 - 240, Math.random() * 360 - 180);
        } else {
          const target = this.interpreter.spriteStore.getSpriteByName(menu);
          if (target) sprite.goToXY(target.x, target.y);
        }
        break;
      }

      case 'glide_to_block': {
        const secs = this._evalValue(block, 'SECS', 1);
        const menu = block.getFieldValue('TO');
        let gx, gy;
        if (menu === '_mouse_') {
          gx = this.interpreter.renderer?.mouseX || 0;
          gy = this.interpreter.renderer?.mouseY || 0;
        } else if (menu === '_random_') {
          gx = Math.random() * 480 - 240;
          gy = Math.random() * 360 - 180;
        } else {
          const target = this.interpreter.spriteStore.getSpriteByName(menu);
          gx = target ? target.x : 0;
          gy = target ? target.y : 0;
        }
        await sprite.glideToXY(gx, gy, secs);
        this._checkCancelled();
        break;
      }

      case 'point_towards_block': {
        const menu = block.getFieldValue('TO');
        let tx = 0, ty = 0;
        if (menu === '_mouse_') {
          tx = this.interpreter.renderer?.mouseX || 0;
          ty = this.interpreter.renderer?.mouseY || 0;
        } else {
          const target = this.interpreter.spriteStore.getSpriteByName(menu);
          if (target) { tx = target.x; ty = target.y; }
        }
        const dx = tx - sprite.x;
        const dy = ty - sprite.y;
        sprite.pointInDirection(Math.atan2(dx, -dy) * 180 / Math.PI);
        break;
      }

      case 'go_to_xy':
        sprite.goToXY(
          this._evalValue(block, 'X', 0),
          this._evalValue(block, 'Y', 0)
        );
        break;

      case 'glide_to_xy': {
        const secs = this._evalValue(block, 'SECS', 1);
        const gx = this._evalValue(block, 'X', 0);
        const gy = this._evalValue(block, 'Y', 0);
        await sprite.glideToXY(gx, gy, secs);
        this._checkCancelled();
        break;
      }

      case 'point_in_direction':
        sprite.pointInDirection(this._evalValue(block, 'DIRECTION', 90));
        break;

      case 'change_x':
        sprite.changeX(this._evalValue(block, 'DX', 10));
        break;

      case 'change_y':
        sprite.changeY(this._evalValue(block, 'DY', 10));
        break;

      case 'set_x':
        sprite.setX(this._evalValue(block, 'X', 0));
        break;

      case 'set_y':
        sprite.setY(this._evalValue(block, 'Y', 0));
        break;

      case 'say_for_secs': {
        const msg = this._evalValue(block, 'MESSAGE', 'Hello!');
        const secs = this._evalValue(block, 'SECS', 2);
        sprite.say(msg, secs);
        await this._wait(secs * 1000);
        break;
      }

      case 'say_block':
        sprite.say(this._evalValue(block, 'MESSAGE', 'Hello!'));
        break;

      case 'think_for_secs': {
        const msg = this._evalValue(block, 'MESSAGE', 'Hmm...');
        const secs = this._evalValue(block, 'SECS', 2);
        sprite.think(msg, secs);
        await this._wait(secs * 1000);
        break;
      }

      case 'think_block':
        sprite.think(this._evalValue(block, 'MESSAGE', 'Hmm...'));
        break;

      case 'switch_costume':
        sprite.switchCostume(this._evalValue(block, 'COSTUME', 'cat'));
        break;

      case 'next_costume':
        sprite.nextCostume();
        break;

      case 'switch_backdrop':
        sprite.stage?.switchBackdrop(this._evalValue(block, 'BACKDROP', ''));
        break;

      case 'next_backdrop':
        sprite.stage?.nextBackdrop();
        break;

      case 'change_effect': {
        const effect = block.getFieldValue('EFFECT');
        const val = this._evalValue(block, 'VALUE', 0);
        sprite.changeEffect(effect, val);
        break;
      }

      case 'set_effect': {
        const effect = block.getFieldValue('EFFECT');
        const val = this._evalValue(block, 'VALUE', 0);
        sprite.setEffect(effect, val);
        break;
      }

      case 'clear_effects':
        sprite.clearEffects();
        break;

      case 'go_to_layer': {
        const layer = block.getFieldValue('LAYER');
        sprite.goToLayer(layer);
        break;
      }

      case 'change_layer': {
        const layer = block.getFieldValue('LAYER');
        const val = this._evalValue(block, 'VALUE', 1);
        sprite.changeLayer(layer, val);
        break;
      }

      case 'change_size':
        sprite.changeSize(this._evalValue(block, 'CHANGE', 10));
        break;

      case 'set_size':
        sprite.setSize(this._evalValue(block, 'SIZE', 100));
        break;

      case 'show_block':
        sprite.show();
        break;

      case 'hide_block':
        sprite.hide();
        break;

      case 'wait_seconds': {
        const dur = this._evalValue(block, 'DURATION', 1);
        await this._wait(dur * 1000);
        break;
      }

      case 'reset_timer':
        this.interpreter.timer = 0;
        break;

      case 'repeat_block': {
        const times = this._evalValue(block, 'TIMES', 10);
        const substackBlock = block.getInputTargetBlock('SUBSTACK');
        for (let i = 0; i < times; i++) {
          this._checkCancelled();
          if (substackBlock) await this._executeBlock(substackBlock);
          await this._yieldFrame();
        }
        break;
      }

      case 'forever_block': {
        const substackBlock = block.getInputTargetBlock('SUBSTACK');
        while (true) {
          this._checkCancelled();
          if (substackBlock) await this._executeBlock(substackBlock);
          await this._yieldFrame();
        }
        break; 
      }

      case 'if_block': {
        const cond = this._evalValue(block, 'CONDITION', false);
        if (cond) {
          const sub = block.getInputTargetBlock('SUBSTACK');
          if (sub) await this._executeBlock(sub);
        }
        break;
      }

      case 'if_else_block': {
        const cond = this._evalValue(block, 'CONDITION', false);
        if (cond) {
          const sub = block.getInputTargetBlock('SUBSTACK');
          if (sub) await this._executeBlock(sub);
        } else {
          const sub2 = block.getInputTargetBlock('SUBSTACK2');
          if (sub2) await this._executeBlock(sub2);
        }
        break;
      }

      case 'stop_all': {
        const option = block.getFieldValue('STOP_OPTION');
        if (option === 'all') {
          eventBus.emit(Events.STOP_ALL);
        } else if (option === 'this script') {
          this.stop();
        }
        throw new Error('THREAD_STOPPED');
      }

      case 'broadcast_block': {
        const msg = this._evalValue(block, 'MESSAGE', 'message1');
        eventBus.emit(Events.BROADCAST, msg);
        break;
      }

      case 'broadcast_and_wait': {
        const msg = this._evalValue(block, 'MESSAGE', 'message1');
        eventBus.emit(Events.BROADCAST, msg);
        await this._yieldFrame();
        break;
      }

      case 'variables_set': {
        const varName = block.getFieldValue('VAR');
        const val = this._evalValue(block, 'VALUE', 0);
        this.interpreter.variables[varName] = val;
        break;
      }

      case 'variables_change': {
        const varName = block.getFieldValue('VAR');
        const change = this._evalValue(block, 'VALUE', 1);
        this.interpreter.variables[varName] = (this.interpreter.variables[varName] || 0) + change;
        break;
      }

      default:
        
        console.log('Unknown block type:', type);
        break;
    }
  }

  _yieldFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  _wait(ms) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (this._cancelled) {
          resolve();
          return;
        }
        if (Date.now() - start >= ms) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }
}

export class BlockInterpreter {
  constructor(spriteStore, workspace) {
    this.spriteStore = spriteStore;
    this.workspace = workspace;
    this.renderer = null;
    this.threads = [];
    this.variables = {};
    this.answer = '';
    this.keysDown = new Set();
    this.timer = 0;
    this._timerInterval = null;

    document.addEventListener('keydown', (e) => {
      this.keysDown.add(e.key);
      eventBus.emit(Events.KEY_PRESS, e.key);
    });
    document.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.key);
    });

    eventBus.on(Events.STOP_ALL, () => this.stopAll());
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  startAll() {
    this.stopAll();
    this.timer = 0;
    this._timerInterval = setInterval(() => { this.timer += 0.01; }, 10);

    const sprites = this.spriteStore.getAllSprites();
    const currentSelected = this.spriteStore.getSelectedSprite();

    for (const sprite of sprites) {

      if (sprite.id === currentSelected?.id) {
        
        this._startHatBlocksForSprite(sprite, this.workspace);
      }
      
    }

    eventBus.emit(Events.GREEN_FLAG);
  }

  _startHatBlocksForSprite(sprite, workspace) {
    const topBlocks = workspace.getTopBlocks(false);

    for (const block of topBlocks) {
      if (block.type === 'when_flag_clicked') {
        const nextBlock = block.getNextBlock();
        if (nextBlock) {
          const thread = new Thread(sprite, nextBlock, this);
          this.threads.push(thread);
          thread.run();
        }
      }

      if (block.type === 'when_key_pressed') {
        const key = block.getFieldValue('KEY');
        const nextBlock = block.getNextBlock();
        if (nextBlock) {
          
          const unsub = eventBus.on(Events.KEY_PRESS, (pressedKey) => {
            if (pressedKey === key || (key === 'space' && pressedKey === ' ')) {
              const thread = new Thread(sprite, nextBlock, this);
              this.threads.push(thread);
              thread.run();
            }
          });
          
          this._keyUnsubs = this._keyUnsubs || [];
          this._keyUnsubs.push(unsub);
        }
      }

      if (block.type === 'when_sprite_clicked') {
        const nextBlock = block.getNextBlock();
        if (nextBlock && this.renderer) {
          this.renderer.onSpriteClick((clickedSprite) => {
            if (clickedSprite.id === sprite.id) {
              const thread = new Thread(sprite, nextBlock, this);
              this.threads.push(thread);
              thread.run();
            }
          });
        }
      }

      if (block.type === 'when_receive') {
        const msgName = block.getFieldValue('MESSAGE');
        const nextBlock = block.getNextBlock();
        if (nextBlock) {
          const unsub = eventBus.on(Events.BROADCAST, (broadcastMsg) => {
            if (broadcastMsg === msgName) {
              const thread = new Thread(sprite, nextBlock, this);
              this.threads.push(thread);
              thread.run();
            }
          });
          this._broadcastUnsubs = this._broadcastUnsubs || [];
          this._broadcastUnsubs.push(unsub);
        }
      }
    }
  }

  stopAll() {
    this.threads.forEach(t => t.stop());
    this.threads = [];
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }

    if (this._keyUnsubs) {
      this._keyUnsubs.forEach(fn => fn());
      this._keyUnsubs = [];
    }
    if (this._broadcastUnsubs) {
      this._broadcastUnsubs.forEach(fn => fn());
      this._broadcastUnsubs = [];
    }
  }
}
