import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Maximize2,
  Sparkles,
  Loader2,
  MessageSquare,
  Check,
  XCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { asistenteApi } from '../../services/asistenteApi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: {
    type: string;
    parameters: any;
    requiresConfirmation: boolean;
    confirmationMessage: string;
  };
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 Bonjour ! Je suis votre Assistant ADM de Simplifaq. En quoi puis-je vous aider avec la gestion de vos factures, clients et comptabilité ?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await asistenteApi.chat({
        message: inputMessage,
        sessionId: 'simplifaq-session',
        locale: 'fr-FR',
        channel: 'dashboard-web'
      });

      if (!response || typeof response !== 'object') {
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Je n\'ai pas pu obtenir de réponse de l\'assistant. Essayez à nouveau dans quelques secondes.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackMessage]);
        console.error('AI Error: invalid assistant response', response);
        return;
      }

      const replyText =
        typeof response.reply === 'string' && response.reply.trim().length > 0
          ? response.reply
          : 'No response';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText,
        timestamp: new Date(),
        action: Array.isArray(response.actions) && response.actions.length > 0 ? {
          type: response.actions[0].endpointMethod || 'unknown',
          parameters: response.actions[0].payload || {},
          requiresConfirmation: response.actions[0].requiresConfirmation || false,
          confirmationMessage: response.actions[0].description || '¿Confirmas esta acción?'
        } : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // If there's a pending action, set it
      if (Array.isArray(response.actions) && response.actions.length > 0) {
        const action = response.actions[0];
        
        // Auto-execute actions that don't require confirmation and are data retrieval
        if (!action.requiresConfirmation && action.endpoint?.method === 'GET') {
          try {
            await executeActionAutomatically(action);
          } catch (autoError) {
            console.error('Auto-execution failed:', autoError);
            // Fall back to manual confirmation
            setPendingAction({
              messageId: assistantMessage.id,
              ...action
            });
          }
        } else {
          // Manual confirmation required
          setPendingAction({
            messageId: assistantMessage.id,
            ...action
          });
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Désolé, j\'ai rencontré un problème. Veuillez réessayer.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('AI Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    
    setIsLoading(true);
    try {
      const response = await asistenteApi.confirmAction({
        actionId: pendingAction.id,
        confirmation: true
      });

      const confirmationMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ Action exécutée avec succès',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, confirmationMessage]);
      setPendingAction(null);
    } catch (error: any) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Erreur lors de l\'exécution de l\'action. Veuillez réessayer.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Action execution error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAction = () => {
    const cancelMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Action annulée. En quoi puis-je vous aider d\'autre ?',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
    setPendingAction(null);
  };

  const executeActionAutomatically = async (action: any) => {
    try {
      // First, store the action to get an actionId
      const storeResponse = await asistenteApi.confirmAction({
        actionId: action.id,
        confirmation: true
      });

      if (storeResponse.action?.id) {
        // Execute the action
        const executeResponse = await api.post(`/asistente/actions/${storeResponse.action.id}/execute`);
        
        // Add a message with the results
        const resultMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ Action exécutée automatiquement. Résultats: ${JSON.stringify(executeResponse.data?.data || executeResponse.data, null, 2)}`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, resultMessage]);
      }
    } catch (error) {
      console.error('Auto-execution error:', error);
      throw error;
    }
  };

  const quickActions = [
    { label: 'Créer facture', prompt: 'Aidez-moi à créer une nouvelle facture pour un client' },
    { label: 'Analyser dépenses', prompt: 'Aidez-moi à analyser mes dépenses du dernier mois' },
    { label: 'Vérifier TVA', prompt: 'Comment vérifier que j\'applique correctement les taux de TVA ?' },
  ];

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:shadow-purple-500/50 transition-shadow duration-300 z-50"
        >
          <Bot className="w-8 h-8" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '60px' : '600px'
            }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-purple-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bot className="w-6 h-6 text-white" />
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-purple-600"></span>
                </div>
                <div>
                  <h3 className="font-bold text-white">Asistente ADM</h3>
                  <p className="text-xs text-purple-100">En línea</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4 text-white" />
                  ) : (
                    <Minimize2 className="w-4 h-4 text-white" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-purple-50 to-blue-50">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                            : 'bg-white text-slate-900 shadow-sm border border-purple-200'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-purple-200' : 'text-slate-400'
                        }`}>
                          {message.timestamp.toLocaleTimeString('fr-CH', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Action Confirmation Buttons */}
                  {pendingAction && !isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white rounded-2xl px-4 py-3 shadow-lg border-2 border-purple-400">
                        <p className="text-sm font-medium text-slate-900 mb-3">
                          Confirmez-vous cette action ?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleConfirmAction}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <Check className="w-4 h-4" />
                            Confirmer
                          </button>
                          <button
                            onClick={handleCancelAction}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <XCircle className="w-4 h-4" />
                            Annuler
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-purple-200">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                          <span className="text-sm text-slate-600">Réflexion...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length <= 2 && (
                  <div className="px-4 py-3 bg-white border-t border-purple-200">
                    <p className="text-xs text-slate-600 mb-2 font-medium">Actions rapides :</p>
                    <div className="flex flex-wrap gap-2">
                      {quickActions.map((action: { label: string; prompt: string }, index: number) => (
                        <button
                          key={index}
                          onClick={() => {
                            setInputMessage(action.prompt);
                          }}
                          className="text-xs px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors duration-200"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 bg-white border-t border-purple-200">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Écrivez votre message..."
                      rows={1}
                      className="flex-1 px-4 py-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-sm"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    ⚡ Propulsé par Asistente ADM de Simplifaq
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
