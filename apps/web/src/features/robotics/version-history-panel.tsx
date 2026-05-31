'use client';

import { useEffect, useState } from 'react';
import { Button } from '@stemverse/ui';
import { versionApi, type ProjectVersionSummary } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export interface VersionHistoryPanelProps {
  projectId?: string;
  workspaceJson?: unknown;
  generatedCode?: string;
  onRestore: (workspaceJson: unknown) => void;
}

export function VersionHistoryPanel({
  projectId,
  workspaceJson,
  generatedCode,
  onRestore,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<ProjectVersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const getValidAccessToken = useAuthStore((s) => s.getValidAccessToken);

  const load = async () => {
    if (!projectId) return;
    const token = await getValidAccessToken();
    if (!token) return;
    const list = await versionApi.list(token, projectId);
    setVersions(list);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const saveVersion = async () => {
    if (!projectId || !workspaceJson) return;
    setLoading(true);
    try {
      const token = await getValidAccessToken();
      if (!token) return;
      await versionApi.create(token, projectId, {
        workspaceJson,
        generatedCode,
      });
      await load();
    } finally {
      setLoading(false);
    }
  };

  const restore = async (versionId: string) => {
    if (!projectId) return;
    const token = await getValidAccessToken();
    if (!token) return;
    const res = await versionApi.restore(token, projectId, versionId);
    onRestore(res.project.workspaceJson);
  };

  if (!projectId) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted">
        Save project to enable version history
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Version History</h3>
        <Button type="button" size="sm" disabled={loading} onClick={saveVersion}>
          Snapshot
        </Button>
      </div>
      <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs">
        {versions.map((v) => (
          <li key={v.id} className="flex items-center justify-between rounded bg-background px-2 py-1">
            <span>
              v{v.versionNumber} {v.label ? `— ${v.label}` : ''}
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={() => restore(v.id)}>
              Restore
            </Button>
          </li>
        ))}
        {versions.length === 0 && <li className="text-muted">No versions yet</li>}
      </ul>
    </div>
  );
}
