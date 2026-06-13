import { BreadboardVisualModel, BreadboardHoleVisual, BreadboardRailVisual, BreadboardLabelVisual } from '../types';

export function generateBreadboardVisual(breadboardId: string, assetId: string): BreadboardVisualModel {
  const holes: BreadboardHoleVisual[] = [];
  const rails: BreadboardRailVisual[] = [];
  const labels: BreadboardLabelVisual[] = [];

  const rowStartOffset = 60;
  const colSpacing = 12;
  const rowSpacing = 13;

  let numCols = 63;
  let numRailGroups = 10;
  let hasRails = true;
  let rightLabelX = 830;
  let width = 900;
  let height = 350;

  if (assetId === 'breadboard_400') {
    numCols = 30;
    numRailGroups = 5;
    hasRails = true;
    rightLabelX = 405;
    width = 475;
    height = 350;
  } else if (assetId === 'breadboard_mini') {
    numCols = 17;
    numRailGroups = 0;
    hasRails = false;
    rightLabelX = 236;
    width = 300;
    height = 250;
  }

  // 1. Generate Main Terminals
  for (let r = 1; r <= numCols; r++) {
    const x = rowStartOffset + (r - 1) * rowSpacing;

    // Columns A-E (top half)
    for (let c = 0; c < 5; c++) {
      const char = String.fromCharCode(65 + c); // A, B, C, D, E
      const holeId = `${char}${r}`;
      holes.push({
        holeId,
        positionX: x,
        positionY: 110 + c * colSpacing,
        diameter: 4,
        groupId: `col_${char}_${r}`,
        connectedGroupId: `col_top_${r}`,
        visualState: 'NORMAL',
      });
    }

    // Columns F-J (bottom half)
    for (let c = 0; c < 5; c++) {
      const char = String.fromCharCode(70 + c); // F, G, H, I, J
      const holeId = `${char}${r}`;
      holes.push({
        holeId,
        positionX: x,
        positionY: 190 + c * colSpacing,
        diameter: 4,
        groupId: `col_${char}_${r}`,
        connectedGroupId: `col_bottom_${r}`,
        visualState: 'NORMAL',
      });
    }
  }

  // 2. Generate Power Rails
  if (hasRails) {
    const powerY = [50, 70, 278, 298];
    const powerLabels = ['top_pos', 'top_neg', 'bot_pos', 'bot_neg'];
    const powerGroupIds = ['power_top', 'gnd_top', 'power_bottom', 'gnd_bottom'];

    for (let railIndex = 0; railIndex < 4; railIndex++) {
      const y = powerY[railIndex];
      const label = powerLabels[railIndex];
      const connectedGroupId = powerGroupIds[railIndex];

      for (let g = 0; g < numRailGroups; g++) {
        const groupStartX = rowStartOffset + g * 6 * rowSpacing;
        for (let h = 0; h < 5; h++) {
          const x = groupStartX + h * rowSpacing;
          const holeId = `hole_${label}_${g + 1}_${h + 1}`;
          holes.push({
            holeId,
            positionX: x,
            positionY: y,
            diameter: 4,
            groupId: holeId,
            connectedGroupId,
            visualState: 'NORMAL',
          });
        }
      }
    }

    // 3. Generate Rails
    const railLength = numRailGroups * 6 * rowSpacing - rowSpacing;
    rails.push({
      railId: 'top_pos',
      railType: 'POWER',
      position: { x: 60, y: 50 },
      length: railLength,
      visualState: 'NORMAL',
    });
    rails.push({
      railId: 'top_neg',
      railType: 'GROUND',
      position: { x: 60, y: 70 },
      length: railLength,
      visualState: 'NORMAL',
    });
    rails.push({
      railId: 'bot_pos',
      railType: 'POWER',
      position: { x: 60, y: 278 },
      length: railLength,
      visualState: 'NORMAL',
    });
    rails.push({
      railId: 'bot_neg',
      railType: 'GROUND',
      position: { x: 60, y: 298 },
      length: railLength,
      visualState: 'NORMAL',
    });
  }

  // 4. Generate Labels
  // 4a. Row labels A-J
  for (let c = 0; c < 5; c++) {
    const char = String.fromCharCode(65 + c); // A-E
    const y = 110 + c * colSpacing;
    labels.push({
      labelId: `label_row_${char}_left`,
      text: char,
      positionX: 45,
      positionY: y,
      color: '#888888',
      fontSize: 10,
    });
    labels.push({
      labelId: `label_row_${char}_right`,
      text: char,
      positionX: rightLabelX,
      positionY: y,
      color: '#888888',
      fontSize: 10,
    });
  }
  for (let c = 0; c < 5; c++) {
    const char = String.fromCharCode(70 + c); // F-J
    const y = 190 + c * colSpacing;
    labels.push({
      labelId: `label_row_${char}_left`,
      text: char,
      positionX: 45,
      positionY: y,
      color: '#888888',
      fontSize: 10,
    });
    labels.push({
      labelId: `label_row_${char}_right`,
      text: char,
      positionX: rightLabelX,
      positionY: y,
      color: '#888888',
      fontSize: 10,
    });
  }

  // 4b. Column labels 1-numCols
  for (let r = 1; r <= numCols; r++) {
    const x = rowStartOffset + (r - 1) * rowSpacing;
    labels.push({
      labelId: `label_col_${r}_top`,
      text: r.toString(),
      positionX: x,
      positionY: 95,
      color: '#888888',
      fontSize: 9,
    });
    labels.push({
      labelId: `label_col_${r}_bottom`,
      text: r.toString(),
      positionX: x,
      positionY: 255,
      color: '#888888',
      fontSize: 9,
    });
  }

  // 4c. Rail marker +/- labels
  if (hasRails) {
    const railMarkerY = [50, 70, 278, 298];
    const railColors = ['#FF0000', '#0000FF', '#FF0000', '#0000FF'];
    const railSigns = ['+', '-', '+', '-'];
    const railKeys = ['top_pos', 'top_neg', 'bot_pos', 'bot_neg'];

    for (let i = 0; i < 4; i++) {
      labels.push({
        labelId: `label_rail_${railKeys[i]}_left`,
        text: railSigns[i],
        positionX: 45,
        positionY: railMarkerY[i],
        color: railColors[i],
        fontSize: 12,
      });
      labels.push({
        labelId: `label_rail_${railKeys[i]}_right`,
        text: railSigns[i],
        positionX: rightLabelX,
        positionY: railMarkerY[i],
        color: railColors[i],
        fontSize: 12,
      });
    }
  }

  return {
    breadboardId,
    assetId,
    holes,
    rails,
    labels,
    width,
    height,
  };
}
