import { Request, Response } from 'express';
import { AsistenteClient, AsistenteClientError, AsistenteChatPayload } from '../services/asistenteClient';
import { ApiResponse } from '../types';
import { AssistantActionPlan } from '../services/asistenteActionService';
import {
  storeAssistantActions,
  markActionConfirmed,
  markActionFailed,
  markActionCancelled,
  markActionExecuted,
  listAssistantActions,
  getAssistantAction,
} from '../services/asistenteActionService';

function getUserId(req: Request): string {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    throw new AsistenteClientError('Missing user context for Asistente request', 401, 'NO_USER');
  }
  return userId;
}

function getUserToken(req: Request): string {
  const token = (req as any).token as string | undefined;
  if (!token) {
    throw new AsistenteClientError('Missing user token for Asistente request', 401, 'NO_TOKEN');
  }
  return token;
}

export async function chatWithAsistente(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const userToken = getUserToken(req);
    const payload: AsistenteChatPayload = {
      message: req.body?.message,
      sessionId: req.body?.sessionId,
      channel: req.body?.channel,
      locale: req.body?.locale,
      metadata: req.body?.metadata,
    };

    // Detectar intención y generar acciones locales si es necesario
    const localActions = detectIntentAndGenerateActions(payload.message);
    let data;

    if (localActions.length > 0) {
      // Si detectamos acciones locales, ejecutarlas directamente
      console.log('🤖 Ejecutando acciones locales detectadas:', localActions.length);
      
      const actionResults = [];
      for (const action of localActions) {
        try {
          const result = await AsistenteClient.executeAction(action, { userToken });
          actionResults.push({
            action: action.description,
            result: result,
            success: true
          });
        } catch (error) {
          actionResults.push({
            action: action.description,
            error: error instanceof Error ? error.message : 'Error desconocido',
            success: false
          });
        }
      }

      // Crear respuesta con resultados de acciones locales
      data = {
        reply: generateResponseFromResults(payload.message, actionResults, payload.locale),
        actions: [], // No hay acciones adicionales del asistente externo
        sessionId: payload.sessionId
      };
    } else {
      // Si no hay acciones locales, consultar al asistente externo
      data = await AsistenteClient.chat(payload, { userToken });
    }

    const actions = extractActions(data);
    if (actions.length > 0) {
      await storeAssistantActions(userId, payload.sessionId, actions);
    }

    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
}

export async function confirmAsistenteAction(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const userToken = getUserToken(req);
    const payload = {
      actionId: req.body?.actionId,
      confirmation: Boolean(req.body?.confirmation),
      metadata: req.body?.metadata,
    };

    const data = await AsistenteClient.confirmAction(payload, { userToken });

    if (payload.confirmation) {
      await markActionConfirmed(userId, payload.actionId);
      if (isActionExecuted(data)) {
        await markActionExecuted(userId, payload.actionId);
      }
    } else {
      await markActionCancelled(userId, payload.actionId);
    }

    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const actionId = req.body?.actionId as string | undefined;
    const userId = (req as any).user?.id as string | undefined;
    if (actionId && userId) {
      await markActionFailed(userId, actionId, error);
    }
    handleError(res, error);
  }
}

