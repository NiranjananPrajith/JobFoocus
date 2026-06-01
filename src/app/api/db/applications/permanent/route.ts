import { createClient } from '@/lib/supabase-utils/server'
import { createServiceClient } from '@/lib/supabase-utils/service'
import { NextResponse } from 'next/server'

// DELETE /api/db/applications/permanent — permanently delete application and its documents
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { categoryId, folder } = await request.json()
  if (!categoryId || !folder) {
    return NextResponse.json({ error: 'Missing categoryId or folder' }, { status: 400 })
  }

  const svc = createServiceClient()

  // Delete associated documents first
  const { error: docError } = await svc
    .from('documents')
    .delete()
    .eq('user_id', user.id).eq('category_id', categoryId).eq('folder', folder)

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 })
  }

  // Permanently delete the application
  const { error: appError } = await svc
    .from('applications')
    .delete()
    .eq('user_id', user.id).eq('category_id', categoryId).eq('folder', folder)

  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
