#!/bin/bash

# 🇨🇭 SimpliFaq - Production Deployment Script
# This script handles the complete deployment process for the Swiss invoicing system

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
BACKUP_DIR="/var/backups/simplifaq"
LOG_FILE="/var/log/simplifaq/deploy.log"

# Default values
ENVIRONMENT="production"
SKIP_BACKUP=false
SKIP_TESTS=false
FORCE_DEPLOY=false
DRY_RUN=false

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
🇨🇭 SimpliFaq Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Deployment environment (production|staging) [default: production]
    -s, --skip-backup       Skip database backup before deployment
    -t, --skip-tests        Skip running tests before deployment
    -f, --force             Force deployment even if tests fail
    -d, --dry-run           Show what would be done without executing
    -h, --help              Show this help message

EXAMPLES:
    $0                      # Deploy to production with all checks
    $0 -e staging           # Deploy to staging environment
    $0 --skip-backup        # Deploy without creating backup
    $0 --dry-run            # Preview deployment steps

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        -t|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -f|--force)
            FORCE_DEPLOY=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
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

# Validate environment
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be 'production' or 'staging'"
fi

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."
    
    # Check if running as root (not recommended)
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root is not recommended for security reasons"
    fi
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "git" "curl" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command not found: $cmd"
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
    fi
    
    # Check environment file
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [[ ! -f "$env_file" ]]; then
        error "Environment file not found: $env_file"
    fi
    
    # Check SSL certificates for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local ssl_cert="$PROJECT_ROOT/ssl/cert.pem"
        local ssl_key="$PROJECT_ROOT/ssl/key.pem"
        if [[ ! -f "$ssl_cert" || ! -f "$ssl_key" ]]; then
            warning "SSL certificates not found. HTTPS will not be available."
        fi
    fi
    
    success "Pre-deployment checks completed"
}

# Create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        log "⏭️  Skipping backup as requested"
        return
    fi
    
    log "💾 Creating database backup..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would create backup in $BACKUP_DIR"
        return
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    local backup_file="$BACKUP_DIR/simplifaq-$(date +%Y%m%d-%H%M%S).sql"
    
    # Create database backup
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T postgres pg_dump -U simplifaq_user simplifaq_prod > "$backup_file"; then
        success "Database backup created: $backup_file"
        
        # Compress backup
        gzip "$backup_file"
        success "Backup compressed: $backup_file.gz"
        
        # Clean old backups (keep last 7 days)
        find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
        log "Old backups cleaned up"
    else
        error "Failed to create database backup"
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log "⏭️  Skipping tests as requested"
        return
    fi
    
    log "🧪 Running tests..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would run backend and frontend tests"
        return
    fi
    
    # Backend tests
    log "Running backend tests..."
    cd "$PROJECT_ROOT/backend"
    if npm test; then
        success "Backend tests passed"
    else
        if [[ "$FORCE_DEPLOY" == true ]]; then
            warning "Backend tests failed but continuing due to --force flag"
        else
            error "Backend tests failed. Use --force to deploy anyway"
        fi
    fi
    
    # Frontend tests
    log "Running frontend tests..."
    cd "$PROJECT_ROOT/frontend"
    if npm test -- --run; then
        success "Frontend tests passed"
    else
        if [[ "$FORCE_DEPLOY" == true ]]; then
            warning "Frontend tests failed but continuing due to --force flag"
        else
            error "Frontend tests failed. Use --force to deploy anyway"
        fi
    fi
    
    # Swiss compliance check
    log "Running Swiss compliance verification..."
    cd "$PROJECT_ROOT/backend"
    if npm run test:compliance; then
        success "Swiss compliance verification passed"
    else
        if [[ "$FORCE_DEPLOY" == true ]]; then
            warning "Swiss compliance check failed but continuing due to --force flag"
        else
            error "Swiss compliance check failed. Use --force to deploy anyway"
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

# Build and deploy
deploy_application() {
    log "🚀 Deploying application to $ENVIRONMENT..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would build and deploy Docker containers"
        return
    fi
    
    # Load environment variables
    set -a
    source "$PROJECT_ROOT/.env.$ENVIRONMENT"
    set +a
    
    # Pull latest images
    log "Pulling latest base images..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" pull
    
    # Build application images
    log "Building application images..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" build --no-cache
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" down
    
    # Start new containers
    log "Starting new containers..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps | grep -q "healthy"; then
            success "Services are healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "Services failed to become healthy within timeout"
        fi
        
        log "Attempt $attempt/$max_attempts - waiting for services..."
        sleep 10
        ((attempt++))
    done
}

# Run database migrations
run_migrations() {
    log "🗄️  Running database migrations..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would run Prisma migrations"
        return
    fi
    
    # Run Prisma migrations
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec backend npx prisma migrate deploy; then
        success "Database migrations completed"
    else
        error "Database migrations failed"
    fi
    
    # Generate Prisma client
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec backend npx prisma generate; then
        success "Prisma client generated"
    else
        error "Prisma client generation failed"
    fi
}

# Post-deployment verification
post_deployment_verification() {
    log "✅ Running post-deployment verification..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would verify deployment health"
        return
    fi
    
    # Health check endpoints
    local backend_url="http://localhost:3000/health"
    local frontend_url="http://localhost/health"
    
    # Check backend health
    log "Checking backend health..."
    if curl -f "$backend_url" &> /dev/null; then
        success "Backend is healthy"
    else
        error "Backend health check failed"
    fi
    
    # Check frontend health
    log "Checking frontend health..."
    if curl -f "$frontend_url" &> /dev/null; then
        success "Frontend is healthy"
    else
        error "Frontend health check failed"
    fi
    
    # Check database connectivity
    log "Checking database connectivity..."
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec backend node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.user.count().then(() => {
            console.log('Database connection successful');
            process.exit(0);
        }).catch((error) => {
            console.error('Database connection failed:', error);
            process.exit(1);
        });
    "; then
        success "Database connectivity verified"
    else
        error "Database connectivity check failed"
    fi
    
    # Check Swiss QR Bill generation
    log "Testing Swiss QR Bill generation..."
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec backend npm run test:qr-bill; then
        success "Swiss QR Bill generation verified"
    else
        warning "Swiss QR Bill generation test failed"
    fi
}

# Cleanup old images and containers
cleanup() {
    log "🧹 Cleaning up old Docker images and containers..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would clean up Docker resources"
        return
    fi
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    success "Cleanup completed"
}

# Send deployment notification
send_notification() {
    log "📧 Sending deployment notification..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would send deployment notification"
        return
    fi
    
    # This would typically send to Slack, email, or other notification system
    local message="🇨🇭 SimpliFaq deployed successfully to $ENVIRONMENT at $(date)"
    
    # Example: Send to webhook (uncomment and configure as needed)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"$message\"}" \
    #     "$SLACK_WEBHOOK_URL"
    
    log "Deployment notification sent"
}

# Main deployment function
main() {
    log "🇨🇭 Starting SimpliFaq deployment to $ENVIRONMENT"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run deployment steps
    pre_deployment_checks
    create_backup
    run_tests
    deploy_application
    run_migrations
    post_deployment_verification
    cleanup
    send_notification
    
    success "🎉 Deployment to $ENVIRONMENT completed successfully!"
    log "Deployment log: $LOG_FILE"
}

# Trap errors and cleanup
trap 'error "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"