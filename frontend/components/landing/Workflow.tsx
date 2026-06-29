import { MessageSquare, Cpu, Activity, Calendar, CheckCircle2, BarChart3 } from 'lucide-react'
import Container from './Container'

export default function Workflow() {
  const steps = [
    { icon: MessageSquare, title: 'Conversation', desc: 'Patient sends message' },
    { icon: Cpu, title: 'AI Processing', desc: 'LangGraph analyzes' },
    { icon: Activity, title: 'Doctor Matching', desc: 'Find best provider' },
    { icon: Calendar, title: 'Booking', desc: 'Appointment scheduled' },
    { icon: CheckCircle2, title: 'Confirmation', desc: 'Confirmation sent' },
    { icon: BarChart3, title: 'Dashboard', desc: 'Everything tracked' }
  ]

  return (
    <section id="how-it-works" style={{
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
              PIPELINE
            </span>
          </div>
          <h2 style={{
            fontSize: '56px',
            fontWeight: 900,
            color: 'white',
            margin: 0,
            marginBottom: '16px'
          }}>
            From Message to Appointment
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#CBD5E1',
            maxWidth: '620px',
            marginInline: 'auto'
          }}>
            A completely automated workflow that saves your staff hours every day.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '24px'
        }}>
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div key={idx} style={{
                padding: '24px',
                background: '#161F2F',
                border: '1px solid #263244',
                borderRadius: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '20px',
                  background: 'rgba(0, 212, 255, 0.12)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginInline: 'auto',
                  marginBottom: '20px'
                }}>
                  <Icon size={24} color="#00D4FF" />
                </div>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: 'white',
                  margin: 0,
                  marginBottom: '8px'
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '12px',
                  color: '#CBD5E1',
                  margin: 0,
                  lineHeight: 1.5
                }}>
                  {step.desc}
                </p>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
