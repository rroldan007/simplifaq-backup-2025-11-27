import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Email templates for transactional emails
 * Uses Handlebars syntax for variable interpolation
 */
const emailTemplates = [
  {
    name: 'registration_confirmation',
    subject: 'Confirmez votre inscription - SimpliFaq',
    language: 'fr',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; }
    .header { background: #4F46E5; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue sur SimpliFaq !</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{userName}},</h2>
      <p>Merci de vous être inscrit sur SimpliFaq, la plateforme suisse de facturation.</p>
      <p>Pour activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
      <p style="text-align: center;">
        <a href="{{confirmationLink}}" class="button">Confirmer mon email</a>
      </p>
      <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
      <p style="font-size: 12px; word-break: break-all;">{{confirmationLink}}</p>
      <p><strong>Ce lien expire dans 24 heures.</strong></p>
    </div>
    <div class="footer">
      <p>SimpliFaq - Plateforme de Facturation Suisse</p>
      <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
Bienvenue sur SimpliFaq !

Bonjour {{userName}},

Merci de vous être inscrit sur SimpliFaq, la plateforme suisse de facturation.

Pour activer votre compte, veuillez confirmer votre adresse email en visitant ce lien :
{{confirmationLink}}

Ce lien expire dans 24 heures.

SimpliFaq - Plateforme de Facturation Suisse
Si vous n'avez pas créé de compte, ignorez cet email.
    `,
    isActive: true,
  },
  {
    name: 'password_reset',
    subject: 'Réinitialisation de mot de passe - SimpliFaq',
    language: 'fr',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; }
    .header { background: #EF4444; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .button { display: inline-block; background: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Réinitialisation de mot de passe</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{userName}},</h2>
      <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte SimpliFaq.</p>
      <p>Pour créer un nouveau mot de passe, cliquez sur le bouton ci-dessous :</p>
      <p style="text-align: center;">
        <a href="{{resetLink}}" class="button">Réinitialiser mon mot de passe</a>
      </p>
      <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
      <p style="font-size: 12px; word-break: break-all;">{{resetLink}}</p>
      <div class="warning">
        <strong>⚠️ Important :</strong>
        <ul>
          <li>Ce lien expire dans 1 heure pour des raisons de sécurité</li>
          <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
          <li>Votre mot de passe actuel reste valide jusqu'à ce que vous en créiez un nouveau</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>SimpliFaq - Plateforme de Facturation Suisse</p>
      <p>Pour toute question, contactez notre support.</p>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
Réinitialisation de mot de passe - SimpliFaq

Bonjour {{userName}},

Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte SimpliFaq.

Pour créer un nouveau mot de passe, visitez ce lien :
{{resetLink}}

IMPORTANT :
- Ce lien expire dans 1 heure pour des raisons de sécurité
- Si vous n'avez pas demandé cette réinitialisation, ignorez cet email
- Votre mot de passe actuel reste valide jusqu'à ce que vous en créiez un nouveau

SimpliFaq - Plateforme de Facturation Suisse
    `,
    isActive: true,
  },
  {
    name: 'welcome',
    subject: 'Bienvenue sur SimpliFaq ! 🎉',
    language: 'fr',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
    .content { padding: 30px; }
    .feature { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #4F46E5; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Votre compte est activé !</h1>
      <p>Bienvenue dans SimpliFaq</p>
    </div>
    <div class="content">
      <h2>Bonjour {{userName}},</h2>
      <p>Félicitations ! Votre compte <strong>{{companyName}}</strong> est maintenant actif sur SimpliFaq.</p>
      
      <h3>🚀 Commencez dès maintenant :</h3>
      
      <div class="feature">
        <strong>1. Configurez votre entreprise</strong><br>
        Ajoutez votre logo, vos coordonnées bancaires et personnalisez vos documents PDF
      </div>
      
      <div class="feature">
        <strong>2. Ajoutez vos clients</strong><br>
        Créez votre base de clients avec toutes les informations nécessaires
      </div>
      
      <div class="feature">
        <strong>3. Créez votre première facture</strong><br>
        Générez des factures professionnelles avec QR Bill suisse en quelques clics
      </div>
      
      <div class="feature">
        <strong>4. Gérez vos devis</strong><br>
        Créez des devis et convertissez-les en factures automatiquement
      </div>
      
      <p style="text-align: center;">
        <a href="{{dashboardUrl}}" class="button">Accéder à mon tableau de bord</a>
      </p>
      
      <h3>💡 Besoin d'aide ?</h3>
      <p>Notre équipe de support est disponible pour vous accompagner. N'hésitez pas à nous contacter si vous avez des questions.</p>
      
      <p>Nous vous souhaitons beaucoup de succès avec SimpliFaq !</p>
    </div>
    <div class="footer">
      <p>SimpliFaq - Plateforme de Facturation Suisse</p>
      <p>Cet email a été envoyé à {{userName}} car un compte a été créé.</p>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
Votre compte est activé !

Bonjour {{userName}},

Félicitations ! Votre compte {{companyName}} est maintenant actif sur SimpliFaq.

Commencez dès maintenant :

1. Configurez votre entreprise
   Ajoutez votre logo, vos coordonnées bancaires et personnalisez vos documents PDF

2. Ajoutez vos clients
   Créez votre base de clients avec toutes les informations nécessaires

3. Créez votre première facture
   Générez des factures professionnelles avec QR Bill suisse en quelques clics

4. Gérez vos devis
   Créez des devis et convertissez-les en factures automatiquement

Accéder à mon tableau de bord : {{dashboardUrl}}

Besoin d'aide ?
Notre équipe de support est disponible pour vous accompagner.

Nous vous souhaitons beaucoup de succès avec SimpliFaq !

SimpliFaq - Plateforme de Facturation Suisse
    `,
    isActive: true,
  },
  {
    name: 'invoice_sent',
    subject: 'Nouvelle facture {{invoiceNumber}} - {{companyName}}',
    language: 'fr',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; }
    .header { background: #10B981; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .invoice-details { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .button { display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Nouvelle Facture</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{clientName}},</h2>
      <p>Vous avez reçu une nouvelle facture de <strong>{{companyName}}</strong>.</p>
      
      <div class="invoice-details">
        <h3>Détails de la facture :</h3>
        <p><strong>Numéro :</strong> {{invoiceNumber}}</p>
        <p><strong>Date d'émission :</strong> {{issueDate}}</p>
        <p><strong>Date d'échéance :</strong> {{dueDate}}</p>
        <p><strong>Montant total :</strong> CHF {{total}}</p>
      </div>
      
      <p>Veuillez trouver votre facture en pièce jointe de cet email.</p>
      
      <p>Pour toute question concernant cette facture, n'hésitez pas à nous contacter.</p>
      
      <p>Cordialement,<br>{{companyName}}</p>
    </div>
    <div class="footer">
      <p>{{companyName}} - {{companyAddress}}</p>
      <p>Cet email a été envoyé automatiquement par SimpliFaq</p>
    </div>
  </div>
</body>
</html>
    `,
    textContent: `
Nouvelle Facture - {{companyName}}

Bonjour {{clientName}},

Vous avez reçu une nouvelle facture de {{companyName}}.

Détails de la facture :
- Numéro : {{invoiceNumber}}
- Date d'émission : {{issueDate}}
- Date d'échéance : {{dueDate}}
- Montant total : CHF {{total}}

Veuillez trouver votre facture en pièce jointe de cet email.

Pour toute question concernant cette facture, n'hésitez pas à nous contacter.

Cordialement,
{{companyName}}

{{companyAddress}}
    `,
    isActive: true,
  },
];

async function seedEmailTemplates() {
  console.log('🌱 Seeding email templates...');

  try {
    for (const template of emailTemplates) {
      const existing = await prisma.emailTemplate.findFirst({
        where: {
          name: template.name,
          language: template.language,
        },
      });

      if (existing) {
        // Update existing template
        await prisma.emailTemplate.update({
          where: { id: existing.id },
          data: template,
        });
        console.log(`✅ Updated template: ${template.name}`);
      } else {
        // Create new template
        await prisma.emailTemplate.create({
          data: template,
        });
        console.log(`✅ Created template: ${template.name}`);
      }
    }

    console.log('✅ Email templates seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding email templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedEmailTemplates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
