import { Router } from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import {
  getInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  generateInvoicePDF,
  duplicateInvoice,
  cancelInvoiceRecurrence,
  addPayment,
  deletePayment,
  sendInvoiceEmail as sendInvoiceViaUserSmtp,
  previewInvoiceEmail,
} from '../controllers/invoiceController';
import {
  sendInvoiceEmail,
  getInvoiceEmailHistory,
} from '../controllers/emailController';
import { 
  validateInput, 
  swissValidationRules,
  auditLogger,
  strictRateLimit 
} from '../middleware/security';
import { checkEntitlementLimit, trackUsageAfterOperation } from '../middleware/usageLimit';

const router = Router();



/**
 * @route GET /api/invoices
 * @desc Get all invoices with optional filtering and pagination
 * @access Private
 * @query status - Filter by invoice status (draft, sent, paid, overdue, cancelled)
 * @query clientId - Filter by client ID
 * @query search - Search in invoice number and client name
 * @query page - Page number for pagination (default: 1)
 * @query limit - Items per page (default: 10)
 */
router.get('/', 
  authenticateToken,
  auditLogger('INVOICE_LIST_ACCESS'),
  getInvoices
);

/**
 * @route POST /api/invoices
 * @desc Create new invoice with Swiss QR Bill generation
 * @access Private
 */
router.post('/', 
  authenticateToken,
  /* validateInput([
    swissValidationRules.sanitizeFinancial,
    swissValidationRules.sanitizeText
  ]), */
  checkEntitlementLimit('invoices'),
  auditLogger('INVOICE_CREATION'),
  createInvoice,
  trackUsageAfterOperation('invoices')
);

/**
 * @route GET /api/invoices/:id
 * @desc Get specific invoice with full details
 * @access Private
 */
router.get('/:id', 
  authenticateToken,
  auditLogger('INVOICE_ACCESS'),
  getInvoice
);

/**
 * @route PUT /api/invoices/:id
 * @desc Update invoice (only if not paid)
 *        Accepts partial updates (e.g., status, notes, terms, dueDate)
 * @access Private
 */
router.put('/:id', 
  authenticateToken,
  // Allow partial updates without enforcing amount/currency validation
  // The controller only updates allowed fields and sets updatedAt safely
  auditLogger('INVOICE_UPDATE'),
  updateInvoice
);

/**
 * @route DELETE /api/invoices/:id
 * @desc Delete invoice (only if not paid)
 * @access Private
 */
router.delete('/:id', 
  authenticateToken,
  strictRateLimit,
  auditLogger('INVOICE_DELETION'),
  deleteInvoice
);

/**
 * @route POST /api/invoices/:id/send
 * @desc Send invoice by email with PDF attachment
 * @access Private
 */
router.post('/:id/send', 
  authenticateToken,
  strictRateLimit,
  auditLogger('INVOICE_SEND'),
  sendInvoice
);

/**
 * @route GET /api/invoices/:id/pdf
 * @desc Generate PDF for invoice with Swiss QR Bill
 * @access Private
 */
router.get('/:id/pdf', 
  authenticateToken,
  auditLogger('INVOICE_PDF_GENERATION'),
  generateInvoicePDF
);

/**
 * @route POST /api/invoices/:id/duplicate
 * @desc Create a duplicate of an existing invoice
 * @access Private
 */
router.post('/:id/duplicate', 
  authenticateToken,
  auditLogger('INVOICE_DUPLICATION'),
  duplicateInvoice
);

/**
 * @route POST /api/invoices/:id/recurrence/cancel
 * @desc Cancel recurrence on a master invoice
 * @access Private
 */
router.post('/:id/recurrence/cancel',
  authenticateToken,
  auditLogger('INVOICE_RECURRENCE_CANCEL'),
  cancelInvoiceRecurrence
);

/**
 * @route POST /api/invoices/:id/send-email
 * @desc Send invoice via email with PDF attachment
 * @access Private
 */
router.post('/:id/send-email', 
  authenticateToken,
  strictRateLimit,
  validateInput([
    body('recipientEmail').isEmail().withMessage('Format d\'email invalide')
  ]),
  auditLogger('INVOICE_EMAIL_SEND'),
  sendInvoiceViaUserSmtp
);

/**
 * @route GET /api/invoices/:id/email-history
 * @desc Get email history for invoice
 * @access Private
 */
router.get('/:id/email-history', 
  authenticateToken,
  auditLogger('INVOICE_EMAIL_HISTORY_ACCESS'),
  getInvoiceEmailHistory
);

/**
 * @route POST /api/invoices/:id/payments
 * @desc Add a payment to an invoice
 * @access Private
 */
router.post('/:id/payments', 
  authenticateToken,
  auditLogger('INVOICE_PAYMENT_ADD'),
  addPayment
);

/**
 * @route DELETE /api/invoices/:invoiceId/payments/:paymentId
 * @desc Delete a payment from an invoice
 * @access Private
 */
router.delete('/:invoiceId/payments/:paymentId', 
  authenticateToken,
  auditLogger('INVOICE_PAYMENT_DELETE'),
  deletePayment
);

/**
 * @route POST /api/invoices/:id/send-via-smtp
 * @desc Send invoice via user's personal SMTP configuration
 * @access Private
 */
router.post('/:id/send-via-smtp',
  authenticateToken,
  strictRateLimit,
  auditLogger('INVOICE_SMTP_SEND'),
  sendInvoiceViaUserSmtp
);

/**
 * @route POST /api/invoices/:id/preview-email-content
 * @desc Preview email content before sending
 * @access Private
 */
router.post('/:id/preview-email-content',
  authenticateToken,
  auditLogger('INVOICE_EMAIL_PREVIEW'),
  previewInvoiceEmail
);

export default router;