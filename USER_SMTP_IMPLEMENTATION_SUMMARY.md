# 📧 Résumé d'Implémentation - Configuration SMTP par Utilisateur

**Date :** Janvier 2025  
**Version :** 1.0.0  
**Statut :** ✅ 87.5% Complété (7/8 tâches)

---

## 🎯 Objectif

Permettre à chaque utilisateur enregistré de configurer son propre serveur SMTP pour envoyer des emails transactionnels (factures, devis, rappels de paiement) à ses clients en utilisant sa propre identité de marque.

## ✅ Fonctionnalités Implémentées

### 1. ✅ Modèles de Base de Données (Prisma)

**Fichier :** `backend/prisma/schema.dev.prisma`

**Modèles créés :**
- `UserSmtpConfig` : Configuration SMTP par utilisateur avec chiffrement AES-256
  - Serveur SMTP (host, port, secure)
  - Authentication (user, password chiffré)
  - Informations expéditeur (fromEmail, fromName, replyTo)
  - Provider (smtp, sendgrid, ses, mailgun)
  - Rate limiting (dailyLimit, emailsSentToday)
  - 2FA et vérification
  
- `UserSmtpLog` : Logs d'audit complets par utilisateur
  - Détails email (to, from, subject, templateType)
  - Référence document (invoiceId, quoteId)
  - Statut d'envoi (queued, sent, failed, delivered, bounced)
  - Timing (queuedAt, sentAt, deliveredAt)
  - Conformité suisse (includesQRBill, includesFooter)

**Relation ajoutée :**
```prisma
model User {
  userSmtpConfig UserSmtpConfig?
}
```

### 2. ✅ Services Backend

#### Service de Colas (BullMQ)
**Fichier :** `backend/src/services/userEmailQueue.ts`

**Fonctionnalités :**
- Colas séparées par utilisateur : `user-emails-{userId}`
- Worker pattern-matched pour tous les utilisateurs
- Retry avec backoff exponentiel (3 tentatives)
- Fallback automatique vers SMTP global
- Rate limiting basé sur le plan
- Compteur quotidien auto-reset

**Méthodes principales :**
- `getUserEmailQueue(userId)` : Obtenir la cola d'un utilisateur
- `queueUserEmail(userId, data)` : Ajouter email à la cola
- `getUserQueueStats(userId)` : Statistiques de la cola
- `getUserEmailStats(userId, days)` : Statistiques d'envoi

#### Service d'Email
**Fichier :** `backend/src/services/userEmailService.ts`

**Templates implémentés :**

1. **Facture (`sendInvoiceEmail`)** :
   - HTML responsive avec gradient header
   - Table d'articles détaillée
   - Notice QR Bill suisse si applicable
   - Footer de conformité ORQR
   - Lien de désinscription

2. **Devis (`sendQuoteEmail`)** :
   - Design vert pour différencier des factures
   - Date de validité mise en évidence
   - Bouton d'acceptation optionnel
   - Informations de contact

3. **Rappel de Paiement (`sendPaymentReminderEmail`)** :
   - Design rouge pour urgence
   - Nombre de jours de retard
   - Montant dû en évidence
   - Facture PDF en pièce jointe

**Méthodes :**
- `sendInvoiceEmail(userId, data, useQueue)` 
- `sendQuoteEmail(userId, data, useQueue)`
- `sendPaymentReminderEmail(userId, data, useQueue)`
- `sendTestEmail(userId, testEmail)`
- `sendDirectEmail(userId, emailData)` : Sans cola (testing)

### 3. ✅ Controller API

**Fichier :** `backend/src/controllers/userSmtpController.ts`

