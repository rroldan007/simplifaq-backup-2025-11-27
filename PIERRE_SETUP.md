# Pierre AI Assistant - Setup Guide

Pierre is the intelligent AI assistant for SimpliFaq, a Swiss invoicing SaaS. It uses Ollama for LLM inference and can manage products and clients directly.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│   PierreAssistant.tsx → pierreApi.ts → /api/pierre/*            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (SimpliFaq Server)                    │
│   pierreController.ts → pierreAgentService.ts                   │
│                              │                                   │
│   ┌──────────────────────────┴──────────────────────────┐       │
│   │                   LOCAL ACTIONS                      │       │
│   │   • Search products (Prisma)                         │       │
│   │   • Create products (Prisma)                         │       │
│   │   • Search clients (Prisma)                          │       │
│   │   • Create clients (Prisma)                          │       │
│   └─────────────────────────────────────────────────────┘       │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────┐       │
│   │           REMOTE OLLAMA (ia.simplifaq.cloud)         │       │
│   │   • LLM inference for understanding user intent      │       │
│   │   • Returns structured JSON actions                  │       │
│   └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Remote VPS Setup (ia.simplifaq.cloud)

### 1.1 Install Ollama

```bash
# SSH into the VPS
ssh root@ia.simplifaq.cloud

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
systemctl enable ollama
systemctl start ollama
```

### 1.2 Pull the Required Model

```bash
# Pull llama3.2:3b (recommended for speed/quality balance)
ollama pull llama3.2:3b

# Or for better quality (slower):
ollama pull llama3.1:8b

# Verify the model is available
ollama list
```

### 1.3 Configure Ollama for Remote Access

By default, Ollama only listens on localhost. To allow remote connections:

```bash
# Edit the systemd service
sudo systemctl edit ollama

# Add these lines:
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"

# Restart the service
sudo systemctl daemon-reload
sudo systemctl restart ollama

# Verify it's listening on all interfaces
ss -tlnp | grep 11434
```

### 1.4 Firewall Configuration

```bash
# Allow port 11434 from SimpliFaq server only (more secure)
ufw allow from YOUR_SIMPLIFAQ_SERVER_IP to any port 11434

# Or allow from anywhere (less secure, use with caution)
ufw allow 11434/tcp
```

### 1.5 Optional: Nginx Reverse Proxy with HTTPS

For production, set up HTTPS:

```nginx
# /etc/nginx/sites-available/ollama
server {
    listen 443 ssl http2;
    server_name ia.simplifaq.cloud;

    ssl_certificate /etc/letsencrypt/live/ia.simplifaq.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ia.simplifaq.cloud/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:11434;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Important for streaming responses
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/ollama /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 1.6 Test Ollama API

```bash
# From the VPS itself
curl http://localhost:11434/api/tags

# From SimpliFaq server (remote test)
curl http://ia.simplifaq.cloud:11434/api/tags

# Test a chat completion
curl http://ia.simplifaq.cloud:11434/api/chat -d '{
  "model": "llama3.2:3b",
  "messages": [{"role": "user", "content": "Hello, respond with OK"}],
  "stream": false
}'
```

## 2. SimpliFaq Backend Configuration

### 2.1 Environment Variables

Add to your `.env` file:

```env
# Pierre AI Assistant Configuration
PIERRE_OLLAMA_URL=http://ia.simplifaq.cloud:11434
PIERRE_OLLAMA_MODEL=llama3.2:3b
PIERRE_LOCAL_API_URL=http://localhost:9000/api
PIERRE_OLLAMA_TIMEOUT=60000
PIERRE_API_TIMEOUT=10000
```

If using HTTPS:
```env
PIERRE_OLLAMA_URL=https://ia.simplifaq.cloud
```

### 2.2 Regenerate Prisma Client

```bash
cd backend
npx prisma generate
```

### 2.3 Restart Backend

```bash
# Development
npm run dev

# Production
pm2 restart simplifaq-backend
```

## 3. API Endpoints

### Test Connection
```
GET /api/pierre/test
```
Returns connection status to Ollama.

### Chat
```
POST /api/pierre/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Cherche le produit service web",
  "conversationId": "optional-conversation-id"
}
```

### Confirm Action
```
POST /api/pierre/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "conversation-id",
  "action": { ... action object from chat response ... }
}
```

### Clear Conversation
```
DELETE /api/pierre/conversation/:conversationId
Authorization: Bearer <token>
```

## 4. Frontend Integration

### Replace AIAssistant with PierreAssistant

In your layout or dashboard component:

```tsx
// OLD (deprecated)
import { AIAssistant } from './components/ai/AIAssistant';

// NEW
import { PierreAssistant } from './components/ai/PierreAssistant';

// In your JSX
<PierreAssistant />
```

## 5. Capabilities

Pierre can:

| Action | Description | Trigger Examples |
|--------|-------------|------------------|
| `search_product` | Find products by name/SKU | "Cherche le produit X", "Trouve service web" |
| `create_product` | Create new product | After "not found" → user confirms |
| `search_client` | Find clients by name/email | "Cherche le client Dupont", "Trouve client@email.com" |
| `create_client` | Create new client | After "not found" → user confirms |

## 6. Troubleshooting

### Ollama Connection Failed

```bash
# Check if Ollama is running
systemctl status ollama

# Check logs
journalctl -u ollama -f

# Test local connection
curl http://localhost:11434/api/tags
```

### Model Not Found

```bash
# List available models
ollama list

# Pull the model if missing
ollama pull llama3.2:3b
```

### Slow Responses

- Use a smaller model: `llama3.2:1b`
- Reduce `max_tokens` in `pierreAgentService.ts`
- Increase `PIERRE_OLLAMA_TIMEOUT`

### CORS Issues (if using HTTPS proxy)

Add CORS headers in Nginx:
```nginx
add_header Access-Control-Allow-Origin "https://app.simplifaq.ch";
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
add_header Access-Control-Allow-Headers "Content-Type, Authorization";
```

## 7. Security Recommendations

1. **Restrict Ollama access** to only SimpliFaq server IP
2. **Use HTTPS** in production
3. **Monitor usage** to prevent abuse
4. **Rate limit** API calls if needed

## 8. Migrating from ADM Assistant

The old ADM assistant files are marked as obsolete:
- `backend/src/services/asistenteClient.ts` → Use `pierreAgentService.ts`
- `backend/src/routes/asistente.ts` → Use `pierre.ts`
- `frontend/src/components/ai/AIAssistant.tsx` → Use `PierreAssistant.tsx`
- `frontend/src/services/asistenteApi.ts` → Use `pierreApi.ts`

These can be removed once Pierre is fully tested and deployed.

---

**Version**: 1.0.0  
**Last Updated**: December 2025
