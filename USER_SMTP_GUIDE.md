# 📧 Guide de Configuration SMTP Personnalisée par Utilisateur

## Vue d'ensemble

Ce système permet à chaque utilisateur enregistré de configurer son propre serveur SMTP pour envoyer des emails transactionnels (factures, devis, rappels de paiement) à ses clients en utilisant sa propre identité de marque.

## 🎯 Caractéristiques Principales

### Sécurité
- **Chiffrement AES-256-CBC** pour tous les mots de passe SMTP
- **Rate limiting** basé sur le plan d'abonnement (100-10,000 emails/jour)
- **2FA optionnel** pour modifier la configuration
- **Fallback automatique** vers le SMTP global en cas d'échec

### Multi-Tenant
- **Colas séparées** par utilisateur (BullMQ avec Redis)
- **Logs indépendants** pour chaque utilisateur
- **Statistiques détaillées** par utilisateur
- **Isolation complète** des configurations

### Conformité Suisse
- **QR Bill tracking** automatique
- **Footer de conformité ORQR** inclus
- **Liens de désinscription** (GDPR)
- **Audit trail complet**

### Templates d'Email
- **Factures** avec PDF et QR Bill
- **Devis** avec lien d'acceptation
- **Rappels de paiement** avec nombre de jours de retard
- **HTML responsive** + version texte brut

## 📋 Structure de la Base de Données

### UserSmtpConfig
```prisma
model UserSmtpConfig {
  id              String   @id @default(cuid())
  userId          String   @unique
  
  // Configuration SMTP
  host            String
  port            Int      @default(587)
  secure          Boolean  @default(false)
  user            String
  password        String   // Chiffré AES-256
  
  // Informations expéditeur
  fromEmail       String
  fromName        String
  replyTo         String?
  
  // Provider
  provider        String   @default("smtp")
  apiKey          String?  // Chiffré
  
  // Statut
  isActive        Boolean  @default(true)
  isVerified      Boolean  @default(false)
  lastTestedAt    DateTime?
  
  // Préférences
  enableAutoSend  Boolean  @default(false)
  includeFooter   Boolean  @default(true)
  
  // Rate Limiting
  dailyLimit      Int      @default(1000)
  emailsSentToday Int      @default(0)
  lastResetAt     DateTime @default(now())
  
  // 2FA
  requires2FA     Boolean  @default(true)
  last2FAVerified DateTime?
  
  // Relations
  user            User     @relation(fields: [userId], references: [id])
  smtpLogs        UserSmtpLog[]
}
```

### UserSmtpLog
```prisma
model UserSmtpLog {
  id             String   @id @default(cuid())
  userId         String
  smtpConfigId   String?
  
  // Détails de l'email
  emailTo        String
  emailFrom      String
  subject        String
  templateType   String   // invoice, quote, payment_reminder
  
  // Référence document
  invoiceId      String?
  quoteId        String?
  documentNumber String?
  
  // Pièces jointes
  hasAttachment  Boolean  @default(false)
  attachmentType String?
  attachmentSize Int?
  
  // Statut
  status         String   // queued, sent, delivered, failed, bounced
  provider       String   @default("smtp")
  messageId      String?
  
  // Erreurs
  errorMessage   String?
  errorCode      String?
  retryCount     Int      @default(0)
  usedFallback   Boolean  @default(false)
  
  // Timing
  queuedAt       DateTime @default(now())
  sentAt         DateTime?
  deliveredAt    DateTime?
  
  // Conformité
  includesQRBill Boolean  @default(false)
  includesFooter Boolean  @default(true)
  
  // Relations
  userSmtpConfig UserSmtpConfig? @relation(fields: [smtpConfigId], references: [id])
}
```

## 🚀 Installation et Configuration

### 1. Migration de la Base de Données

```bash
cd backend
npx prisma migrate dev --name add_user_smtp_config
npx prisma generate
```

### 2. Démarrer le Worker d'Email

Le worker BullMQ est démarré automatiquement avec le service backend. Assurez-vous que Redis est en cours d'exécution :

```bash
# Vérifier Redis
redis-cli ping  # Devrait répondre "PONG"

# Si Redis n'est pas installé
sudo apt install redis-server  # Ubuntu/Debian
brew install redis             # macOS
```

### 3. Variables d'Environnement

Ajoutez ces variables à votre fichier `.env` :

```env
# Déjà configuré pour le SMTP global
ENCRYPTION_KEY=your-32-byte-encryption-key
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
FRONTEND_URL=http://localhost:5173
```

## 🎨 Interface Utilisateur

### Accéder à la Configuration

Les utilisateurs peuvent accéder à leurs paramètres SMTP via :

**URL :** `/settings/smtp`

**Navigation :** Paramètres → Configuration SMTP

### Fonctionnalités de l'Interface

1. **Presets de Fournisseurs**
   - Gmail
   - Outlook / Office 365
   - SendGrid
   - Mailgun
   - Configuration personnalisée

2. **Formulaire de Configuration**
   - Serveur SMTP et port
   - Authentification (utilisateur/mot de passe)
   - Email expéditeur et nom
   - Options SSL/TLS
   - Préférences d'envoi

