import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const emailTemplates = [
  {
    name: 'welcome',
    subject: 'Bienvenue sur SimpliFaq! 🎉 Votre compte est actif',
    language: 'fr',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background-color: #f4f7fa;
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.95;
    }
    .content { 
      background: #ffffff; 
      padding: 40px 30px;
    }
    .welcome-badge {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 50px;
      display: inline-block;
      font-weight: 600;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .company-name {
      color: #667eea;
      font-weight: 700;
      font-size: 18px;
    }
    .steps-container {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%);
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 25px 0;
      border-radius: 8px;
    }
    .steps-container h3 {
      margin: 0 0 15px;
      color: #1e293b;
      font-size: 18px;
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      margin: 12px 0;
      padding: 8px 0;
    }
    .step-number {
      background: #667eea;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
      margin-right: 12px;
    }
    .step-text {
      color: #475569;
      font-size: 15px;
      line-height: 1.5;
    }
    .button { 
      display: inline-block; 
      padding: 16px 40px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important; 
      text-decoration: none; 
      border-radius: 8px; 
      margin: 25px 0;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
    }
    .features {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .feature-item {
      display: flex;
      align-items: center;
      margin: 10px 0;
      color: #475569;
    }
    .feature-icon {
      font-size: 20px;
      margin-right: 10px;
    }
    .footer { 
      background: #1e293b; 
      padding: 30px; 
      text-align: center; 
      color: #94a3b8;
    }
    .footer-logo {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 10px;
    }
    .footer p {
      margin: 8px 0;
      font-size: 13px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .highlight {
      background: linear-gradient(120deg, #fef3c7 0%, #fde68a 100%);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue sur SimpliFaq!</h1>
      <p>Votre solution de facturation suisse est prête</p>
    </div>
    
    <div class="content">
      <div style="text-align: center;">
        <span class="welcome-badge">✅ Compte activé avec succès</span>
      </div>
      
      <p style="font-size: 16px; margin-top: 20px; color: #1e293b;">Bonjour <strong>{{firstName}}</strong>,</p>
      
      <p style="font-size: 16px; color: #334155;">
        Félicitations! Vous venez de rejoindre <span class="highlight" style="color: #1e293b;">SimpliFaq</span>, 
        la plateforme de facturation intelligente conçue spécialement pour les entreprises suisses.
      </p>
      
      <p style="font-size: 16px; color: #334155;">
        Votre compte <span class="company-name">{{companyName}}</span> est maintenant actif et prêt à l'emploi! 🚀
      </p>
      
      <div class="steps-container">
        <h3>🎯 Commencez dès maintenant</h3>
        
        <div class="step-item">
          <div class="step-number">1</div>
          <div class="step-text">
            <strong style="color: #1e293b;">Ajoutez vos clients</strong><br>
            <span style="color: #475569;">Créez votre base de clients en quelques clics</span>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-text">
            <strong style="color: #1e293b;">Créez votre première facture</strong><br>
            <span style="color: #475569;">Avec QR-facture suisse automatique et calcul TVA</span>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">3</div>
          <div class="step-text">
            <strong style="color: #1e293b;">Envoyez et recevez</strong><br>
            <span style="color: #475569;">Envoi par email et suivi des paiements en temps réel</span>
          </div>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="{{dashboardUrl}}" class="button">🚀 Accéder à mon tableau de bord</a>
      </div>
      
      <div class="features">
        <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">✨ Ce qui vous attend:</h3>
        <div class="feature-item">
          <span class="feature-icon">🇨🇭</span>
          <span style="color: #475569;">QR-factures conformes aux normes suisses</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">💰</span>
          <span style="color: #475569;">Calcul automatique de la TVA suisse</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📊</span>
          <span style="color: #475569;">Rapports et statistiques en temps réel</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📧</span>
          <span style="color: #475569;">Envoi automatique par email avec PDF</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🔒</span>
          <span style="color: #475569;">Sécurité et conformité RGPD</span>
        </div>
      </div>
      
      <p style="font-size: 15px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
        <strong style="color: #1e293b;">Besoin d'aide?</strong><br>
        Notre équipe est là pour vous accompagner. N'hésitez pas à nous contacter à 
        <a href="mailto:contact@simplifaq.ch" style="color: #667eea; text-decoration: none; font-weight: 600;">contact@simplifaq.ch</a>
      </p>
      
      <p style="font-size: 16px; text-align: center; margin-top: 20px; color: #334155;">
        À très bientôt,
        <br>
        <strong style="color: #1e293b;">L'équipe SimpliFaq 💙</strong>
      </p>
    </div>
    
    <div class="footer">
      <div class="footer-logo">SimpliFaq</div>
      <p>La solution suisse de facturation intelligente</p>
      <p>Conforme aux normes suisses • TVA • QR-factures • RGPD</p>
      <p style="margin-top: 15px;">
        <a href="{{dashboardUrl}}">Tableau de bord</a> • 
        <a href="mailto:contact@simplifaq.ch">Support</a>
      </p>
      <div style="border-top: 1px solid #475569; margin-top: 20px; padding-top: 15px; font-size: 11px; color: #94a3b8;">
        <p style="margin: 5px 0;">© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)</p>
        <p style="margin: 5px 0;">Genève, Suisse – <a href="mailto:contact@simplifaq.ch" style="color: #94a3b8;">contact@simplifaq.ch</a></p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
🎉 Bienvenue sur SimpliFaq!

Bonjour {{firstName}},

✅ Compte activé avec succès

Félicitations! Vous venez de rejoindre SimpliFaq, la plateforme de facturation intelligente conçue spécialement pour les entreprises suisses.

Votre compte {{companyName}} est maintenant actif et prêt à l'emploi! 🚀

🎯 Commencez dès maintenant:

1. Ajoutez vos clients
   Créez votre base de clients en quelques clics

2. Créez votre première facture
   Avec QR-facture suisse automatique et calcul TVA

3. Envoyez et recevez
   Envoi par email et suivi des paiements en temps réel

✨ Ce qui vous attend:
🇨🇭 QR-factures conformes aux normes suisses
💰 Calcul automatique de la TVA suisse
📊 Rapports et statistiques en temps réel
📧 Envoi automatique par email avec PDF
🔒 Sécurité et conformité RGPD

Accédez à votre tableau de bord: {{dashboardUrl}}

Besoin d'aide?
Notre équipe est là pour vous accompagner.
Contactez-nous: contact@simplifaq.ch

À très bientôt,
L'équipe SimpliFaq 💙

---
© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)
Genève, Suisse – contact@simplifaq.ch
    `,
    isActive: true,
  },
  {
    name: 'password_reset',
    subject: 'Réinitialisation de votre mot de passe',
    language: 'fr',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Réinitialisation de mot de passe</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>{{firstName}}</strong>,</p>
      
      <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte <strong>{{companyName}}</strong>.</p>
      
      <p>Pour créer un nouveau mot de passe, cliquez sur le bouton ci-dessous:</p>
      
      <center>
        <a href="{{resetUrl}}" class="button">Réinitialiser mon mot de passe</a>
      </center>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> Ce lien expire dans <strong>{{expiresIn}}</strong>.
      </div>
      
      <p><strong>Vous n'avez pas demandé cette réinitialisation?</strong><br>
      Ignorez simplement cet email. Votre mot de passe reste inchangé.</p>
      
      <p>Pour votre sécurité, ne partagez jamais ce lien avec personne.</p>
      
      <p>Cordialement,<br>L'équipe SimpliFaq</p>
    </div>
    <div class="footer">
      <p>SimpliFaq - Solution suisse de facturation<br>
      Si vous n'avez pas demandé cette réinitialisation, contactez-nous immédiatement.</p>
      <div style="border-top: 1px solid #666; margin-top: 15px; padding-top: 10px; font-size: 11px;">
        <p style="margin: 5px 0;">© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)</p>
        <p style="margin: 5px 0;">Genève, Suisse – contact@simplifaq.ch</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
Réinitialisation de mot de passe

Bonjour {{firstName}},

Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte {{companyName}}.

Pour créer un nouveau mot de passe, utilisez ce lien:
{{resetUrl}}

⚠️ Important: Ce lien expire dans {{expiresIn}}.

Vous n'avez pas demandé cette réinitialisation?
Ignorez simplement cet email. Votre mot de passe reste inchangé.

Pour votre sécurité, ne partagez jamais ce lien avec personne.

Cordialement,
L'équipe SimpliFaq

---
© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)
Genève, Suisse – contact@simplifaq.ch
    `,
    isActive: true,
  },
  {
    name: 'email_verification',
    subject: 'Vérifiez votre adresse email',
    language: 'fr',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .code { background: #f5f5f5; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✉️ Vérification d'email</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>{{firstName}}</strong>,</p>
      
      <p>Merci de vérifier votre adresse email pour activer complètement votre compte SimpliFaq.</p>
      
      <p>Cliquez sur le bouton ci-dessous pour confirmer votre adresse email:</p>
      
      <center>
        <a href="{{verificationUrl}}" class="button">Vérifier mon email</a>
      </center>
      
      <p>Ou utilisez ce code de vérification:</p>
      
      <div class="code">{{verificationCode}}</div>
      
      <p><small>Ce code expire dans <strong>{{expiresIn}}</strong>.</small></p>
      
      <p>Une fois vérifié, vous pourrez profiter de toutes les fonctionnalités de SimpliFaq.</p>
      
      <p>Cordialement,<br>L'équipe SimpliFaq</p>
    </div>
    <div class="footer">
      <p>SimpliFaq - Solution suisse de facturation<br>
      Si vous n'avez pas créé ce compte, ignorez cet email.</p>
      <div style="border-top: 1px solid #666; margin-top: 15px; padding-top: 10px; font-size: 11px;">
        <p style="margin: 5px 0;">© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)</p>
        <p style="margin: 5px 0;">Genève, Suisse – contact@simplifaq.ch</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
Vérification d'email

Bonjour {{firstName}},

Merci de vérifier votre adresse email pour activer complètement votre compte SimpliFaq.

Utilisez ce lien pour confirmer votre adresse email:
{{verificationUrl}}

Ou utilisez ce code de vérification: {{verificationCode}}

Ce code expire dans {{expiresIn}}.

Une fois vérifié, vous pourrez profiter de toutes les fonctionnalités de SimpliFaq.

Cordialement,
L'équipe SimpliFaq

---
© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)
Genève, Suisse – contact@simplifaq.ch
    `,
    isActive: true,
  },
  {
    name: 'email_confirmation',
    subject: 'Confirmez votre adresse email - SimpliFaq 📧',
    language: 'fr',
    htmlContent: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Email de confirmation SimpliFaq - Solution suisse de facturation">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background-color: #f4f7fa;
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.95;
    }
    .content { 
      background: #ffffff; 
      padding: 40px 30px;
    }
    .lpd-notice {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 25px 0;
      border-radius: 8px;
    }
    .lpd-notice strong {
      color: #1e3a8a;
      display: block;
      margin-bottom: 8px;
      font-size: 16px;
    }
    .lpd-notice p {
      margin: 5px 0;
      color: #1e40af;
      font-size: 14px;
      line-height: 1.6;
    }
    .button { 
      display: inline-block; 
      padding: 16px 40px; 
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white !important; 
      text-decoration: none; 
      border-radius: 8px; 
      margin: 25px 0;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      transition: all 0.3s ease;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
    }
    .expiry-notice {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 8px;
      font-size: 14px;
      color: #92400e;
    }
    .footer { 
      background: #1e293b; 
      padding: 30px; 
      text-align: center; 
      color: #94a3b8;
    }
    .footer-logo {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 10px;
    }
    .footer p {
      margin: 8px 0;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="margin-bottom: 10px;">
        <img src="https://simplifaq.ch/logo.png" alt="SimpliFaq Logo" style="height: 40px; display: inline-block;" onerror="this.style.display='none'">
      </div>
      <h1>📧 Confirmez votre adresse email</h1>
      <p>Une dernière étape pour activer votre compte</p>
    </div>
    
    <div class="content">
      <p style="font-size: 16px; color: #1e293b;">Bonjour <strong>{{firstName}}</strong>,</p>
      
      <p style="font-size: 16px; color: #334155;">
        Merci de vous être inscrit sur <strong>SimpliFaq</strong> pour <strong>{{companyName}}</strong>.
      </p>
      
      <div class="lpd-notice">
        <strong>🔒 Protection de vos données (LPD)</strong>
        <p>
          Conformément à la Loi fédérale sur la protection des données (LPD), nous devons confirmer votre adresse email 
          avant d'enregistrer vos informations personnelles dans notre système.
        </p>
        <p>
          En cliquant sur le bouton ci-dessous, vous confirmez que vous autorisez SimpliFaq à traiter vos données 
          conformément à notre politique de confidentialité.
        </p>
      </div>
      
      <p style="font-size: 16px; color: #334155;">
        Pour finaliser votre inscription et activer votre compte, veuillez cliquer sur le bouton ci-dessous:
      </p>
      
      <div style="text-align: center;">
        <a href="{{confirmationUrl}}" class="button">✅ Confirmer mon adresse email</a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 15px;">
        Ou copiez et collez ce lien dans votre navigateur:<br>
        <span style="word-break: break-all; font-family: monospace; font-size: 12px; color: #3b82f6;">{{confirmationUrl}}</span>
      </p>
      
      <div class="expiry-notice">
        ⏰ <strong>Important:</strong> Ce lien de confirmation expire dans <strong>{{expiresIn}}</strong>.
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 30px; border: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 14px; color: #475569;">
          <strong style="color: #1e293b; display: block; margin-bottom: 8px;">ℹ️ Informations importantes</strong>
        </p>
        <ul style="margin: 10px 0; padding-left: 20px; font-size: 13px; color: #64748b; line-height: 1.8;">
          <li>SimpliFaq est une plateforme légitime de facturation pour entreprises suisses</li>
          <li>Nous sommes basés à Genève, Suisse</li>
          <li>Cet email provient d'une demande d'inscription effectuée le {{registeredAt}}</li>
          <li>Si vous n'avez pas créé ce compte, vous pouvez ignorer cet email</li>
          <li>Vos données ne seront pas enregistrées sans votre confirmation</li>
        </ul>
      </div>
      
      <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 6px;">
        <strong style="color: #92400e;">🔒 Sécurité:</strong> Ne partagez jamais ce lien avec personne. SimpliFaq ne vous demandera jamais votre mot de passe par email.
      </p>
      
      <p style="font-size: 16px; text-align: center; margin-top: 20px; color: #334155;">
        Merci de votre confiance,
        <br>
        <strong style="color: #1e293b;">L'équipe SimpliFaq 💙</strong>
      </p>
    </div>
    
    <div class="footer">
      <div class="footer-logo">SimpliFaq</div>
      <p>La solution suisse de facturation intelligente</p>
      <p>Conforme LPD • TVA • QR-factures • RGPD</p>
      <p style="margin-top: 15px;">
        <a href="https://simplifaq.ch" style="color: #667eea; text-decoration: none;">Site web</a> • 
        <a href="mailto:contact@simplifaq.ch" style="color: #667eea; text-decoration: none;">Contact</a> • 
        <a href="https://simplifaq.ch/privacy" style="color: #667eea; text-decoration: none;">Confidentialité</a>
      </p>
      <div style="border-top: 1px solid #475569; margin-top: 20px; padding-top: 15px; font-size: 11px; color: #94a3b8;">
        <p style="margin: 5px 0;">© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)</p>
        <p style="margin: 5px 0;">📍 Genève, Suisse • 📧 <a href="mailto:contact@simplifaq.ch" style="color: #94a3b8;">contact@simplifaq.ch</a></p>
        <p style="margin: 10px 0 5px; font-size: 10px; color: #64748b;">SimpliFaq est une plateforme de gestion de facturation conforme aux normes suisses.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
📧 Confirmez votre adresse email

Bonjour {{firstName}},

Merci de vous être inscrit sur SimpliFaq pour {{companyName}}.

🔒 Protection de vos données (LPD)
Conformément à la Loi fédérale sur la protection des données (LPD), nous devons confirmer votre adresse email 
avant d'enregistrer vos informations personnelles dans notre système.

En cliquant sur le lien ci-dessous, vous confirmez que vous autorisez SimpliFaq à traiter vos données 
conformément à notre politique de confidentialité.

Pour finaliser votre inscription et activer votre compte, veuillez cliquer sur ce lien:
{{confirmationUrl}}

⏰ Important: Ce lien de confirmation expire dans {{expiresIn}}.

Vous n'avez pas créé ce compte?
Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email en toute sécurité.
Vos données ne seront pas enregistrées sans confirmation.

Merci de votre confiance,
L'équipe SimpliFaq 💙

---
© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)
Genève, Suisse – contact@simplifaq.ch
    `,
    isActive: true,
  },
  {
    name: 'admin_new_registration',
    subject: '[Nouveau compte] Inscription en attente de confirmation',
    language: 'fr',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
    .header { background: #fbbf24; color: #1f2937; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .info-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #4b5563; display: inline-block; width: 150px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-newsletter { background: #d1fae5; color: #065f46; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⏳ Nouvelle inscription en attente</h2>
    </div>
    <div class="content">
      <p><strong>Un nouveau compte a été créé et attend la confirmation email.</strong></p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #1f2937;">📋 Informations du compte</h3>
        <div class="info-row">
          <span class="label">Prénom:</span>
          <span>{{firstName}}</span>
        </div>
        <div class="info-row">
          <span class="label">Nom:</span>
          <span>{{lastName}}</span>
        </div>
        <div class="info-row">
          <span class="label">Entreprise:</span>
          <span><strong>{{companyName}}</strong></span>
        </div>
        <div class="info-row">
          <span class="label">Email:</span>
          <span>{{email}}</span>
        </div>
        <div class="info-row">
          <span class="label">Date:</span>
          <span>{{registeredAt}}</span>
        </div>
        <div class="info-row">
          <span class="label">Newsletter:</span>
          <span>
            {{#if subscribeNewsletter}}
              <span class="badge badge-newsletter">✓ Inscrit</span>
            {{else}}
              <span>Non inscrit</span>
            {{/if}}
          </span>
        </div>
        <div class="info-row">
          <span class="label">Statut:</span>
          <span><span class="badge badge-pending">En attente de confirmation</span></span>
        </div>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        L'utilisateur doit confirmer son adresse email dans les 24 heures pour activer son compte.
      </p>
    </div>
    <div class="footer">
      <p>SimpliFaq - Notification admin<br>
      Cet email est automatique, ne pas répondre.</p>
      <div style="border-top: 1px solid #666; margin-top: 15px; padding-top: 10px; font-size: 11px;">
        <p style="margin: 5px 0;">© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)</p>
        <p style="margin: 5px 0;">Genève, Suisse – contact@simplifaq.ch</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
⏳ Nouvelle inscription en attente

Un nouveau compte a été créé et attend la confirmation email.

Informations du compte:
- Prénom: {{firstName}}
- Nom: {{lastName}}
- Entreprise: {{companyName}}
- Email: {{email}}
- Date: {{registeredAt}}
- Newsletter: {{#if subscribeNewsletter}}Inscrit{{else}}Non inscrit{{/if}}
- Statut: En attente de confirmation

L'utilisateur doit confirmer son adresse email dans les 24 heures pour activer son compte.

SimpliFaq - Notification admin

---
© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)
Genève, Suisse – contact@simplifaq.ch
    `,
    isActive: true,
  },
  {
    name: 'admin_email_confirmed',
    subject: '[Compte confirmé] Nouveau utilisateur actif',
    language: 'fr',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .info-box { background: #ecfdf5; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #10b981; }
    .info-row { padding: 8px 0; border-bottom: 1px solid #d1fae5; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #065f46; display: inline-block; width: 150px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-active { background: #d1fae5; color: #065f46; }
    .badge-newsletter { background: #dbeafe; color: #1e40af; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✅ Compte confirmé et activé</h2>
    </div>
    <div class="content">
      <p><strong>Un utilisateur a confirmé son adresse email et son compte est maintenant actif.</strong></p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #065f46;">📋 Informations du compte</h3>
        <div class="info-row">
          <span class="label">Prénom:</span>
          <span>{{firstName}}</span>
        </div>
        <div class="info-row">
          <span class="label">Nom:</span>
          <span>{{lastName}}</span>
        </div>
        <div class="info-row">
          <span class="label">Entreprise:</span>
          <span><strong>{{companyName}}</strong></span>
        </div>
        <div class="info-row">
          <span class="label">Email:</span>
          <span>{{email}}</span>
        </div>
        <div class="info-row">
          <span class="label">Confirmé le:</span>
          <span>{{confirmedAt}}</span>
        </div>
        <div class="info-row">
          <span class="label">Newsletter:</span>
          <span>
            {{#if subscribeNewsletter}}
              <span class="badge badge-newsletter">✓ Inscrit à la newsletter</span>
            {{else}}
              <span>Non inscrit</span>
            {{/if}}
          </span>
        </div>
        <div class="info-row">
          <span class="label">Statut:</span>
          <span><span class="badge badge-active">✓ Actif et confirmé</span></span>
        </div>
      </div>
      
      <p style="color: #065f46; background: #ecfdf5; padding: 12px; border-radius: 5px; font-size: 14px;">
        ✉️ L'email de bienvenue a été envoyé automatiquement à l'utilisateur.
      </p>
    </div>
    <div class="footer">
      <p>SimpliFaq - Notification admin<br>
      Cet email est automatique, ne pas répondre.</p>
      <div style="border-top: 1px solid #666; margin-top: 15px; padding-top: 10px; font-size: 11px;">
        <p style="margin: 5px 0;">© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)</p>
        <p style="margin: 5px 0;">Genève, Suisse – contact@simplifaq.ch</p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
✅ Compte confirmé et activé

Un utilisateur a confirmé son adresse email et son compte est maintenant actif.

Informations du compte:
- Prénom: {{firstName}}
- Nom: {{lastName}}
- Entreprise: {{companyName}}
- Email: {{email}}
- Confirmé le: {{confirmedAt}}
- Newsletter: {{#if subscribeNewsletter}}Inscrit à la newsletter{{else}}Non inscrit{{/if}}
- Statut: Actif et confirmé

L'email de bienvenue a été envoyé automatiquement à l'utilisateur.

SimpliFaq - Notification admin

---
© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)
Genève, Suisse – contact@simplifaq.ch
    `,
    isActive: true,
  },
];

async function seedEmailTemplates() {
  console.log('🌱 Seeding email templates...');
  
  for (const template of emailTemplates) {
    try {
      // Check if template already exists
      const existing = await prisma.emailTemplate.findFirst({
        where: {
          name: template.name,
          language: template.language,
        },
      });

      if (existing) {
        console.log(`   ✓ Template "${template.name}" (${template.language}) already exists, updating...`);
        await prisma.emailTemplate.update({
          where: { id: existing.id },
          data: template,
        });
      } else {
        console.log(`   + Creating template "${template.name}" (${template.language})...`);
        await prisma.emailTemplate.create({
          data: template,
        });
      }
    } catch (error) {
      console.error(`   ✗ Error with template "${template.name}":`, error);
    }
  }

  console.log('✅ Email templates seeded successfully!');
  await prisma.$disconnect();
}

seedEmailTemplates().catch((error) => {
  console.error('❌ Error seeding email templates:', error);
  process.exit(1);
});
