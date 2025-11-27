/**
 * Security middleware for Swiss financial data compliance
 */

import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import winston from 'winston';

// Security logger configuration
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'simplifaq-security' },
  transports: [
    new winston.transports.File({ filename: 'logs/security-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/security-combined.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  securityLogger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Rate limiting configurations for different endpoints
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      securityLogger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });
};

// Specific rate limiters for different endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  200, // Increased from 50 to 200 attempts for better development experience
  'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
);

export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  1000, // Increased to 1000 requests for better development experience
  'Trop de requêtes API. Veuillez réessayer dans 15 minutes.'
);

export const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 requests
  'Limite de requêtes dépassée pour cette opération sensible.'
);

// Slow down middleware for progressive delays
export const authSlowDown: any = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

// Input validation middleware
export const validateInput = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      securityLogger.warn('Input validation failed', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données d\'entrée invalides',
          details: errors.array()
        },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

// Swiss-specific validation rules
export const swissValidationRules = {
  vatNumber: body('vatNumber')
    .optional()
    .custom((value) => {
      // Allow empty values
      if (!value || value.trim() === '') {
        return true;
      }
      // More flexible Swiss VAT number validation
      const cleanVat = value.trim().toUpperCase();
      if (!/^CHE[-\s]?\d{3}\.?\d{3}\.?\d{3}(\s?(TVA|MWST|IVA))?$/i.test(cleanVat)) {
        if (!cleanVat.startsWith('CHE')) {
          throw new Error('Numéro TVA suisse doit commencer par CHE');
        }
        throw new Error('Format de numéro TVA suisse invalide');
      }
      return true;
    }),

  iban: body('iban')
    .optional()
    .matches(/^CH\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d$/)
    .withMessage('IBAN suisse invalide'),

  postalCode: body('postalCode')
    .matches(/^\d{4}$/)
    .withMessage('Code postal suisse invalide (4 chiffres requis)'),

  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Format d\'email invalide'),

  amount: body('amount')
    .isFloat({ min: 0 })
    .withMessage('Montant invalide'),

  tvaCategory: body('tvaCategory')
    .isIn(['EXEMPT', 'NOT_SUBJECT', 'REDUCED', 'SPECIAL', 'STANDARD'])
    .withMessage('Catégorie TVA suisse invalide (EXEMPT, NOT_SUBJECT, REDUCED, SPECIAL, STANDARD)'),

  currency: body('currency')
    .isIn(['CHF', 'EUR'])
    .withMessage('Devise invalide (CHF ou EUR uniquement)'),

  language: body('language')
    .isIn(['fr', 'de', 'it', 'en'])
    .withMessage('Langue invalide'),

  // Financial data sanitization
  sanitizeFinancial: body(['amount', 'unitPrice', 'total', 'subtotal', 'tvaAmount'])
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        // Remove any non-numeric characters except decimal point and minus
        return value.replace(/[^\d.-]/g, '');
      }
      return value;
    }),

  // Text sanitization
  sanitizeText: body(['companyName', 'firstName', 'lastName', 'description', 'notes'])
    .trim()
    .escape()
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        // Remove potentially dangerous characters
        return value.replace(/[<>"']/g, '');
      }
      return value;
    })
};

// Security audit logging middleware
export const auditLogger = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action with request/response details
      securityLogger.info('Financial operation audit', {
        action,
        userId: (req as any).user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
        requestBody: req.method !== 'GET' ? req.body : undefined,
        success: res.statusCode < 400
      });

      return originalSend.call(this, data);
    };

    next();
  };
};

// SQL injection prevention middleware
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction): void | Response => {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /('|(\\')|(;)|(\\;)|(\|)|(\*)|(%)|(<)|(>)|(\{)|(\})|(\[)|(\]))/gi,
    /((\%3C)|(<)).*?((\%3E)|(>))/gi, // XSS patterns
    /((\%27)|(\')|(\\x27))/gi, // SQL injection quotes
  ];

  const checkForInjection = (obj: any, path: string = ''): boolean => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (checkForInjection(value, `${path}.${key}`)) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Check query parameters, body, and headers
  const sources = [
    { data: req.query, name: 'query' },
    { data: req.body, name: 'body' },
    { data: req.params, name: 'params' }
  ];

  for (const source of sources) {
    if (checkForInjection(source.data)) {
      securityLogger.error('SQL injection attempt detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        source: source.name,
        data: source.data,
        timestamp: new Date().toISOString()
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'SECURITY_VIOLATION',
          message: 'Requête non autorisée détectée',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
};

// CORS configuration
export const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'https://test.simplifaq.ch',
    'https://www.test.simplifaq.ch',
    'https://my.simplifaq.ch'
  ],
  
  // Enable credentials (cookies, auth headers)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  
  // Allowed headers
  allowedHeaders: [
    'content-type',
    'authorization',
    'x-requested-with',
    'accept',
    'origin',
    'x-csrf-token'
  ],
  
  // Exposed headers
  exposedHeaders: [
    'Content-Length',
    'X-Total-Count',
    'X-Page-Count',
    'X-Total-Pages',
    'X-Has-Next-Page',
    'X-Has-Previous-Page',
    'X-Page-Count'
  ],
  
  // Máxima edad de la respuesta de preflight (en segundos)
  maxAge: 600 // 10 minutos
};

// Security headers configuration
export const securityHeaders = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Allow cross-origin embedding of resources (uploads) for the frontend during dev
  crossOriginResourcePolicy: { policy: 'cross-origin' as const },
  crossOriginEmbedderPolicy: false, // Disable for PDF generation compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

export { securityLogger };