import { createClient } from '@/lib/supabase-utils/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId')
  const folder = searchParams.get('folder')
  const docType = searchParams.get('docType')

  if (!categoryId || !folder || !docType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('documents').select('html')
    .eq('user_id', user.id).eq('category_id', categoryId).eq('folder', folder).eq('doc_type', docType).single()

  if (error?.code === 'PGRST116') return NextResponse.json(null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.html ?? null)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { category, categoryId, folder, docType, html } = body

  if (!categoryId || !folder || !docType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabase
    .from('documents')
    .upsert({ user_id: user.id, category, category_id: categoryId, folder, doc_type: docType, html: html ?? '' }, { onConflict: 'user_id,category_id,folder,doc_type' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