3. **Test de Configuration**
   - Envoi d'email de test
   - Validation en temps réel
   - Vérification de la connexion

4. **Statistiques**
   - Emails envoyés aujourd'hui / limite quotidienne
   - Total envoyés (30 derniers jours)
   - Taux de succès
   - Répartition par type (factures, devis, rappels)

## 📡 API Endpoints

### GET /api/user/smtp/config
Récupère la configuration SMTP de l'utilisateur.

**Réponse :**
```json
{
  "config": {
    "id": "cuid",
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "user": "user@example.com",
    "fromEmail": "contact@entreprise.ch",
    "fromName": "Mon Entreprise - Facturation",
    "provider": "smtp",
    "isVerified": true,
    "dailyLimit": 1000,
    "emailsSentToday": 42
  },
  "presets": { ... }
}
```

### PATCH /api/user/smtp/config
Crée ou met à jour la configuration SMTP.

**Requête :**
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "user@gmail.com",
  "password": "app-specific-password",
  "fromEmail": "contact@entreprise.ch",
  "fromName": "Mon Entreprise - Facturation",
  "replyTo": "support@entreprise.ch",
  "provider": "smtp",
  "enableAutoSend": false,
  "includeFooter": true
}
```

### POST /api/user/smtp/test
Envoie un email de test pour valider la configuration.

**Requête :**
```json
{
  "testEmail": "test@example.com"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "details": {
    "messageId": "<message-id@domain>",
    "from": "Mon Entreprise <contact@entreprise.ch>",
    "provider": "smtp",
    "verified": true
  }
}
```

### GET /api/user/smtp/stats?days=30
Récupère les statistiques d'envoi d'emails.

**Réponse :**
```json
{
  "queue": {
    "waiting": 0,
    "active": 2,
    "completed": 150,
    "failed": 3
  },
  "email": {
    "totalSent": 150,
    "totalFailed": 3,
    "successRate": 98.04,
    "byTemplate": {
      "invoice": 120,
      "quote": 25,
      "payment_reminder": 5
    }
  },
  "config": {
    "dailyLimit": 1000,
    "emailsSentToday": 42,
    "isVerified": true
  }
}
```

### GET /api/user/smtp/logs
Récupère les logs d'emails avec pagination.

**Paramètres :**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (optionnel: sent, failed, queued)
- `templateType` (optionnel: invoice, quote, payment_reminder)

## 💻 Utilisation Programmatique

### Envoyer une Facture

```typescript
import { UserEmailService } from './services/userEmailService';

