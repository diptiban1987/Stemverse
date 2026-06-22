// esp32 camera blocks — capture, stream
import * as Blockly from "blockly/core";

const cameraFlash = {
  type: "esp32_camera_flash",
  message0: "set camera flash to %1 , quality to %2 & zoom to %3 %%",
  args0: [
    { type: "field_dropdown", name: "FLASH", options: [["on","on"],["off","off"]] },
    { type: "field_dropdown", name: "QUALITY", options: [["high","high"],["medium","medium"],["low","low"]] },
    { type: "field_number", name: "ZOOM", value: 0, min: 0, max: 100 }
  ],
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Configure camera flash and quality"
};

const rotateCamera = {
  type: "esp32_rotate_camera",
  message0: "rotate camera to %1 side",
  args0: [{ type: "field_dropdown", name: "SIDE", options: [["rear","rear"],["front","front"]] }],
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Switch between front and rear camera"
};

const captureImage = {
  type: "esp32_capture_image",
  message0: "Capture image on camera",
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Capture an image from the camera"
};

const cameraInit = {
  type: "esp32_camera_init",
  message0: "initialize camera (quality %1)",
  args0: [
    { type: "field_dropdown", name: "QUALITY", options: [["high","10"],["medium","15"],["low","20"]] }
  ],
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Initialize the ESP32-CAM camera module"
};

const cameraReady = {
  type: "esp32_camera_ready",
  message0: "camera ready?",
  output: "Boolean",
  colour: 300, tooltip: "Check if the camera is initialized and ready"
};

const cameraSaveImage = {
  type: "esp32_camera_save_image",
  message0: "save captured image as %1",
  args0: [
    { type: "field_input", name: "FILENAME", text: "photo.jpg" }
  ],
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Save the last captured image to the ESP32 flash storage"
};

const cameraStream = {
  type: "esp32_camera_stream",
  message0: "start camera stream on port %1",
  args0: [
    { type: "field_number", name: "PORT", value: 80, min: 1, max: 65535 }
  ],
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Start an HTTP MJPEG camera stream (requires WiFi)"
};

export const cameraBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  cameraInit, cameraFlash, rotateCamera, captureImage,
  cameraSaveImage, cameraStream, cameraReady
]);

