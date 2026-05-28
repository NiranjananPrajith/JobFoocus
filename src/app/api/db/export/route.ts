import { createClient } from '@/lib/supabase-utils/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [appsResult, docsResult, mrResult, settingsResult] = await Promise.all([
    supabase.from('applications').select('category, folder, data').eq('user_id', user.id),
    supabase.from('documents').select('category, folder, doc_type, html').eq('user_id', user.id),
    supabase.from('master_resumes').select('data').eq('user_id', user.id).single(),
    supabase.from('settings').select('cloud_provider, sync_enabled, openai_key').eq('user_id', user.id).single(),
  ])

  const data: Record<string, unknown> = {}
  const apps: Record<string, unknown> = {}
  for (const row of appsResult.data ?? []) {
    apps[`${row.category}/${row.folder}`] = row.data
  }
  data['applications'] = apps

  for (const row of docsResult.data ?? []) {
    data[`doc_${row.category}/${row.folder}/${row.doc_type}`] = row.html
  }

  if (mrResult.data) data['masterResume'] = mrResult.data.data
  if (settingsResult.data) {
    data['settings'] = {
      cloudProvider: settingsResult.data.cloud_provider,
      syncEnabled: settingsResult.data.sync_enabled,
      openAiKey: settingsResult.data.openai_key ?? '',
    }
  }

  return NextResponse.json(data)
}
