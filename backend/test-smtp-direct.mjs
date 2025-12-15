import nodemailer from 'nodemailer';

console.log('📧 Test directo de SMTP con Infomaniak');
console.log('Host: mail.infomaniak.com');
console.log('User: contact@simplifaq.ch\n');

async function testSMTP() {
  const transporter = nodemailer.createTransporter({
    host: 'mail.infomaniak.com',
    port: 587,
    secure: false,
    auth: {
      user: 'contact@simplifaq.ch',
      pass: 'Privado@007'
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('1. Verificando conexión...');
    await transporter.verify();
    console.log('✅ Conexión exitosa\n');
    
    console.log('2. Enviando email de prueba...');
    const info = await transporter.sendMail({
      from: 'SimpliFaq <contact@simplifaq.ch>',
      to: 'r.roldan@live.com',
      subject: 'Test SMTP - SimpliFaq',
      text: 'Este es un email de prueba desde SimpliFaq usando Infomaniak SMTP',
      html: '<h1>Test Email</h1><p>Este es un email de prueba desde SimpliFaq usando Infomaniak SMTP</p>'
    });
    
    console.log('✅ Email enviado exitosamente!');
    console.log('MessageID:', info.messageId);
    console.log('Response:', info.response);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSMTP();
