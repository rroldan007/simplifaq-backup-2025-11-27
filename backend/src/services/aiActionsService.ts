import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * AI Actions Service - Executes actions requested by the AI Assistant
 */

export interface ActionRequest {
  actionType: 'create_expense' | 'create_invoice' | 'create_client' | 'create_product' | 'search_data';
  parameters: any;
  requiresConfirmation?: boolean;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class AIActionsService {
  /**
   * Find the most appropriate account from user's existing accounts
   */
  private async findBestAccount(userId: string, label: string): Promise<any> {
    const labelLower = label.toLowerCase();
    
    // Get all user's active EXPENSE accounts
    const accounts = await prisma.account.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        active: true
      },
      orderBy: {
        code: 'asc'
      }
    });

    if (accounts.length === 0) {
      // No accounts, create a default one
      return await prisma.account.create({
        data: {
          userId,
          code: '6000',
          name: 'Dépenses générales',
          type: 'EXPENSE',
          active: true
        }
      });
    }

    // Try to match by account name keywords
    const matchPatterns = [
      { keywords: ['electricité', 'electricidad', 'electricity', 'énergie', 'energia'], names: ['electric', 'électric', 'energia', 'énergie', 'utilities', 'services publics'] },
      { keywords: ['eau', 'agua', 'water'], names: ['eau', 'agua', 'water', 'utilities'] },
      { keywords: ['internet', 'téléphone', 'telefono', 'phone', 'mobile'], names: ['téléphone', 'internet', 'phone', 'mobile', 'communication', 'télécom'] },
      { keywords: ['loyer', 'alquiler', 'rent', 'location'], names: ['loyer', 'rent', 'alquiler', 'location'] },
      { keywords: ['bureau', 'office', 'oficina', 'fourniture'], names: ['bureau', 'office', 'oficina', 'fourniture', 'supplies'] },
      { keywords: ['transport', 'essence', 'gasolina', 'carburant', 'fuel'], names: ['transport', 'essence', 'carburant', 'fuel', 'déplacement', 'véhicule'] }
    ];

    // Try to find matching account
    for (const pattern of matchPatterns) {
      // Check if label contains any keyword
      if (pattern.keywords.some(kw => labelLower.includes(kw))) {
        // Look for account with matching name
        const matchedAccount = accounts.find(acc => {
          const accNameLower = acc.name.toLowerCase();
          return pattern.names.some(name => accNameLower.includes(name));
        });
        if (matchedAccount) {
          console.log(`[AIActionsService] Matched account by name: ${matchedAccount.name} (${matchedAccount.code})`);
          return matchedAccount;
        }
      }
    }

    // No match found, use first account or one with 6000/6700 code (general expenses)
    const defaultAccount = accounts.find(acc => 
      acc.code === '6000' || acc.code === '6700' || acc.name.toLowerCase().includes('autres') || acc.name.toLowerCase().includes('general')
    ) || accounts[0];

    console.log(`[AIActionsService] Using default account: ${defaultAccount.name} (${defaultAccount.code})`);
    return defaultAccount;
  }

  /**
   * Create a new expense
   */
  async createExpense(userId: string, params: {
    label: string;
    amount: number;
    supplier?: string;
    date?: Date;
    currency?: string;
    tvaRate?: number;
    notes?: string;
    accountId?: string;
    accountCode?: string;
  }): Promise<ActionResult> {
    try {
      console.log('[AIActionsService] Creating expense:', params);
      
      // Get or find appropriate account
      let account;
      
      if (params.accountId) {
        // Get account info for confirmation message
        account = await prisma.account.findUnique({
          where: { id: params.accountId }
        });
        if (!account) {
          throw new Error('Account not found');
        }
      } else {
        // Find best matching account from user's existing accounts
        account = await this.findBestAccount(userId, params.label);
      }

      console.log('[AIActionsService] Using account:', { id: account.id, name: account.name, code: account.code });

      const expense = await prisma.expense.create({
        data: {
          userId,
          accountId: account.id,
          label: params.label,
          amount: params.amount,
          supplier: params.supplier || null,
          date: params.date || new Date(),
          currency: params.currency || 'CHF',
          tvaRate: params.tvaRate || 0,
          notes: params.notes || null
        },
        include: {
          account: true
        }
      });

      console.log('[AIActionsService] Expense created successfully:', expense.id);

      return {
        success: true,
        data: expense,
        message: `✅ Gasto registrado: ${params.label} - ${params.amount} ${params.currency || 'CHF'}\nCuenta: ${expense.account.name} (${expense.account.code})`
      };
    } catch (error: any) {
      console.error('[AIActionsService] Error creating expense:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al registrar el gasto'
      };
    }
  }

  /**
   * Create a new client
   */
  async createClient(userId: string, params: {
    companyName?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    street: string;
    city: string;
    postalCode: string;
    country?: string;
    vatNumber?: string;
  }): Promise<ActionResult> {
    try {
      const client = await prisma.client.create({
        data: {
          userId,
          companyName: params.companyName || null,
          firstName: params.firstName || null,
          lastName: params.lastName || null,
          email: params.email,
          phone: params.phone || null,
          street: params.street,
          city: params.city,
          postalCode: params.postalCode,
          country: params.country || 'Switzerland',
          vatNumber: params.vatNumber || null,
          isActive: true
        }
      });

      return {
        success: true,
        data: client,
        message: `Cliente creado: ${params.companyName || `${params.firstName} ${params.lastName}`}`
      };
    } catch (error: any) {
      console.error('[AIActionsService] Error creating client:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al crear el cliente'
      };
    }
  }

  /**
   * Create a new product
   */
  async createProduct(userId: string, params: {
    name: string;
    description?: string;
    unitPrice: number;
    tvaRate: number;
    unit?: string;
  }): Promise<ActionResult> {
    try {
      const product = await prisma.product.create({
        data: {
          userId,
          name: params.name,
          description: params.description || null,
          unitPrice: params.unitPrice,
          tvaRate: params.tvaRate,
          unit: params.unit || 'piece',
          isActive: true
        }
      });

      return {
        success: true,
        data: product,
        message: `Producto creado: ${params.name} - ${params.unitPrice} CHF`
      };
    } catch (error: any) {
      console.error('[AIActionsService] Error creating product:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al crear el producto'
      };
    }
  }

  /**
   * Create a new invoice
   */
  async createInvoice(userId: string, params: {
    clientId: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      tvaRate: number;
      description?: string;
    }>;
    issueDate?: Date;
    dueDate?: Date;
    currency?: string;
    notes?: string;
  }): Promise<ActionResult> {
    try {
      console.log('[AIActionsService] Creating invoice:', params);

      // Get user info for invoice number generation
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true }
      });

      // Get client info
      const client = await prisma.client.findUnique({
        where: { id: params.clientId },
        select: { companyName: true, firstName: true, lastName: true }
      });

      if (!client) {
        throw new Error('Client not found');
      }

      // Calculate totals
      let subtotal = 0;
      let totalTva = 0;

      const invoiceItems = params.items.map((item, index) => {
        const itemTotal = item.quantity * item.unitPrice;
        const itemTva = itemTotal * (item.tvaRate / 100);
        subtotal += itemTotal;
        totalTva += itemTva;

        return {
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          tvaRate: item.tvaRate,
          total: itemTotal,
          order: index + 1,
          productId: item.productId
        };
      });

      const total = subtotal + totalTva;

      // Generate invoice number (simple format: INV-YYYY-NNNN)
      const year = new Date().getFullYear();
      const lastInvoice = await prisma.invoice.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true }
      });

      let invoiceNumber = `INV-${year}-0001`;
      if (lastInvoice?.invoiceNumber) {
        const match = lastInvoice.invoiceNumber.match(/INV-\d{4}-(\d+)/);
        if (match) {
          const nextNum = parseInt(match[1]) + 1;
          invoiceNumber = `INV-${year}-${nextNum.toString().padStart(4, '0')}`;
        }
      }

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          userId,
          clientId: params.clientId,
          invoiceNumber,
          issueDate: params.issueDate || new Date(),
          dueDate: params.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'draft',
          paymentStatus: 'unpaid',
          currency: params.currency || user?.currency || 'CHF',
          subtotal,
          tvaAmount: totalTva,
          total,
          notes: params.notes || null,
          items: {
            create: invoiceItems
          }
        },
        include: {
          client: true,
          items: true
        }
      });

      console.log('[AIActionsService] Invoice created successfully:', invoice.id);

      const clientName = client.companyName || `${client.firstName} ${client.lastName}`;

      return {
        success: true,
        data: invoice,
        message: `✅ Factura ${invoiceNumber} creada exitosamente para ${clientName}\n` +
                 `Subtotal: ${subtotal.toFixed(2)} ${invoice.currency}\n` +
                 `IVA: ${totalTva.toFixed(2)} ${invoice.currency}\n` +
                 `Total: ${total.toFixed(2)} ${invoice.currency}`
      };
    } catch (error: any) {
      console.error('[AIActionsService] Error creating invoice:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al crear la factura'
      };
    }
  }

  /**
   * Parse AI response to detect action requests
   */
  parseActionRequest(aiResponse: string): ActionRequest | null {
    try {
      // Look for JSON action request in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*"action"[\s\S]*\}/);
      
      if (jsonMatch) {
        const actionData = JSON.parse(jsonMatch[0]);
        return {
          actionType: actionData.action,
          parameters: actionData.parameters,
          requiresConfirmation: actionData.requiresConfirmation !== false
        };
      }

      return null;
    } catch (error) {
      console.error('[AIActionsService] Error parsing action request:', error);
      return null;
    }
  }

  /**
   * Execute an action based on the action request
   */
  async executeAction(userId: string, actionRequest: ActionRequest): Promise<ActionResult> {
    switch (actionRequest.actionType) {
      case 'create_expense':
        return await this.createExpense(userId, actionRequest.parameters);
      
      case 'create_client':
        return await this.createClient(userId, actionRequest.parameters);
      
      case 'create_product':
        return await this.createProduct(userId, actionRequest.parameters);
      
      case 'create_invoice':
        return await this.createInvoice(userId, actionRequest.parameters);
      
      default:
        return {
          success: false,
          error: 'Unknown action type',
          message: `Acción no reconocida: ${actionRequest.actionType}`
        };
    }
  }

  /**
   * Format action confirmation message for the user
   */
  formatConfirmationMessage(actionRequest: ActionRequest): string {
    switch (actionRequest.actionType) {
      case 'create_expense':
        const { label, amount, supplier, date, currency } = actionRequest.parameters;
        return `¿Confirmas registrar este gasto?\n\n` +
               `📄 Descripción: ${label}\n` +
               `💰 Monto: ${amount} ${currency || 'CHF'}\n` +
               `🏢 Proveedor: ${supplier || 'No especificado'}\n` +
               `📅 Fecha: ${date ? new Date(date).toLocaleDateString() : 'Hoy'}`;

      case 'create_client':
        const clientParams = actionRequest.parameters;
        const clientName = clientParams.companyName || `${clientParams.firstName} ${clientParams.lastName}`;
        return `¿Confirmas crear este cliente?\n\n` +
               `👤 Nombre: ${clientName}\n` +
               `📧 Email: ${clientParams.email}\n` +
               `🏙️ Ciudad: ${clientParams.city}`;

      case 'create_product':
        const productParams = actionRequest.parameters;
        return `¿Confirmas crear este producto?\n\n` +
               `📦 Producto: ${productParams.name}\n` +
               `💰 Precio: ${productParams.unitPrice} CHF\n` +
               `📊 IVA: ${productParams.tvaRate}%`;

      case 'create_invoice':
        const invoiceParams = actionRequest.parameters;
        let subtotal = 0;
        let totalTva = 0;
        
        if (invoiceParams.items && Array.isArray(invoiceParams.items)) {
          invoiceParams.items.forEach((item: any) => {
            const itemTotal = item.quantity * item.unitPrice;
            const itemTva = itemTotal * (item.tvaRate / 100);
            subtotal += itemTotal;
            totalTva += itemTva;
          });
        }
        
        const total = subtotal + totalTva;
        const curr = invoiceParams.currency || 'CHF';
        
        let itemsList = '';
        if (invoiceParams.items && Array.isArray(invoiceParams.items)) {
          itemsList = invoiceParams.items.map((item: any) => 
            `  - ${item.description || 'Producto'} x ${item.quantity} @ ${item.unitPrice} ${curr} = ${(item.quantity * item.unitPrice).toFixed(2)} ${curr}`
          ).join('\n');
        }
        
        return `¿Confirmas crear esta factura?\n\n` +
               `📋 Productos:\n${itemsList}\n\n` +
               `💵 Subtotal: ${subtotal.toFixed(2)} ${curr}\n` +
               `📊 IVA: ${totalTva.toFixed(2)} ${curr}\n` +
               `💰 Total: ${total.toFixed(2)} ${curr}`;

      default:
        return '¿Confirmas ejecutar esta acción?';
    }
  }
}

// Export singleton instance
export const aiActionsService = new AIActionsService();
