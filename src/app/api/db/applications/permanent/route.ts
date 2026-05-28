import { createClient, createServiceClient } from '@/lib/supabase-utils/server'
import { NextResponse } from 'next/server'

// DELETE /api/db/applications/permanent — permanently delete application and its documents
// Uses service role client to bypass RLS (trashed items have deleted_at != null which fails RLS)
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category, folder } = await request.json()
  if (!category || !folder) {
    return NextResponse.json({ error: 'Missing category or folder' }, { status: 400 })
  }

  const svc = await createServiceClient()

  // Delete associated documents first
  const { error: docError } = await svc
    .from('documents')
    .delete()
    .eq('user_id', user.id).eq('category', category).eq('folder', folder)

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 })
  }

  // Permanently delete the application
  const { error: appError } = await svc
    .from('applications')
    .delete()
    .eq('user_id', user.id).eq('category', category).eq('folder', folder)

  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
