// Mock all external dependencies FIRST, before any imports
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

// Now import everything AFTER mocks are in place
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFormDataPreservation, useAutoFormPreservation } from '../useFormDataPreservation';
import { formDataPreservation } from '../../services/formDataPreservation';

const mockedService = jest.mocked(formDataPreservation);

describe('useFormDataPreservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should preserve data and update preservationId', async () => {
    mockedService.preserveFormData.mockResolvedValue('new-id-123');
    const { result } = renderHook(() => useFormDataPreservation('form-1', { autoPreserve: false }));
    expect(result.current).toHaveProperty('preserveData');

    await act(async () => {
      await result.current.preserveData({ field: 'value' });
    });

    await waitFor(() => {
      expect(result.current.preservationId).toBe('new-id-123');
    });
    expect(mockedService.preserveFormData).toHaveBeenCalledTimes(1);
  });

  it('should retrieve data', async () => {
    const mockData = { field: 'retrieved-value' };
    mockedService.retrieveFormData.mockResolvedValue(mockData);
    const { result } = renderHook(() => useFormDataPreservation('form-1', { autoPreserve: false }));

    let data;
    await act(async () => {
      data = await result.current.retrieveData('id-to-retrieve');
    });

    expect(data).toEqual(mockData);
    expect(mockedService.retrieveFormData).toHaveBeenCalledWith('id-to-retrieve');
  });

  it('should remove data and clear preservationId if it matches', async () => {
    mockedService.preserveFormData.mockResolvedValue('id-to-remove');
    mockedService.removeFormData.mockResolvedValue(true);
    const { result } = renderHook(() => useFormDataPreservation('form-1', { autoRestore: true, autoPreserve: false }));

    await act(async () => {
      await result.current.preserveData({ field: 'value' });
    });

    await waitFor(() => expect(result.current.preservationId).toBe('id-to-remove'));

    await act(async () => {
      await result.current.removeData('id-to-remove');
    });

    await waitFor(() => expect(result.current.preservationId).toBeNull());
    expect(mockedService.removeFormData).toHaveBeenCalledWith('id-to-remove');
  });

  it('should auto-restore on mount if enabled', async () => {
    const mockEntries = [
      { id: 'old-id', formId: 'form-1', encrypted: false, createdAt: 1000, lastAccessed: 1000, expiresAt: Date.now() + 10000, size: 100 },
      { id: 'recent-id', formId: 'form-1', encrypted: false, createdAt: 2000, lastAccessed: 2000, expiresAt: Date.now() + 10000, size: 100 }
    ];
    mockedService.listFormData.mockResolvedValue(mockEntries);
    
    const { result } = renderHook(() => useFormDataPreservation('form-1', { autoRestore: true, autoPreserve: false }));

    await waitFor(() => {
      expect(result.current.preservationId).toBe('recent-id');
    });
    expect(mockedService.listFormData).toHaveBeenCalledWith('form-1');
  });
});

describe('useAutoFormPreservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should auto-preserve when formData changes', async () => {
    mockedService.preserveFormData.mockResolvedValue('auto-saved-id');
    const { result } = renderHook(
      ({ formData }) => useAutoFormPreservation('auto-form', formData),
      { initialProps: { formData: { name: 'Initial' } } }
    );
    expect(result.current).toHaveProperty('preserveData');
    expect(result.current).toHaveProperty('restoreMostRecent');

    await act(async () => { jest.advanceTimersByTime(1001); });

    await waitFor(() => {
      expect(mockedService.preserveFormData).toHaveBeenCalledWith({ name: 'Initial' }, expect.any(Object));
      expect(result.current.preservationId).toBe('auto-saved-id');
    });
  });

  it('should not preserve empty, null, or unchanged data', async () => {
    type TestFormData = { name: string } | Record<string, never>;

    const { rerender } = renderHook<ReturnType<typeof useAutoFormPreservation>, { formData: TestFormData }>(
      ({ formData }) => useAutoFormPreservation('auto-form', formData),
      { initialProps: { formData: { name: 'Initial' } as TestFormData } }
    );

    await act(async () => { jest.advanceTimersByTime(1001); });
    expect(mockedService.preserveFormData).toHaveBeenCalledTimes(1);

    // Rerender with same data
    rerender({ formData: { name: 'Initial' } });
    await act(async () => { jest.advanceTimersByTime(1001); });
    expect(mockedService.preserveFormData).toHaveBeenCalledTimes(1); // Should not call again

    // Rerender with empty data
    rerender({ formData: {} as TestFormData });
    await act(async () => { jest.advanceTimersByTime(1001); });
    expect(mockedService.preserveFormData).toHaveBeenCalledTimes(1); // Should not call again
  });

  it('should restore the most recent data entry', async () => {
    const recentData = { name: 'Most Recent' };
    const mockEntries = [
      { id: 'old-id', formId: 'auto-form', encrypted: false, createdAt: 1000, lastAccessed: 1000, expiresAt: Date.now() + 10000, size: 100 },
      { id: 'recent-id', formId: 'auto-form', encrypted: false, createdAt: 2000, lastAccessed: 2000, expiresAt: Date.now() + 10000, size: 100 }
    ];
    
    mockedService.listFormData.mockResolvedValue(mockEntries);
    mockedService.retrieveFormData.mockResolvedValue(recentData);
    
    const { result } = renderHook(() => useAutoFormPreservation('auto-form', {}));
    expect(result.current).toHaveProperty('restoreMostRecent');

    let restoredData;
    await act(async () => {
      restoredData = await result.current.restoreMostRecent();
    });

    expect(restoredData).toEqual(recentData);
    expect(mockedService.listFormData).toHaveBeenCalledWith('auto-form');
    expect(mockedService.retrieveFormData).toHaveBeenCalledWith('recent-id');
  });
});
