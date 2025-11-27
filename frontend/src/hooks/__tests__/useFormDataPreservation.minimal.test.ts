// Minimal test to isolate the exact problem

// Mock everything before any imports
jest.mock('../../services/formDataPreservation');
jest.mock('../../utils/security');

import { renderHook } from '@testing-library/react';

describe('Minimal Hook Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mocks to ensure clean state
    jest.resetModules();
    
    // Mock the service completely
    jest.doMock('../../services/formDataPreservation', () => ({
      formDataPreservation: {
        preserveFormData: jest.fn().mockResolvedValue('test-id'),
        retrieveFormData: jest.fn().mockResolvedValue({}),
        removeFormData: jest.fn().mockResolvedValue(true),
        listFormData: jest.fn().mockResolvedValue([]),
      },
    }));

    // Mock security utils
    jest.doMock('../../utils/security', () => ({
      secureStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      securityLogger: {
        logSecurityEvent: jest.fn(),
      },
    }));
  });

  it('should import and render useFormDataPreservation without crashing', async () => {
    // Import the hook AFTER mocks are set up
    const { useFormDataPreservation } = await import('../useFormDataPreservation');
    
    console.log('Hook imported successfully');
    
    let hookResult;
    let renderError;
    
    try {
      const { result } = renderHook(() => {
        console.log('Hook being called...');
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
    
    expect(hookResult).toBeDefined();
    expect(hookResult).not.toBeNull();
    expect(typeof hookResult).toBe('object');
  });

  it('should import and render useAutoFormPreservation without crashing', async () => {
    // Import the hook AFTER mocks are set up
    const { useAutoFormPreservation } = await import('../useFormDataPreservation');
    
    console.log('useAutoFormPreservation imported successfully');
    
    let hookResult;
    let renderError;
    
    try {
      const { result } = renderHook(() => {
        console.log('useAutoFormPreservation being called...');
        return useAutoFormPreservation('test-form', {});
      });
      
      hookResult = result.current;
      console.log('useAutoFormPreservation result:', hookResult);
      console.log('useAutoFormPreservation result type:', typeof hookResult);
      console.log('useAutoFormPreservation result is null:', hookResult === null);
      
    } catch (error) {
      renderError = error;
      console.error('useAutoFormPreservation render error:', error);
    }
    
    if (renderError) {
      throw renderError;
    }
    
    expect(hookResult).toBeDefined();
    expect(hookResult).not.toBeNull();
    expect(typeof hookResult).toBe('object');
  });
});
