import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getQuotes,
  createQuote,
  updateQuote,
  getQuote,
  deleteQuote,
  generateQuotePDF,
  convertQuoteToInvoice,
  getNextQuoteNumber,
} from '../controllers/quoteController';
import {
  sendQuoteEmail,
  previewQuoteEmail,
} from '../controllers/invoiceController';
import { 
  validateInput, 
  swissValidationRules,
  auditLogger,
  strictRateLimit 
} from '../middleware/security';
import { checkEntitlementLimit, trackUsageAfterOperation } from '../middleware/usageLimit';

const router = Router();

/**
 * @route GET /api/quotes/next-number
 * @desc Get next available quote number
 * @access Private
 */
router.get('/next-number',
  authenticateToken,
  getNextQuoteNumber
);

/**
 * @route GET /api/quotes
 * @desc Get all quotes with optional filtering and pagination
 * @access Private
 */
router.get('/', 
  authenticateToken,
  auditLogger('QUOTE_LIST_ACCESS'),
  getQuotes
);

/**
 * @route POST /api/quotes
 * @desc Create new quote
 * @access Private
 */
router.post('/', 
  authenticateToken,
  checkEntitlementLimit('quotes'),
  auditLogger('QUOTE_CREATION'),
  createQuote,
  trackUsageAfterOperation('quotes')
);

/**
 * @route PUT /api/quotes/:id
 * @desc Update existing quote
 * @access Private
 */
router.put('/:id',
  authenticateToken,
  auditLogger('QUOTE_UPDATE'),
  updateQuote
);

/**
 * @route GET /api/quotes/:id
 * @desc Get specific quote with full details
 * @access Private
 */
router.get('/:id', 
  authenticateToken,
  auditLogger('QUOTE_ACCESS'),
  getQuote
);

/**
 * @route DELETE /api/quotes/:id
 * @desc Delete quote (only if not converted)
 * @access Private
 */
router.delete('/:id', 
  authenticateToken,
  strictRateLimit,
  auditLogger('QUOTE_DELETION'),
  deleteQuote
);

/**
 * @route GET /api/quotes/:id/pdf
 * @desc Generate PDF for quote (without QR Bill)
 * @access Private
 */
router.get('/:id/pdf', 
  authenticateToken,
  auditLogger('QUOTE_PDF_GENERATION'),
  generateQuotePDF
);

/**
 * @route POST /api/quotes/:id/convert
 * @desc Convert quote to invoice
 * @access Private
 */
router.post('/:id/convert',
  authenticateToken,
  auditLogger('QUOTE_CONVERT_TO_INVOICE'),
  convertQuoteToInvoice
);

/**
 * @route POST /api/quotes/:id/send-via-smtp
 * @desc Send quote via user's personal SMTP configuration
 * @access Private
 */
router.post('/:id/send-via-smtp',
  authenticateToken,
  strictRateLimit,
  auditLogger('QUOTE_SMTP_SEND'),
  sendQuoteEmail
);

/**
 * @route POST /api/quotes/:id/preview-email-content
 * @desc Preview email content before sending
 * @access Private
 */
router.post('/:id/preview-email-content',
  authenticateToken,
  auditLogger('QUOTE_EMAIL_PREVIEW'),
  previewQuoteEmail
);

export default router;
