/**
 * GET /api/compile/ports — auto-detect connected boards via arduino-cli
 */
import { NextResponse } from 'next/server';
import { findCli, listPorts } from '../helpers';

export async function GET() {
  try {
    const cli = findCli();
    if (!cli) {
      return NextResponse.json(
        { success: false, ports: [], error: 'arduino-cli not found. Install it at C:\\arduino-cli' },
        { status: 200 },
      );
    }

    const ports = listPorts(cli);
    return NextResponse.json({ success: true, ports });
  } catch (err) {
    return NextResponse.json(
      { success: true, ports: [], error: (err as Error).message },
      { status: 200 },
    );
  }
}
