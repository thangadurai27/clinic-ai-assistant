import { XCircle, Check, CheckCircle2 } from 'lucide-react'
import Container from './Container'

export default function Comparison() {
  const traditionalItems = [
    'Manual appointment booking',
    'Limited availability hours',
    'No automated triage',
    'Scattered patient records',
    'High staff workload',
    'No real-time analytics'
  ]

  const klmItems = [
    'Instant AI appointment booking',
    '24/7 AI availability',
    'AI-powered symptom triage',
    'Unified patient records in Supabase',
    '90% automated staff workload',
    'Real-time analytics dashboard'
  ]

  return (
    <section id="comparison" style={{
      paddingTop: '120px',
      paddingBottom: '120px',
      background: '#070B16'
    }}>
      <Container>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(0, 212, 255, 0.1)',
            marginBottom: '16px'
          }}>
            <span style={{
              color: '#00D4FF',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              COMPARISON
            </span>
          </div>
          <h2 style={{
            fontSize: '56px',
            fontWeight: 900,
            color: 'white',
            margin: 0,
            marginBottom: '16px'
          }}>
            Traditional vs KLM AI
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#CBD5E1',
            maxWidth: '620px',
            marginInline: 'auto'
          }}>
            See the difference AI automation makes for your clinic.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px'
        }}>
          <div style={{
            padding: '32px',
            borderRadius: '28px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.03)'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 900,
              color: 'white',
              margin: 0,
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <XCircle size={22} color="#EF4444" />
              Traditional Clinic
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {traditionalItems.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '999px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <XCircle size={12} color="#EF4444" />
                  </div>
                  <span style={{ color: '#CBD5E1', fontSize: '14px', fontWeight: 500 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            padding: '32px',
            borderRadius: '28px',
            border: '1px solid rgba(0, 212, 255, 0.4)',
            background: 'rgba(34, 197, 94, 0.03)',
            boxShadow: '0 0 70px rgba(0, 212, 255, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '256px',
              height: '256px',
              borderRadius: '999px',
              background: 'radial-gradient(circle, #00D4FF 0%, transparent 70%)',
              opacity: 0.3
            }} />
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: '#00D4FF',
              color: '#070B16',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              SWITCH TODAY
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 900,
              color: 'white',
              margin: 0,
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              position: 'relative',
              zIndex: 1
            }}>
              <CheckCircle2 size={22} color="#00D4FF" />
              KLM AI Clinic
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1 }}>
              {klmItems.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '999px',
                    background: 'rgba(0, 212, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Check size={12} color="#00D4FF" />
                  </div>
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  )
}
