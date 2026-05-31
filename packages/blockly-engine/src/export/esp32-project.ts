export type Esp32BoardSlug = 'esp32' | 'esp32_s3';

export type Esp32ProjectExport = {
  board: Esp32BoardSlug;
  files: Record<string, string>;
};

const BOARD_PLATFORMIO: Record<Esp32BoardSlug, { env: string; board: string; target: string }> = {
  esp32: { env: 'esp32dev', board: 'esp32dev', target: 'esp32' },
  esp32_s3: { env: 'esp32-s3-devkitc-1', board: 'esp32-s3-devkitc-1', target: 'esp32s3' },
};

export function generatePlatformioIni(board: Esp32BoardSlug, monitorSpeed = 115200): string {
  const cfg = BOARD_PLATFORMIO[board];
  return `[platformio]
default_envs = ${cfg.env}

[env:${cfg.env}]
platform = espressif32
board = ${cfg.board}
framework = espidf
monitor_speed = ${monitorSpeed}
build_flags =
  -D STEMVERSE_BOARD="${board}"
`;
}

export function generateSdkconfigDefaults(board: Esp32BoardSlug): string {
  const target = BOARD_PLATFORMIO[board].target;
  return `# STEMVerse generated sdkconfig.defaults
CONFIG_IDF_TARGET="${target}"
CONFIG_ESPTOOLPY_FLASHSIZE_4MB=y
CONFIG_PARTITION_TABLE_SINGLE_APP=y
CONFIG_ESP_MAIN_TASK_STACK_SIZE=8192
CONFIG_FREERTOS_HZ=1000
CONFIG_LOG_DEFAULT_LEVEL_INFO=y
`;
}

export function generateEsp32ProjectExport(
  board: Esp32BoardSlug,
  mainSource: string,
  projectName: string,
  monitorSpeed = 115200,
): Esp32ProjectExport {
  const slug = projectName.replace(/\s+/g, '_').toLowerCase();
  return {
    board,
    files: {
      'platformio.ini': generatePlatformioIni(board, monitorSpeed),
      'sdkconfig.defaults': generateSdkconfigDefaults(board),
      'CMakeLists.txt': `cmake_minimum_required(VERSION 3.16)\ninclude($ENV{IDF_PATH}/tools/cmake/project.cmake)\nproject(${slug})\n`,
      'main/CMakeLists.txt': 'idf_component_register(SRCS "main.c" INCLUDE_DIRS ".")',
      'main/main.c': mainSource,
    },
  };
}

export function exportEsp32ProjectAsJson(exportData: Esp32ProjectExport): string {
  return JSON.stringify(exportData, null, 2);
}