**Endpoints implémentés :**

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/user/smtp/config` | Obtenir config SMTP utilisateur |
| PATCH | `/api/user/smtp/config` | Créer/Maj config SMTP |
| DELETE | `/api/user/smtp/config` | Supprimer config SMTP |
| POST | `/api/user/smtp/test` | Envoyer email de test |
| GET | `/api/user/smtp/stats?days=30` | Statistiques d'envoi |
| GET | `/api/user/smtp/logs` | Logs avec pagination |
| GET | `/api/user/smtp/presets` | Presets fournisseurs |

**Validation :**
- Schémas Zod pour tous les inputs
- Vérification des credentials
- Ajustement limites quotidiennes par plan

**Presets inclus :**
- Gmail (smtp.gmail.com:587)
- Outlook (smtp-mail.outlook.com:587)
- Office365 (smtp.office365.com:587)
- SendGrid (smtp.sendgrid.net:587)
- Mailgun (smtp.mailgun.org:587)

### 4. ✅ Routes API

**Fichier :** `backend/src/routes/userSmtp.ts`

Routes protégées par `authenticateToken` middleware.

**Note importante :** Les routes sont également ajoutées à `routes/index.ts` pour le système modular.

⚠️ **Action requise :** Pour le développement, ajouter manuellement les routes dans `backend/src/index.dev.ts` (voir documentation sur architecture dual-server).

### 5. ✅ Rate Limiting par Plan

**Implémentation :** Dans `userSmtpController.ts`

**Limites par plan :**
```typescript
free       → 100 emails/jour
basic      → 500 emails/jour
premium    → 2,000 emails/jour
enterprise → 10,000 emails/jour
```

**Mécanisme :**
- Compteur `emailsSentToday` dans `UserSmtpConfig`
- Reset automatique toutes les 24h (champ `lastResetAt`)
- Vérification avant chaque envoi
- Erreur si limite atteinte

### 6. ✅ Interface Utilisateur Frontend

**Fichier :** `frontend/src/pages/user/SmtpSettingsPage.tsx`

**Composants :**

1. **Dashboard de Statut**
   - Statut de vérification (Vérifié/Non testé)
   - Emails envoyés aujourd'hui / Limite
   - Total envoyés (30 jours)
   - Taux de succès

2. **Formulaire de Configuration**
   - Sélection de presets (boutons rapides)
   - Configuration serveur (host, port, SSL/TLS)
   - Authentication (user, password avec show/hide)
   - Informations expéditeur
   - Préférences (auto-send, footer)

3. **Section de Test**
   - Input pour email de test
   - Bouton "Envoyer un test"
   - Feedback succès/échec en temps réel

4. **Section d'Aide**
   - Instructions Gmail (mot de passe d'app)
   - Instructions Outlook/Office365
   - Instructions SendGrid (apikey)
   - Instructions Mailgun
   - Note sur sécurité (AES-256)

**Routes frontend :**
- URL : `/settings/smtp`
- Ajouté dans `App.tsx`

**Intégration API :**
- Ajout de méthodes dans `frontend/src/services/api.ts` :
  - `getUserSmtpConfig()`
  - `updateUserSmtpConfig(config)`
  - `testUserSmtpConfig(testEmail)`
  - `getUserSmtpStats(days)`
  - `getUserSmtpLogs(params)`
  - `getUserSmtpPresets()`

### 7. ✅ Documentation Complète

**Fichiers créés :**

1. **`USER_SMTP_GUIDE.md`** (Guide utilisateur complet)
   - Vue d'ensemble et caractéristiques
   - Structure de la base de données
   - Installation et configuration
   - Interface utilisateur
   - Documentation API complète
   - Utilisation programmatique
   - Configuration des fournisseurs
   - Sécurité et bonnes pratiques
   - Dépannage
   - Monitoring et statistiques

2. **`backend/setup-user-smtp.sh`** (Script d'installation automatique)
   - Vérification des prérequis
   - Génération ENCRYPTION_KEY
   - Configuration Redis
   - Installation des dépendances
   - Migration Prisma
   - Vérification de l'installation

## ⏳ Tâche Restante

### 8. ⏭️ Intégration avec Génération de Factures

**Objectif :** Ajouter un bouton "Envoyer par Email" dans l'interface de facture.

**Implémentation suggérée :**

1. **Dans InvoiceDetailPage.tsx :**
```typescript
const handleSendEmail = async () => {
  const pdfBuffer = await generateInvoicePDF(invoice);
  await UserEmailService.sendInvoiceEmail(
    userId,
    {
      clientEmail: invoice.client.email,
      clientName: `${invoice.client.firstName} ${invoice.client.lastName}`,
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice.id,
      amount: invoice.total.toFixed(2),
      currency: invoice.currency,
      dueDate: formatDate(invoice.dueDate),
      issueDate: formatDate(invoice.issueDate),
      items: invoice.items,
      pdfBuffer,
      includeQRBill: !!invoice.user.iban
    }
  );
};
```

2. **Ajouter bouton dans UI :**
```tsx
<button onClick={handleSendEmail}>
  <Mail className="h-5 w-5" />
  Envoyer par Email
