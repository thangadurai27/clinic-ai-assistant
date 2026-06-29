import { CheckCircle2, MessageSquare, Bell } from 'lucide-react'
import Container from './Container'

export default function Dashboard() {
  return (
    <section id="solutions" style={{
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
              REALTIME
            </span>
          </div>
          <h2 style={{
            fontSize: '56px',
            fontWeight: 900,
            color: 'white',
            margin: 0,
            marginBottom: '16px'
          }}>
            Your clinic, on a single pane
            <br />
            of glass
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#CBD5E1',
            maxWidth: '620px',
            marginInline: 'auto'
          }}>
            Stream patient flow, AI performance, and booking velocity — live.
          </p>
        </div>

        <div style={{
          width: '100%',
          background: '#161F2F',
          border: '1px solid rgba(0, 212, 255, 0.35)',
          borderRadius: '32px',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.4), 0 0 60px rgba(0, 212, 255, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            borderBottom: '1px solid #263244',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '999px', background: '#EF4444' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '999px', background: '#F59E0B' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '999px', background: '#22C55E' }} />
            </div>
            <span style={{ color: '#CBD5E1', fontSize: '12px', fontWeight: 600 }}>KLM AI CLINIC — LIVE DASHBOARD</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#22C55E', animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#CBD5E1', fontSize: '12px', fontWeight: 600 }}>LIVE</span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: '20px',
            padding: '28px'
          }}>
            <div style={{
              borderRight: '1px solid #263244',
              paddingRight: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {['Overview', 'Patients', 'Scheduling', 'AI Agents', 'Analytics', 'Settings'].map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: i === 0 ? 'rgba(0, 212, 255, 0.12)' : 'transparent',
                    color: i === 0 ? '#00D4FF' : '#CBD5E1',
                    border: i === 0 ? '1px solid rgba(0, 212, 255, 0.35)' : '1px solid transparent',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
              }}>
                {[
                  { label: 'OPTIMAL HEALTH SCORE', value: '88', diff: '+5.2%' },
                  { label: 'MODERN TREATMENTS', value: '142', diff: '+12.4%' },
                  { label: 'ACCURACY', value: '95.4%', diff: '+4.6%' }
                ].map((stat, i) => (
                  <div key={i} style={{
                    padding: '20px',
                    borderRadius: '20px',
                    border: '1px solid #263244',
                    background: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <p style={{
                        color: '#CBD5E1',
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        margin: 0
                      }}>
                        {stat.label}
                      </p>
                      <p style={{
                        color: '#22C55E',
                        fontSize: '10px',
                        fontWeight: 800,
                        margin: 0
                      }}>
                        {stat.diff}
                      </p>
                    </div>
                    <p style={{
                      fontSize: '28px',
                      fontWeight: 900,
                      color: 'white',
                      margin: 0
                    }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '65% 35%',
                gap: '16px'
              }}>
                <div style={{
                  padding: '20px',
                  borderRadius: '20px',
                  border: '1px solid #263244',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}>
                  <p style={{
                    color: '#CBD5E1',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    margin: 0,
                    marginBottom: '16px'
                  }}>
                    Real-time Patient Flow
                  </p>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '8px',
                    height: '112px'
                  }}>
                    {[40, 65, 55, 75, 60, 80, 70].map((height, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(to top, #00D4FF, #38BDF8)',
                          borderRadius: '8px 8px 0 0',
                          height: `${height}%`,
                          opacity: 0.7
                        }}
                      />
                    ))}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    color: '#CBD5E1',
                    fontSize: '10px',
                    fontWeight: 600
                  }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S']}
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  borderRadius: '20px',
                  border: '1px solid #263244',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}>
                  <p style={{
                    color: '#CBD5E1',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    margin: 0,
                    marginBottom: '16px'
                  }}>
                    Live Activity
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { icon: CheckCircle2, text: 'Appointment booked', time: '2 min ago' },
                      { icon: MessageSquare, text: 'New message received', time: '5 min ago' },
                      { icon: Bell, text: 'Reminder sent', time: '8 min ago' },
                      { icon: CheckCircle2, text: 'Consultation completed', time: '15 min ago' }
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <item.icon size={12} color="#22C55E" />
                        <span style={{ color: 'white', fontSize: '12px', fontWeight: 500, flex: 1 }}>{item.text}</span>
                        <span style={{ color: '#CBD5E1', fontSize: '10px' }}>{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
