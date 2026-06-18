import { createClient } from '@/lib/supabase-utils/server'
import { createServiceClient } from '@/lib/supabase-utils/service'
import { getStripe } from '@/lib/stripe'
import { getRazorpay } from '@/lib/razorpay'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Cancel any active subscription (Stripe or Razorpay) so the
  //    webhook doesn't fire for a deleted user. We check which
  //    provider the user is on from the subscriptions row. If the
  //    user has no subscription, this is a no-op.
  try {
    const serviceClient = createServiceClient()
    const { data: subRow } = await serviceClient
      .from('subscriptions')
      .select('stripe_subscription_id, razorpay_subscription_id, status')
      .eq('user_id', user.id)
      .single()

    if (subRow?.status === 'active' || subRow?.status === 'trialing') {
      if (subRow.razorpay_subscription_id) {
        const razorpay = getRazorpay()
        await razorpay.subscriptions.cancel(subRow.razorpay_subscription_id)
      } else if (subRow.stripe_subscription_id) {
        const stripe = getStripe()
        await stripe.subscriptions.cancel(subRow.stripe_subscription_id)
      }
    }
  } catch (err) {
    // Log but don't block deletion — the user wants out. If the
    // subscription cancel fails, the webhook may fire later for a
    // deleted user, but that's harmless (the DB row is already gone
    // via cascade).
    console.error('[account-delete] subscription cancel failed (proceeding):', err)
  }

  // 2. Delete the Supabase auth user. All tables have
  //    ON DELETE CASCADE on user_id, so this wipes applications,
  //    documents, master_resumes, settings, categories,
  //    subscriptions, and usage_counters in one shot.
  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[account-delete] deleteUser failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