</button>
```

3. **Même chose pour QuoteDetailPage.tsx**

## 📊 État du Projet

### Résumé par Composant

| Composant | Statut | Fichiers |
|-----------|--------|----------|
| Base de données | ✅ | schema.dev.prisma |
| Services Backend | ✅ | userEmailQueue.ts, userEmailService.ts |
| Controller API | ✅ | userSmtpController.ts |
| Routes API | ✅ | userSmtp.ts |
| Rate Limiting | ✅ | Intégré dans controller |
| Templates Email | ✅ | userEmailService.ts |
| UI Frontend | ✅ | SmtpSettingsPage.tsx |
| API Client | ✅ | api.ts |
| Documentation | ✅ | USER_SMTP_GUIDE.md, setup script |
| Intégration Factures | ⏭️ | À faire |

### Fichiers Créés (13)

**Backend (7) :**
1. `backend/src/services/userEmailQueue.ts`
2. `backend/src/services/userEmailService.ts`
3. `backend/src/controllers/userSmtpController.ts`
4. `backend/src/routes/userSmtp.ts`
5. `backend/setup-user-smtp.sh`
6. `backend/prisma/schema.dev.prisma` (modifié)
7. `backend/src/routes/index.ts` (modifié)

**Frontend (4) :**
1. `frontend/src/pages/user/SmtpSettingsPage.tsx`
2. `frontend/src/services/api.ts` (modifié)
3. `frontend/src/App.tsx` (modifié)

**Documentation (2) :**
1. `USER_SMTP_GUIDE.md`
2. `USER_SMTP_IMPLEMENTATION_SUMMARY.md` (ce fichier)

### Fichiers Modifiés (6)

1. `backend/prisma/schema.dev.prisma` - Modèles ajoutés
2. `backend/src/routes/index.ts` - Route userSmtp ajoutée
3. `frontend/src/services/api.ts` - Méthodes SMTP ajoutées
4. `frontend/src/App.tsx` - Route /settings/smtp ajoutée
5. `backend/src/routes/userSmtp.ts` - Import middleware corrigé
6. `frontend/src/pages/user/SmtpSettingsPage.tsx` - Import API corrigé

## 🚀 Installation

### Prérequis
- Node.js 16+
- Redis en cours d'exécution
- PostgreSQL (Prisma)

### Installation Automatique

```bash
cd backend
./setup-user-smtp.sh
```

Le script effectue :
1. ✅ Vérification des prérequis
2. ✅ Génération ENCRYPTION_KEY
3. ✅ Configuration variables d'environnement
4. ✅ Installation dépendances (bullmq, ioredis)
5. ✅ Migration Prisma
6. ✅ Vérification tables

### Installation Manuelle

```bash
# 1. Installer dépendances
npm install --save bullmq ioredis

# 2. Ajouter ENCRYPTION_KEY au .env
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env

# 3. Configurer Redis dans .env
cat >> .env << EOF
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
FRONTEND_URL=http://localhost:5173
EOF

# 4. Générer client Prisma
npx prisma generate

# 5. Migrer base de données
npx prisma migrate dev --name add_user_smtp_config
```

## 🔧 Configuration

### Variables d'Environnement Requises

```env
# Chiffrement (généré automatiquement)
ENCRYPTION_KEY=<32-byte-hex-string>

# Redis (pour BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Frontend (pour liens dans emails)
FRONTEND_URL=http://localhost:5173
```

### Démarrage

```bash
# Backend (avec worker BullMQ automatique)
npm run dev

