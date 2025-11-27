#!/bin/bash

# 🚀 SimpliFaq - SMTP Global Configuration Setup Script
# This script automates the setup of the global SMTP system

echo "🚀 SimpliFaq - Configuration SMTP Globale"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Fichier .env non trouvé!${NC}"
    echo "Créez un fichier .env à partir de .env.example"
    exit 1
fi

echo "✅ Fichier .env trouvé"
echo ""

# Check for ENCRYPTION_KEY
if ! grep -q "ENCRYPTION_KEY=" .env; then
    echo -e "${YELLOW}⚠️  ENCRYPTION_KEY non trouvée, génération...${NC}"
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
    echo -e "${GREEN}✅ ENCRYPTION_KEY générée et ajoutée au .env${NC}"
else
    echo "✅ ENCRYPTION_KEY déjà configurée"
fi
echo ""

# Check for Redis configuration
if ! grep -q "REDIS_HOST=" .env; then
    echo -e "${YELLOW}⚠️  Configuration Redis manquante, ajout des valeurs par défaut...${NC}"
    echo "" >> .env
    echo "# Redis Configuration for Email Queue" >> .env
    echo "REDIS_HOST=localhost" >> .env
    echo "REDIS_PORT=6379" >> .env
    echo "REDIS_PASSWORD=" >> .env
    echo -e "${GREEN}✅ Configuration Redis ajoutée${NC}"
else
    echo "✅ Configuration Redis trouvée"
fi
echo ""

# Test Redis connection
echo "🔍 Test de connexion Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis est accessible${NC}"
    else
        echo -e "${RED}❌ Redis ne répond pas${NC}"
        echo "Démarrez Redis avec: sudo systemctl start redis"
        echo "Ou installez avec: sudo apt-get install redis-server"
    fi
else
    echo -e "${YELLOW}⚠️  redis-cli non trouvé. Assurez-vous que Redis est installé.${NC}"
fi
echo ""

# Install dependencies
echo "📦 Installation des dépendances..."
npm install bullmq ioredis handlebars joi
echo -e "${GREEN}✅ Dépendances installées${NC}"
echo ""

# Generate Prisma Client
echo "🔧 Génération du client Prisma..."
npx prisma generate
echo -e "${GREEN}✅ Client Prisma généré${NC}"
echo ""

# Run migration (only if DATABASE_URL is valid)
if grep -q "postgresql://" .env; then
    echo "🗄️  Migration de la base de données..."
    npx prisma migrate dev --name add_global_smtp_config
    echo -e "${GREEN}✅ Migration effectuée${NC}"
    echo ""
    
    # Seed email templates
    echo "🌱 Seeding des templates d'email..."
    npx ts-node prisma/seedEmailTemplates.ts
    echo -e "${GREEN}✅ Templates seedés${NC}"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL non configurée, sautant la migration${NC}"
    echo "Configurez DATABASE_URL dans .env puis exécutez:"
    echo "  npx prisma migrate dev --name add_global_smtp_config"
    echo "  npx ts-node prisma/seedEmailTemplates.ts"
fi
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✅ Setup terminé!${NC}"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Vérifiez que Redis est démarré"
echo "2. Configurez DATABASE_URL dans .env (si pas fait)"
echo "3. Démarrez le backend: npm run dev"
echo "4. Accédez à /admin/smtp-config pour configurer SMTP"
echo ""
echo "📚 Documentation complète: backend/SMTP_CONFIGURATION.md"
echo ""
