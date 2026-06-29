import Link from 'next/link'
import { Activity } from 'lucide-react'
import Container from './Container'

export default function Footer() {
  return (
    <footer style={{
      paddingTop: '64px',
      paddingBottom: '40px',
      background: '#070B16',
      borderTop: '1px solid #263244'
    }}>
      <Container>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: '80px',
          marginBottom: '48px'
        }}>
          <div>
            <Link href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #38BDF8, #00D4FF)'
              }}>
                <Activity size={18} strokeWidth={2.5} color="white" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 800 }}>KLM AI</span>
                <span style={{ color: '#00D4FF', fontSize: '10px', fontWeight: 700 }}>CLINIC</span>
              </div>
            </Link>
            <p style={{
              color: '#CBD5E1',
              fontSize: '14px',
              margin: 0
            }}>
              Transforming clinics worldwide with AI-powered automation and patient management.
            </p>
          </div>

          <div>
            <h4 style={{
              color: '#00D4FF',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: '24px'
            }}>
              PRODUCT
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['Features', 'Solutions', 'Pricing', 'Integrations', 'API'].map((item) => (
                <li key={item}>
                  <Link href="#" style={{
                    color: '#CBD5E1',
                    textDecoration: 'none',
                    fontSize: '14px'
                  }}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{
              color: '#00D4FF',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: '24px'
            }}>
              RESOURCES
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['Documentation', 'Help Center', 'Blog', 'Case Studies', 'Community'].map((item) => (
                <li key={item}>
                  <Link href="#" style={{
                    color: '#CBD5E1',
                    textDecoration: 'none',
                    fontSize: '14px'
                  }}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{
              color: '#00D4FF',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: '24px'
            }}>
              COMPANY
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['About', 'Careers', 'Press', 'Contact', 'Privacy', 'Terms'].map((item) => (
                <li key={item}>
                  <Link href="#" style={{
                    color: '#CBD5E1',
                    textDecoration: 'none',
                    fontSize: '14px'
                  }}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{
          paddingTop: '32px',
          borderTop: '1px solid #263244',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <p style={{
            color: '#CBD5E1',
            fontSize: '12px',
            margin: 0
          }}>
            © {new Date().getFullYear()} KLM AI Clinic. All rights reserved.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="#" style={{ color: '#CBD5E1', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>Privacy</Link>
            <Link href="#" style={{ color: '#CBD5E1', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>Terms</Link>
            <Link href="#" style={{ color: '#CBD5E1', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>HIPAA</Link>
            <span style={{ color: '#CBD5E1', fontSize: '12px', fontWeight: 600 }}>v2.0.0</span>
          </div>
        </div>
      </Container>
    </footer>
  )
}
