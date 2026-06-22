// python generator for esp32 http client blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_http_get"] = function (block, generator) {
  const url = block.getFieldValue("URL");
  generator.definitions_["import_socket"] = "import socket";
  generator.definitions_["import_ure"] = "import ure";
  generator.definitions_["def_http_get"] = `
import socket
import ure

_last_http_status = 0

def http_get(url):
    global _last_http_status
    try:
        m = ure.match(r"http://([^/]+)(.*)", url)
        if not m:
            return ""
        host = m.group(1)
        path = m.group(2) or "/"
        if ":" in host:
            host, port_str = host.split(":", 1)
            port = int(port_str)
        else:
            port = 80
        s = socket.socket()
        s.settimeout(10)
        s.connect((host, port))
        req = f"GET {path} HTTP/1.1\\r\\nHost: {host}\\r\\nConnection: close\\r\\n\\r\\n"
        s.send(req.encode())
        buf = b""
        while True:
            try:
                chunk = s.recv(1024)
                if not chunk:
                    break
                buf += chunk
            except:
                break
        s.close()
        resp = buf.decode("utf-8", "ignore")
        if "\\r\\n\\r\\n" in resp:
            header, body = resp.split("\\r\\n\\r\\n", 1)
        else:
            header, body = resp, ""
        status_match = ure.search(r"HTTP/\\d\\.\\d (\\d+)", header)
        _last_http_status = int(status_match.group(1)) if status_match else 0
        return body
    except Exception as e:
        _last_http_status = -1
        return str(e)
`;
  return [`http_get(${generator.quote_(url)})`, Order.FUNCTION_CALL];
};

forBlock["esp32_http_post"] = function (block, generator) {
  const url = block.getFieldValue("URL");
  const data = generator.valueToCode(block, "DATA", Order.NONE) || '""';
  generator.definitions_["import_socket"] = "import socket";
  generator.definitions_["import_ure"] = "import ure";
  generator.definitions_["def_http_post"] = `
import socket
import ure

_last_http_status = 0

def http_post(url, data):
    global _last_http_status
    try:
        m = ure.match(r"http://([^/]+)(.*)", url)
        if not m:
            return ""
        host = m.group(1)
        path = m.group(2) or "/"
        if ":" in host:
            host, port_str = host.split(":", 1)
            port = int(port_str)
        else:
            port = 80
        s = socket.socket()
        s.settimeout(10)
        s.connect((host, port))
        body = str(data)
        req = f"POST {path} HTTP/1.1\\r\\nHost: {host}\\r\\nContent-Type: application/x-www-form-urlencoded\\r\\nContent-Length: {len(body)}\\r\\nConnection: close\\r\\n\\r\\n{body}"
        s.send(req.encode())
        buf = b""
        while True:
            try:
                chunk = s.recv(1024)
                if not chunk:
                    break
                buf += chunk
            except:
                break
        s.close()
        resp = buf.decode("utf-8", "ignore")
        if "\\r\\n\\r\\n" in resp:
            header, body = resp.split("\\r\\n\\r\\n", 1)
        else:
            header, body = resp, ""
        status_match = ure.search(r"HTTP/\\d\\.\\d (\\d+)", header)
        _last_http_status = int(status_match.group(1)) if status_match else 0
        return body
    except Exception as e:
        _last_http_status = -1
        return str(e)
`;
  return [`http_post(${generator.quote_(url)}, str(${data}))`, Order.FUNCTION_CALL];
};

forBlock["esp32_http_status"] = function (block, generator) {
  return [`_last_http_status`, Order.ATOMIC];
};

forBlock["esp32_http_put"] = function (block, generator) {
  const url = block.getFieldValue("URL");
  const data = generator.valueToCode(block, "DATA", Order.NONE) || '""';
  generator.definitions_["import_socket"] = "import socket";
  generator.definitions_["import_ure"] = "import ure";
  generator.definitions_["def_http_put"] = `
import socket
import ure

_last_http_status = 0

def http_put(url, data):
    global _last_http_status
    try:
        m = ure.match(r"http://([^/]+)(.*)", url)
        if not m:
            return ""
        host = m.group(1)
        path = m.group(2) or "/"
        if ":" in host:
            host, port_str = host.split(":", 1)
            port = int(port_str)
        else:
            port = 80
        s = socket.socket()
        s.settimeout(10)
        s.connect((host, port))
        body = str(data)
        req = f"PUT {path} HTTP/1.1\\r\\nHost: {host}\\r\\nContent-Type: application/x-www-form-urlencoded\\r\\nContent-Length: {len(body)}\\r\\nConnection: close\\r\\n\\r\\n{body}"
        s.send(req.encode())
        buf = b""
        while True:
            try:
                chunk = s.recv(1024)
                if not chunk:
                    break
                buf += chunk
            except:
                break
        s.close()
        resp = buf.decode("utf-8", "ignore")
        if "\\r\\n\\r\\n" in resp:
            header, body = resp.split("\\r\\n\\r\\n", 1)
        else:
            header, body = resp, ""
        status_match = ure.search(r"HTTP/\\d\\.\\d (\\d+)", header)
        _last_http_status = int(status_match.group(1)) if status_match else 0
        return body
    except Exception as e:
        _last_http_status = -1
        return str(e)
`;
  return [`http_put(${generator.quote_(url)}, str(${data}))`, Order.FUNCTION_CALL];
};

forBlock["esp32_http_delete"] = function (block, generator) {
  const url = block.getFieldValue("URL");
  generator.definitions_["import_socket"] = "import socket";
  generator.definitions_["import_ure"] = "import ure";
  generator.definitions_["def_http_delete"] = `
import socket
import ure

_last_http_status = 0

def http_delete(url):
    global _last_http_status
    try:
        m = ure.match(r"http://([^/]+)(.*)", url)
        if not m:
            return ""
        host = m.group(1)
        path = m.group(2) or "/"
        if ":" in host:
            host, port_str = host.split(":", 1)
            port = int(port_str)
        else:
            port = 80
        s = socket.socket()
        s.settimeout(10)
        s.connect((host, port))
        req = f"DELETE {path} HTTP/1.1\\r\\nHost: {host}\\r\\nConnection: close\\r\\n\\r\\n"
        s.send(req.encode())
        buf = b""
        while True:
            try:
                chunk = s.recv(1024)
                if not chunk:
                    break
                buf += chunk
            except:
                break
        s.close()
        resp = buf.decode("utf-8", "ignore")
        if "\\r\\n\\r\\n" in resp:
            header, body = resp.split("\\r\\n\\r\\n", 1)
        else:
            header, body = resp, ""
        status_match = ure.search(r"HTTP/\\d\\.\\d (\\d+)", header)
        _last_http_status = int(status_match.group(1)) if status_match else 0
        return body
    except Exception as e:
        _last_http_status = -1
        return str(e)
`;
  return [`http_delete(${generator.quote_(url)})`, Order.FUNCTION_CALL];
};
