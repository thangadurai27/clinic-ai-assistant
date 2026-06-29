import Link from 'next/link'
import Container from './Container'

export default function CTA() {
  return (
    <section style={{
      paddingTop: '120px',
      paddingBottom: '120px',
      background: '#070B16'
    }}>
      <Container>
        <div style={{
          maxWidth: '1280px',
          marginInline: 'auto',
          padding: '80px',
          borderRadius: '32px',
          border: '1px solid rgba(0, 212, 255, 0.4)',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(0, 212, 255, 0.22) 50%, rgba(34, 197, 94, 0.14) 100%)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.4), 0 0 80px rgba(0, 212, 255, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '25%',
            width: '256px',
            height: '256px',
            borderRadius: '999px',
            background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)',
            opacity: 0.3
          }} />
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: '25%',
            width: '320px',
            height: '320px',
            borderRadius: '999px',
            background: 'radial-gradient(circle, #00D4FF 0%, transparent 70%)',
            opacity: 0.3
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: '56px',
              fontWeight: 900,
              color: 'white',
              margin: 0,
              marginBottom: '20px'
            }}>
              Ready to Modernize Your
              <span style={{
                background: 'linear-gradient(135deg, #38BDF8, #00D4FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {' '}Office?
              </span>
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#CBD5E1',
              maxWidth: '620px',
              marginInline: 'auto',
              marginBottom: '40px'
            }}>
              Join 500+ clinics already using KLM AI to automate patient communication and scheduling.
            </p>
            <div style={{
              display: 'inline-flex',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'center'
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
              <Link
                href="/login"
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: '1px solid #263244',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '18px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
