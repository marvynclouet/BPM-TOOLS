import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const jpoId = request.nextUrl.searchParams.get('jpo_id')

    let query = admin.from('jpo_inscriptions').select('*').order('created_at', { ascending: true })
    if (jpoId) query = query.eq('jpo_id', jpoId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ inscriptions: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
