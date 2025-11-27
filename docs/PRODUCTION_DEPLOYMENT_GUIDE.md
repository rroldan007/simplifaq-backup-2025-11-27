# 🇨🇭 SimpliFaq Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying SimpliFaq to a production environment with enterprise-grade security, monitoring, and Swiss compliance features.

## Prerequisites

### System Requirements

**Minimum Hardware Requirements:**
- CPU: 4 cores (8 recommended)
- RAM: 8GB (16GB recommended)
- Storage: 100GB SSD (500GB recommended)
- Network: 1Gbps connection

**Software Requirements:**
- Ubuntu 20.04 LTS or newer
- Docker 20.10+ and Docker Compose 2.0+
- Git 2.30+
- SSL certificates for HTTPS

### Domain Setup

Configure the following DNS records:
- `app.simplifaq.ch` → Your server IP (main application)
- `admin.simplifaq.ch` → Your server IP (admin panel)
- `api.simplifaq.ch` → Your server IP (API endpoint)

## Pre-Deployment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git unzip htop

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directories
sudo mkdir -p /var/lib/simplifaq/{postgres,redis,prometheus,grafana,alertmanager,loki}
sudo mkdir -p /var/log/simplifaq
sudo mkdir -p /var/backups/simplifaq
sudo chown -R $USER:$USER /var/lib/simplifaq /var/log/simplifaq /var/backups/simplifaq
```

### 2. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot

# Generate certificates
sudo certbot certonly --standalone -d app.simplifaq.ch -d admin.simplifaq.ch

# Copy certificates to project directory
sudo mkdir -p /path/to/simplifaq/ssl
sudo cp /etc/letsencrypt/live/app.simplifaq.ch/fullchain.pem /path/to/simplifaq/ssl/cert.pem
sudo cp /etc/letsencrypt/live/app.simplifaq.ch/privkey.pem /path/to/simplifaq/ssl/key.pem
sudo chown $USER:$USER /path/to/simplifaq/ssl/*
```

#### Option B: Custom Certificates

```bash
# Place your certificates in the ssl directory
mkdir -p ssl
cp your-certificate.pem ssl/cert.pem
cp your-private-key.pem ssl/key.pem
chmod 600 ssl/key.pem
```

### 3. Environment Configuration

```bash
# Clone the repository
git clone https://github.com/your-org/simplifaq.git
cd simplifaq

# Copy and configure environment file
cp .env.production.example .env.production

# Edit the environment file with your values
nano .env.production
```

**Critical Environment Variables:**

```bash
# Database (use strong passwords)
POSTGRES_PASSWORD=your_very_secure_database_password_here
POSTGRES_REPLICATION_PASSWORD=your_replication_password_here

# Redis
REDIS_PASSWORD=your_secure_redis_password_here

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your_very_secure_jwt_secret_key_at_least_32_characters_long

# Email configuration
SMTP_HOST=smtp.your-provider.com
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# Monitoring
GRAFANA_PASSWORD=your_secure_grafana_password
SENTRY_DSN=your_sentry_dsn_for_error_tracking

# AWS (for backups and file storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your-s3-bucket-name
BACKUP_S3_BUCKET=your-backup-s3-bucket
```

## Deployment Process

### 1. Initial Deployment

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run initial deployment
./scripts/deploy.sh --environment production
```

### 2. Manual Deployment Steps

If you prefer manual deployment:

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker-compose -f docker-compose.prod.yml exec backend npx prisma generate

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

### 3. Enable Monitoring (Optional but Recommended)

```bash
# Start monitoring stack
docker-compose -f docker-compose.prod.yml --profile monitoring up -d

# Start logging stack
docker-compose -f docker-compose.prod.yml --profile logging up -d
```

## Post-Deployment Configuration

### 1. Health Checks

Verify all services are running:

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Test endpoints
curl -f https://app.simplifaq.ch/health
curl -f https://app.simplifaq.ch/api/health
curl -f https://admin.simplifaq.ch/health
```

### 2. Create Admin User

```bash
# Access the backend container
docker-compose -f docker-compose.prod.yml exec backend bash

# Create admin user
npm run create-admin-user
```

### 3. Configure Monitoring Dashboards

1. Access Grafana at `http://your-server:3002`
2. Login with admin credentials
3. Import SimpliFaq dashboards from `monitoring/grafana/dashboards/`
4. Configure alert notifications

### 4. Setup Automated Backups

