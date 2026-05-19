import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('alertas').select('*').order('created_at', { ascending: false }).limit(100)
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  if (req.method === 'PATCH') {
    const { ids } = req.body as { ids: string[] }
    const { error } = await supabase.from('alertas').update({ leida: true }).in('id', ids)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }
  res.status(405).json({ error: 'Method not allowed' })
}
