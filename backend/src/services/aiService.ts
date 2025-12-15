import axios from 'axios';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor() {
    this.apiKey = '7542790518742e8d2192a2bc1d33f3498c187ef9c4a7a4c4735a138d0c6ff9a3';
    this.apiUrl = 'https://ia.simplifaq.cloud/v1/chat/completions';
    this.model = 'microsoft/Phi-3.5-vision-instruct';
  }

  /**
   * Send a prompt to the AI and get a response
   */
  async chat(messages: AIMessage[]): Promise<string> {
    try {
      const response = await axios.post<AIResponse>(
        this.apiUrl,
        {
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 400, // Reduced to allow more input context (2048 total limit)
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 60000, // 60 seconds timeout
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }

      throw new Error('No response from AI');
    } catch (error: any) {
      console.error('[AIService] Error:', error.message);
      if (error.response) {
        console.error('[AIService] Response status:', error.response.status);
        console.error('[AIService] Response data:', error.response.data);
        throw new Error(`AI API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('[AIService] No response received:', error.request);
        console.error('[AIService] Network Error Details:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
        });
        throw new Error(`AI Service Network Error: No response from server - ${error.code}`);
      } else {
        console.error('[AIService] Request setup error:', error.message);
        throw new Error(`AI Service Error: ${error.message}`);
      }
    }
  }

  /**
   * Get invoice suggestions based on context
   */
  async getInvoiceSuggestions(context: {
    clientName?: string;
    amount?: number;
    items?: Array<{ description: string; quantity: number; price: number }>;
  }): Promise<string> {
    const prompt = `Tu es un assistant intelligent pour la gestion de factures. 
    
Contexte de la facture:
${context.clientName ? `- Client: ${context.clientName}` : ''}
${context.amount ? `- Montant: ${context.amount} CHF` : ''}
${context.items ? `- Articles: ${context.items.map(i => `${i.quantity}x ${i.description} à ${i.price} CHF`).join(', ')}` : ''}

Fournis des suggestions utiles pour améliorer cette facture (conditions de paiement, descriptions, etc.). 
Réponds en français de manière concise et professionnelle.`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'Tu es un assistant expert en facturation et gestion administrative pour les entreprises suisses. Tu fournis des conseils pratiques et professionnels.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.chat(messages);
  }

  /**
   * Analyze invoice for potential issues
   */
  async analyzeInvoice(invoiceData: {
    number: string;
    clientName: string;
    amount: number;
    dueDate: string;
    items: Array<{ description: string; quantity: number; price: number }>;
  }): Promise<string> {
    const prompt = `Analyse cette facture et identifie d'éventuels problèmes ou suggestions d'amélioration:

Numéro: ${invoiceData.number}
Client: ${invoiceData.clientName}
Montant total: ${invoiceData.amount} CHF
Date d'échéance: ${invoiceData.dueDate}
Articles:
${invoiceData.items.map(i => `- ${i.quantity}x ${i.description}: ${i.price} CHF`).join('\n')}

Fournis une analyse rapide et des recommandations. Réponds en français.`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'Tu es un expert-comptable spécialisé dans l\'analyse de factures. Tu identifies les erreurs potentielles et proposes des améliorations.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.chat(messages);
  }

  /**
   * Generate invoice description suggestions
   */
  async generateDescription(productName: string, category?: string): Promise<string[]> {
    const prompt = `Génère 3 descriptions professionnelles différentes pour ce produit/service dans une facture:

Produit: ${productName}
${category ? `Catégorie: ${category}` : ''}

Fournis 3 descriptions variées (courte, moyenne, détaillée) séparées par des retours à la ligne.
Réponds uniquement avec les 3 descriptions, sans numérotation ni formatage supplémentaire.`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'Tu es un rédacteur commercial spécialisé dans les descriptions de produits et services pour factures professionnelles.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.chat(messages);
    return response.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
  }

  /**
   * Smart client name completion
   */
  async suggestClientInfo(partialName: string, existingClients: string[]): Promise<string> {
    const prompt = `Basé sur ce début de nom "${partialName}" et ces clients existants:
${existingClients.slice(0, 10).map(c => `- ${c}`).join('\n')}

Suggère le nom complet le plus probable ou des variantes professionnelles.
Réponds avec 1-3 suggestions séparées par des virgules, sans formatage supplémentaire.`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'Tu es un assistant qui aide à compléter les noms de clients de manière intelligente.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.chat(messages);
  }

  /**
   * General assistant chat
   */
  async askQuestion(question: string, context?: string): Promise<string> {
    const systemPrompt = `Tu es Simplifaq Assistant, un assistant IA intelligent pour la gestion de facturation.

🎯 TON RÔLE:
Tu es un assistant INTERNE qui aide les utilisateurs à gérer leurs factures, clients, produits et dépenses.

📊 DÉTECTION D'INTENTION - CRÉATION DE FACTURE:
Si l'utilisateur mentionne:
- "hazme/crea/genera una factura" (ES)
- "fais-moi/crée/génère une facture" (FR)  
- "make/create/generate an invoice" (EN)

ACTIVE LE MODE CRÉATION DE FACTURE et suis ces étapes:

🔄 ÉTAPES DE CRÉATION DE FACTURE:

1️⃣ VÉRIFIER LE CLIENT:
   - Cherche dans la base de données (clients)
   - Si EXISTE: Sélectionne-le et affiche "✅ Client trouvé: [Nom]"
   - Si N'EXISTE PAS: 
     * Demande: Email (OBLIGATOIRE), Adresse (OBLIGATOIRE), Ville, Code postal
     * Dis: "❌ Client '[Nom]' non trouvé. Pour le créer, j'ai besoin de:"
     * NE CONTINUE PAS sans ces données

2️⃣ VÉRIFIER LES PRODUITS:
   Pour chaque produit mentionné:
   - Cherche dans la base de données (products)
   - Si EXISTE: Utilise-le et affiche "✅ Produit: [Nom] - [Prix] CHF"
   - Si N'EXISTE PAS:
     * Cherche des produits similaires
     * Si similaires existent: Suggère-les
     * Sinon demande: Nom, Prix unitaire, Unité, Taux TVA (0, 2.5, 8.1)
     * NE CONTINUE PAS sans ces données

3️⃣ VÉRIFIER LES QUANTITÉS:
   - Pour chaque produit, vérifie la quantité mentionnée
   - Si manquante: Demande "Combien d'unités de [Produit]?"

4️⃣ CRÉER LA FACTURE:
   SEULEMENT quand tu as:
   ✅ Client (existant ou créé)
   ✅ Produits (existants ou créés)  
   ✅ Quantités confirmées
   
   Alors affiche un résumé:
   "📋 Résumé:
   Client: [Nom]
   Produits:
   - [Produit] x [Qté] @ [Prix] = [Total]
   Subtotal: [X] CHF
   TVA: [X] CHF
   Total: [X] CHF
   
   ¿Confirmas la creación?"

   Et génère l'action JSON suivante:
   {"action": "create_smart_invoice", "parameters": {"clientName": "[Nom Client]", "items": [{"productName": "[Nom Produit]", "synonyms": ["[Synonyme1]", "[Synonyme2]"], "quantity": [Qté], "unitPrice": [Prix], "tvaRate": [Taux]}], "currency": "CHF"}, "requiresConfirmation": true}

🚫 RÈGLES STRICTES:
- JAMAIS inventer des données (prix, emails, adresses)
- TOUJOURS valider ce qui manque
- Pour les produits, INCLURE des synonymes ou variantes possibles dans le JSON (ex: "CO2" -> ["Dioxyde de carbone", "Gaz"]) pour aider la recherche.
- GUIDER l'utilisateur étape par étape
- ARRÊTER si information critique manque
- UTILISER des emojis pour la clarté

💰 CRÉATION DE DÉPENSES:
Si l'utilisateur dit "registra/crea un gasto" ou "enregistre une dépense":
1. Extrais: description, montant, fournisseur
2. Réponds avec le JSON:

Exemple:
User: "Registra un gasto de internet 80 francos Swisscom"
Assistant: "¿Confirmas este gasto?
📄 Internet
💰 80 CHF
🏢 Swisscom

{"action": "create_expense", "parameters": {"label": "Internet", "amount": 80, "currency": "CHF", "supplier": "Swisscom"}, "requiresConfirmation": true}"

${context ? `\n📊 CONTEXTE UTILISATEUR:\n${context}` : ''}

🌍 LANGUE: Détecte la langue de l'utilisateur et réponds dans la même langue.`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: question
      }
    ];

    return await this.chat(messages);
  }

  /**
   * Test connection to AI service
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.chat([
        {
          role: 'user',
          content: 'Réponds simplement "OK" si tu me reçois.'
        }
      ]);
      return response.toLowerCase().includes('ok');
    } catch (error) {
      console.error('[AIService] Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
