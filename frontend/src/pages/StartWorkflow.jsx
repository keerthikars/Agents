import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { startWorkflow } from '../api/orchestratorApi'
import WorkflowTimeline from '../components/WorkflowTimeline'

const INITIAL = {
  customer_details: { customer_name: '', phone: '', email: '', address: '' },
  bike_details: { bike_model: '', brand: '', registration_number: '', manufacturing_year: '', fuel_type: 'Petrol' },
  complaint: '',
}

const S = {
  card:  { background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(109,40,217,0.06)' },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: {
    width: '100%', background: '#faf9ff', border: '1.5px solid #ede9fe',
    borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#1e1b4b',
    outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'Inter, sans-serif',
  },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#1e1b4b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
}

function Field({ label, type = 'text', value, onChange, disabled }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={S.label}>{label}</label>
      <input
        type={type} value={value} onChange={onChange} disabled={disabled}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...S.input, borderColor: focused ? '#7c3aed' : '#ede9fe', boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none', opacity: disabled ? 0.6 : 1 }}
      />
    </div>
  )
}

export default function StartWorkflow() {
  const [form, setForm] = useState(INITIAL)
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState(null)
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  const set = (section, field, value) =>
    setForm(f => ({ ...f, [section]: { ...f[section], [field]: value } }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customer_details.customer_name || !form.customer_details.phone ||
        !form.bike_details.bike_model || !form.bike_details.brand || !form.complaint) {
      toast.error('Please fill all required fields')
      return
    }
    setRunning(true); setStage('intake'); setResult(null)
    const payload = {
      ...form,
      bike_details: { ...form.bike_details, manufacturing_year: form.bike_details.manufacturing_year ? parseInt(form.bike_details.manufacturing_year) : null },
    }
    try {
      const stages = ['intake', 'diagnosis', 'inventory', 'repair']
      let i = 0
      const interval = setInterval(() => { i = Math.min(i + 1, stages.length - 1); setStage(stages[i]) }, 3000)
      const res = await startWorkflow(payload)
      clearInterval(interval)
      const data = res.data
      if (data.status === 'repair_in_progress') {
        setStage('repair')
        toast.success(`Repair #${data.repair_id} started! Go to Repair Status to mark it complete.`)
      } else {
        setStage('completed')
        toast.success('Workflow completed!')
      }
      setResult(data)
    } catch (err) {
      setStage('failed')
      toast.error(err.response?.data?.detail || 'Workflow failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg,#7c3aed,#a78bfa)', borderRadius: 2 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b' }}>⚡ Start Workflow</h1>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginLeft: 14 }}>All 6 agents execute automatically in sequence</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer */}
          <div style={S.card}>
            <p style={S.sectionTitle}><span style={{ color: '#7c3aed', fontSize: 16 }}>◉</span> Customer Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Full Name *" value={form.customer_details.customer_name} onChange={e => set('customer_details','customer_name',e.target.value)} disabled={running} />
              <Field label="Phone *" value={form.customer_details.phone} onChange={e => set('customer_details','phone',e.target.value)} disabled={running} />
              <Field label="Email" type="email" value={form.customer_details.email} onChange={e => set('customer_details','email',e.target.value)} disabled={running} />
              <Field label="Address" value={form.customer_details.address} onChange={e => set('customer_details','address',e.target.value)} disabled={running} />
            </div>
          </div>

          {/* Bike */}
          <div style={S.card}>
            <p style={S.sectionTitle}><span style={{ color: '#6d28d9', fontSize: 16 }}>◎</span> Bike Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Model *" value={form.bike_details.bike_model} onChange={e => set('bike_details','bike_model',e.target.value)} disabled={running} />
              <Field label="Brand *" value={form.bike_details.brand} onChange={e => set('bike_details','brand',e.target.value)} disabled={running} />
              <Field label="Reg. Number" value={form.bike_details.registration_number} onChange={e => set('bike_details','registration_number',e.target.value)} disabled={running} />
              <Field label="Year" type="number" value={form.bike_details.manufacturing_year} onChange={e => set('bike_details','manufacturing_year',e.target.value)} disabled={running} />
              <div>
                <label style={S.label}>Fuel Type</label>
                <select value={form.bike_details.fuel_type} onChange={e => set('bike_details','fuel_type',e.target.value)} disabled={running}
                  style={{ ...S.input, cursor: 'pointer' }}>
                  {['Petrol','Electric','Diesel','CNG'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Complaint */}
          <div style={S.card}>
            <p style={S.sectionTitle}><span style={{ color: '#8b5cf6', fontSize: 16 }}>◫</span> Complaint *</p>
            <textarea
              value={form.complaint}
              onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))}
              rows={3} disabled={running}
              placeholder="Describe the issue (e.g. Brake making noise, Engine not starting...)"
              style={{ ...S.input, resize: 'none', lineHeight: 1.6 }}
            />
          </div>

          <button type="submit" disabled={running} style={{
            width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: running ? 'not-allowed' : 'pointer',
            background: running ? '#ede9fe' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: running ? '#a78bfa' : '#fff', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: running ? 'none' : '0 4px 20px rgba(124,58,237,0.35)',
            transition: 'all 0.2s',
          }}>
            {running ? (
              <>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #ddd6fe', borderTopColor: '#7c3aed', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Running Workflow...
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </>
            ) : '⚡ Start Multi-Agent Workflow'}
          </button>
        </form>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#ffffff', border: '1px solid #ede9fe', borderRadius: 14, padding: '18px 16px', boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Agent Pipeline</p>
            <WorkflowTimeline
              currentStage={stage || 'intake'}
              status={running ? 'running' : result ? 'completed' : stage === 'failed' ? 'failed' : 'idle'}
            />
          </div>

          {result && result.status === 'repair_in_progress' && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '16px' }}>
              {/* Tracking ID — give this to the customer */}
              <div style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: 10, padding: '14px 16px', marginBottom: 14, textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Customer Tracking ID</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>REP{result.repair_id}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Share this ID with the customer</p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginBottom: 10 }}>🔧 Repair In Progress</p>
              {[
                ['Repair ID', `#${result.repair_id}`],
                ['Priority', result.results?.agent1?.priority || '—'],
                ['Severity', result.results?.agent2?.severity || '—'],
                ['Parts Reserved', result.results?.agent3?.reserved_parts?.length ?? 0],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{k}</span>
                  <span style={{ fontSize: 11, color: '#1e1b4b', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: '#2563eb', marginTop: 8, lineHeight: 1.5 }}>Go to Repair Status and click <b>Mark Complete</b> when the bike is fixed to generate the invoice.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => { navigator.clipboard?.writeText(`REP${result.repair_id}`) }} style={{ flex: 1, padding: '8px', borderRadius: 9, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>📋 Copy ID</button>
                <button onClick={() => navigate('/mechanic/repair')} style={{ flex: 2, padding: '8px', borderRadius: 9, border: '1px solid #bfdbfe', background: '#dbeafe', color: '#2563eb', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Go to Repair Status →</button>
              </div>
            </div>
          )}
          {result && result.status === 'completed' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '16px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 10 }}>✓ Workflow Complete</p>
              {[
                ['Repair ID', `#${result.repair_id}`],
                ['Invoice', result.results?.agent4?.invoice_id],
                ['Total', `₹${result.results?.agent4?.grand_total}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{k}</span>
                  <span style={{ fontSize: 11, color: '#1e1b4b', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <button onClick={() => navigate('/mechanic/history')} style={{
                marginTop: 10, width: '100%', padding: '8px', borderRadius: 9, border: '1px solid #86efac',
                background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>View in History →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
