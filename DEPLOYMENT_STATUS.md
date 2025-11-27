# SimpliFaq Test Deployment Status

**Deployed on:** November 12, 2025  
**Environment:** Production (Test)  
**URL:** https://test.simplifaq.ch

## ✅ Deployment Summary

The SimpliFaq application has been successfully deployed to the test environment without using Docker containers. Instead, we used a traditional Node.js deployment approach with PM2 process manager.

## 📋 What Was Deployed

### Frontend
- **Technology:** React + Vite
- **Location:** `/var/www/simplifaq/test/frontend`
- **Build Output:** `/var/www/simplifaq/test/frontend/dist`
- **Served by:** Nginx (static files)
- **Status:** ✅ Running

### Backend API
- **Technology:** Node.js + Express + TypeScript
- **Location:** `/var/www/simplifaq/test/backend`
- **Process Manager:** PM2 (process name: `simplifaq-test-backend`)
- **Port:** 3003 (internal, proxied by Nginx)
- **Status:** ✅ Running
- **Database:** SQLite (`test.db`)
- **Cache:** Redis (shared instance on port 6379)

## 🔧 Why Docker Wasn't Used

The original docker-compose setup encountered Docker Hub rate limits (HTTP 429). To avoid delays, we deployed using:
- PM2 for backend process management
- Nginx for reverse proxy and static file serving
- SQLite for database (simpler than PostgreSQL for test environment)
- Shared Redis instance (already running on the VPS)

## 🌐 Services Configuration

### Nginx Configuration
- **Config File:** `/etc/nginx/sites-available/test.simplifaq.ch`
- **Frontend:** Serves static files from `/var/www/simplifaq/test/frontend/dist`
- **API Proxy:** Routes `/api/*` → `http://localhost:3003`
- **SSL:** Enabled via Let's Encrypt

### PM2 Process
- **Config File:** `/var/www/simplifaq/test/ecosystem.config.js`
- **Runtime:** ts-node (development mode for easier updates)
- **Auto-restart:** Enabled
- **Logs:** `/var/www/simplifaq/test/logs/`

## 🔐 Environment Configuration

### Backend Environment (`.env.production`)
- NODE_ENV: production
- PORT: 3003
- DATABASE_URL: `file:./test.db` (SQLite)
- REDIS_URL: `redis://localhost:6379`
- CORS_ORIGIN: `https://test.simplifaq.ch`

### Frontend Environment (`.env.production`)
- VITE_API_URL: `https://test.simplifaq.ch/api`
- VITE_APP_NAME: SimpliFaq Test
- VITE_APP_VERSION: 1.0.0-test

## 📊 Port Usage

To avoid conflicts with existing services:
- **Frontend:** Served directly by Nginx on ports 80/443
- **Backend API:** 3003 (internal)
- **Database:** SQLite file (no port)
- **Redis:** 6379 (shared with other services)

## 🚀 Access URLs

- **Main Application:** https://test.simplifaq.ch
- **API Endpoint:** https://test.simplifaq.ch/api/*

## 📝 Management Commands

### View Backend Status
```bash
pm2 status
pm2 info simplifaq-test-backend
```

### View Backend Logs
```bash
pm2 logs simplifaq-test-backend
pm2 logs simplifaq-test-backend --lines 100
```

### Restart Backend
```bash
pm2 restart simplifaq-test-backend
```

### Stop Backend
```bash
pm2 stop simplifaq-test-backend
```

### Rebuild Frontend
```bash
cd /var/www/simplifaq/test/frontend
npm run build
sudo systemctl reload nginx
```

### Update Backend
```bash
cd /var/www/simplifaq/test/backend
pm2 restart simplifaq-test-backend
```

## 🔄 Auto-Start on Reboot

PM2 configuration has been saved:
```bash
pm2 save
```

To enable PM2 auto-start on system reboot:
```bash
pm2 startup
# Follow the command it outputs
```

## ⚠️ Known Issues

1. **TypeScript Build Errors:** The backend has some TypeScript errors, so it's running via `ts-node` in transpile mode rather than pre-built JS
2. **Frontend Type Errors:** The frontend also has TypeScript errors but builds successfully with Vite
3. **No Health Endpoint:** The backend doesn't have a `/health` endpoint configured

## 🔍 Testing Verification

All verified working:
- ✅ Frontend loads: https://test.simplifaq.ch
- ✅ Backend API responding: https://test.simplifaq.ch/api/*
- ✅ SSL Certificate valid
- ✅ PM2 process running and stable
- ✅ Database initialized

## 📌 Next Steps (Optional)

1. Fix TypeScript errors in backend and frontend
2. Add a health check endpoint
3. Configure PM2 auto-start on system reboot
4. Set up log rotation for PM2 logs
5. Configure database backups for test.db
6. Add monitoring/alerts
