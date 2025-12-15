export function PublicPlansPageTest() {
  return (
    <div style={{ padding: '40px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '48px', color: '#333' }}>🎉 Test Page - Pricing Works!</h1>
      <p style={{ fontSize: '24px' }}>Si ves esto, la ruta /pricing funciona correctamente.</p>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        API URL: {import.meta.env.VITE_API_URL || 'http://localhost:3001'}
      </p>
    </div>
  );
}