await UserEmailService.sendInvoiceEmail(
  userId,
  {
    clientEmail: 'client@example.com',
    clientName: 'Jean Dupont',
    invoiceNumber: 'FAC-2025-001',
    invoiceId: 'invoice-id',
    amount: '1500.00',
    currency: 'CHF',
    dueDate: '15.02.2025',
    issueDate: '15.01.2025',
    items: [
      {
        description: 'Consultation',
        quantity: 1,
        unitPrice: 1500.00,
        total: 1500.00
      }
    ],
    pdfBuffer: invoicePdfBuffer,
    includeQRBill: true
  },
  true // useQueue = true (recommandé)
);
```

### Envoyer un Devis

```typescript
await UserEmailService.sendQuoteEmail(
  userId,
  {
    clientEmail: 'client@example.com',
    clientName: 'Jean Dupont',
    quoteNumber: 'DEV-2025-001',
    quoteId: 'quote-id',
    total: '2500.00',
    currency: 'CHF',
    validUntil: '15.02.2025',
    issueDate: '15.01.2025',
    items: [ ... ],
    acceptLink: 'https://app.com/quotes/quote-id/accept',
    pdfBuffer: quotePdfBuffer
  }
);
```

### Envoyer un Rappel de Paiement

```typescript
await UserEmailService.sendPaymentReminderEmail(
  userId,
  {
    clientEmail: 'client@example.com',
    clientName: 'Jean Dupont',
    invoiceNumber: 'FAC-2025-001',
    invoiceId: 'invoice-id',
    amount: '1500.00',
    currency: 'CHF',
    dueDate: '15.01.2025',
    daysPastDue: 7,
    pdfBuffer: invoicePdfBuffer
  }
);
```

## ⚙️ Limites par Plan

Les limites quotidiennes d'envoi sont automatiquement ajustées selon le plan d'abonnement :

| Plan       | Emails/Jour | Recommandation                    |
|------------|-------------|-----------------------------------|
| Free       | 100         | Idéal pour tester                 |
| Basic      | 500         | Petites entreprises               |
| Premium    | 2,000       | Entreprises moyennes              |
| Enterprise | 10,000      | Grandes entreprises               |

**Note :** Le compteur est réinitialisé automatiquement toutes les 24 heures.

## 🔧 Configuration des Fournisseurs

### Gmail

1. **Activer la validation en 2 étapes** sur votre compte Google
2. **Générer un mot de passe d'application** :
   - Compte Google → Sécurité → Validation en 2 étapes
   - Mots de passe des applications
   - Sélectionner "Mail" et votre appareil
3. **Configurer dans SimpliFaq** :
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Secure: `Non` (TLS)
   - User: Votre email Gmail complet
   - Password: Le mot de passe d'application généré

### Outlook / Office 365

1. **Vérifier que SMTP est activé** dans votre compte Microsoft
2. **Configurer dans SimpliFaq** :
   - Host: `smtp-mail.outlook.com` ou `smtp.office365.com`
   - Port: `587`
   - Secure: `Non` (TLS)
   - User: Votre email complet
   - Password: Votre mot de passe de compte

### SendGrid

1. **Créer une clé API** dans le dashboard SendGrid
2. **Configurer dans SimpliFaq** :
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Secure: `Non` (TLS)
   - User: `apikey` (littéralement le mot "apikey")
   - Password: Votre clé API SendGrid

### Mailgun

1. **Récupérer vos credentials SMTP** du dashboard Mailgun
2. **Configurer dans SimpliFaq** :
   - Host: `smtp.mailgun.org` ou votre domaine personnalisé
   - Port: `587`
   - Secure: `Non` (TLS)
   - User: Votre username SMTP Mailgun
   - Password: Votre password SMTP Mailgun

## 🛡️ Sécurité et Bonnes Pratiques

### Sécurité

1. **Mots de passe chiffrés** : Tous les mots de passe SMTP sont chiffrés avec AES-256-CBC
2. **2FA recommandé** : Activez la vérification 2FA pour modifier votre configuration
3. **Rate limiting** : Protection automatique contre l'abus
4. **Audit logs** : Tous les envois sont tracés

### Bonnes Pratiques

1. **Utilisez des mots de passe d'application** plutôt que vos mots de passe principaux
2. **Testez votre configuration** avant de l'utiliser en production
3. **Surveillez vos statistiques** pour détecter les problèmes rapidement
4. **Configurez un email de réponse** approprié pour vos clients
5. **Vérifiez les limites de votre fournisseur** SMTP

## 🐛 Dépannage

### L'email de test échoue

1. **Vérifiez vos credentials** : Username et password corrects
2. **Vérifiez le port** : 587 pour TLS, 465 pour SSL
3. **Vérifiez SSL/TLS** : Cochez "SSL" seulement pour le port 465
4. **Vérifiez les restrictions** : Certains fournisseurs bloquent SMTP par défaut
5. **Consultez les logs** : Utilisez les logs d'erreur pour identifier le problème

### Les emails ne sont pas envoyés

1. **Vérifiez la limite quotidienne** : Vous avez peut-être atteint votre quota
2. **Vérifiez la file d'attente** : Consultez les statistiques de la queue
3. **Vérifiez les logs** : Recherchez les erreurs dans les logs d'envoi
4. **Testez la connexion** : Envoyez un email de test

### Les emails arrivent en spam

1. **Configurez SPF** : Ajoutez votre serveur SMTP à vos enregistrements DNS SPF
2. **Configurez DKIM** : Activez DKIM sur votre fournisseur SMTP
3. **Configurez DMARC** : Configurez une politique DMARC pour votre domaine
4. **Utilisez un domaine vérifié** : Envoyez depuis un domaine que vous possédez

### Erreur "Daily limit exceeded"

Le compteur se réinitialise automatiquement toutes les 24 heures. Si vous avez besoin d'une limite plus élevée :
1. **Passez à un plan supérieur** dans vos paramètres d'abonnement
2. **Contactez le support** pour des besoins spécifiques

## 📊 Monitoring et Statistiques

### Dashboard Utilisateur

Accessible via `/settings/smtp`, affiche :
- **Statut de vérification** de votre configuration
- **Emails envoyés aujourd'hui** vs limite quotidienne
- **Statistiques 30 jours** : total envoyés, taux de succès
- **Répartition par type** : factures, devis, rappels

### Logs Détaillés

Chaque email envoyé est tracé avec :
- Date et heure d'envoi
- Destinataire
- Type de document (facture, devis, rappel)
- Statut (envoyé, échoué, en attente)
- Message d'erreur si applicable
- Utilisation du fallback global

## 🔄 Système de Fallback

Si l'envoi via votre SMTP personnel échoue, le système bascule automatiquement vers le SMTP global configuré par l'administrateur :

1. **Première tentative** : Votre SMTP personnel
2. **En cas d'échec** : SMTP global (fallback)
3. **Logging** : Le log indique `usedFallback: true`
4. **Notification** : Vous êtes informé de l'utilisation du fallback

## 📚 Ressources Additionnelles

- **Code source** : `backend/src/services/userEmailService.ts`
- **Templates** : Fichier de service inclut les templates HTML
- **API Controller** : `backend/src/controllers/userSmtpController.ts`
- **Frontend** : `frontend/src/pages/user/SmtpSettingsPage.tsx`

## 🆘 Support

Pour toute question ou problème :
1. **Consultez les logs** dans l'interface utilisateur
2. **Vérifiez cette documentation**
3. **Contactez le support** via le système de tickets

---

**Version :** 1.0.0  
**Dernière mise à jour :** Janvier 2025  
**Compatibilité :** SimpliFaq v2.0+
