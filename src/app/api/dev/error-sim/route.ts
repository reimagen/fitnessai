import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not Found', { status: 404 });
  }

  const type = req.nextUrl.searchParams.get('type');

  switch (type) {
    case 'quota':
      throw new Error('Quota exceeded (simulated)');
    case 'overload':
      throw new Error('Service overloaded (simulated)');
    case 'validation':
      throw new Error('Validation failed (simulated)');
    case 'auth':
      throw new Error('Authentication failed (simulated)');
    default:
      throw new Error('Simulated error');
  }
}
