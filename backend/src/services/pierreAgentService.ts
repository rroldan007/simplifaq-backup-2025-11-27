/**
 * Pierre Agent Service - SimpliFaq Intelligent Assistant
 * 
 * This service provides an AI-powered assistant that can:
 * - Search and manage products
 * - Search and manage clients
 * - Execute local API operations
 * - Use remote Ollama for LLM inference
 */

import axios, { AxiosError } from 'axios';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PierreAction {
  action: 'search_product' | 'create_product' | 'search_client' | 'create_client' | 
          'ask_confirmation' | 'ask_info' | 'respond' | 'error' | 'prepare_invoice' | 'create_invoice';
  endpoint?: string;
  method?: 'GET' | 'POST';
  payload?: Record<string, unknown>;
  query?: Record<string, string>;
  message: string;
  requiresConfirmation?: boolean;
  pendingAction?: string;
  pendingPayload?: Record<string, unknown>;
  field?: string;
  data?: unknown;
  // For invoice creation
  clientName?: string;
  items?: Array<{ productName: string; quantity: number }>;
}

export interface PierreResponse {
  success: boolean;
  message: string;
  action?: PierreAction;
  conversationId?: string;
  data?: unknown;
}

export interface PierreMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response?: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PIERRE_CONFIG = {
  // Remote Ollama for LLM inference
  remoteOllamaUrl: process.env.PIERRE_OLLAMA_URL || 'http://ia.simplifaq.cloud:11434',
  remoteOllamaModel: process.env.PIERRE_OLLAMA_MODEL || 'mistral:7b',
  
  // Local API base URL for tool execution
  localApiUrl: process.env.PIERRE_LOCAL_API_URL || 'http://localhost:3001/api',
  
  // Timeouts
  ollamaTimeout: Number(process.env.PIERRE_OLLAMA_TIMEOUT || 60000),
  apiTimeout: Number(process.env.PIERRE_API_TIMEOUT || 10000),
};

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const PIERRE_SYSTEM_PROMPT = `Tu es Pierre, assistant SimpliFaq. Tu ne connais PAS les données - tu dois TOUJOURS faire une recherche.

⚠️ RÈGLES CRITIQUES:
1. Tu réponds UNIQUEMENT en JSON valide
2. Tu n'inventes JAMAIS de prix, stock, ou données
3. Quand l'utilisateur mentionne un produit/service → search_product
4. Quand l'utilisateur mentionne un client → search_client
5. Quand l'utilisateur veut créer une facture → prepare_invoice

📋 FORMATS JSON:

RECHERCHE PRODUIT:
{"action":"search_product","endpoint":"/api/products","method":"GET","query":{"search":"TERME"},"message":""}

RECHERCHE CLIENT:
{"action":"search_client","endpoint":"/api/clients","method":"GET","query":{"search":"TERME"},"message":""}

PRÉPARER FACTURE (quand l'utilisateur demande de créer/faire une factura/facture/invoice):
{"action":"prepare_invoice","clientName":"NOM_CLIENT","items":[{"productName":"PRODUIT","quantity":1}],"message":""}

Exemple: "factura para laura 1 pollo" →
{"action":"prepare_invoice","clientName":"laura","items":[{"productName":"pollo","quantity":1}],"message":""}

Exemple: "facture pour dupont 2 transport et 1 chocolat" →
{"action":"prepare_invoice","clientName":"dupont","items":[{"productName":"transport","quantity":2},{"productName":"chocolat","quantity":1}],"message":""}

SALUTATION/CONVERSATION:
{"action":"respond","message":"Réponse courte ici"}

📝 EXEMPLES:
- "prix transport" → {"action":"search_product","endpoint":"/api/products","method":"GET","query":{"search":"transport"},"message":""}
- "client dupont" → {"action":"search_client","endpoint":"/api/clients","method":"GET","query":{"search":"dupont"},"message":""}
- "bonjour" → {"action":"respond","message":"Bonjour! Comment puis-je vous aider?"}
- "crea factura para maria 3 pollos" → {"action":"prepare_invoice","clientName":"maria","items":[{"productName":"pollos","quantity":3}],"message":""}

🚫 INTERDIT: Inventer des prix ou données.`;

// ============================================================================
// PIERRE AGENT SERVICE
// ============================================================================

export class PierreAgentService {
  private conversationHistory: Map<string, PierreMessage[]> = new Map();
  private userTokens: Map<string, string> = new Map(); // Store tokens per conversation

