import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Dev-mode logout handler — simply acknowledges the logout.
 */
export async function POST() {
  return NextResponse.json({ message: 'Logged out' });
}
