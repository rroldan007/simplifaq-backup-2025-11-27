/**
 * Security middleware for frontend application
 * Implements HTTPS enforcement, CSP, and other security measures
 */

import { securityLogger } from './security';

// HTTPS Enforcement
export const enforceHTTPS = (): void => {
  if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
    securityLogger.logSecurityEvent('HTTPS_REDIRECT', {
      originalUrl: window.location.href,
      userAgent: navigator.userAgent
    });
    
    // Redirect to HTTPS
    window.location.replace(window.location.href.replace('http:', 'https:'));
  }
};

// Content Security Policy enforcement
export const enforceCSP = (): void => {
  // Check if CSP is properly configured
  const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  
  if (!metaCSP && process.env.NODE_ENV === 'production') {
    securityLogger.logSecurityEvent('CSP_MISSING', {
      url: window.location.href,
      userAgent: navigator.userAgent
    });
    
    // Add basic CSP as fallback
    const cspMeta = document.createElement('meta');
    cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
    cspMeta.setAttribute('content', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https:; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none';"
    );
    document.head.appendChild(cspMeta);
  }
};

// Session security checks
export const checkSessionSecurity = (): void => {
  // Check for session hijacking indicators
  const sessionData = localStorage.getItem('auth_token');
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      const currentUserAgent = navigator.userAgent;
      
      // Check if user agent has changed (potential session hijacking)
      if (session.userAgent && session.userAgent !== currentUserAgent) {
        securityLogger.logSecurityEvent('SESSION_HIJACK_ATTEMPT', {
          originalUserAgent: session.userAgent,
          currentUserAgent: currentUserAgent,
          sessionId: session.id
        });
        
        // Clear potentially compromised session
        localStorage.removeItem('auth_token');
        window.location.reload();
      }
    } catch (error) {
      securityLogger.logSecurityEvent('SESSION_DATA_CORRUPTED', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      localStorage.removeItem('auth_token');
    }
  }
};

// Detect and prevent clickjacking
export const preventClickjacking = (): void => {
  // Check if page is being framed
  if (window.top !== window.self) {
    securityLogger.logSecurityEvent('CLICKJACKING_ATTEMPT', {
      parentUrl: document.referrer,
      currentUrl: window.location.href
    });
    
    // Break out of frame
    window.top!.location.href = window.self.location.href;
  }
};

// Monitor for suspicious activity
export const monitorSuspiciousActivity = (): void => {
  let rapidClickCount = 0;
  let lastClickTime = 0;
  
  // Monitor for rapid clicking (potential bot activity)
  document.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastClickTime < 100) { // Less than 100ms between clicks
      rapidClickCount++;
      if (rapidClickCount > 10) {
        securityLogger.logSecurityEvent('SUSPICIOUS_RAPID_CLICKS', {
          clickCount: rapidClickCount,
          timeWindow: now - lastClickTime
        });
        rapidClickCount = 0; // Reset counter
      }
    } else {
      rapidClickCount = 0;
    }
    lastClickTime = now;
  });
  
  // Monitor for console access (potential developer tools usage)
  const devtools = { open: false, orientation: null as unknown as null };
  const threshold = 160;
  
  setInterval(() => {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devtools.open) {
        devtools.open = true;
        securityLogger.logSecurityEvent('DEVTOOLS_OPENED', {
          windowDimensions: {
            outer: { width: window.outerWidth, height: window.outerHeight },
            inner: { width: window.innerWidth, height: window.innerHeight }
          }
        });
      }
    } else {
      devtools.open = false;
    }
  }, 500);
};

// Initialize all security measures
export const initializeSecurity = (): void => {
  // Run security checks on initialization
  enforceHTTPS();
  enforceCSP();
  preventClickjacking();
  checkSessionSecurity();
  monitorSuspiciousActivity();
  
  // Set up periodic security checks
  setInterval(() => {
    checkSessionSecurity();
  }, 60000); // Check every minute
  
  // Log security initialization
  securityLogger.logSecurityEvent('SECURITY_INITIALIZED', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
};

// Secure form submission helper
export const secureFormSubmit = (formData: FormData, endpoint: string): Promise<Response> => {
  // Add CSRF token if available
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (csrfToken) {
    formData.append('_token', csrfToken);
  }
  
  // Add security headers
  const headers: HeadersInit = {
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-TOKEN': csrfToken || ''
  };
  
  // Log form submission for audit
  securityLogger.logSecurityEvent('SECURE_FORM_SUBMIT', {
    endpoint: endpoint,
    hasCSRF: !!csrfToken,
    formFields: Array.from(formData.keys())
  });
  
  return fetch(endpoint, {
    method: 'POST',
    body: formData,
    headers: headers,
    credentials: 'same-origin'
  });
};

// Input validation middleware
export const validateSecureInput = (input: string, type: 'financial' | 'text' | 'email'): boolean => {
  // Check for common injection patterns
  const injectionPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi
  ];
  
  const hasInjection = injectionPatterns.some(pattern => pattern.test(input));
  
  if (hasInjection) {
    securityLogger.logSecurityEvent('INJECTION_ATTEMPT', {
      inputType: type,
      inputLength: input.length,
      detectedPatterns: injectionPatterns.filter(pattern => pattern.test(input)).length
    });
    return false;
  }
  
  return true;
};