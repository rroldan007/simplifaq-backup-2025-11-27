/**
 * Custom hook for secure form handling with input validation and sanitization
 */

import { useState, useCallback } from 'react';
import { 
  sanitizeHtml, 
  sanitizeFinancialInput, 
  sanitizeTextInput, 
  sanitizeEmail,
  validateInput,
  securityLogger
} from '../utils/security';
import { validateSecureInput } from '../utils/securityMiddleware';

interface FormField {
  value: string;
  error: string | null;
  touched: boolean;
}

interface FormState {
  [key: string]: FormField;
}

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  type?: 'email' | 'financial' | 'text' | 'swissVAT' | 'swissIBAN';
  custom?: (value: string) => string | null;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

export const useSecureForm = (initialValues: Record<string, string>, validationRules: ValidationRules = {}) => {
  // Initialize form state
  const [formState, setFormState] = useState<FormState>(() => {
    const state: FormState = {};
    Object.keys(initialValues).forEach(key => {
      state[key] = {
        value: initialValues[key] || '',
        error: null,
        touched: false
      };
    });
    return state;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sanitize input based on type
  const sanitizeInput = useCallback((value: string, type: string): string => {
    switch (type) {
      case 'email':
        return sanitizeEmail(value);
      case 'financial':
        return sanitizeFinancialInput(value);
      case 'text':
        return sanitizeTextInput(value);
      default:
        return sanitizeHtml(value);
    }
  }, []);

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: string): string | null => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    // Security validation first
    const inputType = rules.type === 'financial' ? 'financial' : 
                     rules.type === 'email' ? 'email' : 'text';
    
    if (!validateSecureInput(value, inputType)) {
      securityLogger.logSecurityEvent('FORM_INJECTION_BLOCKED', {
        fieldName,
        inputType,
        valueLength: value.length
      });
      return 'Entrée non sécurisée détectée';
    }

    // Required validation
    if (rules.required) {
      const error = validateInput.required(value, fieldName);
      if (error) return error;
    }

    // Type-specific validation
    switch (rules.type) {
      case 'email':
        return validateInput.email(value);
      case 'financial':
        return validateInput.amount(value);
      case 'swissVAT':
        return validateInput.swissVAT(value);
      case 'swissIBAN':
        return validateInput.swissIBAN(value);
    }

    // Length validation
    if (rules.minLength) {
      const error = validateInput.minLength(value, rules.minLength, fieldName);
      if (error) return error;
    }

    if (rules.maxLength) {
      const error = validateInput.maxLength(value, rules.maxLength, fieldName);
      if (error) return error;
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }, [validationRules]);

  // Update field value with sanitization and validation
  const updateField = useCallback((fieldName: string, value: string) => {
    const rules = validationRules[fieldName];
    const sanitizedValue = rules?.type ? sanitizeInput(value, rules.type) : sanitizeHtml(value);
    const error = validateField(fieldName, sanitizedValue);

    setFormState(prev => ({
      ...prev,
      [fieldName]: {
        value: sanitizedValue,
        error,
        touched: true
      }
    }));

    // Clear submit error when user starts typing
    if (submitError) {
      setSubmitError(null);
    }
  }, [sanitizeInput, validateField, validationRules, submitError]);

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    let isValid = true;
    const newFormState = { ...formState };

    Object.keys(formState).forEach(fieldName => {
      const error = validateField(fieldName, formState[fieldName].value);
      newFormState[fieldName] = {
        ...newFormState[fieldName],
        error,
        touched: true
      };
      if (error) isValid = false;
    });

    setFormState(newFormState);
    return isValid;
  }, [formState, validateField]);

  // Get form values
  const getFormValues = useCallback((): Record<string, string> => {
    const values: Record<string, string> = {};
    Object.keys(formState).forEach(key => {
      values[key] = formState[key].value;
    });
    return values;
  }, [formState]);

  // Check if form has errors
  const hasErrors = useCallback((): boolean => {
    return Object.values(formState).some(field => field.error !== null);
  }, [formState]);

  // Check if form is dirty (has been modified)
  const isDirty = useCallback((): boolean => {
    return Object.values(formState).some(field => field.touched);
  }, [formState]);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    const state: FormState = {};
    Object.keys(initialValues).forEach(key => {
      state[key] = {
        value: initialValues[key] || '',
        error: null,
        touched: false
      };
    });
    setFormState(state);
    setSubmitError(null);
    setIsSubmitting(false);
  }, [initialValues]);

  // Secure form submission
  const submitForm = useCallback(async (
    onSubmit: (values: Record<string, string>) => Promise<void>
  ): Promise<boolean> => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate form before submission
      if (!validateForm()) {
        securityLogger.logSecurityEvent('FORM_SUBMIT_VALIDATION_FAILED', {
          formFields: Object.keys(formState),
          errorCount: Object.values(formState).filter(field => field.error).length
        });
        setIsSubmitting(false);
        return false;
      }

      // Log secure form submission
      securityLogger.logSecurityEvent('SECURE_FORM_SUBMIT_ATTEMPT', {
        formFields: Object.keys(formState),
        timestamp: new Date().toISOString()
      });

      // Submit form
      await onSubmit(getFormValues());
      
      securityLogger.logSecurityEvent('SECURE_FORM_SUBMIT_SUCCESS', {
        formFields: Object.keys(formState)
      });

      setIsSubmitting(false);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la soumission';
      setSubmitError(errorMessage);
      
      securityLogger.logSecurityEvent('SECURE_FORM_SUBMIT_ERROR', {
        error: errorMessage,
        formFields: Object.keys(formState)
      });

      setIsSubmitting(false);
      return false;
    }
  }, [formState, validateForm, getFormValues]);

  return {
    formState,
    updateField,
    validateForm,
    getFormValues,
    hasErrors,
    isDirty,
    resetForm,
    submitForm,
    isSubmitting,
    submitError
  };
};