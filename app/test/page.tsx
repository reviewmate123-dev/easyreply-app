// app/test/page.tsx
export default function TestPage() {
  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center',
      fontFamily: 'Arial',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>✅ SERVER WORKING!</h1>
      <p style={{ fontSize: '20px' }}>Next.js is running properly</p>
      <p style={{ fontSize: '16px', marginTop: '40px' }}>Port: 3002</p>
    </div>
  )
}