import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/projects/[projectId]/versions
 * Dev-mode — returns an empty version history array.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  await params;
  return NextResponse.json([]);
}
