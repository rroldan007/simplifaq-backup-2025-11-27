# 🇨🇭 SimpliFaq Operational Runbooks

## Overview

This document contains step-by-step procedures for common operational tasks and incident response for the SimpliFaq Swiss invoicing system.

## Table of Contents

1. [Incident Response](#incident-response)
2. [Service Management](#service-management)
3. [Database Operations](#database-operations)
4. [Backup and Recovery](#backup-and-recovery)
5. [Security Incidents](#security-incidents)
6. [Performance Issues](#performance-issues)
7. [Swiss Compliance Issues](#swiss-compliance-issues)
8. [Monitoring and Alerting](#monitoring-and-alerting)

## Incident Response

### 1. Service Outage Response

**Severity**: Critical
**Response Time**: Immediate (< 5 minutes)

#### Symptoms
- Application not accessible
- Health checks failing
- Multiple user reports

#### Investigation Steps

```bash
# 1. Check service status
docker-compose -f docker-compose.prod.yml ps

# 2. Check system resources
htop
df -h
free -m

# 3. Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
docker-compose -f docker-compose.prod.yml logs --tail=100 frontend
docker-compose -f docker-compose.prod.yml logs --tail=100 postgres

# 4. Check network connectivity
curl -I https://app.simplifaq.ch
curl -I https://app.simplifaq.ch/api/health
```

#### Resolution Steps

```bash
# 1. Restart affected services
docker-compose -f docker-compose.prod.yml restart backend frontend

# 2. If database issues, restart database
docker-compose -f docker-compose.prod.yml restart postgres

# 3. If complete outage, restart all services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify recovery
curl -f https://app.simplifaq.ch/health
curl -f https://app.simplifaq.ch/api/health
```

#### Post-Incident Actions

1. Document incident in incident log
2. Analyze root cause
3. Update monitoring if needed
4. Communicate resolution to stakeholders

### 2. Database Connection Issues

**Severity**: High
**Response Time**: < 15 minutes

#### Symptoms
- "Database connection failed" errors
- Slow query responses
- Connection timeout errors

#### Investigation Steps

```bash
# 1. Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U simplifaq_user -d simplifaq_prod

# 2. Check active connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "
SELECT count(*) as active_connections, 
       max_conn, 
       max_conn - count(*) as available_connections
FROM pg_stat_activity, 
     (SELECT setting::int as max_conn FROM pg_settings WHERE name='max_connections') mc;"

# 3. Check for long-running queries
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# 4. Check database locks
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;"
```

#### Resolution Steps

```bash
# 1. Kill long-running queries (if safe)
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '10 minutes' 
AND state = 'active';"

# 2. Restart database if necessary
docker-compose -f docker-compose.prod.yml restart postgres

# 3. Clear connection pool
docker-compose -f docker-compose.prod.yml restart backend

# 4. Monitor recovery
watch "docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c 'SELECT count(*) FROM pg_stat_activity;'"
```

### 3. High Error Rate Response

**Severity**: High
**Response Time**: < 10 minutes

#### Symptoms
- Error rate > 5% in monitoring
- Multiple 500 errors in logs
- User complaints about errors

#### Investigation Steps

```bash
# 1. Check error logs
docker-compose -f docker-compose.prod.yml logs --tail=200 backend | grep -i error

# 2. Check specific error patterns
docker-compose -f docker-compose.prod.yml logs --tail=500 backend | grep -E "(500|error|exception)" | tail -20

# 3. Check system resources
docker stats

# 4. Check database performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"
```

#### Resolution Steps

```bash
# 1. Identify error pattern and fix if possible
# 2. Restart backend if errors persist
docker-compose -f docker-compose.prod.yml restart backend

# 3. Scale backend if resource issue
docker-compose -f docker-compose.prod.yml --profile scale up -d

# 4. Monitor error rate recovery
# Check Grafana dashboard or Prometheus metrics
```

## Service Management

### 1. Planned Maintenance

#### Pre-Maintenance Checklist

```bash
# 1. Create maintenance backup
./scripts/backup.sh -c -s -v

# 2. Notify users (if applicable)
# Update status page or send notifications

# 3. Verify backup integrity
./scripts/backup.sh -v

# 4. Document maintenance window
echo "Maintenance started: $(date)" >> /var/log/simplifaq/maintenance.log
```

#### Maintenance Procedure

```bash
# 1. Put application in maintenance mode (if supported)
docker-compose -f docker-compose.prod.yml exec backend npm run maintenance:enable

# 2. Stop services gracefully
docker-compose -f docker-compose.prod.yml down

# 3. Perform maintenance tasks
# - Update system packages
# - Update Docker images
# - Apply configuration changes

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify functionality
./scripts/deploy.sh --dry-run --skip-backup --skip-tests
```

#### Post-Maintenance Checklist

```bash
# 1. Verify all services are healthy
docker-compose -f docker-compose.prod.yml ps
curl -f https://app.simplifaq.ch/health

# 2. Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=50 backend frontend

# 3. Disable maintenance mode
docker-compose -f docker-compose.prod.yml exec backend npm run maintenance:disable

# 4. Document completion
echo "Maintenance completed: $(date)" >> /var/log/simplifaq/maintenance.log
```

### 2. Scaling Operations

#### Scale Up Backend Services

```bash
# 1. Start additional backend instances
docker-compose -f docker-compose.prod.yml --profile scale up -d

# 2. Verify load balancing
curl -s https://app.simplifaq.ch/api/health | jq '.instance'

# 3. Monitor performance
watch "docker stats --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}'"
```

#### Scale Down Backend Services

```bash
# 1. Gracefully stop additional instances
docker-compose -f docker-compose.prod.yml stop backend-2

# 2. Remove containers
docker-compose -f docker-compose.prod.yml rm -f backend-2

# 3. Verify single instance operation
curl -f https://app.simplifaq.ch/api/health
```

## Database Operations

### 1. Database Backup

#### Manual Backup

```bash
# 1. Create immediate backup
./scripts/backup.sh -c -s

# 2. Verify backup
./scripts/backup.sh -v

# 3. Test restore (on test environment)
./scripts/restore.sh --backup-file /var/backups/simplifaq/latest.sql.gz --test-mode
```

#### Scheduled Backup Verification

```bash
# 1. Check last backup status
ls -la /var/backups/simplifaq/ | head -10

# 2. Verify backup size (should be reasonable)
du -h /var/backups/simplifaq/*.sql.gz | tail -5

# 3. Check S3 backup status
aws s3 ls s3://your-backup-bucket/backups/ --recursive | tail -10
```

### 2. Database Maintenance

#### Weekly Maintenance

```bash
# 1. Update database statistics
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "ANALYZE;"

# 2. Vacuum database
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "VACUUM;"

# 3. Check database size
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "
SELECT pg_size_pretty(pg_database_size('simplifaq_prod')) as database_size;"

# 4. Check table sizes
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

#### Monthly Maintenance

```bash
# 1. Reindex database
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "REINDEX DATABASE simplifaq_prod;"

# 2. Update query statistics
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "SELECT pg_stat_reset();"

# 3. Check for unused indexes
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;"
```

## Security Incidents

### 1. Suspected Intrusion

**Severity**: Critical
**Response Time**: Immediate

#### Investigation Steps

```bash
# 1. Check authentication logs
docker-compose -f docker-compose.prod.yml logs backend | grep -i "auth\|login\|failed"

# 2. Check for suspicious IP addresses
docker-compose -f docker-compose.prod.yml logs nginx | awk '{print $1}' | sort | uniq -c | sort -nr | head -20

# 3. Check system logs
sudo journalctl -u docker --since "1 hour ago" | grep -i "error\|fail\|attack"

# 4. Check fail2ban status
sudo fail2ban-client status
sudo fail2ban-client status simplifaq-auth
```

#### Response Actions

```bash
# 1. Block suspicious IPs immediately
sudo ufw insert 1 deny from SUSPICIOUS_IP

# 2. Force logout all users (if necessary)
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHDB

# 3. Change critical passwords
# - Database passwords
# - JWT secrets
# - Admin passwords

# 4. Enable additional logging
docker-compose -f docker-compose.prod.yml exec backend npm run security:enable-verbose-logging
```

### 2. Data Breach Response

**Severity**: Critical
**Response Time**: Immediate

#### Immediate Actions

```bash
# 1. Isolate affected systems
docker-compose -f docker-compose.prod.yml down

# 2. Preserve evidence
cp -r /var/log/simplifaq /var/log/simplifaq-incident-$(date +%Y%m%d-%H%M%S)

# 3. Assess scope of breach
# Review logs, database access, file modifications

# 4. Notify authorities (if required by Swiss law)
# Contact data protection authorities
```

#### Recovery Actions

```bash
# 1. Restore from clean backup
./scripts/restore.sh --backup-file /var/backups/simplifaq/pre-incident-backup.sql.gz

# 2. Apply security patches
# Update all components
# Harden configurations

# 3. Reset all credentials
# Generate new JWT secrets
# Reset all user passwords
# Update API keys

# 4. Implement additional monitoring
# Enhanced logging
# Real-time alerting
# Intrusion detection
```

## Performance Issues

### 1. Slow Response Times

#### Investigation

```bash
# 1. Check system resources
htop
iotop
nethogs

# 2. Check database performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U simplifaq_user -d simplifaq_prod -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC 
LIMIT 10;"

# 3. Check application metrics
curl -s https://app.simplifaq.ch/metrics | grep -E "(response_time|request_duration)"

# 4. Check cache hit rates
docker-compose -f docker-compose.prod.yml exec redis redis-cli info stats | grep -E "(hits|misses)"
```

#### Optimization

```bash
# 1. Optimize database queries
# Identify and optimize slow queries

# 2. Increase cache TTL
docker-compose -f docker-compose.prod.yml exec backend npm run cache:optimize

# 3. Scale resources if needed
docker-compose -f docker-compose.prod.yml --profile scale up -d

# 4. Enable compression
# Check nginx gzip settings
# Enable database compression
```

### 2. High Memory Usage

#### Investigation

```bash
# 1. Check memory usage by service
docker stats --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# 2. Check system memory
free -h
cat /proc/meminfo

# 3. Check for memory leaks
docker-compose -f docker-compose.prod.yml exec backend npm run memory:profile
```

#### Resolution

```bash
# 1. Restart memory-intensive services
docker-compose -f docker-compose.prod.yml restart backend

# 2. Adjust memory limits
# Edit docker-compose.prod.yml memory limits

# 3. Optimize application
# Review code for memory leaks
# Optimize database queries
# Clear unnecessary caches
```

## Swiss Compliance Issues

### 1. QR Bill Generation Failures

#### Investigation

```bash
# 1. Check QR Bill logs
docker-compose -f docker-compose.prod.yml logs backend | grep -i "qr.*bill"

# 2. Test QR Bill generation
docker-compose -f docker-compose.prod.yml exec backend npm run test:qr-bill

# 3. Verify Swiss banking data
docker-compose -f docker-compose.prod.yml exec backend npm run verify:swiss-banking
```

#### Resolution

```bash
# 1. Update QR Bill library
# Check for library updates
# Test in staging environment

# 2. Verify IBAN validation
docker-compose -f docker-compose.prod.yml exec backend npm run test:iban-validation

# 3. Check Swiss address formats
docker-compose -f docker-compose.prod.yml exec backend npm run test:swiss-addresses
```

### 2. TVA Calculation Errors

#### Investigation

```bash
# 1. Check TVA calculation logs
docker-compose -f docker-compose.prod.yml logs backend | grep -i "tva\|tax"

# 2. Verify TVA rates
docker-compose -f docker-compose.prod.yml exec backend npm run verify:tva-rates

# 3. Test calculations
docker-compose -f docker-compose.prod.yml exec backend npm run test:tva-calculations
```

#### Resolution

```bash
# 1. Update TVA rates (if changed by Swiss authorities)
docker-compose -f docker-compose.prod.yml exec backend npm run update:tva-rates

# 2. Recalculate affected invoices
docker-compose -f docker-compose.prod.yml exec backend npm run recalculate:invoices --date-range="2024-01-01,2024-12-31"

# 3. Generate compliance report
docker-compose -f docker-compose.prod.yml exec backend npm run generate:compliance-report
```

## Monitoring and Alerting

### 1. Alert Response Procedures

#### High Error Rate Alert

```bash
# 1. Acknowledge alert in monitoring system
# 2. Check error logs
docker-compose -f docker-compose.prod.yml logs --tail=100 backend | grep -i error

# 3. Identify error pattern
# 4. Apply fix or restart services
# 5. Monitor recovery
# 6. Update runbook if new issue
```

#### Database Connection Alert

```bash
# 1. Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# 2. Check connection pool
docker-compose -f docker-compose.prod.yml logs backend | grep -i "connection"

# 3. Restart services if needed
docker-compose -f docker-compose.prod.yml restart backend postgres

# 4. Monitor recovery
```

### 2. Monitoring Maintenance

#### Weekly Monitoring Review

```bash
# 1. Review Grafana dashboards
# Check for trends and anomalies

# 2. Update alert thresholds if needed
# Based on historical data

# 3. Test alert notifications
# Ensure alerts are reaching the right people

# 4. Review and update runbooks
# Based on recent incidents
```

## Emergency Contacts

### Internal Team
- **On-Call Engineer**: +41 XX XXX XX XX
- **Database Administrator**: dba@simplifaq.ch
- **Security Team**: security@simplifaq.ch
- **DevOps Lead**: devops@simplifaq.ch

### External Vendors
- **Hosting Provider**: support@hosting-provider.com
- **SSL Certificate Provider**: support@ssl-provider.com
- **Monitoring Service**: support@monitoring-service.com

### Swiss Authorities
- **Data Protection Authority**: +41 XX XXX XX XX
- **Financial Authorities**: +41 XX XXX XX XX

---

**Document Version**: 1.0.0
**Last Updated**: December 2024
**Review Schedule**: Monthly
**Owner**: SimpliFaq DevOps Team