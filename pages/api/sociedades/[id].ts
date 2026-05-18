import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }

  if (req.method === 'PATCH') {
    const { activa, tipos } = req.body
    const updates: any = {}
    if (typeof activa === 'boolean') updates.activa = activa
    if (tipos) updates.tipos = tipos
    const { data, error } = await supabaseAdmin
      .from('sociedades').update(updates).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin.from('sociedades').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(204).end()
  }

  res.status(405).json({ error: 'Method not allowed' })
}
