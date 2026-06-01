import { createClient } from '@/lib/supabase-utils/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: { name: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const decodedName = decodeURIComponent(params.name)
  const body = await request.json()
  const { name, description } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
  }

  const nameTrimmed = name.trim()

  if (nameTrimmed.toLowerCase() !== decodedName.toLowerCase()) {
    const { data: existing } = await supabase
      .from('user_categories')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', nameTrimmed)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('user_categories')
    .update({
      name: nameTrimmed,
      description: description?.trim() || null,
    })
    .eq('user_id', user.id)
    .eq('name', decodedName)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: { name: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const decodedName = decodeURIComponent(params.name)

  const { error } = await supabase
    .from('user_categories')
    .delete()
    .eq('user_id', user.id)
    .eq('name', decodedName)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
