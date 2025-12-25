#!/bin/bash
# Script to apply fiscal year numbering migration
# Run this script to add the new columns to your PostgreSQL database

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '#' | awk '/=/ {print $1}')
fi

echo "Applying fiscal year numbering migration..."

# Apply the migration
psql "$DATABASE_URL" -f ../prisma/migrations/20251225_add_fiscal_year_numbering/migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Now regenerate the Prisma client:"
    echo "  cd backend && npx prisma generate"
else
    echo "❌ Migration failed. Please check your DATABASE_URL and try again."
    exit 1
fi
