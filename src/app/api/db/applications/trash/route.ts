import { createClient, createServiceClient } from '@/lib/supabase-utils/server'
import { NextResponse } from 'next/server'

// GET /api/db/applications/trash — list trashed applications
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('applications')
    .select('category, folder, data, deleted_at')
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/db/applications/trash — move application to trash (soft delete)
// Uses service role client to bypass RLS for UPDATE operations
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category, folder } = await request.json()
  if (!category || !folder) {
    return NextResponse.json({ error: 'Missing category or folder' }, { status: 400 })
  }

  // Use service client to bypass RLS for the UPDATE (RLS blocks UPDATE when setting deleted_at)
  const svc = await createServiceClient()
  const { error } = await svc
    .from('applications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('category', category).eq('folder', folder).is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
