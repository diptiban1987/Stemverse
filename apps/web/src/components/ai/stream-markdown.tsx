'use client';

import { memo, useMemo } from 'react';

/** Lightweight streaming markdown (headings, bold, code) — no external deps. */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-background px-1 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const StreamMarkdown = memo(function StreamMarkdown({ text }: { text: string }) {
  const blocks = useMemo(() => text.split('\n'), [text]);

  return (
    <div className="prose-sm space-y-1 whitespace-pre-wrap text-sm">
      {blocks.map((line, i) => {
        if (line.startsWith('### ')) {
          return (
            <h4 key={i} className="font-semibold">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={i} className="font-semibold">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h2 key={i} className="font-semibold">
              {line.slice(2)}
            </h2>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <li key={i} className="ml-4 list-disc">
              {renderInline(line.slice(2))}
            </li>
          );
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
});