export async function analyzeExpenseWithAsistente(req: Request, res: Response): Promise<void> {
  try {
    const userToken = getUserToken(req);
    const file = req.file;
    const metadata = req.body?.metadata ? parseMetadata(req.body.metadata) : undefined;

    const data = await AsistenteClient.analyzeExpense(file as Express.Multer.File, metadata, { userToken });

    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
}

export async function getAsistenteActions(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const status = typeof req.query?.status === 'string' ? req.query.status : undefined;

    const actions = await listAssistantActions(userId, status as any);

    const response: ApiResponse = {
      success: true,
      data: actions,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
}

export async function getAsistenteActionDetails(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const { actionId } = req.params;

    const action = await getAssistantAction(userId, actionId);
    if (!action) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ACTION_NOT_FOUND',
          message: 'Action introuvable',
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: action,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
}

export async function cancelAsistenteAction(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const { actionId } = req.params;

    await markActionCancelled(userId, actionId);

    const response: ApiResponse = {
      success: true,
      data: {
        actionId,
        status: 'cancelled',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
}

export async function executeAsistenteAction(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const userToken = getUserToken(req);
    const { actionId } = req.params;

    // Get the action from database
    const action = await getAssistantAction(userId, actionId);
    if (!action) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ACTION_NOT_FOUND',
          message: 'Action introuvable',
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse);
      return;
    }

    if (action.status !== 'confirmed') {
      res.status(400).json({
        success: false,
        error: {
          code: 'ACTION_NOT_CONFIRMED',
          message: 'L\'action doit être confirmée avant d\'être exécutée',
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse);
      return;
    }

    // Execute the action
    const actionPlan: AssistantActionPlan = action.payload as AssistantActionPlan;
    const result = await AsistenteClient.executeAction(actionPlan, { userToken });

    // Mark as executed
    await markActionExecuted(userId, actionId);

    const response: ApiResponse = {
      success: true,
      data: {
        actionId,
        result,
        status: 'executed',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const actionId = req.params.actionId as string | undefined;
    const userId = (req as any).user?.id as string | undefined;
    if (actionId && userId) {
      await markActionFailed(userId, actionId, error);
    }
    handleError(res, error);
  }
}

function parseMetadata(metadataField: unknown): Record<string, unknown> | undefined {
  if (!metadataField) return undefined;

  if (typeof metadataField === 'object') {
    return metadataField as Record<string, unknown>;
  }

  if (typeof metadataField === 'string') {
    try {
      return JSON.parse(metadataField);
    } catch (error) {
      throw new AsistenteClientError(
        'metadata field must be a valid JSON string',
        400,
        'INVALID_METADATA',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  throw new AsistenteClientError('Unsupported metadata format', 400, 'INVALID_METADATA');
}

function handleError(res: Response, error: unknown) {
  if (error instanceof AsistenteClientError) {
    res.status(error.status).json({
      success: false,
      error: {
        code: error.code ?? 'ASISTENTE_ERROR',
        message: error.message,
        details: error.details,
      },
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse);
    return;
  }

  const message = error instanceof Error ? error.message : 'Erreur interne du serveur';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
    },
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
}

export function detectIntentAndGenerateActions(message: string): AssistantActionPlan[] {
  if (!message) return [];

  const lowerMessage = message.toLowerCase().trim();

  // Patrones para detectar consultas sobre clientes
  const clientPatterns = [
    /cuántos?\s+clientes?\s+tengo/i,
    /cuantos\s+clientes\s+tengo/i,
    /número\s+de\s+clientes/i,
    /numero\s+de\s+clientes/i,
    /lista\s+de\s+clientes/i,
    /mis\s+clientes/i,
    /ver\s+clientes/i,
    /clientes\s+registrados/i,
    /how\s+many\s+clients/i,
    /list\s+clients/i,
    /my\s+clients/i,
    /(cuáles|cuales)\s+son\s+los\s+clientes/i,
    /(cuáles|cuales)\s+son\s+mis\s+clientes/i,
    /combien\s+de\s+clients/i,
    /nombre\s+de\s+clients/i,
    /liste\s+des?\s+clients/i,
    /mes\s+clients/i,
    /voir\s+les?\s+clients/i,
    /clients?\s+(enregistrés?|inscrits?)/i
  ];

  // Patrones para detectar consultas sobre facturas
  const invoicePatterns = [
    /cuántas?\s+facturas?\s+tengo/i,
    /cuantas\s+facturas\s+tengo/i,
    /número\s+de\s+facturas/i,
    /numero\s+de\s+facturas/i,
    /lista\s+de\s+facturas/i,
    /mis\s+facturas/i,
    /ver\s+facturas/i,
    /facturas\s+registradas/i,
    /how\s+many\s+invoices/i,
    /list\s+invoices/i,
    /my\s+invoices/i,
    /combien\s+de\s+factures/i,
    /nombre\s+de\s+factures/i,
    /liste\s+des?\s+factures/i,
    /mes\s+factures/i,
    /voir\s+les?\s+factures/i
  ];

  // Patrones para detectar consultas sobre productos
  const productPatterns = [
    /cuántos?\s+productos?\s+tengo/i,
    /cuantos\s+productos\s+tengo/i,
    /número\s+de\s+productos/i,
    /numero\s+de\s+productos/i,
    /lista\s+de\s+productos/i,
    /mis\s+productos/i,
    /ver\s+productos/i,
    /productos\s+registrados/i,
    /how\s+many\s+products/i,
    /list\s+products/i,
    /my\s+products/i,
    /combien\s+de\s+produits/i,
    /nombre\s+de\s+produits/i,
    /liste\s+des?\s+produits/i,
    /mes\s+produits/i,
    /voir\s+les?\s+produits/i
  ];

  const actions: AssistantActionPlan[] = [];

  // Detectar consultas sobre clientes
  if (clientPatterns.some(pattern => pattern.test(lowerMessage))) {
    actions.push({
      id: `query_clients_${Date.now()}`,
      description: 'Consultar lista de clientes del usuario',
      requiresConfirmation: false, // No requiere confirmación para consultas GET
      endpoint: {
        method: 'GET',
        url: '/clients'
      }
    });
  }

  // Detectar consultas sobre facturas
  if (invoicePatterns.some(pattern => pattern.test(lowerMessage))) {
    actions.push({
      id: `query_invoices_${Date.now()}`,
      description: 'Consultar lista de facturas del usuario',
      requiresConfirmation: false,
      endpoint: {
        method: 'GET',
        url: '/invoices'
      }
    });
  }

  // Detectar consultas sobre productos
  if (productPatterns.some(pattern => pattern.test(lowerMessage))) {
    actions.push({
      id: `query_products_${Date.now()}`,
      description: 'Consultar lista de productos del usuario',
      requiresConfirmation: false,
      endpoint: {
        method: 'GET',
        url: '/products'
      }
    });
  }

  return actions;
}

export function generateResponseFromResults(originalMessage: string, results: any[], locale?: string): string {
  const isFrench = locale === 'fr-FR' || locale === 'fr' || !locale;
  const isSpanish = locale === 'es-ES' || locale === 'es';
  
  if (results.length === 0) {
    if (isFrench) {
      return "Je n'ai pas trouvé d'informations pertinentes pour votre requête.";
    }
    return isSpanish 
      ? "No pude encontrar información relevante para tu consulta."
      : "I couldn't find relevant information for your query.";
  }

  let response = "";
  const successfulResults = results.filter(r => r.success);

  if (successfulResults.length === 0) {
    if (isFrench) {
      return "J'ai eu des problèmes pour accéder aux informations. Veuillez réessayer.";
    }
    return isSpanish
      ? "Tuve problemas para acceder a la información. Por favor, intenta de nuevo."
      : "I had problems accessing the information. Please try again.";
  }

  // Procesar resultados por tipo
  for (const result of successfulResults) {
    if (result.action.includes('clientes') || result.action.includes('clients')) {
      const clientData = result.result?.data || result.result;
      if (Array.isArray(clientData)) {
        if (isFrench) {
          response += `Vous avez ${clientData.length} client${clientData.length !== 1 ? 's' : ''} enregistré${clientData.length !== 1 ? 's' : ''}`;
          
          if (clientData.length > 0 && clientData.length <= 3) {
            response += " :\n";
            clientData.slice(0, 3).forEach((client: any, i: number) => {
              const name = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Sans nom';
              response += `${i + 1}. ${name} (${client.email || 'Sans email'})\n`;
            });
          } else if (clientData.length > 3) {
            response += ". Les 3 premiers sont :\n";
            clientData.slice(0, 3).forEach((client: any, i: number) => {
              const name = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Sans nom';
              response += `${i + 1}. ${name}\n`;
            });
          }
        } else if (isSpanish) {
          response += `Tienes ${clientData.length} cliente${clientData.length !== 1 ? 's' : ''} registrado${clientData.length !== 1 ? 's' : ''}`;
          
          if (clientData.length > 0 && clientData.length <= 3) {
            response += ":\n";
            clientData.slice(0, 3).forEach((client: any, i: number) => {
              const name = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Sin nombre';
              response += `${i + 1}. ${name} (${client.email || 'Sin email'})\n`;
            });
          } else if (clientData.length > 3) {
            response += ". Los primeros 3 son:\n";
            clientData.slice(0, 3).forEach((client: any, i: number) => {
              const name = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Sin nombre';
              response += `${i + 1}. ${name}\n`;
            });
          }
        } else {
          response += `You have ${clientData.length} client${clientData.length !== 1 ? 's' : ''} registered`;
          
          if (clientData.length > 0 && clientData.length <= 3) {
            response += ":\n";
            clientData.slice(0, 3).forEach((client: any, i: number) => {
              const name = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'No name';
              response += `${i + 1}. ${name} (${client.email || 'No email'})\n`;
            });
          }
        }
      }
    }
    
    else if (result.action.includes('facturas') || result.action.includes('invoices')) {
      const invoiceData = result.result?.data || result.result;
      if (Array.isArray(invoiceData)) {
        if (isFrench) {
          response += `Vous avez ${invoiceData.length} facture${invoiceData.length !== 1 ? 's' : ''}`;
          
          if (invoiceData.length > 0 && invoiceData.length <= 3) {
            response += " :\n";
            invoiceData.slice(0, 3).forEach((invoice: any, i: number) => {
              const number = invoice.invoiceNumber || invoice.number || `FAC-${i + 1}`;
              const amount = invoice.total || invoice.amount || 0;
              const status = invoice.status || 'inconnu';
              response += `${i + 1}. ${number} - CHF ${amount} (${status})\n`;
            });
          }
        } else if (isSpanish) {
          response += `Tienes ${invoiceData.length} factura${invoiceData.length !== 1 ? 's' : ''}`;
          
          if (invoiceData.length > 0 && invoiceData.length <= 3) {
            response += ":\n";
            invoiceData.slice(0, 3).forEach((invoice: any, i: number) => {
              const number = invoice.invoiceNumber || invoice.number || `FAC-${i + 1}`;
              const amount = invoice.total || invoice.amount || 0;
              const status = invoice.status || 'desconocido';
              response += `${i + 1}. ${number} - CHF ${amount} (${status})\n`;
            });
          }
        } else {
          response += `You have ${invoiceData.length} invoice${invoiceData.length !== 1 ? 's' : ''}`;
          
          if (invoiceData.length > 0 && invoiceData.length <= 3) {
            response += ":\n";
            invoiceData.slice(0, 3).forEach((invoice: any, i: number) => {
              const number = invoice.invoiceNumber || invoice.number || `INV-${i + 1}`;
              const amount = invoice.total || invoice.amount || 0;
              const status = invoice.status || 'unknown';
              response += `${i + 1}. ${number} - CHF ${amount} (${status})\n`;
            });
          }
        }
      }
    }
    
    else if (result.action.includes('productos') || result.action.includes('products')) {
      const productData = result.result?.data || result.result;
      if (Array.isArray(productData)) {
        if (isFrench) {
          response += `Vous avez ${productData.length} produit${productData.length !== 1 ? 's' : ''} enregistré${productData.length !== 1 ? 's' : ''}`;
          
          if (productData.length > 0 && productData.length <= 3) {
            response += " :\n";
            productData.slice(0, 3).forEach((product: any, i: number) => {
              const name = product.name || 'Sans nom';
              const price = product.unitPrice || product.price || 0;
              response += `${i + 1}. ${name} - CHF ${price}\n`;
            });
          }
        } else if (isSpanish) {
          response += `Tienes ${productData.length} producto${productData.length !== 1 ? 's' : ''} registrado${productData.length !== 1 ? 's' : ''}`;
          
          if (productData.length > 0 && productData.length <= 3) {
            response += ":\n";
            productData.slice(0, 3).forEach((product: any, i: number) => {
              const name = product.name || 'Sin nombre';
              const price = product.unitPrice || product.price || 0;
              response += `${i + 1}. ${name} - CHF ${price}\n`;
            });
          }
        } else {
          response += `You have ${productData.length} product${productData.length !== 1 ? 's' : ''} registered`;
          
          if (productData.length > 0 && productData.length <= 3) {
            response += ":\n";
            productData.slice(0, 3).forEach((product: any, i: number) => {
              const name = product.name || 'No name';
              const price = product.unitPrice || product.price || 0;
              response += `${i + 1}. ${name} - CHF ${price}\n`;
            });
          }
        }
      }
    }
  }

  if (!response) {
    if (isFrench) {
      response = "J'ai trouvé des informations, mais je n'ai pas pu les traiter correctement.";
    } else {
      response = isSpanish 
        ? "Encontré información, pero no pude procesarla correctamente."
        : "I found information, but couldn't process it correctly.";
    }
  }

  return response.trim();
}

function extractActions(data: unknown): any[] {
  if (!data || typeof data !== 'object') {
    return [];
  }

  const possibleArrays = [
    (data as any).actions,
    (data as any).data?.actions,
  ];

  for (const candidate of possibleArrays) {
    if (Array.isArray(candidate)) {
      return candidate.filter((action) => action && typeof action.id === 'string');
    }
  }

  return [];
}

function isActionExecuted(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const status = (data as any).status || (data as any).actionStatus;
  return typeof status === 'string' && status.toLowerCase() === 'executed';
}
