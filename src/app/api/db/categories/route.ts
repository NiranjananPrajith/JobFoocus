import { createClient } from '@/lib/supabase-utils/server'
import { NextResponse } from 'next/server'

const CATEGORY_COLORS = ['#4a90e2', '#4caf50', '#f5a623', '#9c27b0', '#00bcd4', '#ff5722', '#607d8b', '#e91e63']
const MAX_USER_CATEGORIES = 100

// Reserved category names. The user cannot POST these — they're
// auto-managed by the storage layer (see ensureUncategorizedCategory).
// We enforce the check on the server too, in case the client check is
// bypassed (older client, direct API call, race during deploy).
const RESERVED_CATEGORY_NAMES = new Set(['uncategorized'])

function isReservedName(name: string): boolean {
  return RESERVED_CATEGORY_NAMES.has(name.trim().toLowerCase())
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, description } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
  }

  const nameTrimmed = name.trim()

  if (isReservedName(nameTrimmed)) {
    return NextResponse.json(
      { error: `"${nameTrimmed}" is a reserved system category name.` },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from('user_categories')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', nameTrimmed)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
  }

  const { data: countData } = await supabase
    .from('user_categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const count = countData?.length ?? 0
  if (count >= MAX_USER_CATEGORIES) {
    return NextResponse.json({ error: 'Maximum categories reached' }, { status: 400 })
  }

  const color = CATEGORY_COLORS[count % CATEGORY_COLORS.length]

  const { data, error } = await supabase
    .from('user_categories')
    .insert({
      user_id: user.id,
      name: nameTrimmed,
      description: description?.trim() || null,
      color,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
