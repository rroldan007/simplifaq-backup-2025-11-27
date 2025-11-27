import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { injectFeatureFlags } from '../middleware/featureFlags';
// Usar el controlador existente hasta que implementemos todas las funciones en V2
import { 
  getInvoices, 
  createInvoice, 
  getInvoice, 
  updateInvoice, 
  deleteInvoice, 
  sendInvoice, 
  duplicateInvoice,
  cancelInvoiceRecurrence,
  addPayment,
  deletePayment,
  sendInvoiceEmail as sendInvoiceViaUserSmtp,
  previewInvoiceEmail,
} from '../controllers/invoiceController';
import { generateInvoicePDF } from '../controllers/invoiceControllerV2';
import { 
  auditLogger,
  strictRateLimit 
} from '../middleware/security';

const router = Router();

// Aplicar feature flags a todas las rutas
router.use(injectFeatureFlags);

/**
 * @route GET /api/v2/invoices
 * @desc Get all invoices with feature flags support
 * @access Private
 */
router.get('/', 
  authenticateToken,
  auditLogger('INVOICE_V2_LIST_ACCESS'),
  getInvoices
);

/**
 * @route GET /api/v2/invoices/:id
 * @desc Get a single invoice with feature flags support
 * @access Private
 */
router.get('/:id', 
  authenticateToken,
  auditLogger('INVOICE_V2_VIEW'),
  getInvoice
);

/**
 * @route POST /api/v2/invoices
 * @desc Create a new invoice with feature flags support
 * @access Private
 */
router.post('/',
  authenticateToken,
  auditLogger('INVOICE_V2_CREATE'),
  createInvoice
);

/**
 * @route PUT /api/v2/invoices/:id
 * @desc Update an existing invoice with feature flags support
 * @access Private
 */
router.put('/:id',
  authenticateToken,
  auditLogger('INVOICE_V2_UPDATE'),
  updateInvoice
);

/**
 * @route DELETE /api/v2/invoices/:id
 * @desc Delete an invoice with feature flags support
 * @access Private
 */
router.delete('/:id',
  authenticateToken,
  auditLogger('INVOICE_V2_DELETE'),
  deleteInvoice
);

/**
 * @route POST /api/v2/invoices/:id/send
 * @desc Send an invoice via email with feature flags support
 * @access Private
 */
router.post('/:id/send',
  authenticateToken,
  strictRateLimit,
  auditLogger('INVOICE_V2_SEND'),
  sendInvoice
);

/**
 * @route GET /api/v2/invoices/:id/pdf
 * @desc Generate PDF for an invoice with feature flags support
 * @access Private
 */
router.get('/:id/pdf',
  authenticateToken,
  auditLogger('INVOICE_V2_PDF_GENERATE'),
  generateInvoicePDF
);

/**
 * @route POST /api/v2/invoices/:id/duplicate
 * @desc Duplicate an invoice with feature flags support
 * @access Private
 */
router.post('/:id/duplicate',
  authenticateToken,
  auditLogger('INVOICE_V2_DUPLICATE'),
  duplicateInvoice
);

/**
 * @route POST /api/v2/invoices/:id/cancel-recurrence
 * @desc Cancel invoice recurrence with feature flags support
 * @access Private
 */
router.post('/:id/cancel-recurrence',
  authenticateToken,
  auditLogger('INVOICE_V2_CANCEL_RECURRENCE'),
  cancelInvoiceRecurrence
);

/**
 * @route POST /api/v2/invoices/:id/payments
 * @desc Add a payment to an invoice with feature flags support
 * @access Private
 */
router.post('/:id/payments',
  authenticateToken,
  auditLogger('INVOICE_V2_ADD_PAYMENT'),
  addPayment
);

/**
 * @route DELETE /api/v2/invoices/:invoiceId/payments/:paymentId
 * @desc Delete a payment from an invoice with feature flags support
 * @access Private
 */
router.delete('/:invoiceId/payments/:paymentId',
  authenticateToken,
  auditLogger('INVOICE_V2_DELETE_PAYMENT'),
  deletePayment
);

/**
 * @route POST /api/v2/invoices/:id/send-email
 * @desc Send invoice email with feature flags support
 * @access Private
 */
router.post('/:id/send-email',
  authenticateToken,
  strictRateLimit,
  auditLogger('INVOICE_V2_SEND_EMAIL'),
  sendInvoiceViaUserSmtp
);

/**
 * @route POST /api/v2/invoices/:id/preview-email-content
 * @desc Preview invoice email content with feature flags support
 * @access Private
 */
router.post('/:id/preview-email-content',
  authenticateToken,
  auditLogger('INVOICE_V2_EMAIL_PREVIEW'),
  previewInvoiceEmail
);

export default router;
