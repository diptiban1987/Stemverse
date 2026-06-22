// esp32 upload panel — status badge, upload button, and output log
import { uploadToESP32 } from "../upload/serialUpload";
import { refreshIcons } from "./icons";
import { connectSerialMonitor, toggleMonitor as smToggle } from "./SerialMonitor";

const STATUS_LABELS = {
  idle: { text: "Ready", cls: "status-idle" },
  waiting_port: { text: "Select Port…", cls: "status-waiting" },
  connecting: { text: "Connecting…", cls: "status-waiting" },
  interrupting: { text: "Interrupting…", cls: "status-waiting" },
  entering_repl: { text: "Entering REPL…", cls: "status-waiting" },
  uploading: { text: "Uploading…", cls: "status-uploading" },
  reading_output: { text: "Reading output…", cls: "status-uploading" },
  success: { text: "Done!", cls: "status-success" },
  error: { text: "Error", cls: "status-error" },
};

let _getCode = null;
let _getLanguage = null;
let _isUploading = false;

import { showToast } from "./ModeSwitcher";

/**
 * @param {Function} getCode     — returns current code string from editor
 * @param {Function} getLanguage — returns 'arduino' | 'micropython'
 */
export function initUploadPanel(getCode, getLanguage) {
  _getCode = getCode;
  _getLanguage = getLanguage || (() => 'micropython');

  const uploadBtn = document.getElementById("uploadBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", handleUpload);
  }

  const headerUploadBtn = document.getElementById("headerUploadBtn");
  if (headerUploadBtn) {
    headerUploadBtn.addEventListener("click", handleUpload);
  }
}

/**
 * Update the upload button label and behavior based on selected language.
 */
export function updateUploadButtonForLanguage(lang) {
  const uploadBtnLabel = document.getElementById("uploadBtnLabel");
  if (uploadBtnLabel) {
    uploadBtnLabel.textContent = lang === 'arduino' ? 'Download .ino' : 'Upload Code';
  }
}

async function handleUpload() {
  if (_isUploading) return;

  const code = _getCode();
  if (!code || code.trim() === "") {
    showToast("No code in workspace. Add some blocks first.");
    return;
  }

  const lang = _getLanguage ? _getLanguage() : 'micropython';

  if (lang === 'arduino') {
    // Arduino C++ cannot be compiled in the browser → download .ino
    _downloadFile(code, 'sketch.ino', 'text/x-arduino');
    showToast("Arduino sketch downloaded! Open in Arduino IDE to compile & upload.");
    return;
  }

  // ── MicroPython: upload via Web Serial Raw REPL ──
  _isUploading = true;
  setButtonState(true);

  try {
    const result = await uploadToESP32(code, (status) => {
      setStatus(status);
    });

    if (result.success) {
      setStatus("success");
      showToast("Upload Successful! Serial monitor reconnected.");

      // Serial monitor is auto-resumed by serialUpload.js after upload.
      // Just make sure the panel is visible.
      const smBody = document.getElementById('smBody');
      if (smBody && smBody.style.display === 'none') {
        smToggle();
      }
    } else {
      setStatus("error");
      showToast("ESP32 Error: " + result.output);
    }
  } catch (err) {
    setStatus("error");
    if (err.name === "NotFoundError") {
      showToast("No port selected. Upload cancelled.");
      setStatus("idle");
    } else {
      showToast("Error: " + err.message);
    }
  } finally {
    _isUploading = false;
    setButtonState(false);
  }
}

function _downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function setStatus(key) {
  const el = document.getElementById("uploadStatus");
  if (!el) return;
  const { text, cls } = STATUS_LABELS[key] || STATUS_LABELS.idle;
  el.textContent = text;
  el.style.display = key === 'idle' ? 'none' : 'inline';
}

function setButtonState(uploading) {
  const btn = document.getElementById("uploadBtn");
  if (btn) {
    btn.disabled = uploading;
    const label = btn.querySelector('#uploadBtnLabel');
    if (label) {
      label.textContent = uploading ? "Uploading…" : (_getLanguage?.() === 'arduino' ? 'Download .ino' : 'Upload Code');
    }
  }

  const headerBtn = document.getElementById("headerUploadBtn");
  if (headerBtn) {
    headerBtn.disabled = uploading;
    headerBtn.innerHTML = uploading
      ? `<i data-lucide="loader" class="spin-icon" style="width:14px;height:14px;"></i> Uploading…`
      : `<i data-lucide="upload" style="width:14px;height:14px;"></i> Upload`;
    refreshIcons();
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
