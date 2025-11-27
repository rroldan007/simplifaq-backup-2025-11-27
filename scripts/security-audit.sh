#!/bin/bash

# 🇨🇭 SimpliFaq - Security Audit Script
# Comprehensive security audit for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AUDIT_LOG="/var/log/simplifaq/security-audit.log"
REPORT_FILE="/tmp/simplifaq-security-audit-$(date +%Y%m%d-%H%M%S).txt"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$AUDIT_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$AUDIT_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$AUDIT_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$AUDIT_LOG"
}

check_passed() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$REPORT_FILE"
}

check_failed() {
    echo -e "${RED}✗${NC} $1" | tee -a "$REPORT_FILE"
}

check_warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$REPORT_FILE"
}

# Initialize audit report
init_report() {
    cat > "$REPORT_FILE" << EOF
🇨🇭 SimpliFaq Security Audit Report
====================================

Audit Date: $(date)
Server: $(hostname)
Auditor: $(whoami)

SECURITY CHECKLIST
==================

EOF
}

# System Security Checks
check_system_security() {
    log "🔒 Checking system security..."
    echo -e "\n## System Security" >> "$REPORT_FILE"
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        check_failed "Running as root (security risk)"
    else
        check_passed "Not running as root"
    fi
    
    # Check firewall status
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            check_passed "UFW firewall is active"
        else
            check_failed "UFW firewall is not active"
        fi
    else
        check_warning "UFW firewall not installed"
    fi
    
    # Check fail2ban status
    if command -v fail2ban-client &> /dev/null; then
        if systemctl is-active --quiet fail2ban; then
            check_passed "Fail2ban is running"
        else
            check_failed "Fail2ban is not running"
        fi
    else
        check_warning "Fail2ban not installed"
    fi
    
    # Check SSH configuration
    if [[ -f /etc/ssh/sshd_config ]]; then
        if grep -q "PermitRootLogin no" /etc/ssh/sshd_config; then
            check_passed "SSH root login disabled"
        else
            check_failed "SSH root login not disabled"
        fi
        
        if grep -q "PasswordAuthentication no" /etc/ssh/sshd_config; then
            check_passed "SSH password authentication disabled"
        else
            check_warning "SSH password authentication enabled"
        fi
    fi
    
    # Check for security updates
    if command -v apt &> /dev/null; then
        local updates=$(apt list --upgradable 2>/dev/null | grep -c security || true)
        if [[ $updates -eq 0 ]]; then
            check_passed "No pending security updates"
        else
            check_warning "$updates pending security updates"
        fi
    fi
}

# Docker Security Checks
check_docker_security() {
    log "🐳 Checking Docker security..."
    echo -e "\n## Docker Security" >> "$REPORT_FILE"
    
    # Check Docker daemon configuration
    if docker info --format '{{.SecurityOptions}}' | grep -q "name=seccomp"; then
        check_passed "Docker seccomp enabled"
    else
        check_failed "Docker seccomp not enabled"
    fi
    
    # Check for privileged containers
    local privileged_containers=$(docker ps --format "table {{.Names}}\t{{.Status}}" --filter "label=privileged=true" | wc -l)
    if [[ $privileged_containers -eq 1 ]]; then  # Header line counts as 1
        check_passed "No privileged containers running"
    else
        check_failed "Privileged containers detected"
    fi
    
    # Check container resource limits
    local containers_without_limits=$(docker ps --format "{{.Names}}" | xargs -I {} docker inspect {} --format '{{.Name}}: Memory={{.HostConfig.Memory}} CPU={{.HostConfig.CpuShares}}' | grep -c "Memory=0" || true)
    if [[ $containers_without_limits -eq 0 ]]; then
        check_passed "All containers have resource limits"
    else
        check_warning "$containers_without_limits containers without memory limits"
    fi
    
    # Check for latest base images
    log "Checking for outdated base images..."
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | grep -E "(postgres|redis|nginx)" >> "$REPORT_FILE"
}

