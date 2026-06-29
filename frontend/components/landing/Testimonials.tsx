import { Star } from 'lucide-react'
import Container from './Container'

export default function Testimonials() {
  const testimonials = [
    {
      quote: "As a clinic owner, I've seen a 200% increase in bookings since we started using KLM AI.",
      name: "Daniel Chen",
      role: "Patient",
      hospital: "Wellness Hub",
      initial: "DC"
    },
    {
      quote: "The AI scheduling system saves us countless hours every week.",
      name: "Dr. Amelia Thomas",
      role: "Lead Physician",
      hospital: "Oakwood Medical",
      initial: "AT"
    },
    {
      quote: "KLM AI completely transformed our patient communication workflow.",
      name: "Mercy Johns",
      role: "Clinical Manager",
      hospital: "Heart Clinic",
      initial: "MJ"
    }
  ]

  return (
    <section id="testimonials" style={{
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
              LOVED
            </span>
          </div>
          <h2 style={{
            fontSize: '56px',
            fontWeight: 900,
            color: 'white',
            margin: 0,
            marginBottom: '16px'
          }}>
            Loved by Clinics & Patients
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#CBD5E1',
            maxWidth: '620px',
            marginInline: 'auto'
          }}>
            Real teams running real clinics with KLM AI.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '32px'
        }}>
          {testimonials.map((t, idx) => (
            <div key={idx} style={{
              padding: '28px',
              background: '#161F2F',
              border: '1px solid #263244',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#00D4FF" color="#00D4FF" />
                ))}
              </div>
              <p style={{
                fontSize: '14px',
                color: '#CBD5E1',
                lineHeight: 1.6,
                margin: 0,
                marginBottom: '28px',
                flex: 1
              }}>
                {t.quote}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #38BDF8, #00D4FF)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: 900 }}>{t.initial}</span>
                </div>
                <div>
                  <p style={{ color: 'white', fontSize: '14px', fontWeight: 900, margin: 0 }}>{t.name}</p>
                  <p style={{ color: '#CBD5E1', fontSize: '12px', fontWeight: 600, margin: 0 }}>{t.role} · {t.hospital}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
