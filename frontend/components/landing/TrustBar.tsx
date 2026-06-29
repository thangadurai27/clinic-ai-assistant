import { ShieldCheck, Activity } from 'lucide-react'
import Container from './Container'

export default function TrustBar() {
  return (
    <section style={{
      paddingTop: '40px',
      paddingBottom: '40px',
      background: '#111827',
      borderTop: '1px solid #263244',
      borderBottom: '1px solid #263244'
    }}>
      <Container>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '48px'
        }}>
          {[
            { icon: ShieldCheck, text: 'GDPR' },
            { icon: ShieldCheck, text: 'HIPAA' },
            { icon: Activity, text: 'SUPABASE REAL-TIME' },
            { icon: Activity, text: '10,000+ PATIENTS DAILY' }
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <item.icon size={16} color="#00D4FF" />
              <span style={{
                color: '#CBD5E1',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
