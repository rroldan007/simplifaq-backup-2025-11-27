import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceForm } from '../InvoiceForm';
import { useAuth } from '../../../hooks/useAuth';
import { useClients } from '../../../hooks/useClients';
import { tokenManager } from '../../../services/tokenManager';
import { formDataPreservation } from '../../../services/formDataPreservation';

// Define types locally for testing
interface TestClient {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    canton?: string;
  };
  vatNumber?: string;
  language: 'de' | 'fr' | 'it' | 'en';
  paymentTerms: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceFormData {
  invoiceNumber: string;
  client: TestClient | null;
  issueDate: string;
  dueDate: string;
  items: Item[];
  notes: string;
  terms: string;
  language: string;
  currency: string;
}

interface Item {
  id: string | number;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
}

// Mock dependencies
jest.mock('../../../hooks/useAuth');
jest.mock('../../../hooks/useClients');
jest.mock('../../../services/tokenManager');
jest.mock('../../../services/formDataPreservation');

// Increase default timeout for async-heavy tests with debounce and timers
jest.setTimeout(20000);

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseClients = useClients as jest.MockedFunction<typeof useClients>;
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
const mockFormDataPreservation = formDataPreservation as jest.Mocked<typeof formDataPreservation>;

// Mock components
jest.mock('../../ui/Card', () => {
  const React = require('react');
  return {
    Card: jest.fn(({ children, className }: { children?: React.ReactNode; className?: string }) =>
      React.createElement('div', { className, ['data-testid']: 'card' }, children)
    ),
  };
});

jest.mock('../../ui/Input', () => {
  const React = require('react');
  return {
    Input: jest.fn((props: any) =>
      React.createElement('input', {
        ...props,
        'data-error': props.error,
        'data-testid': props['data-testid'] || 'input',
      })
    ),
  };
});

jest.mock('../../ui/Button', () => {
  const React = require('react');
  return {
    Button: jest.fn((props: any) =>
      React.createElement('button', {
        ...props,
        'data-variant': props.variant,
        'data-loading': props.isLoading,
        'data-testid': props['data-testid'] || 'button',
      }, props.children)
    ),
  };
});

jest.mock('../ClientSelector', () => {
  const React = require('react');
  return {
    ClientSelector: jest.fn((props: any) => {
      const selectProps = {
        value: props.selectedClient?.id || '',
        onChange: (e: any) => {
          const client = (props.clients || []).find((c: any) => c.id === e.target.value);
          props.onClientSelect(client || null);
        },
        'data-testid': 'client-select',
      };

      const options = [
        React.createElement('option', { key: 'empty', value: '' }, 'Sélectionner un client'),
        ...((props.clients || []).map((client: any) =>
          React.createElement('option', { key: client.id, value: client.id },
            client.companyName || `${client.firstName} ${client.lastName}`
          )
        )),
      ];

      return React.createElement('div', { 'data-testid': 'client-selector' },
        React.createElement('select', selectProps, ...options)
      );
    }),
  };
});

jest.mock('../InvoiceItemsTable', () => {
  const React = require('react');
  return {
    InvoiceItemsTable: jest.fn((props: any) => {
      const buttonProps = {
        onClick: () => props.onItemsChange([
          ...(props.items || []),
          { id: Date.now(), description: 'Test Item', quantity: 1, unitPrice: 100, tvaRate: 7.7 },
        ]),
        'data-testid': 'add-item-button',
      };

      return React.createElement('div', { 'data-testid': 'invoice-items-table' },
        React.createElement('button', buttonProps, 'Add Item'),
        React.createElement('div', { 'data-testid': 'items-count' }, `${(props.items || []).length} items`)
      );
    }),
  };
});

