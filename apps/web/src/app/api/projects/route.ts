import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/projects?type=ROBOTICS
 * Dev-mode project listing — returns mock robotics projects.
 *
 * POST /api/projects
 * Dev-mode project creation — returns a new mock project with a generated ID.
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'ROBOTICS';

  return NextResponse.json([
    {
      id: 'd2e0b277-5f73-42bf-b960-5c3422d207a8',
      name: 'LED Blink Demo',
      type,
      board: 'ESP32',
      updatedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 604800000).toISOString(),
    },
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Smart Home Project',
      type,
      board: 'Arduino Uno',
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 1209600000).toISOString(),
    },
    {
      id: 'f9e8d7c6-b5a4-3210-fedc-ba9876543210',
      name: 'Distance Alarm',
      type,
      board: 'ESP32',
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
      createdAt: new Date(Date.now() - 2419200000).toISOString(),
    },
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = crypto.randomUUID();

    return NextResponse.json({
      id,
      name: body.name || 'Untitled Project',
      type: body.type || 'ROBOTICS',
      board: body.board || 'ESP32',
      blocklyXml: '',
      generatedCode: '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
}
