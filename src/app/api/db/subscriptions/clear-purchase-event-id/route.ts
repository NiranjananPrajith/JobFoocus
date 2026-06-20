// POST /api/db/subscriptions/clear-purchase-event-id
//
// Clears meta_purchase_event_id for the current user after the client
// has fired the Pixel Purchase event. Prevents re-firing on next page load.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({ meta_purchase_event_id: null })
    .eq('user_id', user.id);

  if (error) {
    console.error('[clear-purchase-event-id] failed:', error);
    return NextResponse.json({ error: 'Failed to clear' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
