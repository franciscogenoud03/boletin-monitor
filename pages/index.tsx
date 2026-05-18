import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

const TIPOS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  asamblea:   { label: 'Convocatoria a asamblea', color: '#92400e', bg: '#fef3c7' },
  disolucion: { label: 'Disolución / liquidación', color: '#991b1b', bg: '#fee2e2' },
  directorio: { label: 'Cambio de directorio',    color: '#1e40af', bg: '#dbeafe' },
  capital:    { label: 'Modificación de capital',  color: '#075985', bg: '#e0f2fe' },
  estatuto:   { label: 'Reforma de estatuto',      color: '#166534', bg: '#dcfce7' },
  otro:       { label: 'Otro edicto',              color: '#374151', bg: '#f3f4f6' },
}

const TIPOS_KEYS = Object.keys(TIPOS_CONFIG)

type Sociedad = { id: string; nombre: string; cuit?: string; tipos: string[]; activa: boolean; created_at: string }
type Alerta   = { id: string; sociedad_id: string; sociedad_nombre: string; tipo: string; fecha_publicacion: string; numero_boletin: string; seccion: string; resumen: string; url: string; leida: boolean; created_at: string }

export default function Home() {
  const [tab, setTab] = useState<'alertas' | 'sociedades' | 'historial'>('alertas')
  const [sociedades, setSociedades] = useState<Sociedad[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [log, setLog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')

  // Add form state
  const [showForm, setShowForm] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newCuit, setNewCuit] = useState('')
  const [newTipos, setNewTipos] = useState<string[]>(['asamblea', 'disolucion'])
  const [saving, setSaving] = useState(false)

  // Filters
  const [filterTipo, setFilterTipo] = useState('')
  const [filterLeida, setFilterLeida] = useState('')
  const [searchQ, setSearchQ] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [socRes, alertRes, logRes] = await Promise.all([
      fetch('/api/sociedades'),
      fetch('/api/alertas'),
      fetch('/api/log'),
    ])
    setSociedades(await socRes.json().catch(() => []))
    setAlertas(await alertRes.json().catch(() => []))
    setLog(await logRes.json().catch(() => []))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const nuevas = alertas.filter(a => !a.leida).length

  async function addSociedad() {
    if (!newNombre.trim() || !newTipos.length) return
    setSaving(true)
    const res = await fetch('/api/sociedades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newNombre, cuit: newCuit, tipos: newTipos }),
    })
    if (res.ok) {
      setNewNombre(''); setNewCuit(''); setNewTipos(['asamblea', 'disolucion']); setShowForm(false)
      fetchAll()
    }
    setSaving(false)
  }

  async function toggleActiva(s: Sociedad) {
    await fetch(`/api/sociedades/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: !s.activa }),
    })
    fetchAll()
  }

  async function deleteSociedad(id: string) {
    if (!confirm('¿Eliminar esta sociedad y todas sus alertas?')) return
    await fetch(`/api/sociedades/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  async function marcarLeida(id: string) {
    await fetch('/api/alertas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, leida: true } : a))
  }

  async function marcarTodasLeidas() {
    const ids = alertas.filter(a => !a.leida).map(a => a.id)
    if (!ids.length) return
    await fetch('/api/alertas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    setAlertas(prev => prev.map(a => ({ ...a, leida: true })))
  }

  async function runScan() {
    setScanning(true); setScanMsg('Consultando Boletín Oficial...')
    const secret = process.env.NEXT_PUBLIC_CRON_SECRET_HINT ?? ''
    const res = await fetch('/api/cron', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET_HINT ?? ''}` },
    })
    const data = await res.json().catch(() => ({}))
    setScanMsg(data.alertasGeneradas > 0 ? `✓ ${data.alertasGeneradas} novedad(es) encontradas` : '✓ Sin novedades nuevas')
    await fetchAll()
    setTimeout(() => { setScanning(false); setScanMsg('') }, 3000)
  }

  const filteredAlertas = alertas.filter(a => {
    const q = searchQ.toLowerCase()
    const matchQ = !q || a.sociedad_nombre.toLowerCase().includes(q) || a.resumen.toLowerCase().includes(q)
    const matchTipo = !filterTipo || a.tipo === filterTipo
    const matchLeida = !filterLeida || (filterLeida === 'nuevo' && !a.leida) || (filterLeida === 'leido' && a.leida)
    return matchQ && matchTipo && matchLeida
  })

  return (
    <>
      <Head>
        <title>Monitor Boletín Oficial</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital@0;1&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap" rel="stylesheet" />
      </Head>

      <div className={styles.app}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>§</span>
            <div>
              <div className={styles.logoTitle}>Monitor BO</div>
              <div className={styles.logoSub}>Boletín Oficial ARG</div>
            </div>
          </div>

          <nav className={styles.nav}>
            <button className={`${styles.navItem} ${tab === 'alertas' ? styles.active : ''}`} onClick={() => setTab('alertas')}>
              <span className={styles.navIcon}>🔔</span>
              <span>Alertas</span>
              {nuevas > 0 && <span className={styles.navBadge}>{nuevas}</span>}
            </button>
            <button className={`${styles.navItem} ${tab === 'sociedades' ? styles.active : ''}`} onClick={() => setTab('sociedades')}>
              <span className={styles.navIcon}>🏢</span>
              <span>Sociedades</span>
              <span className={styles.navCount}>{sociedades.filter(s => s.activa).length}</span>
            </button>
            <button className={`${styles.navItem} ${tab === 'historial' ? styles.active : ''}`} onClick={() => setTab('historial')}>
              <span className={styles.navIcon}>📋</span>
              <span>Historial</span>
            </button>
          </nav>

          <div className={styles.sidebarBottom}>
            <div className={styles.statusDot} />
            <span className={styles.statusText}>Escaneo diario activo</span>
          </div>
        </aside>

        {/* Main */}
        <main className={styles.main}>
          {/* Top bar */}
          <header className={styles.topbar}>
            <h1 className={styles.pageTitle}>
              {tab === 'alertas' && 'Alertas'}
              {tab === 'sociedades' && 'Mis sociedades'}
              {tab === 'historial' && 'Historial de escaneos'}
            </h1>
            <div className={styles.topbarActions}>
              {scanMsg && <span className={styles.scanMsg}>{scanMsg}</span>}
              <button className={styles.btnScan} onClick={runScan} disabled={scanning}>
                {scanning ? 'Escaneando...' : '↻ Escanear ahora'}
              </button>
            </div>
          </header>

          {loading ? (
            <div className={styles.loadingMsg}>Cargando...</div>
          ) : (
            <>
              {/* ── ALERTAS ── */}
              {tab === 'alertas' && (
                <div>
                  <div className={styles.statRow}>
                    <div className={styles.stat}>
                      <div className={styles.statVal}>{alertas.filter(a => !a.leida).length}</div>
                      <div className={styles.statLabel}>Alertas nuevas</div>
                    </div>
                    <div className={styles.stat}>
                      <div className={styles.statVal}>{alertas.length}</div>
                      <div className={styles.statLabel}>Total históricas</div>
                    </div>
                    <div className={styles.stat}>
                      <div className={styles.statVal}>{sociedades.filter(s => s.activa).length}</div>
                      <div className={styles.statLabel}>Sociedades activas</div>
                    </div>
                  </div>

                  <div className={styles.filterBar}>
                    <input className={styles.searchInput} placeholder="Buscar..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                    <select className={styles.select} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
                      <option value="">Todos los tipos</option>
                      {TIPOS_KEYS.map(t => <option key={t} value={t}>{TIPOS_CONFIG[t].label}</option>)}
                    </select>
                    <select className={styles.select} value={filterLeida} onChange={e => setFilterLeida(e.target.value)}>
                      <option value="">Todas</option>
                      <option value="nuevo">Solo nuevas</option>
                      <option value="leido">Leídas</option>
                    </select>
                    {nuevas > 0 && <button className={styles.btnSecondary} onClick={marcarTodasLeidas}>Marcar todas leídas</button>}
                  </div>

                  {filteredAlertas.length === 0 ? (
                    <div className={styles.empty}>
                      <div className={styles.emptyIcon}>🔕</div>
                      <div>Sin alertas para mostrar</div>
                    </div>
                  ) : (
                    filteredAlertas.map(a => {
                      const cfg = TIPOS_CONFIG[a.tipo] ?? TIPOS_CONFIG.otro
                      return (
                        <div key={a.id} className={`${styles.alertCard} ${a.leida ? styles.leida : ''}`}>
                          <div className={styles.alertHeader}>
                            <div className={styles.alertLeft}>
                              {!a.leida && <span className={styles.newDot} />}
                              <span className={styles.alertSoc}>{a.sociedad_nombre}</span>
                              <span className={styles.badge} style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                            </div>
                            <div className={styles.alertActions}>
                              {!a.leida && <button className={styles.btnXs} onClick={() => marcarLeida(a.id)}>Leída</button>}
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className={styles.btnXs}>Ver →</a>
                            </div>
                          </div>
                          <div className={styles.alertMeta}>
                            📅 {a.fecha_publicacion} &nbsp;·&nbsp; Boletín N° {a.numero_boletin} &nbsp;·&nbsp; {a.seccion}
                          </div>
                          <div className={styles.alertBody}>{a.resumen}</div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* ── SOCIEDADES ── */}
              {tab === 'sociedades' && (
                <div>
                  {!showForm ? (
                    <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>+ Agregar sociedad</button>
                  ) : (
                    <div className={styles.addForm}>
                      <div className={styles.formTitle}>Nueva sociedad a monitorear</div>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Nombre / Razón social *</label>
                          <input className={styles.input} placeholder="ej. ACME S.A." value={newNombre} onChange={e => setNewNombre(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>CUIT (opcional)</label>
                          <input className={styles.input} placeholder="30-12345678-9" value={newCuit} onChange={e => setNewCuit(e.target.value)} />
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Tipos de publicación a monitorear</label>
                        <div className={styles.checkGroup}>
                          {TIPOS_KEYS.map(t => (
                            <button
                              key={t}
                              className={`${styles.checkChip} ${newTipos.includes(t) ? styles.checkChipOn : ''}`}
                              onClick={() => setNewTipos(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                            >
                              {TIPOS_CONFIG[t].label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={styles.formActions}>
                        <button className={styles.btnPrimary} onClick={addSociedad} disabled={saving || !newNombre || !newTipos.length}>
                          {saving ? 'Guardando...' : 'Agregar'}
                        </button>
                        <button className={styles.btnSecondary} onClick={() => setShowForm(false)}>Cancelar</button>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 20 }}>
                    {sociedades.length === 0 && (
                      <div className={styles.empty}><div className={styles.emptyIcon}>🏢</div><div>No hay sociedades agregadas aún</div></div>
                    )}
                    {sociedades.map(s => {
                      const alertasActivas = alertas.filter(a => a.sociedad_id === s.id && !a.leida).length
                      return (
                        <div key={s.id} className={styles.socCard}>
                          <div className={styles.socHeader}>
                            <div>
                              <div className={styles.socName}>
                                {s.nombre}
                                {alertasActivas > 0 && <span className={styles.badgeWarn}>{alertasActivas} nueva{alertasActivas > 1 ? 's' : ''}</span>}
                                <span className={styles.badgeStatus} style={s.activa ? {} : { background: '#f3f4f6', color: '#6b7280' }}>
                                  {s.activa ? 'Activa' : 'Pausada'}
                                </span>
                              </div>
                              <div className={styles.socCuit}>{s.cuit ?? 'Sin CUIT'}</div>
                              <div className={styles.socTipos}>
                                {s.tipos.map(t => (
                                  <span key={t} className={styles.tipoChip}>{TIPOS_CONFIG[t]?.label ?? t}</span>
                                ))}
                              </div>
                            </div>
                            <div className={styles.socActions}>
                              <button className={styles.btnXs} onClick={() => toggleActiva(s)}>{s.activa ? 'Pausar' : 'Activar'}</button>
                              <button className={`${styles.btnXs} ${styles.danger}`} onClick={() => deleteSociedad(s.id)}>Eliminar</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── HISTORIAL ── */}
              {tab === 'historial' && (
                <div className={styles.logList}>
                  {log.length === 0 && <div className={styles.empty}><div className={styles.emptyIcon}>📋</div><div>Sin registros aún</div></div>}
                  {log.map((l, i) => (
                    <div key={i} className={styles.logRow}>
                      <span className={styles.logTs}>{new Date(l.fecha).toLocaleString('es-AR')}</span>
                      <span className={styles.logMsg}><strong>{l.mensaje}</strong> — {l.detalle}</span>
                      {l.alertas_generadas > 0 && <span className={styles.badgeWarn}>{l.alertas_generadas}</span>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}
