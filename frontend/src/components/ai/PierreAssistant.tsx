/**
 * Pierre Assistant - Modern AI Chat Component for SimpliFaq
 * 
 * Pierre is the intelligent assistant that can:
 * - Search and manage products
 * - Search and manage clients  
 * - Execute local API operations
 * - Use remote Ollama for LLM inference
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  Check,
  XCircle,
  Send,
  Mic,
  MicOff,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { pierreApi, type PierreAction, type PierreChatResponse } from '../../services/pierreApi';

// Speech Recognition types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: PierreAction;
}

export function PierreAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 Bonjour ! Je suis Pierre, votre assistant intelligent SimpliFaq. Je peux vous aider à rechercher et gérer vos produits et clients. Comment puis-je vous aider ?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PierreAction | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech recognition
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Test connection on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const result = await pierreApi.testConnection();
        setConnectionStatus(result.success ? 'connected' : 'disconnected');
      } catch {
        setConnectionStatus('disconnected');
      }
    };
    
    if (isOpen) {
      testConnection();
    }
  }, [isOpen]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'fr-CH';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

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
      const response: PierreChatResponse = await pierreApi.chat({
        message: inputMessage,
        conversationId: conversationId || undefined
      });

      console.log('[Pierre] Response:', response);

      // Store conversation ID
      if (response?.conversationId) {
        setConversationId(response.conversationId);
      }

      // Ensure message is a string
      let messageContent = '';
      if (response?.action?.message && typeof response.action.message === 'string') {
        messageContent = response.action.message;
      } else if (response?.message && typeof response.message === 'string') {
        messageContent = response.message;
      } else if (typeof response?.message === 'object' && response.message !== null) {
        // Handle case where message might be an object
        messageContent = JSON.stringify(response.message, null, 2);
      } else {
        messageContent = 'Réponse reçue';
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: messageContent,
        timestamp: new Date(),
        action: response?.action
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If action requires confirmation, set it as pending
      if (response.action?.requiresConfirmation) {
        setPendingAction(response.action);
      }

    } catch (error) {
      console.error('[Pierre] Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Désolé, j\'ai rencontré un problème. Veuillez réessayer.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
    if (!pendingAction || !conversationId) return;

    setIsLoading(true);
    try {
      const response = await pierreApi.confirmAction({
        conversationId,
        action: {
          ...pendingAction,
          requiresConfirmation: false
        }
      });

      const confirmationMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message || '✅ Action exécutée avec succès',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, confirmationMessage]);
      setPendingAction(null);
    } catch (error) {
      console.error('[Pierre] Confirm error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Erreur lors de l\'exécution de l\'action. Veuillez réessayer.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAction = () => {
    const cancelMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Action annulée. Comment puis-je vous aider autrement ?',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
    setPendingAction(null);
  };

  const handleClearConversation = async () => {
    if (conversationId) {
      try {
        await pierreApi.clearConversation(conversationId);
      } catch (error) {
        console.error('[Pierre] Clear conversation error:', error);
      }
    }
    
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: '🔄 Conversation réinitialisée. Comment puis-je vous aider ?',
        timestamp: new Date()
      }
    ]);
    setConversationId(null);
    setPendingAction(null);
  };

  const quickActions = [
    { label: '🔍 Chercher produit', prompt: 'Cherche le produit "service web"' },
    { label: '👤 Chercher client', prompt: 'Cherche le client "Dupont"' },
    { label: '📦 Liste produits', prompt: 'Montre-moi mes produits' },
  ];

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-400';
      case 'disconnected': return 'bg-red-400';
      default: return 'bg-yellow-400';
    }
  };

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
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:shadow-emerald-500/50 transition-shadow duration-300 z-50"
        >
          <Bot className="w-8 h-8" />
          <span className={`absolute -top-1 -right-1 w-4 h-4 ${getStatusColor()} rounded-full border-2 border-white animate-pulse`}></span>
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
            className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-emerald-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bot className="w-6 h-6 text-white" />
                  <span className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor()} rounded-full border-2 border-emerald-600`}></span>
                </div>
                <div>
                  <h3 className="font-bold text-white">Pierre</h3>
                  <p className="text-xs text-emerald-100">
                    {connectionStatus === 'connected' ? 'En ligne' : 
                     connectionStatus === 'disconnected' ? 'Hors ligne' : 'Connexion...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearConversation}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Nouvelle conversation"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-emerald-50 to-teal-50">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                          ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white'
                          : 'bg-white text-slate-900 shadow-sm border border-emerald-200'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-emerald-200' : 'text-slate-400'
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
                      <div className="bg-white rounded-2xl px-4 py-3 shadow-lg border-2 border-emerald-400">
                        <p className="text-sm font-medium text-slate-900 mb-3">
                          Confirmez-vous cette action ?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleConfirmAction}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <Check className="w-4 h-4" />
                            Oui
                          </button>
                          <button
                            onClick={handleCancelAction}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <XCircle className="w-4 h-4" />
                            Non
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
                      <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-emerald-200">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          <span className="text-sm text-slate-600">Pierre réfléchit...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length <= 2 && (
                  <div className="px-4 py-3 bg-white border-t border-emerald-200">
                    <p className="text-xs text-slate-600 mb-2 font-medium">Suggestions :</p>
                    <div className="flex flex-wrap gap-2">
                      {quickActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => setInputMessage(action.prompt)}
                          className="text-xs px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-full transition-colors duration-200"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 bg-white border-t border-emerald-200">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Écrivez ou parlez..."
                      rows={1}
                      className="flex-1 px-4 py-3 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-sm"
                      disabled={isLoading || connectionStatus === 'disconnected'}
                    />
                    {recognitionRef.current && (
                      <button
                        onClick={toggleListening}
                        disabled={isLoading}
                        className={`p-3 rounded-xl transition-all duration-200 shadow-md ${
                          isListening 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                    )}
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading || connectionStatus === 'disconnected'}
                      className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    ⚡ Propulsé par Pierre AI
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

