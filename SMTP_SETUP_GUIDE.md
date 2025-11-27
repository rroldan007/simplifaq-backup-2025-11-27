# 🚀 Guide Rapide - Configuration SMTP Globale

## Installation Express (5 minutes)

### 1. Setup Automatique

```bash
cd backend
chmod +x setup-smtp.sh
./setup-smtp.sh
```

Ce script va:
- ✅ Générer une clé d'encryption sécurisée
- ✅ Configurer Redis
- ✅ Installer les dépendances (BullMQ, Handlebars, etc.)
- ✅ Migrer la base de données
- ✅ Seeder les templates d'email

### 2. Vérifier Redis

```bash
# Ubuntu/Debian
sudo systemctl status redis
sudo systemctl start redis  # si pas démarré

# macOS
brew services start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### 3. Démarrer les Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Configuration Initiale

1. **Accéder**: http://localhost:3000/admin/login
2. **Login admin**: Vos credentials admin
3. **Navigation**: Menu → **Configuration SMTP**
4. **Configurer**:
   - Choisir preset (Gmail recommandé pour tests)
   - Remplir les informations
   - Tester la connexion
   - Enregistrer

## Configuration Gmail (Recommandé pour tests)

### Créer un App Password

1. **Google Account** → https://myaccount.google.com/security
2. **2-Step Verification** → Activer si pas déjà fait
3. **App Passwords** → Générer un nouveau
4. **Choisir**: "Mail" et "Other" (SimpliFaq)
5. **Copier** le mot de passe à 16 caractères

### Dans SimpliFaq Admin Panel

```
Serveur SMTP: smtp.gmail.com
Port: 587
SSL/TLS: Non coché (utilise STARTTLS)
Utilisateur: votre-email@gmail.com
Mot de passe: [votre app password 16 caractères]
Email Expéditeur: votre-email@gmail.com
Nom Expéditeur: SimpliFaq
```

Cliquer **"Envoyer Email Test"** → Vérifier votre boîte mail

## Fichiers Créés

### Backend
```
backend/
├── prisma/
│   ├── schema.dev.prisma          (+ SmtpConfig, SmtpLog models)
│   └── seedEmailTemplates.ts      (4 templates transactionnels)
├── src/
│   ├── controllers/
│   │   └── adminSmtpController.ts (CRUD + test endpoints)
│   ├── routes/
│   │   └── adminSmtp.ts           (Routes /api/admin/smtp/*)
│   ├── services/
│   │   ├── emailService.ts        (Mis à jour avec queue)
│   │   └── emailQueue.ts          (BullMQ worker)
│   └── utils/
│       └── encryption.ts          (AES-256 encryption)
├── SMTP_CONFIGURATION.md          (Documentation complète)
└── setup-smtp.sh                  (Script d'installation)
```

### Frontend
```
frontend/src/
├── pages/admin/
│   └── SmtpConfigPage.tsx         (Interface d'administration)
├── components/admin/
│   └── AdminSidebar.tsx           (+ lien SMTP Config)
└── router/
    └── index.tsx                  (+ route /admin/smtp-config)
```

## Architecture Simplifiée

```
Admin UI → API → SmtpConfig (BD) → EmailQueue (Redis) → SMTP Server
                                         ↓
                                    SmtpLog (Audit)
```

## Tests Rapides

### Test 1: Connexion SMTP
```bash
curl -X POST http://localhost:3001/api/admin/smtp/config/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "votre-email@example.com", "configId": "config-id"}'
```

### Test 2: Envoyer Email de Bienvenue
```typescript
// Dans votre code
import { EmailService } from './services/emailService';

await EmailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  'Ma Société SA'
);
```

### Test 3: Consulter Stats
```bash
curl http://localhost:3001/api/admin/smtp/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Variables d'Environnement Requises

```env
# OBLIGATOIRE - Génération auto par setup-smtp.sh
ENCRYPTION_KEY=your-64-char-hex-key

# OBLIGATOIRE - Redis pour queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OPTIONNEL - Fallback si pas de config BD
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=noreply@simplifaq.com

# Requis pour liens dans emails
FRONTEND_URL=http://localhost:3000
```

## Dépannage Express

| Problème | Solution |
|----------|----------|
| Redis connection error | `sudo systemctl start redis` |
| ENCRYPTION_KEY missing | Exécuter `setup-smtp.sh` |
| Migration fails | Vérifier `DATABASE_URL` dans .env |
| Gmail auth fails | Utiliser App Password (pas mot de passe normal) |
| Emails pas envoyés | Vérifier queue: GET `/api/admin/smtp/stats` |

## Endpoints API Disponibles

```
GET    /api/admin/smtp/config        # Config active
POST   /api/admin/smtp/config        # Créer/modifier
POST   /api/admin/smtp/config/test   # Tester + envoyer email
DELETE /api/admin/smtp/config/:id    # Supprimer
GET    /api/admin/smtp/logs          # Logs (pagination)
GET    /api/admin/smtp/stats         # Statistiques
```

## Templates Email Inclus

✅ **registration_confirmation** - Confirmation d'inscription  
✅ **password_reset** - Réinitialisation mot de passe  
✅ **welcome** - Bienvenue après activation  
✅ **invoice_sent** - Notification facture envoyée  

Tous en français 🇫🇷 avec design responsive.

## Production Checklist

- [ ] Configurer `ENCRYPTION_KEY` unique et sécurisée
- [ ] Utiliser SendGrid/AWS SES (meilleure délivrabilité)
- [ ] Configurer SPF/DKIM/DMARC records
- [ ] Activer monitoring Redis (memory, connections)
- [ ] Setup rate limiting sur endpoints de test
- [ ] Backup régulier de SmtpLog
- [ ] Implémenter rotation des logs (> 90 jours)
- [ ] Configurer alertes sur taux d'échec > 5%

## Support & Documentation

📚 **Documentation complète**: `backend/SMTP_CONFIGURATION.md`  
🐛 **Logs**: `/admin/smtp-logs` ou `backend/logs/`  
📊 **Stats**: `/admin/smtp-config` (dashboard)  
🔧 **Troubleshooting**: Consulter SMTP_CONFIGURATION.md section "Troubleshooting"

---

**Version**: 1.0.0  
**Date**: Janvier 2025  
**Status**: ✅ Production Ready
