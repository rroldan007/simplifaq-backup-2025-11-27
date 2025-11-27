import { renderHook } from '@testing-library/react';
import { useFormDataPreservation } from '../useFormDataPreservation';

// Mock all external dependencies completely
jest.mock('../../services/formDataPreservation', () => ({
  formDataPreservation: {
    preserveFormData: jest.fn().mockResolvedValue('test-id'),
    retrieveFormData: jest.fn().mockResolvedValue({}),
    removeFormData: jest.fn().mockResolvedValue(true),
    listFormData: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../utils/security', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  securityLogger: {
    logSecurityEvent: jest.fn(),
  },
}));

describe('useFormDataPreservation Diagnostic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render hook without throwing', () => {
    console.log('Starting diagnostic test...');
    
    let hookResult;
    let renderError;
    
    try {
      const { result } = renderHook(() => {
        console.log('Hook is being called...');
        return useFormDataPreservation('test-form');
      });
      
      hookResult = result.current;
      console.log('Hook result:', hookResult);
      console.log('Hook result type:', typeof hookResult);
      console.log('Hook result is null:', hookResult === null);
      
    } catch (error) {
      renderError = error;
      console.error('Hook render error:', error);
    }
    
    if (renderError) {
      throw renderError;
    }
    
    // Basic assertion - hook should return an object, not null
    expect(hookResult).toBeDefined();
    expect(typeof hookResult).toBe('object');
    expect(hookResult).not.toBeNull();
  });

  it('should have expected properties', () => {
    const { result } = renderHook(() => useFormDataPreservation('test-form'));
    
    console.log('Hook result properties:', Object.keys(result.current || {}));
    
    if (result.current) {
      expect(result.current).toHaveProperty('preserveData');
      expect(result.current).toHaveProperty('retrieveData');
      expect(result.current).toHaveProperty('removeData');
      expect(result.current).toHaveProperty('preservationId');
      expect(result.current).toHaveProperty('isPreserving');
      expect(result.current).toHaveProperty('clearFormData');
    } else {
      fail('Hook result is null - this indicates a fundamental issue with the hook');
    }
  });
});
