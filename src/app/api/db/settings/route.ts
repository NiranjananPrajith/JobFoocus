import { createClient } from '@/lib/supabase-utils/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('settings').select('cloud_provider, sync_enabled, openai_key').eq('user_id', user.id).single()

  if (error?.code === 'PGRST116') return NextResponse.json({ cloudProvider: 'none', syncEnabled: false, openAiKey: '' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    cloudProvider: data!.cloud_provider,
    syncEnabled: data!.sync_enabled,
    openAiKey: data!.openai_key ?? '',
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { cloudProvider, syncEnabled, openAiKey } = body

  const { error } = await supabase.from('settings').upsert({
    user_id: user.id,
    cloud_provider: cloudProvider,
    sync_enabled: syncEnabled,
    openai_key: openAiKey ?? '',
  }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
