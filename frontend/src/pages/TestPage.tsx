export function TestPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: 'white',
        color: '#333',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>✅ Test Page Works!</h1>
        <p style={{ marginBottom: '20px' }}>Cette page de test fonctionne correctement.</p>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Si cette page s'affiche, le problème est spécifique au FeedbackPage.
        </p>
        <a 
          href="/feedback" 
          style={{
            display: 'inline-block',
            marginTop: '20px',
            padding: '12px 24px',
            background: '#667eea',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px'
          }}
        >
          Essayer /feedback
        </a>
      </div>
    </div>
  );
}
