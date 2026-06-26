import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EDGE_FUNCTION_URL =
  'https://etsaihssgoyexbzprrdo.supabase.co/functions/v1/generate-plan'

export interface ProposedEvent {
  source: 'fixture' | 'generated'
  category_id: string | null
  title: string
  event_type: 'deadline' | 'lecture' | 'lab' | 'study' | 'other'
  start_at: string
  end_at: string
  event_id: string | null
}

export interface GeneratePlanResponse {
  week_start: string
  proposed: ProposedEvent[]
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { student_id, week_start } = body as { student_id: string; week_start: string }

  if (!student_id || !week_start) {
    return NextResponse.json({ error: 'student_id and week_start required' }, { status: 400 })
  }

  const resp = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ student_id, week_start }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    return NextResponse.json({ error: text }, { status: resp.status })
  }

  const data: GeneratePlanResponse = await resp.json()
  return NextResponse.json(data)
}