# Application Security Checks
check_application_security() {
    log "🛡️ Checking application security..."
    echo -e "\n## Application Security" >> "$REPORT_FILE"
    
    # Check environment file permissions
    if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
        local env_perms=$(stat -c "%a" "$PROJECT_ROOT/.env.production")
        if [[ "$env_perms" == "600" ]]; then
            check_passed "Environment file has correct permissions (600)"
        else
            check_failed "Environment file permissions: $env_perms (should be 600)"
        fi
    else
        check_failed "Production environment file not found"
    fi
    
    # Check SSL certificate validity
    if [[ -f "$PROJECT_ROOT/ssl/cert.pem" ]]; then
        local cert_expiry=$(openssl x509 -in "$PROJECT_ROOT/ssl/cert.pem" -noout -enddate | cut -d= -f2)
        local cert_expiry_epoch=$(date -d "$cert_expiry" +%s)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (cert_expiry_epoch - current_epoch) / 86400 ))
        
        if [[ $days_until_expiry -gt 30 ]]; then
            check_passed "SSL certificate valid for $days_until_expiry days"
        elif [[ $days_until_expiry -gt 0 ]]; then
            check_warning "SSL certificate expires in $days_until_expiry days"
        else
            check_failed "SSL certificate has expired"
        fi
    else
        check_failed "SSL certificate not found"
    fi
    
    # Check for hardcoded secrets in code
    log "Scanning for hardcoded secrets..."
    local secret_patterns=("password" "secret" "key" "token" "api_key")
    local secrets_found=0
    
    for pattern in "${secret_patterns[@]}"; do
        local matches=$(grep -r -i "$pattern.*=" "$PROJECT_ROOT/backend/src" "$PROJECT_ROOT/frontend/src" 2>/dev/null | grep -v ".test." | grep -v "example" | wc -l || true)
        if [[ $matches -gt 0 ]]; then
            ((secrets_found++))
        fi
    done
    
    if [[ $secrets_found -eq 0 ]]; then
        check_passed "No hardcoded secrets found in source code"
    else
        check_warning "Potential hardcoded secrets found - manual review required"
    fi
    
    # Check database connection security
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T postgres psql -U simplifaq_user -d simplifaq_prod -c "SHOW ssl;" 2>/dev/null | grep -q "on"; then
        check_passed "Database SSL enabled"
    else
        check_warning "Database SSL not enabled"
    fi
}

# Network Security Checks
check_network_security() {
    log "🌐 Checking network security..."
    echo -e "\n## Network Security" >> "$REPORT_FILE"
    
    # Check open ports
    local open_ports=$(ss -tuln | grep LISTEN | awk '{print $5}' | cut -d: -f2 | sort -n | uniq)
    echo "Open ports:" >> "$REPORT_FILE"
    echo "$open_ports" >> "$REPORT_FILE"
    
    # Check for unnecessary services
    local unnecessary_services=("telnet" "ftp" "rsh" "rlogin")
    for service in "${unnecessary_services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            check_failed "Unnecessary service running: $service"
        else
            check_passed "Service not running: $service"
        fi
    done
    
    # Check Docker network isolation
    local docker_networks=$(docker network ls --format "{{.Name}}" | grep -v "bridge\|host\|none")
    if [[ -n "$docker_networks" ]]; then
        check_passed "Custom Docker networks configured"
    else
        check_warning "Using default Docker bridge network"
    fi
    
    # Check for exposed Docker daemon
    if ss -tuln | grep -q ":2375\|:2376"; then
        check_failed "Docker daemon exposed on network"
    else
        check_passed "Docker daemon not exposed"
    fi
}

# Data Security Checks
check_data_security() {
    log "💾 Checking data security..."
    echo -e "\n## Data Security" >> "$REPORT_FILE"
    
    # Check backup encryption
    if [[ -f "$PROJECT_ROOT/scripts/backup.sh" ]]; then
        if grep -q "encryption" "$PROJECT_ROOT/scripts/backup.sh"; then
            check_passed "Backup script includes encryption"
        else
            check_warning "Backup encryption not configured"
        fi
    fi
    
    # Check database backup permissions
    local backup_dir="/var/backups/simplifaq"
    if [[ -d "$backup_dir" ]]; then
        local backup_perms=$(stat -c "%a" "$backup_dir")
        if [[ "$backup_perms" == "700" ]]; then
            check_passed "Backup directory has correct permissions"
        else
            check_warning "Backup directory permissions: $backup_perms (should be 700)"
        fi
    fi
    
    # Check log file permissions
    local log_dir="/var/log/simplifaq"
    if [[ -d "$log_dir" ]]; then
        local log_files_with_wrong_perms=$(find "$log_dir" -type f ! -perm 640 | wc -l)
        if [[ $log_files_with_wrong_perms -eq 0 ]]; then
            check_passed "Log files have correct permissions"
        else
            check_warning "$log_files_with_wrong_perms log files with incorrect permissions"
        fi
    fi
    
    # Check for sensitive data in logs
    local sensitive_patterns=("password" "secret" "token" "credit.*card" "ssn")
    local sensitive_in_logs=0
    
    for pattern in "${sensitive_patterns[@]}"; do
        if find "$log_dir" -name "*.log" -exec grep -l -i "$pattern" {} \; 2>/dev/null | head -1 | grep -q .; then
            ((sensitive_in_logs++))
        fi
    done
    
    if [[ $sensitive_in_logs -eq 0 ]]; then
        check_passed "No sensitive data found in logs"
    else
        check_failed "Potential sensitive data found in logs"
    fi
}

