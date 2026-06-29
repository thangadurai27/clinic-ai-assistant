import Link from 'next/link'
import { Zap, Check, Cpu } from 'lucide-react'
import Container from './Container'

export default function Hero() {
  return (
    <section style={{
      paddingTop: '180px',
      paddingBottom: '120px',
      background: '#070B16'
    }}>
      <Container>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '80px',
          alignItems: 'start'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(0, 212, 255, 0.12)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              marginBottom: '20px'
            }}>
              <Zap size={14} fill="#00D4FF" color="#00D4FF" />
              <span style={{ color: '#00D4FF', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                NEXT-GEN CLINICAL AUTOMATION PLATFORM
              </span>
            </div>

            <h1 style={{
              fontSize: '72px',
              fontWeight: 900,
              lineHeight: 0.95,
              color: 'white',
              maxWidth: '650px',
              marginBottom: '20px'
            }}>
              Transforming Clinics
              <br />
              With
              <span style={{ background: 'linear-gradient(135deg, #38BDF8, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {' '}Next-Gen AI
              </span>
            </h1>

            <p style={{
              fontSize: '22px',
              lineHeight: 1.6,
              color: '#CBD5E1',
              maxWidth: '560px',
              marginBottom: '32px'
            }}>
              Deep scheduling and front-desk automation integrated seamlessly with your patient systems, calendar schedules, and messaging platforms — for up to one hour.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                'Capture details from WhatsApp and Email automatically',
                'AI-powered patient flows through LangGraph workflows',
                'Webhooks, notifications & instant confirmations across all channels'
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '999px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Check size={12} color="#22C55E" />
                  </div>
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>

            <div style={{
              display: 'inline-flex',
              gap: '16px',
              alignItems: 'center'
            }}>
              <Link
                href="/register"
                style={{
                  background: '#00D4FF',
                  color: '#070B16',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontSize: '18px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Try Free Now →
              </Link>
              <button style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: '1px solid #263244',
                background: 'transparent',
                color: 'white',
                fontSize: '18px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}>
                Watch Demo
              </button>
            </div>
          </div>

          <div style={{ justifySelf: 'end' }}>
            <div style={{
              width: '500px',
              background: '#161F2F',
              border: '1px solid rgba(0, 212, 255, 0.35)',
              borderRadius: '28px',
              overflow: 'hidden',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), 0 0 80px rgba(0, 212, 255, 0.25)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #263244',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '999px',
                    background: 'rgba(0, 212, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: '#00D4FF', fontSize: '10px', fontWeight: 800 }}>DR</span>
                  </div>
                  <div>
                    <p style={{ color: 'white', fontSize: '14px', fontWeight: 800, margin: 0 }}>Dr. Sarah Jenkins</p>
                    <p style={{ color: '#CBD5E1', fontSize: '10px', margin: 0 }}>Meet for Therapy</p>
                  </div>
                </div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  background: 'rgba(0, 212, 255, 0.08)'
                }}>
                  <span style={{ color: '#00D4FF', fontSize: '10px', fontWeight: 800 }}>ONLINE</span>
                </div>
              </div>

              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '999px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'white',
                      flexShrink: 0,
                      marginTop: '4px'
                    }}>
                      P
                    </div>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '16px',
                      borderTopLeftRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      fontSize: '14px',
                      lineHeight: 1.5
                    }}>
                      I&apos;m messed up right about symptoms and feel I can&apos;t book a know it all questions?
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '999px',
                      background: 'rgba(0, 212, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '4px'
                    }}>
                      <Cpu size={14} color="#00D4FF" />
                    </div>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '16px',
                      borderTopLeftRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      color: '#00D4FF',
                      fontSize: '14px',
                      lineHeight: 1.5
                    }}>
                      Hello abscess patient — I can help book with Dr. Sarah or another provider?
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { value: '88', suffix: '/100', label: 'OPTIMAL HEALTH SCORE' },
                    { value: '9', suffix: '', label: 'PATIENT VISITS' }
                  ].map((stat, idx) => (
                    <div key={idx} style={{
                      padding: '20px',
                      borderRadius: '20px',
                      border: '1px solid #263244',
                      background: 'rgba(255, 255, 255, 0.02)',
                      textAlign: 'center'
                    }}>
                      <p style={{
                        fontSize: '28px',
                        fontWeight: 900,
                        color: idx === 0 ? '#00D4FF' : 'white',
                        margin: 0,
                        marginBottom: '4px'
                      }}>
                        {stat.value}{stat.suffix}
                      </p>
                      <p style={{
                        color: '#CBD5E1',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        margin: 0
                      }}>
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
