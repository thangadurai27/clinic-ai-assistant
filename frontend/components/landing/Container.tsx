export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: '1280px',
      marginInline: 'auto',
      paddingInline: '32px'
    }}>
      {children}
    </div>
  )
}