# Swiss Compliance Checks
check_swiss_compliance() {
    log "🇨🇭 Checking Swiss compliance..."
    echo -e "\n## Swiss Compliance" >> "$REPORT_FILE"
    
    # Check data residency
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T backend node -e "
        console.log(process.env.AWS_REGION || 'not-set');
    " | grep -q "eu-central-1\|eu-west-1"; then
        check_passed "Data stored in EU region"
    else
        check_warning "Data region not confirmed as EU"
    fi
    
    # Check audit logging
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" logs backend 2>/dev/null | grep -q "audit"; then
        check_passed "Audit logging enabled"
    else
        check_warning "Audit logging not detected"
    fi
    
    # Check data retention policies
    if [[ -f "$PROJECT_ROOT/backend/src/services/complianceService.ts" ]]; then
        if grep -q "retention" "$PROJECT_ROOT/backend/src/services/complianceService.ts"; then
            check_passed "Data retention policies implemented"
        else
            check_warning "Data retention policies not found"
        fi
    fi
    
    # Check GDPR compliance features
    local gdpr_endpoints=("/api/users/export-data" "/api/users/delete-data")
    for endpoint in "${gdpr_endpoints[@]}"; do
        if grep -r "$endpoint" "$PROJECT_ROOT/backend/src" >/dev/null 2>&1; then
            check_passed "GDPR endpoint implemented: $endpoint"
        else
            check_failed "GDPR endpoint missing: $endpoint"
        fi
    done
}

# Monitoring and Alerting Checks
check_monitoring() {
    log "📊 Checking monitoring and alerting..."
    echo -e "\n## Monitoring & Alerting" >> "$REPORT_FILE"
    
    # Check if monitoring services are running
    local monitoring_services=("prometheus" "grafana" "alertmanager")
    for service in "${monitoring_services[@]}"; do
        if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps | grep -q "$service.*Up"; then
            check_passed "Monitoring service running: $service"
        else
            check_warning "Monitoring service not running: $service"
        fi
    done
    
    # Check alert rules
    if [[ -f "$PROJECT_ROOT/monitoring/alert_rules.yml" ]]; then
        local alert_count=$(grep -c "alert:" "$PROJECT_ROOT/monitoring/alert_rules.yml")
        check_passed "$alert_count alert rules configured"
    else
        check_failed "Alert rules file not found"
    fi
    
    # Check log aggregation
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps | grep -q "loki.*Up"; then
        check_passed "Log aggregation service running"
    else
        check_warning "Log aggregation not running"
    fi
}

# Generate security recommendations
generate_recommendations() {
    log "📋 Generating security recommendations..."
    echo -e "\n## Security Recommendations" >> "$REPORT_FILE"
    
    cat >> "$REPORT_FILE" << EOF

### Immediate Actions Required:
- Fix any failed checks marked with ✗
- Review and address all warnings marked with ⚠
- Update any expired SSL certificates
- Apply pending security updates

### Regular Maintenance:
- Review this security audit monthly
- Update base Docker images regularly
- Rotate secrets and passwords quarterly
- Review and update firewall rules
- Monitor security logs daily

### Swiss Compliance:
- Ensure data residency in EU/Switzerland
- Maintain audit logs for required retention period
- Implement and test GDPR data export/deletion
- Regular compliance reviews with legal team

### Monitoring:
- Set up 24/7 monitoring alerts
- Configure log aggregation and analysis
- Implement intrusion detection
- Regular penetration testing

### Backup and Recovery:
- Test backup restoration procedures monthly
- Encrypt all backups
- Store backups in geographically separate location
- Document disaster recovery procedures

EOF
}

# Main audit function
main() {
    log "🇨🇭 Starting SimpliFaq security audit..."
    
    # Create log directory
    mkdir -p "$(dirname "$AUDIT_LOG")"
    
    # Initialize report
    init_report
    
    # Run security checks
    check_system_security
    check_docker_security
    check_application_security
    check_network_security
    check_data_security
    check_swiss_compliance
    check_monitoring
    
    # Generate recommendations
    generate_recommendations
    
    # Summary
    echo -e "\n## Audit Summary" >> "$REPORT_FILE"
    local passed_checks=$(grep -c "✓" "$REPORT_FILE")
    local failed_checks=$(grep -c "✗" "$REPORT_FILE")
    local warning_checks=$(grep -c "⚠" "$REPORT_FILE")
    
    echo "Passed: $passed_checks" >> "$REPORT_FILE"
    echo "Failed: $failed_checks" >> "$REPORT_FILE"
    echo "Warnings: $warning_checks" >> "$REPORT_FILE"
    
    if [[ $failed_checks -eq 0 ]]; then
        success "🎉 Security audit completed successfully!"
        echo -e "\nOverall Status: ${GREEN}PASS${NC}" >> "$REPORT_FILE"
    else
        warning "⚠️ Security audit completed with $failed_checks failed checks"
        echo -e "\nOverall Status: ${RED}FAIL${NC}" >> "$REPORT_FILE"
    fi
    
    log "Security audit report: $REPORT_FILE"
    log "Security audit log: $AUDIT_LOG"
    
    # Display summary
    echo -e "\n${BLUE}Security Audit Summary:${NC}"
    echo -e "Passed: ${GREEN}$passed_checks${NC}"
    echo -e "Failed: ${RED}$failed_checks${NC}"
    echo -e "Warnings: ${YELLOW}$warning_checks${NC}"
    echo -e "Report: $REPORT_FILE"
}

# Trap errors
trap 'error "Security audit failed at line $LINENO"' ERR

# Run main function
main "$@"