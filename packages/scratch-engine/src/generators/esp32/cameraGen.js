// python generator for esp32 camera blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_camera_flash"] = function (block, generator) {
  const flash = block.getFieldValue("FLASH");
  const quality = block.getFieldValue("QUALITY");
  const zoom = block.getFieldValue("ZOOM");
  generator.definitions_["import_camera"] = "import camera";
  const flashVal = flash === "on" ? "True" : "False";
  const qualityMap = { high: 10, medium: 15, low: 20 };
  const q = qualityMap[quality] || 10;
  return `camera.init(0, format=camera.JPEG, fb_location=camera.PSRAM, quality=${q})\ncamera.flash(${flashVal})\n`;
};

forBlock["esp32_rotate_camera"] = function (block, generator) {
  const side = block.getFieldValue("SIDE");
  generator.definitions_["import_camera"] = "import camera";
  const flip = side === "front" ? "True" : "False";
  return `camera.flip(${flip})\n`;
};

forBlock["esp32_capture_image"] = function (block, generator) {
  generator.definitions_["import_camera"] = "import camera";
  return `_img = camera.capture()\n`;
};

forBlock["esp32_camera_init"] = function (block, generator) {
  const quality = block.getFieldValue("QUALITY") || "10";
  generator.definitions_["import_camera"] = "import camera";
  generator.definitions_["camera_init"] = `
_cam_ready = False
try:
  camera.init(0, format=camera.JPEG, fb_location=camera.PSRAM, quality=${quality})
  _cam_ready = True
except Exception as e:
  print('Camera init failed:', e)
`;
  return "";
};

forBlock["esp32_camera_ready"] = function (block, generator) {
  generator.definitions_["import_camera"] = "import camera";
  return [`_cam_ready`, Order.ATOMIC];
};

forBlock["esp32_camera_save_image"] = function (block, generator) {
  const filename = block.getFieldValue("FILENAME") || "photo.jpg";
  generator.definitions_["import_camera"] = "import camera";
  return `_img = camera.capture()\nif _img:\n  f = open('${filename}', 'wb')\n  f.write(_img)\n  f.close()\n  print('Saved: ${filename}')\n`;
};

forBlock["esp32_camera_stream"] = function (block, generator) {
  const port = block.getFieldValue("PORT") || "80";
  generator.definitions_["import_camera"] = "import camera";
  generator.definitions_["import_socket"] = "import socket";
  generator.definitions_["def_cam_stream"] = `
def _start_cam_stream(port):
  s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
  s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
  s.bind(('0.0.0.0', port))
  s.listen(1)
  print('Camera stream at http://0.0.0.0:' + str(port))
  while True:
    conn, addr = s.accept()
    try:
      img = camera.capture()
      if img:
        conn.send(b'HTTP/1.1 200 OK\\r\\nContent-Type: image/jpeg\\r\\n\\r\\n')
        conn.send(img)
    except Exception:
      pass
    finally:
      conn.close()
`;
  return `_start_cam_stream(${port})\n`;
};
