import React from 'react';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface InvoiceStatusSelectorProps {
  currentStatus: InvoiceStatus;
  onStatusChange: (status: InvoiceStatus) => void;
  disabled?: boolean;
}

export const InvoiceStatusSelector: React.FC<InvoiceStatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false
}) => {
  const statusOptions: Array<{ value: InvoiceStatus; label: string; color: string }> = [
    { value: 'draft', label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
    { value: 'sent', label: 'Envoyée', color: 'bg-blue-100 text-blue-800' },
    { value: 'paid', label: 'Payée', color: 'bg-green-100 text-green-800' },
    { value: 'overdue', label: 'En retard', color: 'bg-red-100 text-red-800' },
    { value: 'cancelled', label: 'Annulée', color: 'bg-slate-100 text-slate-800' }
  ];

  const currentOption = statusOptions.find(opt => opt.value === currentStatus);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Statut de la facture
      </label>
      <select
        value={currentStatus}
        onChange={(e) => onStatusChange(e.target.value as InvoiceStatus)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}
        `}
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Current Status Badge */}
      {currentOption && (
        <div className="mt-2">
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${currentOption.color}`}>
            {currentOption.label}
          </span>
        </div>
      )}
    </div>
  );
};

export default InvoiceStatusSelector;
