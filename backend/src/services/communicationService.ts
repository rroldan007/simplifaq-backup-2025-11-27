import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// ===== TYPE DEFINITIONS AND ZOD SCHEMAS =====

// --- Generic & Utility Types ---
export interface EmailVariables {
  [key: string]: string | number | boolean;
}

export interface EmailResult {
  id: string;
  status: 'sent' | 'failed' | 'queued';
  messageId?: string;
  error?: string;
}

// --- User Segments ---
export const segmentCriteriaSchema = z.object({
  plans: z.array(z.string()).optional(),
  registrationDateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
  // Note: lastLogin and subscriptionStatus filters are disabled as they are not on the User model.
  // Note: customFields filter is disabled as User model lacks a JSON metaData field.
  // customFields: z.record(z.any()).optional(),
});
export type SegmentCriteria = z.infer<typeof segmentCriteriaSchema>;

export const createUserSegmentSchema = z.object({
  name: z.string().min(1, 'Segment name is required'),
  description: z.string().optional(),
  criteria: segmentCriteriaSchema,
  isDynamic: z.boolean().default(true),
});
export type CreateUserSegmentDto = z.infer<typeof createUserSegmentSchema>;

export const updateUserSegmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  criteria: segmentCriteriaSchema.optional(),
  isDynamic: z.boolean().optional(),
});
export type UpdateUserSegmentDto = z.infer<typeof updateUserSegmentSchema>;

// --- Email Templates ---
export const emailTemplateSchema = z.object({
    name: z.string().min(1),
    subject: z.string().min(1),
    htmlContent: z.string().min(1),
    category: z.string().optional(),
    isSystem: z.boolean().default(false),
});
export type EmailTemplateDto = z.infer<typeof emailTemplateSchema>;

