import { NextResponse } from 'next/server';

/**
 * GET /api/components
 * Dev-mode component registry — returns an empty registry so the
 * workspace uses its built-in defaults from blockly-engine.
 * 
 * The actual component definitions are baked into the blockly-engine package.
 * This endpoint only needs to return the proper shape to avoid 404s.
 */
export async function GET() {
  return NextResponse.json({
    boards: [],
    sensors: [],
    actuators: [],
    source: 'dev-mock',
  });
}
