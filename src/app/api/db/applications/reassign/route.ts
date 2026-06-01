import { createClient } from '@/lib/supabase-utils/server'
import { NextResponse } from 'next/server'

// POST /api/db/applications/reassign
// Updates application row in place (oldCategoryId + folder) to new category
// Also moves all documents to the new category
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { oldCategoryId, newCategoryId, newCategoryName, folder, appData } = body

  if (!oldCategoryId || !newCategoryId || !folder || !appData) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!newCategoryId) {
    return NextResponse.json({ error: 'Category not found' }, { status: 400 })
  }

  // Update the application row in place
  const { error: appError } = await supabase
    .from('applications')
    .update({
      category: newCategoryName,
      category_id: newCategoryId,
      data: appData,
    })
    .eq('user_id', user.id)
    .eq('category_id', oldCategoryId)
    .eq('folder', folder)

  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 })

  // Move all documents to the new category
  const { error: docError } = await supabase
    .from('documents')
    .update({
      category: newCategoryName,
      category_id: newCategoryId,
    })
    .eq('user_id', user.id)
    .eq('category_id', oldCategoryId)
    .eq('folder', folder)

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}