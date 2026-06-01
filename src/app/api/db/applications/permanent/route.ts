import { createClient } from '@/lib/supabase-utils/server'
import { createServiceClient } from '@/lib/supabase-utils/service'
import { NextResponse } from 'next/server'

// DELETE /api/db/applications/permanent — permanently delete application and its documents
export async function DELETE(request: Request) {
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

  // Delete associated documents first
  let docQuery = svc
    .from('documents')
    .delete()
    .eq('user_id', user.id).eq('folder', folder)

  if (categoryId) {
    docQuery = docQuery.eq('category_id', categoryId)
  } else {
    docQuery = docQuery.eq('category', category)
  }

  const { error: docError } = await docQuery

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 })
  }

  // Permanently delete the application
  let appQuery = svc
    .from('applications')
    .delete()
    .eq('user_id', user.id).eq('folder', folder)

  if (categoryId) {
    appQuery = appQuery.eq('category_id', categoryId)
  } else {
    appQuery = appQuery.eq('category', category)
  }

  const { error: appError } = await appQuery

  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