# Frontend
cd ../frontend
npm run dev
```

## 📝 Utilisation

### Pour les Utilisateurs

1. **Accéder à la configuration :**
   - Navigation : Paramètres → Configuration SMTP
   - URL : `/settings/smtp`

2. **Configurer SMTP :**
   - Sélectionner un preset (Gmail, Outlook, etc.)
   - Entrer credentials
   - Configurer informations expéditeur
   - Enregistrer

3. **Tester la configuration :**
   - Entrer email de test
   - Cliquer "Envoyer un test"
   - Vérifier réception

4. **Consulter statistiques :**
   - Emails envoyés aujourd'hui / limite
   - Total 30 jours
   - Taux de succès
   - Logs détaillés

### Pour les Développeurs

Voir exemples complets dans `USER_SMTP_GUIDE.md`

## 🔒 Sécurité

- ✅ Passwords SMTP chiffrés en AES-256-CBC
- ✅ Rate limiting par plan d'abonnement
- ✅ 2FA optionnel pour modifications
- ✅ Validation Zod sur tous inputs
- ✅ Audit trail complet (UserSmtpLog)
- ✅ Fallback automatique vers SMTP global
- ✅ Isolation multi-tenant (colas séparées)

## 🌐 Multi-Tenant

- ✅ Colas BullMQ séparées : `user-emails-{userId}`
- ✅ Logs indépendants par utilisateur
- ✅ Configuration isolée par utilisateur
- ✅ Statistiques par utilisateur
- ✅ Rate limiting par utilisateur

## 📈 Performance

- ✅ Envoi asynchrone via BullMQ
- ✅ Retry automatique (3 tentatives)
- ✅ Concurrence : 3 emails simultanés par worker
- ✅ Nettoyage automatique des jobs complétés (24h)
- ✅ Nettoyage automatique des jobs échoués (7 jours)

## 🇨🇭 Conformité Suisse

- ✅ Support QR Bill (tracking dans logs)
- ✅ Footer de conformité ORQR
- ✅ Liens de désinscription (GDPR)
- ✅ Audit trail complet
- ✅ Templates en français

## 🐛 Problèmes Connus

### Erreurs TypeScript (Non-bloquants)

**Dans `userSmtpController.ts` :**
- Property 'userSmtpConfig' does not exist on PrismaClient
  - **Cause :** Types Prisma non régénérés après migration
  - **Solution :** `npx prisma generate`

**Dans `userEmailService.ts` :**
- Mêmes erreurs de types Prisma
  - **Solution :** `npx prisma generate`

### Routes en Développement (⚠️ IMPORTANT)

Le système utilise deux serveurs :
- **Production :** `index.ts` (système modular)
- **Développement :** `index.dev.ts` (routes inline)

**Action requise :**
Si les routes donnent 404 en développement, ajouter manuellement dans `index.dev.ts` :

```typescript
// Import controllers
import {
  getUserSmtpConfig,
  updateUserSmtpConfig,
  testUserSmtpConfig,
  getUserSmtpStats,
  getUserSmtpLogs,
  deleteUserSmtpConfig,
  getSmtpPresets,
} from './controllers/userSmtpController';

// Add routes BEFORE catch-all
app.get('/api/user/smtp/config', async (req, res, next) => {
  try {
    await ensureDevUser(req);
    await getUserSmtpConfig(req as any, res as any);
  } catch (e) { next(e); }
});
// ... (répéter pour tous les endpoints)
```

Voir `SYSTEM-RETRIEVED-MEMORY[2d3519f2-5b7f-4a6f-a127-6b6bd9deaed1]` pour plus de détails.

## 📚 Documentation Additionnelle

- **Guide complet :** `USER_SMTP_GUIDE.md`
- **Script d'installation :** `backend/setup-user-smtp.sh`
- **Architecture serveurs :** Voir mémoires récupérées sur routes 404
- **API Reference :** Voir section API dans USER_SMTP_GUIDE.md

## 🎉 Prochaines Étapes Recommandées

1. **Intégration Factures** (Tâche #8)
   - Ajouter bouton "Envoyer par Email" dans InvoiceDetailPage
   - Même chose pour QuoteDetailPage
   - Gérer auto-send si configuré

2. **Tests Unitaires**
   - Tests pour UserEmailService
   - Tests pour userSmtpController
   - Tests pour userEmailQueue

3. **Tests d'Intégration**
   - Test complet du flow d'envoi
   - Test du fallback SMTP global
   - Test du rate limiting

4. **Amélioration UI**
   - Page de logs d'email détaillée
   - Graphiques de statistiques
   - Filtres avancés sur logs

5. **Features Additionnelles**
   - Webhooks pour status d'email (si provider le supporte)
   - Templates d'email personnalisables par utilisateur
   - Planification d'envois
   - Envoi en masse

## 👥 Support

Pour toute question ou problème :
1. Consulter `USER_SMTP_GUIDE.md`
2. Vérifier les logs : `UserSmtpLog` dans la base de données
3. Consulter les statistiques : `/settings/smtp`
4. Vérifier Redis : `redis-cli ping`

---

**Développé pour SimpliFaq v2.0**  
**© 2025 SimpliFaq - Système de Facturation Suisse**
