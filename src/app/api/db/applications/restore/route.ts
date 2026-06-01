import { createClient } from '@/lib/supabase-utils/server'
import { createServiceClient } from '@/lib/supabase-utils/service'
import { NextResponse } from 'next/server'

// POST /api/db/applications/restore — restore application from trash
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { categoryId, category, folder } = await request.json()
  if (!folder) {
    return NextResponse.json({ error: 'Missing folder' }, { status: 400 })
  }

  if (!categoryId && !category) {
    return NextResponse.json({ error: 'Missing categoryId or category' }, { status: 400 })
  }

  const svc = createServiceClient()
  let query = svc
    .from('applications')
    .update({ deleted_at: null })
    .eq('user_id', user.id).eq('folder', folder).not('deleted_at', 'is', null)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  } else {
    query = query.eq('category', category)
  }

  const { error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
