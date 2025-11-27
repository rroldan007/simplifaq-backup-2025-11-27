/**
 * Email Templates for Document Sending
 * Supports French templates for invoices, quotes, and other documents
 */

export interface EmailTemplateVariables {
  customer_name: string;
  invoice_number?: string;
  quote_number?: string;
  document_number: string;
  invoice_amount?: string;
  quote_amount?: string;
  document_amount: string;
  due_date?: string;
  valid_until?: string;
  user_company_name: string;
  user_email?: string;
  user_phone?: string;
  user_website?: string;
  currency?: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(
  template: string,
  variables: EmailTemplateVariables
): string {
  let result = template;
  
  // Replace all variables in {{variable}} format
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
  });
  
  return result;
}

/**
 * Default Invoice Email Template (French)
 */
export const INVOICE_TEMPLATE_FR: EmailTemplate = {
  subject: 'Facture n° {{invoice_number}}',
  body: `Bonjour {{customer_name}},

Veuillez trouver ci-joint la facture n° {{invoice_number}} pour un montant de {{invoice_amount}} {{currency}}.

Merci de procéder au paiement avant le {{due_date}}.

Cordialement,
{{user_company_name}}`,
};

/**
 * Default Quote Email Template (French)
 */
export const QUOTE_TEMPLATE_FR: EmailTemplate = {
  subject: 'Devis n° {{quote_number}}',
  body: `Bonjour {{customer_name}},

Veuillez trouver ci-joint le devis n° {{quote_number}} pour un montant de {{quote_amount}} {{currency}}.

Ce devis est valable jusqu'au {{valid_until}}.

N'hésitez pas à me contacter si vous avez des questions.

Cordialement,
{{user_company_name}}`,
};

/**
 * Payment Reminder Email Template (French)
 */
export const PAYMENT_REMINDER_TEMPLATE_FR: EmailTemplate = {
  subject: 'Rappel de paiement - Facture n° {{invoice_number}}',
  body: `Bonjour {{customer_name}},

Nous vous rappelons que la facture n° {{invoice_number}} d'un montant de {{invoice_amount}} {{currency}} est arrivée à échéance le {{due_date}}.

Merci de procéder au paiement dans les meilleurs délais.

Cordialement,
{{user_company_name}}`,
};

/**
 * Quote Accepted Confirmation Template (French)
 */
export const QUOTE_ACCEPTED_TEMPLATE_FR: EmailTemplate = {
  subject: 'Confirmation d\'acceptation du devis n° {{quote_number}}',
  body: `Bonjour {{customer_name}},

Nous confirmons la réception de votre acceptation du devis n° {{quote_number}}.

Nous procéderons à la préparation de votre commande dans les meilleurs délais.

Cordialement,
{{user_company_name}}`,
};

/**
 * Get email template by type
 */
export function getEmailTemplate(
  type: 'invoice' | 'quote' | 'payment_reminder' | 'quote_accepted',
  language: string = 'fr'
): EmailTemplate {
  // For now, only French is supported
  switch (type) {
    case 'invoice':
      return INVOICE_TEMPLATE_FR;
    case 'quote':
      return QUOTE_TEMPLATE_FR;
    case 'payment_reminder':
      return PAYMENT_REMINDER_TEMPLATE_FR;
    case 'quote_accepted':
      return QUOTE_ACCEPTED_TEMPLATE_FR;
    default:
      return INVOICE_TEMPLATE_FR;
  }
}

/**
 * Prepare email content with variables replaced
 */
export function prepareEmail(
  type: 'invoice' | 'quote' | 'payment_reminder' | 'quote_accepted',
  variables: EmailTemplateVariables,
  language: string = 'fr'
): { subject: string; body: string } {
  const template = getEmailTemplate(type, language);
  
  return {
    subject: replaceTemplateVariables(template.subject, variables),
    body: replaceTemplateVariables(template.body, variables),
  };
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'CHF'): string {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format date for email display (Swiss format)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}