```bash
# Test backup system
docker-compose -f docker-compose.prod.yml --profile backup run --rm backup /backup.sh

# Add to crontab for automated backups
crontab -e

# Add these lines:
# Daily backup at 2 AM
0 2 * * * cd /path/to/simplifaq && docker-compose -f docker-compose.prod.yml --profile backup run --rm backup /backup.sh

# Weekly full backup with S3 upload
0 3 * * 0 cd /path/to/simplifaq && docker-compose -f docker-compose.prod.yml --profile backup run --rm backup /backup.sh -c -s
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Install and configure UFW
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 9090/tcp  # Prometheus (restrict to monitoring network)
sudo ufw allow 3002/tcp  # Grafana (restrict to monitoring network)

# Reload firewall
sudo ufw reload
```

### 2. SSH Hardening

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings:
# Port 2222                    # Change default port
# PermitRootLogin no          # Disable root login
# PasswordAuthentication no   # Use key-based auth only
# MaxAuthTries 3             # Limit auth attempts

# Restart SSH service
sudo systemctl restart sshd
```

### 3. System Monitoring

```bash
# Install fail2ban for intrusion prevention
sudo apt install -y fail2ban

# Configure fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Add SimpliFaq-specific rules
sudo tee /etc/fail2ban/jail.d/simplifaq.conf << EOF
[simplifaq-auth]
enabled = true
port = http,https
filter = simplifaq-auth
logpath = /var/log/simplifaq/security.log
maxretry = 5
bantime = 3600
EOF

# Restart fail2ban
sudo systemctl restart fail2ban
```

## Monitoring and Alerting

### 1. Prometheus Metrics

Access Prometheus at `http://your-server:9090` to view:
- Application performance metrics
- Swiss QR Bill generation statistics
- Database performance
- System resource usage

### 2. Grafana Dashboards

Access Grafana at `http://your-server:3002` for:
- Real-time system monitoring
- Business metrics (invoices, revenue)
- Swiss compliance metrics
- Alert management

### 3. Log Aggregation

If using the logging profile:
- Loki aggregates logs from all services
- Promtail collects and forwards logs
- View logs in Grafana's Explore section

## Backup and Disaster Recovery

### 1. Backup Strategy

**Daily Backups:**
- Database dump with compression
- Application logs
- Configuration files

**Weekly Backups:**
- Full system backup
- S3 upload for off-site storage
- Backup verification

### 2. Disaster Recovery Procedure

```bash
# 1. Restore from backup
cd /path/to/simplifaq
./scripts/restore.sh --backup-file /var/backups/simplifaq/latest.sql.gz

# 2. Verify data integrity
docker-compose -f docker-compose.prod.yml exec backend npm run verify-data

# 3. Test application functionality
curl -f https://app.simplifaq.ch/health
```

## Maintenance Procedures

### 1. Regular Updates

```bash
# Monthly security updates
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Update application
git pull origin main
./scripts/deploy.sh --environment production
```

### 2. Database Maintenance

```bash
# Weekly database optimization
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "VACUUM ANALYZE;"

# Monthly statistics update
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "REINDEX DATABASE simplifaq_prod;"
```

### 3. Log Rotation

```bash
# Configure logrotate
sudo tee /etc/logrotate.d/simplifaq << EOF
/var/log/simplifaq/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /path/to/simplifaq/docker-compose.prod.yml restart backend
    endscript
}
EOF
```

## Troubleshooting

### Common Issues

**1. Service Won't Start**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs service-name

# Check resource usage
docker stats

# Restart service
docker-compose -f docker-compose.prod.yml restart service-name
```

**2. Database Connection Issues**
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "SELECT count(*) FROM pg_stat_activity;"
```

**3. SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Renew Let's Encrypt certificates
sudo certbot renew
```

### Performance Optimization

**1. Database Tuning**
```bash
# Optimize PostgreSQL settings in infrastructure/postgres/postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
```

**2. Redis Optimization**
```bash
# Configure Redis for production in infrastructure/redis/redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## Swiss Compliance Verification

### 1. QR Bill Compliance

```bash
# Test QR Bill generation
docker-compose -f docker-compose.prod.yml exec backend npm run test:qr-bill

# Verify Swiss banking standards
docker-compose -f docker-compose.prod.yml exec backend npm run verify:swiss-compliance
```

### 2. Data Protection

```bash
# Verify GDPR compliance
docker-compose -f docker-compose.prod.yml exec backend npm run test:gdpr

# Check audit trail integrity
docker-compose -f docker-compose.prod.yml exec backend npm run verify:audit-trail
```

## Support and Maintenance

### Emergency Contacts

- **System Administrator**: admin@simplifaq.ch
- **Database Administrator**: dba@simplifaq.ch
- **Security Team**: security@simplifaq.ch

### Monitoring Alerts

Configure alerts for:
- Service downtime
- High error rates
- Database performance issues
- Security incidents
- Backup failures

### Regular Health Checks

Schedule weekly reviews of:
- System performance metrics
- Security logs
- Backup integrity
- Swiss compliance status
- User feedback and issues

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintained by**: SimpliFaq DevOps Team