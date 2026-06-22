import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_camera_init'] = function (block, generator) {
  const format = block.getFieldValue('FORMAT') || 'PIXFORMAT_JPEG';
  const size = block.getFieldValue('SIZE') || 'FRAMESIZE_SVGA';
  generator.definitions_['include_camera'] = '#include "esp_camera.h"';
  generator.definitions_['camera_pins'] = `// Define camera pins before setup()
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     10
#define SIOD_GPIO_NUM     40
#define SIOC_GPIO_NUM     39
#define Y9_GPIO_NUM       48
#define Y8_GPIO_NUM       11
#define Y7_GPIO_NUM       12
#define Y6_GPIO_NUM       14
#define Y5_GPIO_NUM       16
#define Y4_GPIO_NUM       18
#define Y3_GPIO_NUM       17
#define Y2_GPIO_NUM       15
#define VSYNC_GPIO_NUM    38
#define HREF_GPIO_NUM     47
#define PCLK_GPIO_NUM     13`;
  generator.definitions_['camera_init_code'] = `
camera_config_t camera_config = {0};
camera_config.ledc_channel = LEDC_CHANNEL_0;
camera_config.ledc_timer = LEDC_TIMER_0;
camera_config.pin_d0 = Y2_GPIO_NUM;
camera_config.pin_d1 = Y3_GPIO_NUM;
camera_config.pin_d2 = Y4_GPIO_NUM;
camera_config.pin_d3 = Y5_GPIO_NUM;
camera_config.pin_d4 = Y6_GPIO_NUM;
camera_config.pin_d5 = Y7_GPIO_NUM;
camera_config.pin_d6 = Y8_GPIO_NUM;
camera_config.pin_d7 = Y9_GPIO_NUM;
camera_config.pin_xclk = XCLK_GPIO_NUM;
camera_config.pin_pclk = PCLK_GPIO_NUM;
camera_config.pin_vsync = VSYNC_GPIO_NUM;
camera_config.pin_href = HREF_GPIO_NUM;
camera_config.pin_sscb_sda = SIOD_GPIO_NUM;
camera_config.pin_sscb_scl = SIOC_GPIO_NUM;
camera_config.pin_pwdn = PWDN_GPIO_NUM;
camera_config.pin_reset = RESET_GPIO_NUM;
camera_config.xclk_freq_hz = 20000000;
camera_config.pixel_format = ${format};
camera_config.frame_size = ${size};
camera_config.jpeg_quality = 12;
camera_config.fb_count = 1;
if (esp_camera_init(&camera_config) != ESP_OK) {
  Serial.println("Camera init failed");
  return;
}`;
  return '// Camera initialized in setup()\n';
};

forBlock['esp32_camera_flash'] = function (block, generator) {
  const flash = block.getFieldValue('FLASH');
  const quality = block.getFieldValue('QUALITY');
  generator.definitions_['include_camera'] = '#include "esp_camera.h"';
  const flashVal = flash === 'on' ? 'HIGH' : 'LOW';
  return `// Flash: ${flashVal}\n`;
};

forBlock['esp32_rotate_camera'] = function (block, generator) {
  const side = block.getFieldValue('SIDE');
  generator.definitions_['include_camera'] = '#include "esp_camera.h"';
  const flip = side === 'front' ? '1' : '0';
  return `sensor_t* s = esp_camera_sensor_get();\ns->set_vflip(s, ${flip});\n`;
};

forBlock['esp32_capture_image'] = function (block, generator) {
  generator.definitions_['include_camera'] = '#include "esp_camera.h"';
  return `camera_fb_t* fb = esp_camera_fb_get();\nif (fb) esp_camera_fb_return(fb);\n`;
};

forBlock['esp32_camera_ready'] = function (block, generator) {
  generator.definitions_['include_camera'] = '#include "esp_camera.h"';
  return [`(esp_camera_fb_get() != NULL)`, ArduinoOrder.EQUALITY];
};

forBlock['esp32_camera_save_image'] = function (block, generator) {
  const filename = block.getFieldValue('FILENAME') || '/capture.jpg';
  generator.definitions_['include_camera'] = '#include "esp_camera.h"';
  generator.definitions_['include_fs'] = '#include "FS.h"\n#include "SD_MMC.h"';
  return `camera_fb_t* fb = esp_camera_fb_get();\nif (fb) {\n  File file = SD_MMC.open("${filename}", FILE_WRITE);\n  if (file) { file.write(fb->buf, fb->len); file.close(); }\n  esp_camera_fb_return(fb);\n}\n`;
};

forBlock['esp32_camera_stream'] = function (block, generator) {
  generator.definitions_['include_camera'] = '#include "esp_camera.h"';
  return `// Camera streaming enabled\n`;
};
