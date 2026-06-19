import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 * Dev-mode login handler — returns a mock JWT and user profile
 * when no external backend is available.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email || 'dev@stemverse.io';
    const displayName = email.split('@')[0] || 'Dev User';

    return NextResponse.json({
      accessToken: `dev-mock-token-${Date.now()}`,
      refreshToken: `dev-mock-refresh-${Date.now()}`,
      user: {
        id: `dev-${email.replace(/[^a-z0-9]/gi, '_')}`,
        email,
        role: 'STUDENT',
        displayName,
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Invalid request body' },
      { status: 400 },
    );
  }
}
