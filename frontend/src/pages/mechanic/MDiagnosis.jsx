import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getAppointments, getDiagnosisContext, runDiagnosis, getDiagnosis, getInventoryResult } from '../../api/orchestratorApi'

const CARD = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
const MONO = { fontFamily: 'JetBrains Mono, monospace' }

const SEV_STYLE = {
  Critical: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  High:     { bg: '#ffedd5', color: '#ea580c', border: '#fed7aa' },
  Medium:   { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  Low:      { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
}

const STATUS_COLOR = {
  Available:    { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  'Low Stock':  { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  'Out of Stock': { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
}

function Chip({ text, bg, color, border }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 8, background: bg, color, border: `1px solid ${border}` }}>
      {text}
    </span>
  )
}

function InventoryResult({ inv }) {
  if (!inv || !inv.parts?.length) return null
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        📦 Inventory Check — Agent 3
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {inv.parts.map((p, i) => {
          const sc = STATUS_COLOR[p.status] || STATUS_COLOR['Out of Stock']
          return (
            <div key={i} style={{ background: '#f8fafc', border: `1px solid ${sc.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.part_name}</p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                  {p.status}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  ['Required', p.required_quantity],
                  ['Available', p.available_quantity],
                  ['Reserved', p.reserved_quantity],
                  ['Min Stock', p.minimum_stock],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', ...MONO }}>{val}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  ₹{p.unit_price} × {p.reserved_quantity} = <strong style={{ color: '#0f172a' }}>₹{p.total_price}</strong>
                </span>
                {p.need_to_purchase > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 6 }}>
                    Need to Purchase: {p.need_to_purchase}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {inv.low_stock_alerts?.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginTop: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>⚠ Low Stock Alerts</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {inv.low_stock_alerts.map((a, i) => (
              <span key={i} style={{ fontSize: 11, color: '#d97706', background: '#fef3c7', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 6 }}>
                {a.part_name} ({a.quantity} left)
              </span>
            ))}
          </div>
        </div>
      )}
      {inv.out_of_stock_alerts?.length > 0 && (
        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginTop: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>🚫 Out of Stock</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {inv.out_of_stock_alerts.map((a, i) => (
              <span key={i} style={{ fontSize: 11, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: 6 }}>
                {a.part_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DiagnosisPanel({ appt, onDone }) {
  const [ctx, setCtx]               = useState(null)
  const [inspectionNotes, setNotes] = useState('')
  const [addSymptoms, setSymptoms]  = useState('')
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [running, setRunning]       = useState(false)
  const [error, setError]           = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getDiagnosisContext(appt.id)
      .then(async r => {
        setCtx(r.data)
        if (r.data.existing_diagnosis) {
          const existingDiag = r.data.existing_diagnosis
          setNotes(existingDiag.inspection_notes || '')
          setSymptoms(existingDiag.additional_symptoms || '')
          let inv = null
          if (existingDiag.repair_id) {
            try { inv = (await getInventoryResult(existingDiag.repair_id)).data } catch (_) {}
          }
          setResult({ diagnosis: existingDiag, inventory: inv })
        }
      })
      .catch(e => setError(e.response?.data?.detail || 'Failed to load diagnosis context'))
      .finally(() => setLoading(false))
  }, [appt.id])

  const handleRun = async () => {
    if (ctx?.repair_id == null) { toast.error('No repair ID found for this appointment'); return }
    setRunning(true)
    setError(null)
    try {
      const res = await runDiagnosis({
        appointment_id: appt.id,
        repair_id: ctx.repair_id,
        inspection_notes: inspectionNotes,
        additional_symptoms: addSymptoms,
      })
      setResult(res.data)
      toast.success('Diagnosis completed & Inventory checked successfully!')
      if (onDone) onDone()
    } catch (e) {
      const msg = e.response?.data?.detail || 'Diagnosis failed. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setRunning(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error && !ctx) return (
    <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px', color: '#dc2626', fontSize: 13 }}>
      ⚠ {error}
    </div>
  )

  const diag = result?.diagnosis
  const inv  = result?.inventory
  const sev  = diag?.repair_severity ? (SEV_STYLE[diag.repair_severity] || SEV_STYLE.Medium) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Auto-loaded context */}
      {ctx && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Customer & Bike Info (Auto-loaded)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              ['Customer', ctx.customer_name],
              ['Phone', ctx.customer_phone],
              ['Bike Model', ctx.bike_model],
              ['Brand', ctx.bike_brand || '—'],
              ['Reg No.', ctx.registration_number || '—'],
              ['Service Req ID', `#${ctx.service_request_id}`],
            ].map(([label, val]) => (
              <div key={label}>
                <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{val}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Customer Complaint</p>
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{ctx.complaint}</p>
          </div>
          {ctx.repair_history?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Previous Repair History</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ctx.repair_history.slice(0, 3).map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748b' }}>
                    <span style={{ ...MONO, color: '#3b82f6' }}>#{h.repair_id}</span>
                    <span>{h.complaint?.slice(0, 50)}{h.complaint?.length > 50 ? '…' : ''}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>{h.repair_status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mechanic input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Inspection Notes
          </label>
          <textarea
            value={inspectionNotes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Enter your physical inspection findings..."
            rows={3}
            style={{ width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '10px 12px', fontSize: 13, color: '#0f172a', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Additional Symptoms
          </label>
          <textarea
            value={addSymptoms}
            onChange={e => setSymptoms(e.target.value)}
            placeholder="Any additional symptoms observed..."
            rows={2}
            style={{ width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '10px 12px', fontSize: 13, color: '#0f172a', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 9, padding: '10px 14px', color: '#dc2626', fontSize: 12 }}>
          ⚠ {error}
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={running || ctx?.repair_id == null}
        style={{
          padding: '13px', borderRadius: 11, border: 'none', fontWeight: 700, fontSize: 14,
          cursor: running || ctx?.repair_id == null ? 'not-allowed' : 'pointer',
          background: running ? '#e2e8f0' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
          color: running ? '#94a3b8' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {running ? (
          <>
            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #94a3b8', borderTopColor: '#475569', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            Running AI Diagnosis...
          </>
        ) : diag ? '🔄 Re-run AI Diagnosis' : '🤖 Run AI Diagnosis'}
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Diagnosis Result */}
      {diag && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>✅ Diagnosis Completed</span>
            {diag.confidence_score && (
              <span style={{ fontSize: 11, color: '#64748b' }}>Confidence: <strong style={{ color: '#0f172a' }}>{diag.confidence_score}%</strong></span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              ['Severity', diag.repair_severity, sev],
              ['Priority', diag.priority, null],
              ['Repair Time', diag.estimated_repair_time, null],
              ['Labor Charge', diag.estimated_labor_charge ? `₹${diag.estimated_labor_charge}` : '—', null],
            ].map(([label, val, accent]) => (
              <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                {accent
                  ? <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}>{val || '—'}</span>
                  : <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{val || '—'}</p>
                }
              </div>
            ))}
          </div>

          {diag.faulty_components?.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Faulty Components</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {diag.faulty_components.map((c, i) => <Chip key={i} text={c} bg="#fee2e2" color="#dc2626" border="#fecaca" />)}
              </div>
            </div>
          )}

          {diag.required_parts?.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Suggested Spare Parts</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {diag.required_parts.map((p, i) => (
                  <Chip key={i}
                    text={typeof p === 'string' ? p : `${p.part_name} ×${p.quantity}`}
                    bg="#dbeafe" color="#2563eb" border="#bfdbfe"
                  />
                ))}
              </div>
            </div>
          )}

          {diag.root_cause && (
            <div>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Root Cause</p>
              <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{diag.root_cause}</p>
            </div>
          )}

          {diag.ai_explanation && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, color: '#2563eb', fontWeight: 700, marginBottom: 6 }}>🤖 AI Explanation & Recommended Repair</p>
              <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{diag.ai_explanation}</p>
            </div>
          )}

          {/* Inventory result auto-shown */}
          {inv && <InventoryResult inv={inv} />}
          {!inv && diag && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                ✅ Inventory checked automatically. Re-run diagnosis to refresh inventory status.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MDiagnosis() {
  const [appointments, setAppointments] = useState([])
  const [selected, setSelected]         = useState(null)
  const [loading, setLoading]           = useState(true)

  const fetchAppts = () => {
    setLoading(true)
    getAppointments('bike_received')
      .then(r => setAppointments(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAppts() }, [])

  if (!loading && appointments.length === 0) {
    return (
      <div style={{ padding: '32px 36px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#3b82f6,#60a5fa)', borderRadius: 2 }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>AI Diagnosis</h1>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginLeft: 14 }}>Agent 2 — Runs after bike is received</p>
        </div>
        <div style={{ background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 16, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>No Bikes Received Yet</p>
          <p style={{ fontSize: 13, color: '#64748b', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            AI Diagnosis is available only after the mechanic marks a bike as <strong>Received</strong> in the Appointments page.
          </p>
          <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 18px' }}>
            <span style={{ fontSize: 14 }}>📅</span>
            <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>Go to Appointments → Receive Bike → AI Diagnosis unlocks</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#3b82f6,#60a5fa)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>AI Diagnosis</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginLeft: 14 }}>Agent 2 — Select a received bike to run AI diagnosis. Inventory Agent triggers automatically.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '320px 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
          {/* Appointment list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Received Bikes ({appointments.length})
            </p>
            {appointments.map(appt => {
              const isSelected = selected?.id === appt.id
              return (
                <button
                  key={appt.id}
                  onClick={() => setSelected(isSelected ? null : appt)}
                  style={{
                    ...CARD,
                    padding: '14px 16px', border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{appt.customer_name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                      Bike Received
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b' }}>{appt.bike_model}{appt.bike_brand ? ` · ${appt.bike_brand}` : ''}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {appt.complaint}
                  </p>
                  {appt.repair_id && (
                    <span style={{ fontSize: 10, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace', marginTop: 4, display: 'block' }}>
                      REP{appt.repair_id}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Diagnosis panel */}
          {selected && (
            <div style={{ ...CARD, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                    {selected.customer_name} — {selected.bike_model}
                  </p>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Appointment #{selected.id}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, fontSize: 14, color: '#64748b', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <DiagnosisPanel appt={selected} onDone={fetchAppts} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
