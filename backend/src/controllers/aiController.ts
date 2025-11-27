import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { aiDataService } from '../services/aiDataService';
import { aiActionsService } from '../services/aiActionsService';
import { extractExpenseFromText, isExpenseCreationRequest } from '../utils/expenseParser';

export class AIController {
  /**
   * Test AI connection
   */
  static async testConnection(req: Request, res: Response) {
    try {
      const isConnected = await aiService.testConnection();
      
      res.json({
        success: true,
        data: {
          connected: isConnected,
          message: isConnected ? 'AI service is operational' : 'AI service connection failed'
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to test AI connection',
        message: error.message
      });
    }
  }

  /**
   * Ask a question to the AI assistant
   */
  static async askQuestion(req: Request, res: Response) {
    try {
      const { question, context } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Question is required'
        });
      }

      // Get user information from authenticated request
      const user = (req as any).user;
      const userId = user?.id || user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Fetch real data from database (reduced to minimize context size)
      const [userInfo, recentInvoices, invoiceStats, recentClients, recentProducts] = await Promise.all([
        aiDataService.getUserInfo(userId),
        aiDataService.searchInvoices(userId, { limit: 2 }), // Reduced from 5 to 2
        aiDataService.getInvoiceStats(userId, {}),
        aiDataService.searchClients(userId, { limit: 1 }), // Reduced from 3 to 1
        aiDataService.searchProducts(userId, { limit: 1 }) // Reduced from 3 to 1
      ]);

      // Build rich context with real data
      let enhancedContext = context || '';

      // Build minimal context to avoid token overflow
      if (userInfo) {
        enhancedContext += `\n👤 ${userInfo.companyName} | ${userInfo.currency}`;
        if (userInfo._count) {
          enhancedContext += ` | Factures: ${userInfo._count.invoices}, Clients: ${userInfo._count.clients}`;
        }
      }

      if (invoiceStats) {
        enhancedContext += `\n📊 Stats: ${invoiceStats.total} factures (${invoiceStats.paid} payées, ${invoiceStats.pending} en attente) | Total: ${invoiceStats.totalAmount.toFixed(0)} ${userInfo?.currency || 'CHF'}`;
      }

      const answer = await aiService.askQuestion(question, enhancedContext);

      // Check if the AI response contains an action request
      let actionRequest = aiActionsService.parseActionRequest(answer);
      
      // FALLBACK: If AI didn't generate JSON but user wants to create expense, parse manually
      if (!actionRequest && isExpenseCreationRequest(question)) {
        console.log('[AIController] AI did not generate JSON, using expense parser fallback');
        const parsed = extractExpenseFromText(question);
        
        if (parsed) {
          actionRequest = {
            actionType: 'create_expense',
            parameters: parsed,
            requiresConfirmation: true
          };
          console.log('[AIController] Expense parsed:', parsed);
        }
      }
      
      // Separate the message from the JSON action
      let cleanAnswer = answer;
      if (actionRequest) {
        // Remove the JSON part from the visible answer if present
        cleanAnswer = answer.replace(/\{[\s\S]*"action"[\s\S]*\}/, '').trim();
        
        // If no meaningful answer after removing JSON, create a confirmation message
        if (!cleanAnswer || cleanAnswer.length < 20) {
          const params = actionRequest.parameters;
          cleanAnswer = `¿Confirmas este gasto?\n📄 ${params.label || 'Gasto'}\n💰 ${params.amount} ${params.currency || 'CHF'}${params.supplier ? `\n🏢 ${params.supplier}` : ''}`;
        }
      }

      res.json({
        success: true,
        data: {
          question,
          answer: cleanAnswer,
          action: actionRequest ? {
            type: actionRequest.actionType,
            parameters: actionRequest.parameters,
            requiresConfirmation: actionRequest.requiresConfirmation,
            confirmationMessage: aiActionsService.formatConfirmationMessage(actionRequest)
          } : null,
          user: userInfo ? {
            id: userInfo.id,
            email: userInfo.email,
            companyName: userInfo.companyName
          } : null,
          context: {
            invoices: invoiceStats?.total || 0,
            clients: userInfo?._count?.clients || 0,
            products: userInfo?._count?.products || 0
          }
        }
      });
    } catch (error: any) {
      console.error('[AIController] Ask question error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get AI response',
        message: error.message
      });
    }
  }

  /**
   * Execute a confirmed action
   */
  static async executeAction(req: Request, res: Response) {
    try {
      const { actionType, parameters } = req.body;

      if (!actionType || !parameters) {
        return res.status(400).json({
          success: false,
          error: 'Action type and parameters are required'
        });
      }

      // Get user information from authenticated request
      const user = (req as any).user;
      const userId = user?.id || user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Execute the action
      const result = await aiActionsService.executeAction(userId, {
        actionType,
        parameters,
        requiresConfirmation: false // Already confirmed by user
      });

      res.json({
        success: result.success,
        data: result.data,
        message: result.message,
        error: result.error
      });
    } catch (error: any) {
      console.error('[AIController] Execute action error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute action',
        message: error.message
      });
    }
  }

  /**
   * Debug AI service directly
   */
  static async debugAI(req: Request, res: Response) {
    try {
      const result = await aiService.askQuestion('hello', 'test context');
      res.json({
        success: true,
        data: {
          result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('[AIController] Debug error:', error);
      res.status(500).json({
        success: false,
        error: 'Debug failed',
        message: error.message,
        details: error.toString()
      });
    }
  }

  /**
   * Get invoice suggestions
   */
  static async getInvoiceSuggestions(req: Request, res: Response) {
    try {
      const { clientName, amount, items } = req.body;

      const suggestions = await aiService.getInvoiceSuggestions({
        clientName,
        amount,
        items
      });

      res.json({
        success: true,
        data: {
          suggestions
        }
      });
    } catch (error: any) {
      console.error('[AIController] Get suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get invoice suggestions',
        message: error.message
      });
    }
  }

  /**
   * Analyze invoice
   */
  static async analyzeInvoice(req: Request, res: Response) {
    try {
      const { number, clientName, amount, dueDate, items } = req.body;

      if (!number || !clientName || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Invoice number, client name, and amount are required'
        });
      }

      const analysis = await aiService.analyzeInvoice({
        number,
        clientName,
        amount,
        dueDate,
        items: items || []
      });

      res.json({
        success: true,
        data: {
          analysis
        }
      });
    } catch (error: any) {
      console.error('[AIController] Analyze invoice error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze invoice',
        message: error.message
      });
    }
  }

  /**
   * Generate product descriptions
   */
  static async generateDescription(req: Request, res: Response) {
    try {
      const { productName, category } = req.body;

      if (!productName) {
        return res.status(400).json({
          success: false,
          error: 'Product name is required'
        });
      }

      const descriptions = await aiService.generateDescription(productName, category);

      res.json({
        success: true,
        data: {
          descriptions
        }
      });
    } catch (error: any) {
      console.error('[AIController] Generate description error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate descriptions',
        message: error.message
      });
    }
  }

  /**
   * Suggest client info
   */
  static async suggestClientInfo(req: Request, res: Response) {
    try {
      const { partialName, existingClients } = req.body;

      if (!partialName) {
        return res.status(400).json({
          success: false,
          error: 'Partial name is required'
        });
      }

      const suggestions = await aiService.suggestClientInfo(
        partialName,
        existingClients || []
      );

      res.json({
        success: true,
        data: {
          suggestions
        }
      });
    } catch (error: any) {
      console.error('[AIController] Suggest client info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suggest client info',
        message: error.message
      });
    }
  }
}
