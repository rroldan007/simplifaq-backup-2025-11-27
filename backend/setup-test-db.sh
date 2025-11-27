#!/bin/bash

# Setup test database for PostgreSQL
echo "Setting up test database..."

# Create test database if it doesn't exist
psql -U roberto -d postgres -c "DROP DATABASE IF EXISTS simplifaq_test;"
psql -U roberto -d postgres -c "CREATE DATABASE simplifaq_test;"

# Copy schema from main database
pg_dump -U roberto -s simplifaq | psql -U roberto -d simplifaq_test

echo "Test database setup complete!"