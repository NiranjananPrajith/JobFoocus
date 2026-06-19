import { createClient } from '@/lib/supabase-utils/server';
import { createServiceClient } from '@/lib/supabase-utils/service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Auth gate — must be logged in to submit.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body.
  let body: {
    name?: string;
    email?: string;
    referrer_name?: string;
    referral_code?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, email, referrer_name, referral_code } = body;

  // Validate all four fields are non-empty strings.
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof email !== 'string' || !email.trim() ||
    typeof referrer_name !== 'string' || !referrer_name.trim() ||
    typeof referral_code !== 'string' || !referral_code.trim()
  ) {
    return NextResponse.json(
      { error: 'All fields are required.' },
      { status: 400 }
    );
  }

  // Insert via service-role client (bypasses RLS).
  const admin = createServiceClient();
  const { error } = await admin
    .from('insider_requests')
    .insert({
      user_id: user.id,
      name: name.trim(),
      email: email.trim(),
      referrer_name: referrer_name.trim(),
      referral_code: referral_code.trim(),
    });

  if (error) {
    console.error('[insider-request] insert failed:', error);
    return NextResponse.json(
      { error: 'Failed to submit request. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
