/**
 * POST /api/compiler — Cloud compile stub
 *
 * The cloud compiler service isn't available in local development.
 * This route returns a helpful message instead of timing out with a 504.
 * In production, this is handled by the backend API server.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message:
        'Cloud compiler is not available in local development. Use the "Upload to Board" button to compile and upload directly via arduino-cli.',
    },
    { status: 503 },
  );
}

export async function GET() {
  return NextResponse.json(
    { status: 'Cloud compiler not available in local development' },
    { status: 503 },
  );
}
