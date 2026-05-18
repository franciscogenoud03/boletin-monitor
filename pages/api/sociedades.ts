import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('sociedades')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'POST') {
    const { nombre, cuit, tipos } = req.body
    if (!nombre || !tipos?.length) return res.status(400).json({ error: 'Nombre y tipos son requeridos' })
    const { data, error } = await supabaseAdmin
      .from('sociedades')
      .insert({ nombre: nombre.trim(), cuit: cuit?.trim() || null, tipos, activa: true })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
