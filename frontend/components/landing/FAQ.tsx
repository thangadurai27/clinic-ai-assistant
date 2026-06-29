import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Container from './Container'

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(3)
  const faqs = [
    { q: 'Is patient data secure?', a: 'Yes — AES-256 encryption with Supabase Row-Level Security. Only approved practitioners access clinical records. Fully HIPAA & GDPR compliant.' },
    { q: 'How accurate is the AI diagnostic classification?', a: 'Our LangGraph-powered AI achieves 95%+ symptom-to-intent accuracy across 200+ clinical categories, continuously improving with every interaction.' },
    { q: 'Does it sync with my existing EMR?', a: 'Yes. Our API-first framework provides webhooks to integrate with any existing EMR or scheduling system without disrupting your workflow.' },
    { q: 'How long does setup take?', a: 'Most clinics are live in under an hour. Connect WhatsApp Business and your calendar, import provider availability, and the AI starts handling intake immediately.' }
  ]

  return (
    <section id="faq" style={{
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
              SUPPORT
            </span>
          </div>
          <h2 style={{
            fontSize: '56px',
            fontWeight: 900,
            color: 'white',
            margin: 0,
            marginBottom: '16px'
          }}>
            Frequently Asked Questions
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#CBD5E1',
            maxWidth: '620px',
            marginInline: 'auto'
          }}>
            Everything teams ask before they switch.
          </p>
        </div>

        <div style={{
          maxWidth: '900px',
          marginInline: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{
              border: open === idx ? '1px solid rgba(0, 212, 255, 0.4)' : '1px solid #263244',
              borderRadius: '24px',
              background: '#161F2F',
              boxShadow: open === idx ? '0 0 50px rgba(0, 212, 255, 0.2)' : 'none',
              overflow: 'hidden'
            }}>
              <button onClick={() => setOpen(open === idx ? null : idx)} style={{
                width: '100%',
                padding: '16px 24px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                textAlign: 'left'
              }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'white'
                }}>
                  {faq.q}
                </span>
                <ChevronDown
                  size={22}
                  color={open === idx ? '#00D4FF' : '#CBD5E1'}
                  style={{ transform: open === idx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                />
              </button>
              {open === idx && (
                <div style={{
                  padding: '0 24px 20px 24px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <p style={{
                    color: '#CBD5E1',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    margin: 0
                  }}>
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
