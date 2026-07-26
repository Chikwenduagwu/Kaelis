import { NextRequest, NextResponse } from 'next/server';
import { getPassportScore } from '../../../../lib/passport';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  try {
    const result = await getPassportScore(address);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Passport lookup errored.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
