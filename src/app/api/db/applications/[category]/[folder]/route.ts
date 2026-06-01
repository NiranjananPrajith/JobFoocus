import { createClient } from '@/lib/supabase-utils/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId')
  const folder = searchParams.get('folder')

  if (!categoryId || !folder) {
    return NextResponse.json({ error: 'Missing categoryId or folder' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('applications').select('category, category_id, folder, data')
    .eq('user_id', user.id).eq('category_id', categoryId).eq('folder', folder).single()

  if (error?.code === 'PGRST116') return NextResponse.json(null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
