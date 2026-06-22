// esp32 http client blocks — get, post, put, delete
import * as Blockly from "blockly/core";

const httpGet = {
  type: "esp32_http_get",
  message0: "HTTP GET url %1",
  args0: [
    { type: "field_input", name: "URL", text: "http://api.example.com/data" }
  ],
  output: "String",
  colour: 300,
  tooltip: "Perform an HTTP GET request and return the response body as a string"
};

const httpPost = {
  type: "esp32_http_post",
  message0: "HTTP POST url %1 data %2",
  args0: [
    { type: "field_input", name: "URL", text: "http://api.example.com/data" },
    { type: "input_value", name: "DATA" }
  ],
  output: "String",
  colour: 300,
  tooltip: "Perform an HTTP POST request with data and return the response body"
};

const httpStatus = {
  type: "esp32_http_status",
  message0: "last HTTP status code",
  output: "Number",
  colour: 300,
  tooltip: "Returns the HTTP status code from the most recent request (200, 404, etc.)"
};

const httpPut = {
  type: "esp32_http_put",
  message0: "HTTP PUT url %1 data %2",
  args0: [
    { type: "field_input", name: "URL", text: "http://api.example.com/data" },
    { type: "input_value", name: "DATA" }
  ],
  output: "String",
  colour: 300,
  tooltip: "Perform an HTTP PUT request with data and return the response body"
};

const httpDelete = {
  type: "esp32_http_delete",
  message0: "HTTP DELETE url %1",
  args0: [
    { type: "field_input", name: "URL", text: "http://api.example.com/data/1" }
  ],
  output: "String",
  colour: 300,
  tooltip: "Perform an HTTP DELETE request and return the response body"
};

export const httpBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  httpGet, httpPost, httpStatus, httpPut, httpDelete
]);
