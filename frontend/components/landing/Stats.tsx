import Container from './Container'

export default function Stats() {
  const stats = [
    { value: '500+', label: 'CLINICS ACTIVE' },
    { value: '120K+', label: 'PATIENTS SERVED' },
    { value: '2.4M', label: 'AI CONVERSATIONS' },
    { value: '98K', label: 'APPOINTMENTS BOOKED' },
    { value: '95%', label: 'AI ACCURACY' },
    { value: '<15s', label: 'AVG RESPONSE TIME' }
  ]

  return (
    <section style={{
      paddingTop: '120px',
      paddingBottom: '120px',
      background: '#070B16'
    }}>
      <Container>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '20px'
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              padding: '24px',
              background: '#161F2F',
              border: '1px solid #263244',
              borderRadius: '24px',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '28px',
                fontWeight: 900,
                color: 'white',
                margin: 0,
                marginBottom: '8px',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                {stat.value}
              </p>
              <p style={{
                color: '#CBD5E1',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                margin: 0
              }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
