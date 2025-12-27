/**
 * Pierre Controller - API endpoints for Pierre AI Assistant
 */

import { Request, Response } from 'express';
import { pierreAgentService } from '../services/pierreAgentService';

export class PierreController {
  /**
   * Test Pierre connection to Ollama
   */
  static async testConnection(req: Request, res: Response) {
    try {
      const result = await pierreAgentService.testConnection();
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PierreController] Test connection error:', errorMessage);
      
      res.status(500).json({
        success: false,
        error: 'Failed to test Pierre connection',
        message: errorMessage
      });
    }
  }

  /**
   * Chat with Pierre assistant
   */
  static async chat(req: Request, res: Response) {
    try {
      const { message, conversationId } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      // Get authenticated user
      const user = (req as any).user;
      const userId = user?.id || user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Extract auth token for internal API calls
      const authHeader = req.headers.authorization;
      const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

      const result = await pierreAgentService.processMessage(
        userId,
        message.trim(),
        conversationId,
        userToken
      );

      res.json({
        success: true,
        data: {
          message: result.message,
          action: result.action,
          conversationId: result.conversationId,
          data: result.data
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PierreController] Chat error:', errorMessage);
      
      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        message: errorMessage
      });
    }
  }

  /**
   * Confirm a pending action
   */
  static async confirmAction(req: Request, res: Response) {
    try {
      const { conversationId, action } = req.body;
      
      if (!conversationId || !action) {
        return res.status(400).json({
          success: false,
          error: 'ConversationId and action are required'
        });
      }

      // Get authenticated user
      const user = (req as any).user;
      const userId = user?.id || user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Extract auth token for internal API calls
      const authHeader = req.headers.authorization;
      const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

      const result = await pierreAgentService.confirmAction(
        userId,
        conversationId,
        action,
        userToken
      );

      res.json({
        success: true,
        data: {
          message: result.message,
          action: result.action,
          data: result.data
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PierreController] Confirm action error:', errorMessage);
      
      res.status(500).json({
        success: false,
        error: 'Failed to confirm action',
        message: errorMessage
      });
    }
  }

  /**
   * Clear conversation history
   */
  static async clearConversation(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          error: 'ConversationId is required'
        });
      }

      pierreAgentService.clearConversation(conversationId);

      res.json({
        success: true,
        message: 'Conversation cleared'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PierreController] Clear conversation error:', errorMessage);
      
      res.status(500).json({
        success: false,
        error: 'Failed to clear conversation',
        message: errorMessage
      });
    }
  }
}
