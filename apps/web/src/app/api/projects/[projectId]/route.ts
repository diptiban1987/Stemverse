import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/projects/[projectId]
 * Dev-mode — returns a mock project detail for any project ID.
 *
 * PUT /api/projects/[projectId]
 * Dev-mode — echoes back updates.
 *
 * DELETE /api/projects/[projectId]
 * Dev-mode — acknowledges deletion.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  return NextResponse.json({
    id: projectId,
    name: 'Robotics Project',
    description: 'A dev-mode robotics project',
    type: 'ROBOTICS',
    visibility: 'PRIVATE',
    boardType: 'ESP32',
    thumbnailUrl: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    workspaceJson: {},
    workspaces: [],
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  let body = {};
  try { body = await req.json(); } catch { /* empty */ }

  return NextResponse.json({
    id: projectId,
    name: 'Robotics Project',
    type: 'ROBOTICS',
    visibility: 'PRIVATE',
    boardType: 'ESP32',
    thumbnailUrl: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    workspaceJson: {},
    workspaces: [],
    ...body,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  await params;
  return NextResponse.json({ success: true });
}
