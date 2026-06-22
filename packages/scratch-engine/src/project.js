import spriteStore from './engine/SpriteStore';
import { DEFAULT_CAT_SVG } from './engine/SpriteEngine';
import { getCurrentMode, setMode } from './ui/ModeSwitcher';
import * as Blockly from 'blockly';

function serializeSprite(s) {
  return {
    name: s.name,
    x: s.x, y: s.y, direction: s.direction, size: s.size,
    visible: s.visible, opacity: s.opacity,
    rotationStyle: s.rotationStyle,
    costumes: s.costumes.map(c => ({ name: c.name, src: c.src })),
    currentCostumeIndex: s.currentCostumeIndex,
    sayBubble: s.sayBubble,
    penDown: s.penDown, penColor: s.penColor, penSize: s.penSize,
    penTrails: s.penTrails,
    workspaceState: s.workspaceState,
  };
}

export function saveProject(ws) {
  const mode = getCurrentMode();
  const allSprites = spriteStore.getAllSprites();
  const selId = spriteStore.selectedSpriteId;
  const selIndex = allSprites.findIndex(s => s.id === selId);

  const data = {
    version: 2,
    mode: mode,
    project: {
      spriteStore: {
        sprites: allSprites.map(serializeSprite),
        selectedSpriteIndex: selIndex >= 0 ? selIndex : 0,
        currentBackdrop: spriteStore.getCurrentBackdrop(),
        backdrops: spriteStore.getBackdrops(),
      },
      boardWorkspace: mode === 'board' ? Blockly.serialization.workspaces.save(ws) : null,
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'project.techyguide';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function loadProject(ws) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.techyguide';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      restoreProject(data, ws);
    } catch (err) {
      alert('Failed to load project: ' + err.message);
    }
  };
  input.click();
}

function restoreProject(data, ws) {
  const projectData = data.project || data;
  const spriteData = projectData.spriteStore || projectData;
  const boardWs = projectData.boardWorkspace || null;

  if (!spriteData && !boardWs) {
    alert('Invalid project file.');
    return;
  }

  // Restore sprites (Scratch mode)
  const existingIds = spriteStore.getAllSprites().map(s => s.id);
  for (const id of existingIds) {
    spriteStore.removeSprite(id);
  }

  if (spriteData && spriteData.sprites) {
    for (const saved of spriteData.sprites) {
      const firstCostume = saved.costumes && saved.costumes[0] ? saved.costumes[0].src : DEFAULT_CAT_SVG;
      const sprite = spriteStore.addSprite(saved.name, { costumeSrc: firstCostume });

      sprite.x = saved.x ?? 0;
      sprite.y = saved.y ?? 0;
      sprite.direction = saved.direction ?? 90;
      sprite.size = saved.size ?? 100;
      sprite.visible = saved.visible ?? true;
      sprite.opacity = saved.opacity ?? 1;
      sprite.rotationStyle = saved.rotationStyle ?? 'all around';
      sprite.currentCostumeIndex = saved.currentCostumeIndex ?? 0;
      sprite.sayBubble = saved.sayBubble ?? null;
      sprite.penDown = saved.penDown ?? false;
      sprite.penColor = saved.penColor ?? '#4C97FF';
      sprite.penSize = saved.penSize ?? 1;
      sprite.penTrails = saved.penTrails ?? [];
      sprite.workspaceState = saved.workspaceState ?? null;

      if (saved.costumes) {
        for (let i = 1; i < saved.costumes.length; i++) {
          sprite.addCostume(saved.costumes[i].name, saved.costumes[i].src);
        }
      }
    }

    if (spriteData.currentBackdrop) {
      spriteStore.setBackdrop(spriteData.currentBackdrop);
    }
    if (spriteData.backdrops) {
      for (const bd of spriteData.backdrops) {
        spriteStore.addBackdropToLibrary(bd);
      }
    }

    const allSprites = spriteStore.getAllSprites();
    const selIndex = spriteData.selectedSpriteIndex ?? 0;
    if (allSprites[selIndex]) {
      spriteStore.selectSprite(allSprites[selIndex].id);
    } else if (allSprites[0]) {
      spriteStore.selectSprite(allSprites[0].id);
    }
  }

  // Restore board mode workspace — switch mode first (which clears workspace),
  // then load the saved blocks so they survive the mode switch
  if (boardWs) {
    setMode('board');
    Blockly.serialization.workspaces.load(boardWs, ws);
  }
}
