// python generator for esp32 blynk & thingspeak blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

// ── Blynk IoT blocks ───────────────────────────────────────────────────────

forBlock["esp32_blynk_setup"] = function (block, generator) {
  const auth = block.getFieldValue("AUTH");
  const ssid = block.getFieldValue("SSID");
  const password = block.getFieldValue("PASSWORD");
  generator.definitions_["import_network"] = "import network";
  generator.definitions_["import_time"] = "import time";
  generator.definitions_["import_BlynkLib"] = "import BlynkLib";
  generator.definitions_["def_blynk_wifi_connect"] = `
_wifi_sta = network.WLAN(network.STA_IF)

def _blynk_wifi_connect(ssid, password):
    if not _wifi_sta.isconnected():
        _wifi_sta.active(True)
        _wifi_sta.connect(ssid, password)
        for _ in range(30):
            if _wifi_sta.isconnected():
                break
            time.sleep_ms(500)
`;
  return `_blynk_wifi_connect(${generator.quote_(ssid)}, ${generator.quote_(password)})
blynk = BlynkLib.Blynk(${generator.quote_(auth)})
`;
};

forBlock["esp32_blynk_run"] = function (block, generator) {
  return `blynk.run()\n`;
};

forBlock["esp32_blynk_virtual_write"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  return `blynk.virtual_write(${pin}, ${value})\n`;
};

forBlock["esp32_blynk_virtual_read"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  return [`blynk.virtual_read(${pin})`, Order.FUNCTION_CALL];
};

forBlock["esp32_blynk_connected"] = function (block, generator) {
  return [`blynk.connected()`, Order.FUNCTION_CALL];
};

forBlock["esp32_blynk_notify"] = function (block, generator) {
  const message = generator.valueToCode(block, "MESSAGE", Order.NONE) || "''";
  return `blynk.notify(str(${message}))\n`;
};

forBlock["esp32_blynk_email"] = function (block, generator) {
  const email = block.getFieldValue("EMAIL");
  const subject = block.getFieldValue("SUBJECT");
  const body = generator.valueToCode(block, "BODY", Order.NONE) || "''";
  return `blynk.email(${generator.quote_(email)}, ${generator.quote_(subject)}, str(${body}))\n`;
};

forBlock["esp32_blynk_lcd_print"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  const row = block.getFieldValue("ROW");
  const col = block.getFieldValue("COL");
  const text = generator.valueToCode(block, "TEXT", Order.NONE) || "''";
  return `# Blynk LCD not directly supported in MicroPython (V${pin} row=${row} col=${col})\n`;
};

forBlock["esp32_blynk_lcd_clear"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  return `# Blynk LCD not directly supported in MicroPython (V${pin})\n`;
};

forBlock["esp32_blynk_set_property"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  const property = block.getFieldValue("PROPERTY");
  const value = generator.valueToCode(block, "VALUE", Order.NONE) || "''";
  return `blynk.set_property(${pin}, ${generator.quote_(property)}, str(${value}))\n`;
};

forBlock["esp32_blynk_sync_virtual"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  return `blynk.sync_virtual(${pin})\n`;
};

forBlock["esp32_blynk_timer_setup"] = function (block, generator) {
  const interval = block.getFieldValue("INTERVAL");
  const func = block.getFieldValue("FUNCTION");
  generator.definitions_["import_machine"] = "import machine";
  generator.definitions_["def_blynk_timer"] = `
_blynk_timer = machine.Timer(-1)
`;
  return `_blynk_timer.init(period=${interval}, mode=machine.Timer.PERIODIC, callback=lambda t: ${func}())\n`;
};

forBlock["esp32_blynk_timer_run"] = function (block, generator) {
  return `# Timer runs automatically via hardware interrupt\n`;
};

// ── ThingSpeak blocks ───────────────────────────────────────────────────────

forBlock["esp32_thingspeak_setup"] = function (block, generator) {
  const apiKey = block.getFieldValue("API_KEY");
  const channel = block.getFieldValue("CHANNEL");
  generator.definitions_["import_network"] = "import network";
  generator.definitions_["def_thingspeak_vars"] = `
_ts_fields = {}
`;
  return `_ts_api_key = ${generator.quote_(apiKey)}
_ts_channel = ${channel}
`;
};

forBlock["esp32_thingspeak_set_field"] = function (block, generator) {
  const field = block.getFieldValue("FIELD");
  const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  return `_ts_fields[${field}] = str(${value})\n`;
};

forBlock["esp32_thingspeak_write"] = function (block, generator) {
  generator.definitions_["import_socket"] = "import socket";
  generator.definitions_["def_thingspeak_write"] = `
def _thingspeak_write(api_key, fields):
    try:
        params = '&'.join('field' + str(k) + '=' + v for k, v in fields.items())
        url = 'api.thingspeak.com'
        path = '/update?api_key=' + api_key + '&' + params
        s = socket.socket()
        s.settimeout(10)
        s.connect((url, 80))
        req = 'GET ' + path + ' HTTP/1.1\\r\\nHost: ' + url + '\\r\\nConnection: close\\r\\n\\r\\n'
        s.send(req.encode())
        buf = b''
        while True:
            try:
                chunk = s.recv(512)
                if not chunk:
                    break
                buf += chunk
            except:
                break
        s.close()
        return buf.decode('utf-8', 'ignore')
    except Exception as e:
        return str(e)
`;
  return `_thingspeak_write(_ts_api_key, _ts_fields)
_ts_fields = {}
`;
};

forBlock["esp32_thingspeak_read"] = function (block, generator) {
  const field = block.getFieldValue("FIELD");
  const channel = block.getFieldValue("CHANNEL");
  generator.definitions_["import_socket"] = "import socket";
  generator.definitions_["def_thingspeak_read"] = `
def _thingspeak_read(channel, field):
    try:
        url = 'api.thingspeak.com'
        path = '/channels/' + str(channel) + '/fields/' + str(field) + '/last.txt'
        s = socket.socket()
        s.settimeout(10)
        s.connect((url, 80))
        req = 'GET ' + path + ' HTTP/1.1\\r\\nHost: ' + url + '\\r\\nConnection: close\\r\\n\\r\\n'
        s.send(req.encode())
        buf = b''
        while True:
            try:
                chunk = s.recv(512)
                if not chunk:
                    break
                buf += chunk
            except:
                break
        s.close()
        resp = buf.decode('utf-8', 'ignore')
        if '\\r\\n\\r\\n' in resp:
            body = resp.split('\\r\\n\\r\\n', 1)[1]
        else:
            body = resp
        return body.strip()
    except Exception as e:
        return str(e)
`;
  return [`_thingspeak_read(${channel}, ${field})`, Order.FUNCTION_CALL];
};