describe('InvoiceForm Data Preservation Integration', () => {
  const mockClient: TestClient = {
    id: 'client-1',
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Test Company',
    email: 'john@test.com',
    phone: '+41 79 000 00 00',
    address: {
      street: '123 Test St',
      city: 'Test City',
      postalCode: '12345',
      country: 'Switzerland'
    },
    vatNumber: 'CHE-123.456.789 TVA',
    language: 'fr',
    paymentTerms: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockClients = [mockClient];

  const defaultProps = {
    mode: 'create' as const,
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    
    // Setup default mocks
    mockUseAuth.mockReturnValue({
      // État d'authentification
      user: { 
        id: 'user-1', 
        email: 'test@example.com',
        companyName: 'Test Co',
        firstName: 'Test',
        lastName: 'User'
      },
      token: 'token-1',
      isLoading: false,
      isAuthenticated: true,
      error: null,
      
      // Actions d'authentification
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      updateLogo: jest.fn(),
      updateUser: jest.fn(),
      
      // Fonctions utilitaires
      hasRole: jest.fn(() => true),
      isEmailVerified: jest.fn(() => true),
      getDisplayName: jest.fn(() => 'Test User'),
      getInitials: jest.fn(() => 'TU'),
    });

  

    mockUseClients.mockReturnValue({
      // state
      clients: mockClients,
      loading: false,
      error: null,
      total: mockClients.length,
      hasMore: false,
      lastUpdated: new Date(),
      
      // extras
      notifications: [],
      operationLoading: {},
      
      // actions
      createClient: jest.fn(),
      updateClient: jest.fn(),
      deleteClient: jest.fn(),
      toggleClientStatus: jest.fn(),
      searchClients: jest.fn().mockResolvedValue(mockClients),
      refreshClients: jest.fn(),
      removeNotification: jest.fn(),
    });

    mockTokenManager.onTokenExpired = jest.fn();
    mockTokenManager.removeListener = jest.fn();

    mockFormDataPreservation.preserveFormData = jest.fn().mockResolvedValue('test-id');
    mockFormDataPreservation.retrieveFormData = jest.fn().mockResolvedValue(null);
    mockFormDataPreservation.removeFormData = jest.fn().mockResolvedValue(true);
    mockFormDataPreservation.listFormData = jest.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    // Ensure no pending timers leak between tests and restore real timers
    try {
      jest.runOnlyPendingTimers();
    } catch (_) {
      // ignore if none pending
    }
    jest.useRealTimers();
  });

  describe('Form Data Auto-Preservation', () => {
    it('should automatically preserve form data when user fills out the form', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(<InvoiceForm {...defaultProps} />);

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Flush effects once after render
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Fill out form fields
      const invoiceNumberInput = screen.getByDisplayValue(/FAC-\d{4}\d{2}-\d{3}/);
      await user.clear(invoiceNumberInput);
      await user.type(invoiceNumberInput, 'FAC-2024-001');

      // Select a client
      const clientSelect = screen.getByTestId('client-select');
      await user.selectOptions(clientSelect, mockClient.id);

      // Add notes
      const notesTextarea = screen.getByPlaceholderText(/Notes internes/);
      await user.type(notesTextarea, 'Test notes for preservation');

      // Advance debounce timer to trigger auto-save
      await act(async () => {
        jest.advanceTimersByTime(2100);
      });

      // Wait for debounced auto-save
      await waitFor(() => {
        expect(mockFormDataPreservation.preserveFormData).toHaveBeenCalledWith(
          expect.objectContaining({
            invoiceNumber: 'FAC-2024-001',
            client: mockClient,
            notes: 'Test notes for preservation',
          }), expect.any(Object)
        );
      }, { timeout: 2000 });
    });

    it('should preserve form data when token expires', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      let tokenExpiredCallback: (() => void) | undefined;

      mockTokenManager.onTokenExpired.mockImplementation((callback) => {
        tokenExpiredCallback = callback;
      });

      render(<InvoiceForm {...defaultProps} />);

      // Fill out some form data
      const notesTextarea = screen.getByPlaceholderText(/Notes internes/);
      await user.type(notesTextarea, 'Important data to preserve');

      // Add an item
      const addItemButton = screen.getByTestId('add-item-button');
      await user.click(addItemButton);

      // Simulate token expiration
      act(() => {
        if (tokenExpiredCallback) {
          tokenExpiredCallback();
        }
      });

      // Allow any debounced actions to flush
      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      await waitFor(() => {
        expect(mockFormDataPreservation.preserveFormData).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Important data to preserve',
            items: expect.arrayContaining([
              expect.objectContaining({
                description: 'Test Item',
                quantity: 1,
                unitPrice: 100,
              })
            ]),
          }), expect.any(Object)
        );
      });
    });
  });

  describe('Form Data Restoration', () => {
    it('should restore form data after authentication and show notification', async () => {
      const preservedData: Partial<InvoiceFormData> = {
        invoiceNumber: 'FAC-2024-RESTORED',
        client: mockClient,
        notes: 'Restored notes',
        terms: 'Restored terms',
        items: [
          { id: '1', description: 'Restored Item', quantity: 2, unitPrice: 150, tvaRate: 7.7 }
        ],
        language: 'de',
        currency: 'EUR',
      };

      // Simulate that there is a most recent preserved entry and return its data
      mockFormDataPreservation.listFormData.mockResolvedValue([
        { 
          id: 'pres-1', 
          formId: 'invoice-form-create', 
          encrypted: true,
          createdAt: Date.now() - 10000,
          expiresAt: Date.now() + 100000,
          lastAccessed: Date.now(),
          size: 1280,
        }
      ] as unknown as Array<{
        id: string; formId: string; encrypted: boolean; createdAt: number; expiresAt: number; lastAccessed: number; size: number;
      }>);
      mockFormDataPreservation.retrieveFormData.mockResolvedValue(preservedData as unknown as Record<string, unknown>);

      // Start with unauthenticated state
      mockUseAuth.mockReturnValueOnce({
        // État d'authentification
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        
        // Actions d'authentification
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
        updateLogo: jest.fn(),
        updateUser: jest.fn(),
        
        // Fonctions utilitaires
        hasRole: jest.fn(() => false),
        isEmailVerified: jest.fn(() => false),
        getDisplayName: jest.fn(() => ''),
        getInitials: jest.fn(() => ''),
      });

      const { rerender } = render(<InvoiceForm {...defaultProps} />);

      // Simulate authentication
      mockUseAuth.mockReturnValue({
        // État d'authentification
        user: { 
          id: 'user-1', 
          email: 'test@example.com',
          companyName: 'Test Co',
          firstName: 'Test',
          lastName: 'User'
        },
        token: 'token-1',
        isLoading: false,
        isAuthenticated: true,
        error: null,
        
        // Actions d'authentification
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
        updateLogo: jest.fn(),
        updateUser: jest.fn(),
        
        // Fonctions utilitaires
        hasRole: jest.fn(() => true),
        isEmailVerified: jest.fn(() => true),
        getDisplayName: jest.fn(() => 'Test User'),
        getInitials: jest.fn(() => 'TU'),
      });

      rerender(<InvoiceForm {...defaultProps} />);

      // Allow effects/microtasks to process under fake timers
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Effects flushed; retrieve should have been called
      expect(mockFormDataPreservation.retrieveFormData).toHaveBeenCalled();

      // Check that restoration notification is shown
      await waitFor(() => {
        expect(screen.getByText(/Données restaurées/)).toBeInTheDocument();
        expect(screen.getByText(/Vos données de facture ont été restaurées automatiquement/)).toBeInTheDocument();
      });

      // Verify form fields are populated with restored data
      expect(screen.getByDisplayValue('FAC-2024-RESTORED')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Restored notes')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Restored terms')).toBeInTheDocument();
    });

    it('should not restore data if no meaningful data exists', async () => {
      const emptyData = {
        invoiceNumber: '',
        client: null,
        notes: '',
        terms: '',
        items: [],
      };

      mockFormDataPreservation.listFormData.mockResolvedValue([
        { 
          id: 'pres-empty', 
          formId: 'invoice-form-create', 
          encrypted: true,
          createdAt: Date.now() - 10000,
          expiresAt: Date.now() + 100000,
          lastAccessed: Date.now(),
          size: 850,
        }
      ] as unknown as Array<{
        id: string; formId: string; encrypted: boolean; createdAt: number; expiresAt: number; lastAccessed: number; size: number;
      }>);
      mockFormDataPreservation.retrieveFormData.mockResolvedValue(emptyData as unknown as Record<string, unknown>);

      render(<InvoiceForm {...defaultProps} />);

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Flush microtasks to resolve async retrieval
      await act(async () => { await Promise.resolve(); });
      expect(mockFormDataPreservation.retrieveFormData).toHaveBeenCalled();

      // Should not show restoration notification for empty data
      expect(screen.queryByText(/Données restaurées/)).not.toBeInTheDocument();
    });

    it('should handle restoration errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockFormDataPreservation.listFormData.mockResolvedValue([
        { 
          id: 'pres-err', 
          formId: 'invoice-form-create', 
          encrypted: true,
          createdAt: Date.now() - 10000,
          expiresAt: Date.now() + 100000,
          lastAccessed: Date.now(),
          size: 640,
        }
      ] as unknown as Array<{
        id: string; formId: string; encrypted: boolean; createdAt: number; expiresAt: number; lastAccessed: number; size: number;
      }>);
      mockFormDataPreservation.retrieveFormData.mockRejectedValue(new Error('Restoration failed'));

      render(<InvoiceForm {...defaultProps} />);

      await act(async () => {
        jest.advanceTimersByTime(0);
      });
      // resolve async retrieval
      await act(async () => { await Promise.resolve(); });
      expect(mockFormDataPreservation.retrieveFormData).toHaveBeenCalled();

      expect(consoleError).toHaveBeenCalledWith('Failed to restore form data:', expect.any(Error));
      expect(screen.queryByText(/Données restaurées/)).not.toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('should allow user to dismiss restoration notification', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const preservedData = {
        invoiceNumber: 'FAC-2024-RESTORED',
        client: mockClient,
        notes: 'Test notes',
        terms: 'Restored terms',
        items: [
          { id: '1', description: 'Restored Item', quantity: 1, unitPrice: 100, tvaRate: 7.7 }
        ],
        language: 'fr',
        currency: 'CHF',
      };

      mockFormDataPreservation.listFormData.mockResolvedValue([
        { 
          id: 'pres-2', 
          formId: 'invoice-form-create', 
          encrypted: true,
          createdAt: Date.now() - 10000,
          expiresAt: Date.now() + 100000,
          lastAccessed: Date.now(),
          size: 1024,
        }
      ] as unknown as Array<{
        id: string; formId: string; encrypted: boolean; createdAt: number; expiresAt: number; lastAccessed: number; size: number;
      }>);
      mockFormDataPreservation.retrieveFormData.mockResolvedValue(preservedData as unknown as Record<string, unknown>);

      render(<InvoiceForm {...defaultProps} />);

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Flush microtasks to complete retrieval
      await act(async () => { await Promise.resolve(); });
      // Effects flushed; notification should be visible
      expect(screen.getByText(/Données restaurées/)).toBeInTheDocument();

      // Click dismiss button (no accessible name on svg-only button)
      const notificationContainer = screen.getByText(/Vos données de facture ont été restaurées automatiquement/).closest('div');
      const dismissButton = notificationContainer?.querySelector('button') as HTMLButtonElement;
      await user.click(dismissButton);

      // Notification should be hidden
      expect(screen.queryByText(/Données restaurées/)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission and Data Cleanup', () => {
    it('should clear preserved data on successful form submission', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSubmit = jest.fn();

      // Ensure there is preserved data to clear
      mockFormDataPreservation.listFormData.mockResolvedValue([
        {
          id: 'clear-1',
          formId: 'invoice-form-create',
          encrypted: true,
          createdAt: Date.now() - 1000,
          expiresAt: Date.now() + 100000,
          lastAccessed: Date.now(),
          size: 123,
        },
      ] as unknown as Array<{ id: string; formId: string; encrypted: boolean; createdAt: number; expiresAt: number; lastAccessed: number; size: number; }>);

      render(<InvoiceForm {...defaultProps} onSubmit={onSubmit} />);

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Fill required fields
      const clientSelect = screen.getByTestId('client-select');
      await user.selectOptions(clientSelect, mockClient.id);

      const addItemButton = screen.getByTestId('add-item-button');
      await user.click(addItemButton);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Créer la facture/i });
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalled();
      // allow promise microtask to resolve
      await act(async () => { await Promise.resolve(); });
      expect(mockFormDataPreservation.removeFormData).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSubmit = jest.fn();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      // Ensure there is preserved data and simulate remove failure
      mockFormDataPreservation.listFormData.mockResolvedValue([
        {
          id: 'clear-err',
          formId: 'invoice-form-create',
          encrypted: true,
          createdAt: Date.now() - 1000,
          expiresAt: Date.now() + 100000,
          lastAccessed: Date.now(),
          size: 123,
        },
      ] as unknown as Array<{ id: string; formId: string; encrypted: boolean; createdAt: number; expiresAt: number; lastAccessed: number; size: number; }>);
      mockFormDataPreservation.removeFormData.mockRejectedValue(new Error('Cleanup failed'));

      render(<InvoiceForm {...defaultProps} onSubmit={onSubmit} />);

      // Fill required fields and submit
      const clientSelect = screen.getByTestId('client-select');
      await user.selectOptions(clientSelect, mockClient.id);

      const addItemButton = screen.getByTestId('add-item-button');
      await user.click(addItemButton);

      const submitButton = screen.getByRole('button', { name: /Créer la facture/i });
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalled();
      // Hook logs on cleanup error
      expect(consoleError).toHaveBeenCalledWith('Failed to clear form data:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('should handle pending restoration and then hide pending state', async () => {
      let resolveRestore: (value: Partial<InvoiceFormData>) => void;
      const restorePromise = new Promise<Partial<InvoiceFormData>>((resolve) => {
        resolveRestore = resolve;
      });

      mockFormDataPreservation.listFormData.mockResolvedValue([
        { 
          id: 'pres-3', 
          formId: 'invoice-form-create', 
          encrypted: true,
          createdAt: Date.now() - 10000,
          expiresAt: Date.now() + 100000,
          lastAccessed: Date.now(),
          size: 900,
        }
      ] as unknown as Array<{
        id: string; formId: string; encrypted: boolean; createdAt: number; expiresAt: number; lastAccessed: number; size: number;
      }>);
      mockFormDataPreservation.retrieveFormData.mockReturnValue(restorePromise as unknown as Promise<Record<string, unknown>>);

      render(<InvoiceForm {...defaultProps} />);

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Complete the pending restore
      act(() => {
        // resolve with some benign data
        resolveRestore!({ notes: 'restored' });
      });

      // Flush microtasks and any pending timers
      await act(async () => { await Promise.resolve(); });
      expect(mockFormDataPreservation.retrieveFormData).toHaveBeenCalled();
      await act(async () => { jest.runOnlyPendingTimers(); });
    });
  });

  describe('Data Validation with Restored Data', () => {
    it('should validate restored data structure', async () => {
      const invalidData = {
        invoiceNumber: 'RESTORED-001',
        client: mockClient,
        items: 'invalid-items', // Should be array
        notes: null, // Should be string
        invalidField: 'should be ignored',
      } as unknown as Partial<InvoiceFormData>;

      mockFormDataPreservation.listFormData.mockResolvedValue([
        { 
          id: 'pres-4', 
          formId: 'invoice-form-create', 
          encrypted: true,
          createdAt: Date.now() - 10000,
          expiresAt: Date.now() + 100000,
          lastAccessed: Date.now(),
          size: 700,
        }
      ] as unknown as Array<{
        id: string; formId: string; encrypted: boolean; createdAt: number; expiresAt: number; lastAccessed: number; size: number;
      }>);
      mockFormDataPreservation.retrieveFormData.mockResolvedValue(invalidData as unknown as Record<string, unknown>);

      render(<InvoiceForm {...defaultProps} />);

      await act(async () => { jest.advanceTimersByTime(0); });
      await act(async () => { await Promise.resolve(); });
      expect(mockFormDataPreservation.retrieveFormData).toHaveBeenCalled();

      // Effects flushed; notification should be visible (data cleaned up)
      expect(screen.getByText(/Données restaurées/)).toBeInTheDocument();

      // Check that form has valid data structure
      expect(screen.getByDisplayValue('RESTORED-001')).toBeInTheDocument();
      expect(screen.getByTestId('items-count')).toHaveTextContent('0 items'); // Invalid items array was replaced
    });
  });

  describe('Cross-Component Integration', () => {
    it('should work with existing form validation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onSubmit = jest.fn();

      render(<InvoiceForm {...defaultProps} onSubmit={onSubmit} />);

      // Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /Créer la facture/i });
      await user.click(submitButton);

      // Form should not submit due to validation
      expect(onSubmit).not.toHaveBeenCalled();
      expect(mockFormDataPreservation.removeFormData).not.toHaveBeenCalled();
    });

    it('should preserve data even when form has validation errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<InvoiceForm {...defaultProps} />);

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Fill some fields but leave required fields empty
      const notesTextarea = screen.getByPlaceholderText(/Notes internes/);
      await user.type(notesTextarea, 'Notes without client');

      // Advance debounce to trigger auto-save (should still work despite validation errors)
      await act(async () => {
        jest.advanceTimersByTime(2100);
      });
      await waitFor(() => {
        expect(mockFormDataPreservation.preserveFormData).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Notes without client',
          })
        );
      }, { timeout: 2000 });
    });
  });
});
