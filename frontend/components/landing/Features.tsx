import { MessageSquare, Cpu, Activity, CheckCircle2 } from 'lucide-react'
import Container from './Container'

export default function Features() {
  const features = [
    {
      icon: MessageSquare,
      title: 'Seamless Communication',
      desc: 'Meet patients where they are — WhatsApp, Email, SMS, all from a simplified, unified interface'
    },
    {
      icon: Cpu,
      title: 'Intelligent Workflows',
      desc: 'Dynamic scheduling with deep understanding of your calendar and patient availability constraints'
    },
    {
      icon: Activity,
      title: 'Operational Control',
      desc: 'High-fidelity visualizations with a simplified, dynamic glimpse of the entire clinic operations'
    },
    {
      icon: CheckCircle2,
      title: 'Verified Impact',
      desc: 'Comprehensive performance metrics delivered directly to your dashboard in real-time'
    }
  ]

  return (
    <section id="features" style={{
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
              PLATFORM
            </span>
          </div>
          <h2 style={{
            fontSize: '56px',
            fontWeight: 900,
            color: 'white',
            margin: 0,
            marginBottom: '16px'
          }}>
            Features Built for Scale
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#CBD5E1',
            maxWidth: '620px',
            marginInline: 'auto'
          }}>
            Everything you need to run a modern, efficient clinic — all in one place.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '32px'
        }}>
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div key={idx} style={{
                height: '320px',
                padding: '32px',
                background: '#161F2F',
                border: '1px solid #263244',
                borderRadius: '28px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '24px',
                  background: 'rgba(0, 212, 255, 0.12)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px'
                }}>
                  <Icon size={28} color="#00D4FF" />
                </div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  color: 'white',
                  margin: 0,
                  marginBottom: '12px'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '17px',
                  color: '#CBD5E1',
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  {feature.desc}
                </p>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
