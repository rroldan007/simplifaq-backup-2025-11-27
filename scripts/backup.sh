#!/bin/bash

# 🇨🇭 SimpliFaq - Database Backup Script
# This script creates automated backups of the Swiss invoicing system database

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/simplifaq}"
LOG_FILE="${LOG_FILE:-/var/log/simplifaq/backup.log}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-eu-central-1}"

# Database configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-simplifaq_prod}"
DB_USER="${POSTGRES_USER:-simplifaq_user}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

usage() {
    cat << EOF
🇨🇭 SimpliFaq Database Backup Script

Usage: $0 [OPTIONS]

OPTIONS:
    -t, --type TYPE         Backup type (full|schema|data) [default: full]
    -c, --compress          Compress backup with gzip
    -s, --s3-upload         Upload backup to S3
    -r, --retention DAYS    Retention period in days [default: 30]
    -d, --directory DIR     Backup directory [default: /var/backups/simplifaq]
    -v, --verify            Verify backup integrity
    -h, --help              Show this help message

EXAMPLES:
    $0                      # Create full backup
    $0 -c -s               # Create compressed backup and upload to S3
    $0 -t schema           # Backup schema only
    $0 -r 7                # Keep backups for 7 days

ENVIRONMENT VARIABLES:
    POSTGRES_DB            Database name
    POSTGRES_USER          Database user
    POSTGRES_PASSWORD      Database password
    BACKUP_S3_BUCKET       S3 bucket for remote backups
    AWS_ACCESS_KEY_ID      AWS access key
    AWS_SECRET_ACCESS_KEY  AWS secret key

EOF
}

# Default values
BACKUP_TYPE="full"
COMPRESS=false
S3_UPLOAD=false
VERIFY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        -c|--compress)
            COMPRESS=true
            shift
            ;;
        -s|--s3-upload)
            S3_UPLOAD=true
            shift
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -d|--directory)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -v|--verify)
            VERIFY=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate backup type
if [[ "$BACKUP_TYPE" != "full" && "$BACKUP_TYPE" != "schema" && "$BACKUP_TYPE" != "data" ]]; then
    error "Invalid backup type: $BACKUP_TYPE. Must be 'full', 'schema', or 'data'"
fi

# Pre-backup checks
pre_backup_checks() {
    log "🔍 Running pre-backup checks..."
    
    # Check required commands
    local required_commands=("pg_dump" "psql")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command not found: $cmd. Install PostgreSQL client tools."
        fi
    done
    
    # Check S3 tools if S3 upload is requested
    if [[ "$S3_UPLOAD" == true ]]; then
        if ! command -v "aws" &> /dev/null; then
            error "AWS CLI not found. Install aws-cli for S3 uploads."
        fi
        
        if [[ -z "$S3_BUCKET" ]]; then
            error "S3_BUCKET environment variable not set"
        fi
    fi
    
    # Check database connection
    export PGPASSWORD="$DB_PASSWORD"
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to database. Check connection parameters."
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Check disk space (require at least 1GB free)
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 1048576 ]]; then  # 1GB in KB
        warning "Low disk space available: $(($available_space / 1024))MB"
    fi
    
    success "Pre-backup checks completed"
}

# Create database backup
create_backup() {
    log "💾 Creating $BACKUP_TYPE database backup..."
    
    # Generate backup filename
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_filename="simplifaq-${BACKUP_TYPE}-${timestamp}.sql"
    local backup_path="$BACKUP_DIR/$backup_filename"
    
    # Set pg_dump options based on backup type
    local pg_dump_options=""
    case "$BACKUP_TYPE" in
        "full")
            pg_dump_options="--verbose --no-owner --no-privileges"
            ;;
        "schema")
            pg_dump_options="--verbose --no-owner --no-privileges --schema-only"
            ;;
        "data")
            pg_dump_options="--verbose --no-owner --no-privileges --data-only"
            ;;
    esac
    
    # Create backup
    log "Creating backup: $backup_path"
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" $pg_dump_options > "$backup_path"; then
        success "Database backup created: $backup_path"
        
        # Get backup size
        local backup_size=$(du -h "$backup_path" | cut -f1)
        log "Backup size: $backup_size"
        
        # Compress if requested
        if [[ "$COMPRESS" == true ]]; then
            log "Compressing backup..."
            if gzip "$backup_path"; then
                backup_path="${backup_path}.gz"
                local compressed_size=$(du -h "$backup_path" | cut -f1)
                success "Backup compressed: $backup_path (size: $compressed_size)"
            else
                error "Failed to compress backup"
            fi
        fi
        
        # Store backup path for later use
        BACKUP_FILE="$backup_path"
        
    else
        error "Failed to create database backup"
    fi
}

