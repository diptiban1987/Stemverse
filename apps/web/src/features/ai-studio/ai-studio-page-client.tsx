'use client';

import dynamic from 'next/dynamic';

const AiStudioWorkspace = dynamic(
  () => import('./ai-studio-workspace').then((m) => m.AiStudioWorkspace),
  {
    loading: () => (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-sm text-muted">
        Loading AI Studio…
      </div>
    ),
  },
);

export function AiStudioPageClient() {
  return (
    <div>
      <div className="border-b border-border px-8 py-4">
        <h1 className="font-display text-2xl font-bold">AI Studio</h1>
        <p className="text-sm text-muted">
          Prompt history, saved sessions, and AI-generated Blockly workspaces
        </p>
      </div>
      <AiStudioWorkspace />
    </div>
  );
}
