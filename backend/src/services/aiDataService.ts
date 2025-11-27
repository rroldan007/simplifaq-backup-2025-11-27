import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * AI Data Service - Provides data access functions for the AI Assistant
 */
export class AIDataService {
  /**
   * Search invoices by various criteria
   */
  async searchInvoices(userId: string, params: {
    status?: string;
    clientName?: string;
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    try {
      const { status, clientName, limit = 10, dateFrom, dateTo } = params;

      const where: any = {
        userId,
      };

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.issueDate = {};
        if (dateFrom) where.issueDate.gte = dateFrom;
        if (dateTo) where.issueDate.lte = dateTo;
      }

      const invoices = await prisma.invoice.findMany({
        where,
        take: limit,
        orderBy: {
          issueDate: 'desc'
        },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
          issueDate: true,
          dueDate: true,
          currency: true,
          client: {
            select: {
              companyName: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      return invoices;
    } catch (error) {
      console.error('[AIDataService] Error searching invoices:', error);
      return [];
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(userId: string, params: {
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    try {
      const { dateFrom, dateTo } = params;

      const where: any = {
        userId,
      };

      if (dateFrom || dateTo) {
        where.issueDate = {};
        if (dateFrom) where.issueDate.gte = dateFrom;
        if (dateTo) where.issueDate.lte = dateTo;
      }

      const [totalCount, paid, pending, overdue] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.count({ where: { ...where, status: 'paid' } }),
        prisma.invoice.count({ where: { ...where, status: 'sent' } }),
        prisma.invoice.count({ where: { ...where, status: 'overdue' } }),
      ]);

      const totalAmount = await prisma.invoice.aggregate({
        where,
        _sum: {
          total: true
        }
      });

      const paidAmount = await prisma.invoice.aggregate({
        where: { ...where, status: 'paid' },
        _sum: {
          total: true
        }
      });

      return {
        total: totalCount,
        paid,
        pending,
        overdue,
        totalAmount: totalAmount._sum?.total || 0,
        paidAmount: paidAmount._sum?.total || 0,
        pendingAmount: (totalAmount._sum?.total || 0) - (paidAmount._sum?.total || 0)
      };
    } catch (error) {
      console.error('[AIDataService] Error getting invoice stats:', error);
      return null;
    }
  }

  /**
   * Search clients
   */
  async searchClients(userId: string, params: {
    name?: string;
    limit?: number;
  }) {
    try {
      const { name, limit = 10 } = params;

      const where: any = {
        userId,
      };

      if (name) {
        where.OR = [
          { companyName: { contains: name, mode: 'insensitive' } },
          { firstName: { contains: name, mode: 'insensitive' } },
          { lastName: { contains: name, mode: 'insensitive' } },
          { email: { contains: name, mode: 'insensitive' } }
        ];
      }

      const clients = await prisma.client.findMany({
        where,
        take: limit,
        orderBy: {
          companyName: 'asc'
        },
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          street: true,
          city: true,
          postalCode: true,
          _count: {
            select: {
              invoices: true
            }
          }
        }
      });

      return clients;
    } catch (error) {
      console.error('[AIDataService] Error searching clients:', error);
      return [];
    }
  }

  /**
   * Search products
   */
  async searchProducts(userId: string, params: {
    name?: string;
    limit?: number;
  }) {
    try {
      const { name, limit = 10 } = params;

      const where: any = {
        userId,
      };

      if (name) {
        where.OR = [
          { name: { contains: name, mode: 'insensitive' } },
          { description: { contains: name, mode: 'insensitive' } }
        ];
      }

      const products = await prisma.product.findMany({
        where,
        take: limit,
        orderBy: {
          name: 'asc'
        },
        select: {
          id: true,
          name: true,
          description: true,
          unitPrice: true,
          unit: true,
          tvaRate: true
        }
      });

      return products;
    } catch (error) {
      console.error('[AIDataService] Error searching products:', error);
      return [];
    }
  }

  /**
   * Get recent expenses
   */
  async getRecentExpenses(userId: string, params: {
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    try {
      const { limit = 10, dateFrom, dateTo } = params;

      const where: any = {
        userId,
      };

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = dateFrom;
        if (dateTo) where.date.lte = dateTo;
      }

      const expenses = await prisma.expense.findMany({
        where,
        take: limit,
        orderBy: {
          date: 'desc'
        },
        select: {
          id: true,
          label: true,
          amount: true,
          date: true,
          currency: true,
          supplier: true,
          tvaRate: true
        }
      });

      return expenses;
    } catch (error) {
      console.error('[AIDataService] Error getting expenses:', error);
      return [];
    }
  }

  /**
   * Get company/user information
   */
  async getUserInfo(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          companyName: true,
          street: true,
          city: true,
          postalCode: true,
          phone: true,
          website: true,
          vatNumber: true,
          currency: true,
          language: true,
          _count: {
            select: {
              invoices: true,
              clients: true,
              products: true
            }
          }
        }
      });

      return user;
    } catch (error) {
      console.error('[AIDataService] Error getting user info:', error);
      return null;
    }
  }

  /**
   * Find client by name (exact or partial match)
   */
  async findClientByName(userId: string, clientName: string) {
    try {
      const client = await prisma.client.findFirst({
        where: {
          userId,
          OR: [
            { companyName: { contains: clientName, mode: 'insensitive' } },
            { companyName: { equals: clientName, mode: 'insensitive' } },
            { firstName: { contains: clientName, mode: 'insensitive' } },
            { lastName: { contains: clientName, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          street: true,
          city: true,
          postalCode: true,
          country: true
        }
      });

      return client;
    } catch (error) {
      console.error('[AIDataService] Error finding client:', error);
      return null;
    }
  }

  /**
   * Find product by name (exact or partial match)
   */
  async findProductByName(userId: string, productName: string) {
    try {
      const product = await prisma.product.findFirst({
        where: {
          userId,
          OR: [
            { name: { contains: productName, mode: 'insensitive' } },
            { name: { equals: productName, mode: 'insensitive' } },
            { description: { contains: productName, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          description: true,
          unitPrice: true,
          unit: true,
          tvaRate: true
        }
      });

      return product;
    } catch (error) {
      console.error('[AIDataService] Error finding product:', error);
      return null;
    }
  }

  /**
   * Find similar products by name
   */
  async findSimilarProducts(userId: string, productName: string, limit: number = 3) {
    try {
      const products = await prisma.product.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: productName, mode: 'insensitive' } },
            { description: { contains: productName, mode: 'insensitive' } }
          ]
        },
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          unitPrice: true,
          unit: true,
          tvaRate: true
        }
      });

      return products;
    } catch (error) {
      console.error('[AIDataService] Error finding similar products:', error);
      return [];
    }
  }
}

// Export singleton instance
export const aiDataService = new AIDataService();
