import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTextWithFallback } from '@/lib/ai-model'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = createAdminClient()

    const { data: insc } = await admin
      .from('jpo_inscriptions')
      .select('*')
      .eq('id', id)
      .single()

    if (!insc) return NextResponse.json({ error: 'Inscription non trouvée' }, { status: 404 })

    const result = await generateTextWithFallback({
      type: 'chat',
      prompt: `Tu es un commercial de BPM Formation, une école de production musicale (Ingé Son & Beatmaking).
Génère un court message de relance WhatsApp (3-4 lignes max) pour ${insc.first_name} ${insc.last_name} qui est venu à la Journée Portes Ouvertes.
Son statut actuel : ${insc.status === 'froid' ? 'indécis/froid' : insc.status}.
${insc.motivation ? `Sa motivation initiale : "${insc.motivation}"` : ''}
${insc.formation_interet ? `Formation qui l'intéresse : ${insc.formation_interet}` : ''}
Le message doit être naturel, pas trop commercial, en tutoiement. Pas d'emoji excessif.
Réponds UNIQUEMENT avec le message, rien d'autre.`,
    })

    return NextResponse.json({ message: result.text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