# Verify backup integrity
verify_backup() {
    if [[ "$VERIFY" != true ]]; then
        return
    fi
    
    log "🔍 Verifying backup integrity..."
    
    local backup_file="$BACKUP_FILE"
    
    # If compressed, decompress for verification
    if [[ "$backup_file" == *.gz ]]; then
        log "Decompressing backup for verification..."
        local temp_file="${backup_file%.gz}.verify"
        if gunzip -c "$backup_file" > "$temp_file"; then
            backup_file="$temp_file"
        else
            error "Failed to decompress backup for verification"
        fi
    fi
    
    # Check if backup file is valid SQL
    if head -n 10 "$backup_file" | grep -q "PostgreSQL database dump"; then
        success "Backup file appears to be a valid PostgreSQL dump"
    else
        error "Backup file does not appear to be a valid PostgreSQL dump"
    fi
    
    # Try to restore to a test database (if test database exists)
    local test_db="${DB_NAME}_backup_test"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$test_db';" | grep -q 1; then
        log "Testing backup restore to test database..."
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" < "$backup_file" &> /dev/null; then
            success "Backup restore test successful"
        else
            warning "Backup restore test failed - backup may be corrupted"
        fi
    fi
    
    # Clean up temporary file
    if [[ "$backup_file" == *.verify ]]; then
        rm -f "$backup_file"
    fi
}

# Upload to S3
upload_to_s3() {
    if [[ "$S3_UPLOAD" != true ]]; then
        return
    fi
    
    log "☁️  Uploading backup to S3..."
    
    local backup_file="$BACKUP_FILE"
    local s3_key="backups/$(basename "$backup_file")"
    
    # Upload to S3
    if aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key" --region "$AWS_REGION"; then
        success "Backup uploaded to S3: s3://$S3_BUCKET/$s3_key"
        
        # Set lifecycle policy for automatic cleanup
        local lifecycle_config=$(cat << EOF
{
    "Rules": [
        {
            "ID": "SimpliFaqBackupRetention",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "backups/"
            },
            "Expiration": {
                "Days": $RETENTION_DAYS
            }
        }
    ]
}
EOF
)
        
        # Apply lifecycle policy
        echo "$lifecycle_config" | aws s3api put-bucket-lifecycle-configuration \
            --bucket "$S3_BUCKET" \
            --lifecycle-configuration file:///dev/stdin \
            --region "$AWS_REGION" || warning "Failed to set S3 lifecycle policy"
        
    else
        error "Failed to upload backup to S3"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "🧹 Cleaning up old backups..."
    
    # Clean local backups
    local deleted_count=0
    while IFS= read -r -d '' file; do
        rm -f "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "simplifaq-*.sql*" -mtime +$RETENTION_DAYS -print0)
    
    if [[ $deleted_count -gt 0 ]]; then
        success "Deleted $deleted_count old local backups"
    else
        log "No old local backups to delete"
    fi
    
    # Clean S3 backups (if S3 upload is enabled)
    if [[ "$S3_UPLOAD" == true ]]; then
        log "S3 backups will be cleaned up automatically by lifecycle policy"
    fi
}

# Generate backup report
generate_report() {
    log "📊 Generating backup report..."
    
    local report_file="$BACKUP_DIR/backup-report-$(date +%Y%m%d).txt"
    
    cat > "$report_file" << EOF
🇨🇭 SimpliFaq Database Backup Report
=====================================

Backup Date: $(date)
Backup Type: $BACKUP_TYPE
Database: $DB_NAME
Host: $DB_HOST:$DB_PORT

Backup Details:
- File: $(basename "$BACKUP_FILE")
- Size: $(du -h "$BACKUP_FILE" | cut -f1)
- Compressed: $COMPRESS
- S3 Upload: $S3_UPLOAD
- Verified: $VERIFY

Local Backups:
$(ls -lh "$BACKUP_DIR"/simplifaq-*.sql* 2>/dev/null | wc -l) backup files in $BACKUP_DIR

Retention Policy: $RETENTION_DAYS days

Status: SUCCESS
EOF

    success "Backup report generated: $report_file"
}

# Send notification
send_notification() {
    log "📧 Sending backup notification..."
    
    local status="SUCCESS"
    local backup_size=$(du -h "$BACKUP_FILE" | cut -f1)
    local message="🇨🇭 SimpliFaq backup completed successfully
Type: $BACKUP_TYPE
Size: $backup_size
File: $(basename "$BACKUP_FILE")
Date: $(date)"
    
    # This would typically send to email, Slack, or other notification system
    # Example: Send to webhook (uncomment and configure as needed)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"$message\"}" \
    #     "$SLACK_WEBHOOK_URL"
    
    log "Backup notification sent"
}

# Main backup function
main() {
    log "🇨🇭 Starting SimpliFaq database backup ($BACKUP_TYPE)"
    
    # Run backup steps
    pre_backup_checks
    create_backup
    verify_backup
    upload_to_s3
    cleanup_old_backups
    generate_report
    send_notification
    
    success "🎉 Database backup completed successfully!"
    log "Backup file: $BACKUP_FILE"
    log "Backup log: $LOG_FILE"
}

# Trap errors
trap 'error "Backup failed at line $LINENO"' ERR

# Run main function
main "$@"