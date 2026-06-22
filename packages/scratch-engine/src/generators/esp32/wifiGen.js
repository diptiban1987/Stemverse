// python generator for esp32 wifi blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_wifi_connect"] = function (block, generator) {
  const ssid = block.getFieldValue("SSID");
  const password = block.getFieldValue("PASSWORD");
  generator.definitions_["import_network"] = "import network";
  generator.definitions_["import_time"] = "import time";
  generator.definitions_["def_wifi_connect"] = `
_wifi_sta = network.WLAN(network.STA_IF)

def wifi_connect(ssid, password):
    if not _wifi_sta.isconnected():
        _wifi_sta.active(True)
        _wifi_sta.connect(ssid, password)
        for _ in range(30):
            if _wifi_sta.isconnected():
                break
            time.sleep_ms(500)
`;
  return `wifi_connect(${generator.quote_(ssid)}, ${generator.quote_(password)})\n`;
};

forBlock["esp32_wifi_disconnect"] = function (block, generator) {
  generator.definitions_["import_network"] = "import network";
  return `_wifi_sta.disconnect()
_wifi_sta.active(False)
`;
};

forBlock["esp32_wifi_is_connected"] = function (block, generator) {
  generator.definitions_["import_network"] = "import network";
  return [`_wifi_sta.isconnected() if '_wifi_sta' in dir() else False`, Order.LOGICAL_OR];
};

forBlock["esp32_wifi_local_ip"] = function (block, generator) {
  generator.definitions_["import_network"] = "import network";
  return [`str(_wifi_sta.ifconfig()[0]) if '_wifi_sta' in dir() and _wifi_sta.isconnected() else "0.0.0.0"`, Order.CONDITIONAL];
};

forBlock["esp32_wifi_scan"] = function (block, generator) {
  generator.definitions_["import_network"] = "import network";
  generator.definitions_["import_time"] = "import time";
  generator.definitions_["def_wifi_scan"] = `
_wifi_sta = network.WLAN(network.STA_IF)

def scan_wifi():
    _wifi_sta.active(True)
    return _wifi_sta.scan()
`;
  return `scan_wifi()\n`;
};

forBlock["esp32_wifi_rssi"] = function (block, generator) {
  generator.definitions_["import_network"] = "import network";
  return [`_wifi_sta.status('rssi') if '_wifi_sta' in dir() and _wifi_sta.isconnected() else -127`, Order.CONDITIONAL];
};
