import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { data, error } = await supabaseAdmin
    .from('scan_log')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(50)
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data ?? [])
}
