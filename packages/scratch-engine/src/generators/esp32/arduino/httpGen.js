// Arduino C++ generator for ESP32 HTTP client blocks
import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

// Helper definitions injected into the top of the sketch
const HTTP_HELPER_DEF = `
#include <WiFi.h>
#include <HTTPClient.h>

String _httpResponse = "";

String httpGet(const char* url) {
  HTTPClient http;
  http.begin(url);
  int httpCode = http.GET();
  String result = (httpCode > 0) ? http.getString() : "";
  _httpResponse = result;
  http.end();
  return result;
}

String httpPost(const char* url, const char* data) {
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  int httpCode = http.POST(data);
  String result = (httpCode > 0) ? http.getString() : "";
  _httpResponse = result;
  http.end();
  return result;
}

String httpPut(const char* url, const char* data) {
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  int httpCode = http.PUT(data);
  String result = (httpCode > 0) ? http.getString() : "";
  _httpResponse = result;
  http.end();
  return result;
}

String httpDelete(const char* url) {
  HTTPClient http;
  http.begin(url);
  int httpCode = http.sendRequest("DELETE", "");
  String result = (httpCode > 0) ? http.getString() : "";
  _httpResponse = result;
  http.end();
  return result;
}
`;

forBlock['esp32_http_get'] = function (block, generator) {
  const url = block.getFieldValue('URL');
  generator.definitions_['http_helpers'] = HTTP_HELPER_DEF;
  return [`httpGet("${url}")`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_http_post'] = function (block, generator) {
  const url = block.getFieldValue('URL');
  const data = generator.valueToCode(block, 'DATA', ArduinoOrder.NONE) || '""';
  generator.definitions_['http_helpers'] = HTTP_HELPER_DEF;
  return [`httpPost("${url}", String(${data}).c_str())`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_http_put'] = function (block, generator) {
  const url = block.getFieldValue('URL');
  const data = generator.valueToCode(block, 'DATA', ArduinoOrder.NONE) || '""';
  generator.definitions_['http_helpers'] = HTTP_HELPER_DEF;
  return [`httpPut("${url}", String(${data}).c_str())`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_http_delete'] = function (block, generator) {
  const url = block.getFieldValue('URL');
  generator.definitions_['http_helpers'] = HTTP_HELPER_DEF;
  return [`httpDelete("${url}")`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_http_status'] = function (block, generator) {
  return ['_httpResponse.length() > 0 ? 200 : -1', ArduinoOrder.CONDITIONAL];
};
