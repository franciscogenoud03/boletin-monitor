import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { data, error } = await supabase
    .from('scan_log').select('*').order('fecha', { ascending: false }).limit(50)
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data ?? [])
}