  /**
   * Process a user message and return Pierre's response
   */
  async processMessage(
    userId: string,
    message: string,
    conversationId?: string,
    userToken?: string
  ): Promise<PierreResponse> {
    const convId = conversationId || `pierre-${userId}-${Date.now()}`;
    
    // Store token for this conversation
    if (userToken) {
      this.userTokens.set(convId, userToken);
    }
    
    try {
      // Get or create conversation history
      let history = this.conversationHistory.get(convId) || [];
      
      // Add user message to history
      history.push({ role: 'user', content: message });
      
      // Limit history to last 10 messages
      if (history.length > 10) {
        history = history.slice(-10);
      }
      
      // Get LLM response from remote Ollama
      const llmResponse = await this.queryOllama(history);
      console.log('[PierreAgent] LLM Response:', llmResponse);
      
      // Parse the response to extract action
      const parsedAction = this.parseResponse(llmResponse);
      console.log('[PierreAgent] Parsed Action:', JSON.stringify(parsedAction));
      
      // Execute the action if needed - pass the user token for auth
      const token = this.userTokens.get(convId);
      console.log('[PierreAgent] Executing action:', parsedAction.action, 'with token:', !!token);
      const result = await this.executeAction(userId, parsedAction, token);
      console.log('[PierreAgent] Action Result:', JSON.stringify(result).slice(0, 300));
      
      // Add assistant response to history
      history.push({ role: 'assistant', content: llmResponse });
      this.conversationHistory.set(convId, history);
      
      return {
        success: true,
        message: result.message,
        action: result,
        conversationId: convId,
        data: result.data
      };
      
    } catch (error) {
      console.error('[PierreAgent] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        message: `Désolé, j'ai rencontré une erreur: ${errorMessage}`,
        conversationId: convId
      };
    }
  }

  /**
   * Query remote Ollama for LLM inference
   */
  private async queryOllama(messages: PierreMessage[]): Promise<string> {
    try {
      const response = await axios.post<OllamaChatResponse>(
        `${PIERRE_CONFIG.remoteOllamaUrl}/api/chat`,
        {
          model: PIERRE_CONFIG.remoteOllamaModel,
          messages: [
            { role: 'system', content: PIERRE_SYSTEM_PROMPT },
            ...messages
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 500
          }
        },
        {
          timeout: PIERRE_CONFIG.ollamaTimeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.message?.content || '';
      
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('[PierreAgent] Ollama error:', error.response?.data || error.message);
        throw new Error(`Ollama connection failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse LLM response to extract action
   */
  private parseResponse(response: string): PierreAction {
    try {
      console.log('[PierreAgent] Raw LLM response:', response);
      
      // Try to extract the FIRST complete JSON object from response
      // Use a more careful approach to find balanced braces
      let braceCount = 0;
      let startIndex = -1;
      let jsonString = '';
      
      for (let i = 0; i < response.length; i++) {
        if (response[i] === '{') {
          if (braceCount === 0) startIndex = i;
          braceCount++;
        } else if (response[i] === '}') {
          braceCount--;
          if (braceCount === 0 && startIndex !== -1) {
            jsonString = response.substring(startIndex, i + 1);
            break;
          }
        }
      }
      
      if (jsonString) {
        const parsed = JSON.parse(jsonString);
        console.log('[PierreAgent] Parsed action:', parsed);
        
        // Build payload from query or payload field
        const payload = parsed.payload || parsed.query || {};
        
        return {
          action: parsed.action || 'respond',
          endpoint: parsed.endpoint,
          method: parsed.method,
          payload: payload,
          query: parsed.query,
          message: parsed.message || '',
          requiresConfirmation: parsed.requiresConfirmation || false,
          pendingAction: parsed.pendingAction,
          pendingPayload: parsed.pendingPayload,
          // Invoice-specific fields
          clientName: parsed.clientName,
          items: parsed.items
        };
      }
      
      // If no JSON found, return as simple response
      return {
        action: 'respond',
        message: response
      };
      
    } catch (error) {
      console.error('[PierreAgent] Parse error:', error, 'Response:', response);
      return {
        action: 'respond',
        message: response
      };
    }
  }

  /**
   * Execute the parsed action via HTTP calls to local API
   */
  private async executeAction(userId: string, action: PierreAction, userToken?: string): Promise<PierreAction> {
    // Actions that don't require API calls
    if (action.action === 'respond' || action.action === 'ask_confirmation' || action.action === 'ask_info') {
      return action;
    }

    // If action requires confirmation, don't execute yet
    if (action.requiresConfirmation) {
      return action;
    }

    // Handle prepare_invoice - multi-step process
    if (action.action === 'prepare_invoice') {
      return await this.handlePrepareInvoice(userId, action, userToken);
    }

    try {
      const endpoint = action.endpoint;
      const method = action.method || 'GET';
      
      if (!endpoint) {
        return action;
      }

      // Build the full URL
      const baseUrl = PIERRE_CONFIG.localApiUrl.replace('/api', '');
      let url = `${baseUrl}${endpoint}`;
      
      // Add query params for GET requests
      if (method === 'GET') {
        // Use action.query first, then payload.query, then payload itself
        const query = action.query || (action.payload?.query as Record<string, string>) || action.payload || {};
        const params = new URLSearchParams();
        Object.entries(query as Record<string, string>).forEach(([k, v]) => {
          if (v) params.append(k, String(v));
        });
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }

      console.log(`[PierreAgent] Executing ${method} ${url}`);

      const response = await axios({
        method,
        url,
        data: method === 'POST' ? action.payload : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...(userToken ? { 'Authorization': `Bearer ${userToken}` } : {})
        },
        timeout: PIERRE_CONFIG.apiTimeout,
        validateStatus: () => true // Don't throw on 4xx/5xx
      });

      console.log(`[PierreAgent] Response status: ${response.status}`);

      // Handle 404 - not found
      if (response.status === 404) {
        const entityType = endpoint.includes('product') ? 'producto' : 'cliente';
        const searchTerm = action.query?.name || 
                          action.query?.search ||
                          (action.payload as Record<string, string>)?.name ||
                          (action.payload as Record<string, string>)?.search || 'desconocido';
        
        return {
          action: 'ask_confirmation',
          message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} no encontrado. ¿Quieres crear uno nuevo?`,
          requiresConfirmation: true,
          payload: { 
            name: searchTerm, 
            pendingAction: endpoint.includes('product') ? 'create_product' : 'create_client' 
          }
        };
      }

      // Handle success
      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data?.data || response.data;
        console.log('[PierreAgent] Response data:', JSON.stringify(responseData).slice(0, 200));
        
        if (action.action === 'search_product') {
          // Products endpoint returns {products: [...], total: N}
          const products = responseData?.products || (Array.isArray(responseData) ? responseData : []);
          const searchTerm = action.query?.search || (action.payload as Record<string, string>)?.search || '';
          
          if (!products || products.length === 0) {
            return {
              action: 'ask_confirmation',
              message: `Producto "${searchTerm}" no encontrado. ¿Quieres crear uno nuevo?`,
              requiresConfirmation: true,
              payload: { name: searchTerm, pendingAction: 'create_product' }
            };
          }
          const maxShow = 15;
          const productList = products.slice(0, maxShow).map((p: Record<string, unknown>) => 
            `• ${p.name}: ${p.description || 'Sin descripción'} - Precio: ${p.unitPrice} CHF`
          ).join('\n');
          const moreMsg = products.length > maxShow ? `\n... y ${products.length - maxShow} más` : '';
          return { ...action, action: 'respond', message: `Productos encontrados (${products.length}):\n${productList}${moreMsg}`, data: products };
        }
        
        if (action.action === 'search_client') {
          // Clients endpoint returns {clients: [...]} or array directly
          const clients = responseData?.clients || (Array.isArray(responseData) ? responseData : []);
          const searchTerm = action.query?.search || (action.payload as Record<string, string>)?.search || '';
          
          if (!clients || clients.length === 0) {
            return {
              action: 'ask_confirmation', 
              message: `Cliente "${searchTerm}" no encontrado. ¿Quieres crearlo?`,
              requiresConfirmation: true,
              payload: { name: searchTerm, pendingAction: 'create_client' }
            };
          }
          const maxShowClients = 15;
          const clientList = clients.slice(0, maxShowClients).map((c: Record<string, unknown>) => 
            `• ${c.companyName || `${c.firstName} ${c.lastName}`} - Email: ${c.email || 'N/A'}`
          ).join('\n');
          const moreClientsMsg = clients.length > maxShowClients ? `\n... y ${clients.length - maxShowClients} más` : '';
          return { ...action, action: 'respond', message: `Clientes encontrados (${clients.length}):\n${clientList}${moreClientsMsg}`, data: clients };
        }

        if (action.action === 'create_product') {
          const product = responseData?.product || responseData;
          return { ...action, action: 'respond', message: `✅ Producto creado: ${product.name} - ${product.unitPrice} CHF`, data: product };
        }

        if (action.action === 'create_client') {
          const client = responseData?.client || responseData;
          const clientName = client.companyName || `${client.firstName} ${client.lastName}`;
          return { ...action, action: 'respond', message: `✅ Cliente creado: ${clientName} - ${client.email}`, data: client };
        }

        return { ...action, message: 'Operación completada', data: responseData };
      }

      // Handle errors
      const errorMsg = response.data?.error?.message || 
                       (typeof response.data?.error === 'string' ? response.data.error : null) ||
                       response.statusText || 
                       `HTTP ${response.status}`;
      console.log('[PierreAgent] HTTP Error:', response.status, errorMsg);
      return {
        ...action,
        action: 'error',
        message: `Error: ${errorMsg}`
      };

    } catch (error) {
      console.error('[PierreAgent] Action execution error:', error);
      return {
        ...action,
        action: 'error',
        message: `Error de conexión: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Confirm and execute a pending action
   */
  async confirmAction(
    userId: string, 
    conversationId: string, 
    actionData: PierreAction,
    userToken?: string
  ): Promise<PierreResponse> {
    try {
      // Store token if provided
      if (userToken) {
        this.userTokens.set(conversationId, userToken);
      }
      const token = this.userTokens.get(conversationId);

      // Handle ask_confirmation with pendingAction (create_client or create_product)
      let actionToExecute = { ...actionData, requiresConfirmation: false };
      
      if (actionData.action === 'ask_confirmation' && actionData.payload?.pendingAction) {
        const pendingAction = actionData.payload.pendingAction as string;
        const name = actionData.payload.name as string || '';
        
        console.log(`[PierreAgent] Executing pending action: ${pendingAction} for "${name}"`);
        
        if (pendingAction === 'create_client') {
          actionToExecute = {
            action: 'create_client',
            endpoint: '/api/clients',
            method: 'POST',
            payload: {
              companyName: name,
              firstName: '',
              lastName: '',
              email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
              clientType: 'ENTREPRISE'
            },
            message: '',
            requiresConfirmation: false
          };
        } else if (pendingAction === 'create_product') {
          actionToExecute = {
            action: 'create_product',
            endpoint: '/api/products',
            method: 'POST',
            payload: {
              name: name,
              description: `Producto: ${name}`,
              unitPrice: 0,
              tvaRate: 8.1,
              unit: 'unité',
              isActive: true
            },
            message: '',
            requiresConfirmation: false
          };
        }
      }

      // Execute the confirmed action with user token
      const result = await this.executeAction(userId, actionToExecute, token);

      return {
        success: true,
        message: result.message,
        action: result,
        conversationId,
        data: result.data
      };

    } catch (error) {
      console.error('[PierreAgent] Confirm action error:', error);
      return {
        success: false,
        message: `Erreur lors de la confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        conversationId
      };
    }
  }

  /**
   * Handle prepare_invoice action - search client and products, then create invoice
   */
  private async handlePrepareInvoice(userId: string, action: PierreAction, userToken?: string): Promise<PierreAction> {
    const baseUrl = PIERRE_CONFIG.localApiUrl.replace('/api', '');
    const headers = {
      'Content-Type': 'application/json',
      ...(userToken ? { 'Authorization': `Bearer ${userToken}` } : {})
    };

    try {
      const clientName = action.clientName || '';
      const items = action.items || [];

      if (!clientName) {
        return { action: 'respond', message: '❌ Necesito el nombre del cliente para crear la factura.' };
      }

      if (items.length === 0) {
        return { action: 'respond', message: '❌ Necesito al menos un producto para crear la factura.' };
      }

      console.log(`[PierreAgent] Preparing invoice for client: ${clientName}, items:`, items);

      // 1. Search for client
      const clientResponse = await axios.get(`${baseUrl}/api/clients?search=${encodeURIComponent(clientName)}`, {
        headers, timeout: PIERRE_CONFIG.apiTimeout, validateStatus: () => true
      });

      const clients = clientResponse.data?.data?.clients || [];
      if (clients.length === 0) {
        return { 
          action: 'respond', 
          message: `❌ Cliente "${clientName}" no encontrado. Primero debes crear el cliente.` 
        };
      }
      const client = clients[0];
      console.log(`[PierreAgent] Found client: ${client.firstName} ${client.lastName} (${client.id})`);

      // 2. Search for each product and build invoice items
      const invoiceItems: Array<{ productId: string; quantity: number; unitPrice: number; tvaRate: number; description: string }> = [];
      const notFoundProducts: string[] = [];

      for (const item of items) {
        const productResponse = await axios.get(`${baseUrl}/api/products?search=${encodeURIComponent(item.productName)}`, {
          headers, timeout: PIERRE_CONFIG.apiTimeout, validateStatus: () => true
        });

        const products = productResponse.data?.data?.products || [];
        if (products.length === 0) {
          notFoundProducts.push(item.productName);
          continue;
        }

        const product = products[0];
        invoiceItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.unitPrice,
          tvaRate: product.tvaRate,
          description: product.name
        });
        console.log(`[PierreAgent] Found product: ${product.name} - ${product.unitPrice} CHF`);
      }

      if (invoiceItems.length === 0) {
        return { 
          action: 'respond', 
          message: `❌ No se encontraron los productos: ${notFoundProducts.join(', ')}. Debes crearlos primero.` 
        };
      }

      // 3. Create the invoice
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

      const invoicePayload = {
        clientId: client.id,
        dueDate: dueDate.toISOString(),
        items: invoiceItems,
        notes: `Factura creada por Pierre AI`
      };

      console.log(`[PierreAgent] Creating invoice:`, JSON.stringify(invoicePayload, null, 2));

      const createResponse = await axios.post(`${baseUrl}/api/invoices`, invoicePayload, {
        headers, timeout: PIERRE_CONFIG.apiTimeout, validateStatus: () => true
      });

      if (createResponse.status >= 200 && createResponse.status < 300) {
        const invoice = createResponse.data?.data?.invoice || createResponse.data?.data;
        const clientDisplayName = client.companyName || `${client.firstName} ${client.lastName}`;
        
        // Calculate total
        const total = invoiceItems.reduce((sum, item) => {
          const lineTotal = item.quantity * item.unitPrice * (1 + item.tvaRate / 100);
          return sum + lineTotal;
        }, 0);

        const itemsList = invoiceItems.map(i => `  • ${i.description} x${i.quantity} = ${(i.quantity * i.unitPrice).toFixed(2)} CHF`).join('\n');
        let message = `✅ Factura creada!\n\nCliente: ${clientDisplayName}\nProductos:\n${itemsList}\n\nTotal (con TVA): ${total.toFixed(2)} CHF`;
        
        if (notFoundProducts.length > 0) {
          message += `\n\n⚠️ Productos no encontrados: ${notFoundProducts.join(', ')}`;
        }

        if (invoice?.invoiceNumber) {
          message = `✅ Factura ${invoice.invoiceNumber} creada!\n\n` + message.substring(message.indexOf('\n') + 2);
        }

        return { action: 'respond', message, data: invoice };
      } else {
        const errorMsg = createResponse.data?.error?.message || createResponse.statusText || 'Error desconocido';
        console.error(`[PierreAgent] Invoice creation failed:`, createResponse.status, errorMsg);
        return { action: 'error', message: `❌ Error al crear factura: ${errorMsg}` };
      }

    } catch (error) {
      console.error('[PierreAgent] handlePrepareInvoice error:', error);
      return { 
        action: 'error', 
        message: `❌ Error al preparar factura: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      };
    }
  }

  /**
   * Clear conversation history and tokens
   */
  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
    this.userTokens.delete(conversationId);
  }

  /**
   * Test Ollama connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; model?: string }> {
    try {
      const response = await axios.get(`${PIERRE_CONFIG.remoteOllamaUrl}/api/tags`, {
        timeout: 5000
      });

      const models = response.data?.models || [];
      const hasConfiguredModel = models.some(
        (m: { name: string }) => m.name.startsWith(PIERRE_CONFIG.remoteOllamaModel.split(':')[0])
      );

      return {
        success: true,
        message: hasConfiguredModel 
          ? `Connected to Ollama. Model ${PIERRE_CONFIG.remoteOllamaModel} available.`
          : `Connected but model ${PIERRE_CONFIG.remoteOllamaModel} not found. Available: ${models.map((m: { name: string }) => m.name).join(', ')}`,
        model: PIERRE_CONFIG.remoteOllamaModel
      };

    } catch (error) {
      return {
        success: false,
        message: `Cannot connect to Ollama at ${PIERRE_CONFIG.remoteOllamaUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const pierreAgentService = new PierreAgentService();
