'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Code2, Terminal, ChevronDown, ChevronUp, Trash2, Copy, Check } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Default starter code                                               */
/* ------------------------------------------------------------------ */

const DEFAULT_ARDUINO_CODE = `// STEMVerse Circuit Simulator
// Write your Arduino code here and press ▶ Run

void setup() {
  pinMode(2, OUTPUT);    // LED on GPIO 2
  Serial.begin(115200);
  Serial.println("Setup complete!");
}

void loop() {
  digitalWrite(2, HIGH);   // Turn LED ON
  Serial.println("LED ON");
  delay(1000);             // Wait 1 second

  digitalWrite(2, LOW);    // Turn LED OFF
  Serial.println("LED OFF");
  delay(1000);             // Wait 1 second
}
`;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SimulatorCodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  serialOutput: string[];
  onClearSerial: () => void;
  isSimulating: boolean;
}

/* ------------------------------------------------------------------ */
/*  Line numbers component                                             */
/* ------------------------------------------------------------------ */

function LineNumbers({ count }: { count: number }) {
  return (
    <div className="select-none pr-3 text-right text-[11px] leading-[20px] text-[#6e7681] font-mono" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i + 1}>{i + 1}</div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SimulatorCodeEditor({
  code,
  onCodeChange,
  serialOutput,
  onClearSerial,
  isSimulating,
}: SimulatorCodeEditorProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'serial'>('code');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const serialEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll serial output
  useEffect(() => {
    if (activeTab === 'serial' && serialEndRef.current) {
      serialEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serialOutput, activeTab]);

  // Handle tab key in editor
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newVal = code.substring(0, start) + '  ' + code.substring(end);
      onCodeChange(newVal);
      // Restore cursor position
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, [code, onCodeChange]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const lineCount = code.split('\n').length;

  if (isCollapsed) {
    return (
      <div className="border-t border-border/40 bg-[#0d1117]">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex w-full items-center gap-2 px-4 py-2 text-xs text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          <Code2 className="h-3.5 w-3.5" />
          <span className="font-medium">Code Editor</span>
          {isSimulating && (
            <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 animate-pulse">
              ▶ Running
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t border-border/40 bg-[#0d1117]" style={{ height: 260 }}>
      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#21262d] px-1">
        <div className="flex items-center">
          {/* Code tab */}
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'code'
                ? 'text-[#c9d1d9] border-[#58a6ff]'
                : 'text-[#8b949e] border-transparent hover:text-[#c9d1d9]'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Code
          </button>

          {/* Serial Monitor tab */}
          <button
            type="button"
            onClick={() => setActiveTab('serial')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'serial'
                ? 'text-[#c9d1d9] border-[#58a6ff]'
                : 'text-[#8b949e] border-transparent hover:text-[#c9d1d9]'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Serial Monitor
            {serialOutput.length > 0 && (
              <span className="ml-1 rounded-full bg-[#58a6ff]/20 px-1.5 text-[10px] text-[#58a6ff]">
                {serialOutput.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1">
          {activeTab === 'code' && (
            <button
              type="button"
              onClick={handleCopy}
              title="Copy code"
              className="p-1.5 rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
          {activeTab === 'serial' && (
            <button
              type="button"
              onClick={onClearSerial}
              title="Clear serial output"
              className="p-1.5 rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            title="Collapse panel"
            className="p-1.5 rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'code' ? (
          /* ── Code editor ────────────────────────────────────────── */
          <div className="flex h-full overflow-auto bg-[#0d1117]">
            <LineNumbers count={lineCount} />
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 resize-none bg-transparent text-[#c9d1d9] font-mono text-[12px] leading-[20px] outline-none p-0 pr-4 caret-[#58a6ff] placeholder:text-[#484f58]"
              placeholder="Write your Arduino code here..."
              style={{ tabSize: 2 }}
            />
          </div>
        ) : (
          /* ── Serial Monitor ─────────────────────────────────────── */
          <div className="h-full overflow-auto bg-[#010409] p-3 font-mono text-[11px] leading-[18px]">
            {serialOutput.length === 0 ? (
              <div className="text-[#484f58] italic">
                Serial output will appear here when simulation runs...
              </div>
            ) : (
              serialOutput.map((line, i) => (
                <div key={i} className="text-[#7ee787]">
                  <span className="text-[#484f58] mr-2 select-none">{String(i + 1).padStart(3, ' ')}|</span>
                  {line}
                </div>
              ))
            )}
            <div ref={serialEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

export { DEFAULT_ARDUINO_CODE };
