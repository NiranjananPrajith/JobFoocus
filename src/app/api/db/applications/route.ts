import { createClient } from '@/lib/supabase-utils/server'
import { createServiceClient } from '@/lib/supabase-utils/service'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId')
  const category = searchParams.get('category')
  const folder = searchParams.get('folder')

  // If categoryId and folder provided, return single item
  if (categoryId && folder) {
    const { data, error } = await supabase
      .from('applications').select('category, category_id, folder, data')
      .eq('user_id', user.id).eq('category_id', categoryId).eq('folder', folder).single()
    if (error?.code === 'PGRST116') return NextResponse.json(null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Fallback: if category (text name) and folder provided, query by category name
  // Used for legacy jobs where category_id is NULL
  if (category && folder) {
    const { data, error } = await supabase
      .from('applications').select('category, category_id, folder, data')
      .eq('user_id', user.id).eq('category', category).eq('folder', folder).single()
    if (error?.code === 'PGRST116') return NextResponse.json(null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Otherwise return all
  const { data, error } = await supabase
    .from('applications').select('category, category_id, folder, data').eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { category, categoryId, folder, appData } = body

  if (!folder || !appData) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!categoryId) {
    const { error } = await supabase
      .from('applications')
      .upsert({ user_id: user.id, category: category || 'Uncategorized', folder, data: appData }, { onConflict: 'user_id,category,folder' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const { error } = await supabase
    .from('applications')
    .upsert({ user_id: user.id, category, category_id: categoryId, folder, data: appData }, { onConflict: 'user_id,category_id,folder' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId')
  const folder = searchParams.get('folder')

  if (!categoryId || !folder) {
    return NextResponse.json({ error: 'Missing categoryId or folder' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { error } = await svc
    .from('applications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('category_id', categoryId).eq('folder', folder).is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