// --- Support Tickets ---
export const supportTicketSchema = z.object({
    subject: z.string().min(1),
    description: z.string().min(1),
    contactEmail: z.string().email(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    category: z.string().optional(),
});
export type SupportTicketDto = z.infer<typeof supportTicketSchema>;

export const supportTicketResponseSchema = z.object({
    message: z.string().min(1),
    isInternalNote: z.boolean().default(false),
});
export type SupportTicketResponseDto = z.infer<typeof supportTicketResponseSchema>;


export class CommunicationService {

  // ===== USER SEGMENTATION METHODS =====

    private static buildUserWhereClause(criteria: SegmentCriteria): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = { AND: [] };

    if (criteria.plans && criteria.plans.length > 0) {
      (where.AND as Prisma.UserWhereInput[]).push({ subscriptionPlan: { in: criteria.plans } });
    }

    if (criteria.registrationDateRange) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (criteria.registrationDateRange.start) dateFilter.gte = new Date(criteria.registrationDateRange.start);
      if (criteria.registrationDateRange.end) dateFilter.lte = new Date(criteria.registrationDateRange.end);
      (where.AND as Prisma.UserWhereInput[]).push({ createdAt: dateFilter });
    }

    return where;
  }

  private static async calculateSegmentUserCount(criteria: SegmentCriteria): Promise<number> {
    const whereClause = this.buildUserWhereClause(criteria);
    return prisma.user.count({ where: whereClause });
  }

  static async createUserSegment(data: CreateUserSegmentDto & { createdBy: string }) {
    const { name, description, criteria, isDynamic, createdBy } = data;
    const userCount = isDynamic ? 0 : await this.calculateSegmentUserCount(criteria);
    return prisma.userSegment.create({
      data: { name, description, criteria, is_dynamic: isDynamic, user_count: userCount, created_by: createdBy },
    });
  }

  static async getUserSegments() {
    const segments = await prisma.userSegment.findMany({ orderBy: { created_at: 'desc' } });
    return Promise.all(
      segments.map(async (segment) => {
        if (segment.is_dynamic) {
          const count = await this.calculateSegmentUserCount(segment.criteria as SegmentCriteria);
          return { ...segment, userCount: count };
        }
        return segment;
      })
    );
  }

  static async getUserSegmentById(segmentId: string) {
    const segment = await prisma.userSegment.findUnique({ where: { id: segmentId } });
    if (segment && segment.is_dynamic) {
      const count = await this.calculateSegmentUserCount(segment.criteria as SegmentCriteria);
      return { ...segment, userCount: count };
    }
    return segment;
  }

  static async updateUserSegment(segmentId: string, data: UpdateUserSegmentDto) {
    const { criteria, ...restData } = data;

    const dataToUpdate: any = {
      ...restData,
      isDynamic: data.isDynamic,
    };

    if (criteria !== undefined) {
      dataToUpdate.criteria = criteria;
    }

    const updatedSegment = await prisma.userSegment.update({
      where: { id: segmentId },
      data: dataToUpdate,
    });

    return this.getUserSegmentById(updatedSegment.id);
  }

  static async deleteUserSegment(segmentId: string): Promise<void> {
    await prisma.userSegment.delete({ where: { id: segmentId } });
  }

  // ===== EMAIL TEMPLATE METHODS =====

  private static processTemplate(template: string, variables: EmailVariables): string {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
        processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return processed;
  }

  static async getEmailTemplates(category?: string) {
    // The 'category' field does not exist on the EmailTemplate model.
    // The filter has been removed.
    return prisma.emailTemplate.findMany({
        orderBy: { name: 'asc' },
    });
  }

  static async getEmailTemplateById(id: string) {
    return prisma.emailTemplate.findUnique({ where: { id } });
  }

    static async createEmailTemplate(data: EmailTemplateDto, createdBy: string) {
    // The 'createdBy' field does not exist on the EmailTemplate model.
    return prisma.emailTemplate.create({ data: { ...data, language: 'fr' } });
  }

  static async updateEmailTemplate(id: string, data: Partial<EmailTemplateDto>) {
    return prisma.emailTemplate.update({ where: { id }, data });
  }

  static async deleteEmailTemplate(id: string) {
    return prisma.emailTemplate.delete({ where: { id } });
  }

  // ===== EMAIL SENDING METHODS =====

  static async sendEmail(templateId: string, userId: string, variables: EmailVariables): Promise<EmailResult> {
    const template = await this.getEmailTemplateById(templateId);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!template || !user) {
        return { id: '', status: 'failed', error: 'Template or user not found' };
    }

    const subject = this.processTemplate(template.subject, variables);
    const body = this.processTemplate(template.htmlContent, variables);

    // Simulate email sending
    console.log(`---- Sending Email ----`);
    console.log(`To: ${user.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body.substring(0, 100)}...`);
    console.log(`-----------------------`);

    const emailSend = await prisma.emailSend.create({
        data: {
            user_id: userId,
            template_id: templateId,
            email: user.email,
            subject,
            status: 'queued',
        }
    });

    // Simulate async sending
    setTimeout(async () => {
        await prisma.emailSend.update({
            where: { id: emailSend.id },
            data: { status: 'sent', sent_at: new Date(), message_id: `sim_${Date.now()}` }
        });
    }, 1000);

    return { id: emailSend.id, status: 'queued' };
  }

  // ===== SUPPORT TICKET METHODS =====

    static async createSupportTicket(data: SupportTicketDto, userId: string) {
    // The 'message' field does not exist. The 'description' from the DTO is already included in `...data`.
    return prisma.supportTicket.create({
        data: { ...data, userId, status: 'OPEN' },
    });
  }

    static async getSupportTicketById(ticketId: string) {
    // The 'user' relation is on the SupportTicket model, not a direct field to include.
    // Prisma automatically handles fetching the related user via the userId field.
    return prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { responses: { orderBy: { createdAt: 'asc' } } },
    });
  }

    static async addSupportTicketResponse(ticketId: string, data: SupportTicketResponseDto, userId: string) {
    return prisma.supportResponse.create({
        data: { ...data, ticketId, responderId: userId },
    });
  }

  static async getTicketHistoryForUser(userId: string) {
    return prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
  }
}