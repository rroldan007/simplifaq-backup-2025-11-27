# Configuration SMTP Globale - SimpliFaq

## 📧 Vue d'ensemble

Système complet de configuration SMTP centralisée pour tous les emails transactionnels de SimpliFaq (inscriptions, réinitialisations de mot de passe, emails de bienvenue, factures, etc.).

## 🎯 Fonctionnalités Implémentées

### Backend

#### 1. **Modèles de Base de Données**
- **SmtpConfig**: Configuration SMTP globale
  - Serveur SMTP (host, port, secure)
  - Authentification (user, password chiffré)
  - Informations expéditeur (fromEmail, fromName, replyTo)
  - Support multi-providers (SMTP, SendGrid, SES, Mailgun)
  - Options GDPR (unsubscribe links)
  - Configuration de retry et backoff
  
- **SmtpLog**: Journal d'audit complet
  - Tracking de tous les emails (envoyés, échecs, bounces)
  - Métriques de performance (taux de succès, temps d'envoi)
  - Traçabilité complète (IP, user agent, message ID)

#### 2. **Sécurité**
- **Encryption AES-256-CBC** pour mots de passe SMTP
- Utilitaire d'encryption (`utils/encryption.ts`)
- Clé d'encryption configurable via `ENCRYPTION_KEY` env var
- Validation Zod pour tous les inputs

#### 3. **Système de Colas (BullMQ)**
- File d'attente asynchrone avec Redis
- Retry automatique avec backoff exponentiel (3 tentatives)
- Concurrence configurable (5 emails simultanés)
- Logging automatique dans SmtpLog

#### 4. **Service Email Amélioré**
- Lecture config depuis BD avec fallback env vars
- Support Handlebars pour templates dynamiques
- Envoi direct ou via queue (configurable)
- Méthodes spécialisées:
  - `sendRegistrationEmail()`
  - `sendPasswordResetEmail()`
  - `sendWelcomeEmail()`
  - `sendTestEmail()`

#### 5. **Endpoints API Admin**
```
GET    /api/admin/smtp/config        - Obtenir config active
POST   /api/admin/smtp/config        - Créer/modifier config
POST   /api/admin/smtp/config/test   - Tester connexion + email test
DELETE /api/admin/smtp/config/:id    - Supprimer config
GET    /api/admin/smtp/logs          - Logs avec pagination
GET    /api/admin/smtp/stats         - Statistiques (30 derniers jours)
```

#### 6. **Templates d'Email Transactionnels**
4 templates prédéfinis en français:
- **registration_confirmation**: Email de confirmation d'inscription
- **password_reset**: Réinitialisation de mot de passe
- **welcome**: Email de bienvenue après activation
- **invoice_sent**: Notification d'envoi de facture

Tous avec design HTML responsive et version texte.

### Frontend

#### 1. **Page d'Administration SMTP**
Route: `/admin/smtp-config`

**Fonctionnalités:**
- Presets pour providers courants (Gmail, Outlook, SendGrid)
- Formulaire complet de configuration SMTP
- Masquage/affichage du mot de passe
- Options avancées (GDPR, tracking, retry)
- Test de connexion en temps réel
- Envoi d'email de test
- Statistiques en temps réel (emails envoyés, échecs, taux de succès)
- Status de vérification

**UX/UI:**
- Design moderne avec Tailwind CSS
- Messages de feedback instantanés
- Icônes Lucide React
- Conseils de configuration contextuels
- Responsive et accessible

#### 2. **Navigation**
- Ajouté dans AdminSidebar avec icône email
- Route protégée (admin uniquement)

## 🚀 Installation et Configuration

### 1. Variables d'Environnement

Ajouter dans `.env`:

```env
# Encryption (OBLIGATOIRE pour production)
ENCRYPTION_KEY=your-32-byte-hex-key-here

# Redis pour les colas d'emails (OBLIGATOIRE)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional-password

# SMTP Fallback (optionnel, si pas de config BD)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@simplifaq.com

# Frontend URL pour liens dans emails
FRONTEND_URL=http://localhost:3000
```

### 2. Générer une clé d'encryption

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copier la sortie dans `ENCRYPTION_KEY`.

### 3. Installer Redis

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 4. Migrer la Base de Données

```bash
cd backend
npx prisma migrate dev --name add_global_smtp_config
npx prisma generate
```

### 5. Seeder les Templates d'Email

```bash
cd backend
npx ts-node prisma/seedEmailTemplates.ts
```

### 6. Démarrer les Services

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 📋 Utilisation

### Configuration Initiale

1. **Accéder au panel admin**: `http://localhost:3000/admin/smtp-config`
2. **Choisir un preset** (Gmail, Outlook, etc.) ou configurer manuellement
3. **Remplir les informations**:
   - Serveur SMTP et port
   - Utilisateur et mot de passe
   - Email expéditeur et nom
4. **Tester la connexion**: Cliquer "Envoyer Email Test"
5. **Enregistrer** la configuration

### Fournisseurs Courants

#### Gmail
- **Host**: `smtp.gmail.com`
- **Port**: `587`
- **Secure**: `false` (STARTTLS)
- **Mot de passe**: Utiliser un **App Password** (pas le mot de passe Gmail)
  - Google Account → Security → 2-Step Verification → App Passwords

#### Outlook/Office365
- **Host**: `smtp.office365.com`
- **Port**: `587`
- **Secure**: `false`
- **User**: Votre email complet

#### SendGrid
- **Host**: `smtp.sendgrid.net`
- **Port**: `587`
- **User**: `apikey`
- **Password**: Votre API Key SendGrid

### Utilisation dans le Code

**Envoyer un email avec template:**
```typescript
import { EmailService } from './services/emailService';

await EmailService.sendRegistrationEmail(
  'user@example.com',
  'John Doe',
  'https://app.com/confirm?token=abc123'
);
```

**Envoyer un email personnalisé:**
```typescript
await EmailService.sendTemplateEmail({
  to: 'client@example.com',
  subject: 'Votre facture',
  templateName: 'invoice_sent',
  templateData: {
    clientName: 'Marie Dupont',
    invoiceNumber: 'FAC-2025-001',
    total: '1500.00',
    companyName: 'Ma Société SA',
  },
});
```

## 🔒 Sécurité

### Bonnes Pratiques Implémentées

1. **Encryption**: Mots de passe SMTP chiffrés en AES-256
2. **Validation**: Tous les inputs validés avec Zod
3. **Rate Limiting**: À implémenter sur endpoints de test
4. **GDPR**: Support pour liens de désabonnement
5. **Audit Trail**: Tous les emails loggés avec métadonnées
6. **Permissions**: Endpoints admin protégés

### Recommandations

- ✅ **NE JAMAIS** commit la clé `ENCRYPTION_KEY` dans Git
- ✅ Utiliser des **App Passwords** pour Gmail/Outlook
- ✅ Activer **2FA** sur comptes SMTP
- ✅ Utiliser **SendGrid/SES** pour production (meilleure délivrabilité)
- ✅ Monitorer les **bounce rates** via SmtpLog
- ✅ Implémenter **rate limiting** sur test emails

## 📊 Monitoring et Logs

### Dashboard SMTP

Accès: `/admin/smtp-config`

**Métriques affichées:**
- Total emails envoyés (30 derniers jours)
- Total échecs
- Emails en attente
- Taux de succès (%)

### Consultation des Logs

```typescript
GET /api/admin/smtp/logs?page=1&limit=50&status=failed&eventType=password_reset
```

**Filtres disponibles:**
- `status`: queued, sent, delivered, failed, bounced
- `eventType`: registration, password_reset, welcome, invoice_sent, etc.
- `emailTo`: Filtrer par destinataire
- `startDate` / `endDate`: Période

### Statistiques Détaillées

```typescript
GET /api/admin/smtp/stats
```

Retourne:
- Totaux par statut
- Taux de succès
- 10 derniers envois

## 🐛 Troubleshooting

### Problème: "Failed to connect to SMTP server"

**Solutions:**
1. Vérifier host et port
2. Vérifier firewall (autoriser port 587/465)
3. Tester avec `telnet smtp.gmail.com 587`
4. Vérifier credentials (app password pour Gmail)

### Problème: "Queue processing errors"

**Solutions:**
1. Vérifier que Redis est démarré: `redis-cli ping` → doit retourner `PONG`
2. Vérifier logs Redis
3. Redémarrer worker: `npm run dev` (relance automatiquement)

### Problème: "Emails not being sent"

**Solutions:**
1. Vérifier queue stats: `GET /api/admin/smtp/stats`
2. Consulter SmtpLog pour erreurs
3. Vérifier que config est `isActive: true`
4. Tester connexion SMTP manuellement

### Problème: "High bounce rate"

**Solutions:**
1. Vérifier SPF/DKIM/DMARC records
2. Utiliser un provider professionnel (SendGrid, SES)
3. Nettoyer liste d'emails (remove invalides)
4. Vérifier que fromEmail est vérifié

## 🔄 Migration depuis Config User-Based

Si vous aviez l'ancienne config SMTP par utilisateur:

```typescript
// Ancien (par utilisateur)
const config = {
  host: user.smtpHost,
  port: user.smtpPort,
  // ...
};

// Nouveau (global)
const config = await EmailService.getSmtpConfig();
// Automatiquement chargé depuis BD
```

Les anciennes configs user sont toujours supportées en fallback si besoin.

## 📚 Architecture

```
┌─────────────────┐
│  Admin Panel    │
│  /admin/smtp    │
└────────┬────────┘
         │ POST /api/admin/smtp/config
         ▼
┌─────────────────┐
│ adminSmtpCtrl   │
│  + encrypt()    │
└────────┬────────┘
         │ save to
         ▼
┌─────────────────┐      ┌──────────────┐
│   SmtpConfig    │◄─────│  Encryption  │
│   (Database)    │      │  AES-256     │
└────────┬────────┘      └──────────────┘
         │ read by
         ▼
┌─────────────────┐
│  EmailService   │
│  + templates    │
└────────┬────────┘
         │ queue
         ▼
┌─────────────────┐      ┌──────────────┐
│  EmailQueue     │◄─────│    Redis     │
│  (BullMQ)       │      │   Queue      │
└────────┬────────┘      └──────────────┘
         │ process
         ▼
┌─────────────────┐      ┌──────────────┐
│  Nodemailer     │─────►│  SMTP Server │
│  Transport      │      │  (Gmail/etc) │
└────────┬────────┘      └──────────────┘
         │ log
         ▼
┌─────────────────┐
│   SmtpLog       │
│  (Audit Trail)  │
└─────────────────┘
```

## 🎨 Templates Email

### Structure d'un Template

```typescript
{
  name: 'template_name',
  subject: 'Sujet avec {{variable}}',
  language: 'fr',
  htmlContent: `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Bonjour {{userName}}</h1>
        <p>{{message}}</p>
      </body>
    </html>
  `,
  textContent: 'Version texte avec {{variables}}',
  isActive: true
}
```

### Variables Handlebars Disponibles

**Registration:**
- `{{userName}}`: Nom de l'utilisateur
- `{{confirmationLink}}`: Lien de confirmation

**Password Reset:**
- `{{userName}}`: Nom
- `{{resetLink}}`: Lien de réinitialisation

**Welcome:**
- `{{userName}}`: Nom
- `{{companyName}}`: Nom entreprise
- `{{dashboardUrl}}`: URL du dashboard

**Invoice:**
- `{{clientName}}`: Nom du client
- `{{invoiceNumber}}`: Numéro de facture
- `{{total}}`: Montant total
- `{{companyName}}`: Entreprise émettrice

### Ajouter un Nouveau Template

1. Créer le template dans `seedEmailTemplates.ts`
2. Exécuter le seeder
3. Utiliser dans le code:

```typescript
await EmailService.sendTemplateEmail({
  to: 'user@example.com',
  subject: 'Mon sujet',
  templateName: 'my_new_template',
  templateData: { /* variables */ },
});
```

## 🔮 Évolutions Futures

### Court Terme
- [ ] Rate limiting sur endpoints de test
- [ ] Dashboard de statistiques avancées
- [ ] Webhooks pour events (bounce, open, click)
- [ ] Support multi-langue pour templates
- [ ] Preview de templates dans l'admin

### Moyen Terme
- [ ] A/B testing de templates
- [ ] Segmentation d'audience
- [ ] Scheduling d'emails
- [ ] Suppression liste (unsubscribe management)
- [ ] Import/export de templates

### Long Terme
- [ ] Email marketing campaigns
- [ ] Automation workflows
- [ ] Advanced analytics (open rates, click rates)
- [ ] Template editor WYSIWYG
- [ ] Multi-tenant SMTP configs

## 📞 Support

En cas de problème:
1. Consulter les logs: `/admin/smtp-logs`
2. Tester la configuration: Button "Tester"
3. Vérifier Redis: `redis-cli ping`
4. Consulter cette documentation

---

**Version:** 1.0.0  
**Date:** Janvier 2025  
**Statut:** ✅ Production Ready
