import Link from 'next/link'
import Container from './Container'
import { Activity } from 'lucide-react'

export default function Navbar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '72px',
      background: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid #263244',
      zIndex: 1000
    }}>
      <Container>
        <div style={{
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {['Features', 'Solutions', 'How it Works', 'FAQ', 'Contact'].map((item) => (
              <Link
                key={item}
                href="#"
                style={{
                  color: '#CBD5E1',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                {item}
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link
              href="/login"
              style={{
                color: '#CBD5E1',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              style={{
                background: '#00D4FF',
                color: '#070B16',
                padding: '10px 20px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 800
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </Container>
    </nav>
  )
}
