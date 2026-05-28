import { createClient } from '@/lib/supabase-utils/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data: incoming, strategy } = body

  if (!incoming || typeof incoming !== 'object') {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  if (strategy === 'overwrite') {
    await Promise.all([
      supabase.from('applications').delete().eq('user_id', user.id),
      supabase.from('documents').delete().eq('user_id', user.id),
      supabase.from('master_resumes').delete().eq('user_id', user.id),
      supabase.from('settings').delete().eq('user_id', user.id),
    ])
  }

  const applications = incoming['applications'] as Record<string, unknown> | undefined
  if (applications) {
    for (const [key, value] of Object.entries(applications)) {
      const slashIdx = key.indexOf('/')
      if (slashIdx === -1) continue
      const category = key.slice(0, slashIdx)
      const folder = key.slice(slashIdx + 1)
      try {
        await supabase.from('applications').upsert(
          { user_id: user.id, category, folder, data: value },
          { onConflict: 'user_id,category,folder' }
        )
      } catch (e) { console.warn('[import] failed to upsert application:', key, e) }
    }
  }

  for (const [key, html] of Object.entries(incoming)) {
    if (!key.startsWith('doc_') || typeof html !== 'string') continue
    const remainder = key.slice(4)
    const lastSlash = remainder.lastIndexOf('/')
    if (lastSlash === -1) continue
    const docType = remainder.slice(lastSlash + 1)
    const path = remainder.slice(0, lastSlash)
    const slashIdx = path.indexOf('/')
    if (slashIdx === -1) continue
    const category = path.slice(0, slashIdx)
    const folder = path.slice(slashIdx + 1)
    try {
      await supabase.from('documents').upsert(
        { user_id: user.id, category, folder, doc_type: docType, html },
        { onConflict: 'user_id,category,folder,doc_type' }
      )
    } catch (e) { console.warn('[import] failed to upsert document:', key, e) }
  }

  const masterResume = incoming['masterResume']
  if (masterResume) {
    try {
      await supabase.from('master_resumes').upsert({ user_id: user.id, data: masterResume }, { onConflict: 'user_id' })
    } catch (e) { console.warn('[import] failed to upsert master resume:', e) }
  }

  const settings = incoming['settings'] as { cloudProvider: string; syncEnabled: boolean; openAiKey: string } | undefined
  if (settings) {
    try {
      await supabase.from('settings').upsert({
        user_id: user.id,
        cloud_provider: settings.cloudProvider,
        sync_enabled: settings.syncEnabled,
        openai_key: settings.openAiKey ?? '',
      }, { onConflict: 'user_id' })
    } catch (e) { console.warn('[import] failed to upsert settings:', e) }
  }

  return NextResponse.json({ success: true, itemsImported: Object.keys(incoming).length })
}
