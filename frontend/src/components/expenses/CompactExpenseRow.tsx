import React from 'react';
import { 
  Edit2, 
  Trash2,
  User
} from 'lucide-react';
import type { Expense } from '../../services/expensesApi';

interface CompactExpenseRowProps {
  expense: Expense;
  onEdit?: (expenseId: string) => void;
  onDelete?: (expenseId: string) => void;
}

const formatAmount = (n: number) => new Intl.NumberFormat('fr-CH', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
}).format(n);

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export function CompactExpenseRow({
  expense,
  onEdit,
  onDelete
}: CompactExpenseRowProps) {
  return (
    <>
      {/* Date */}
      <td className="px-6 py-4 text-sm text-slate-700">
        {formatDate(expense.date)}
      </td>

      {/* Label & Supplier */}
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-slate-900">{expense.label}</div>
        {expense.supplier && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <User className="w-3 h-3" />
            {expense.supplier}
          </div>
        )}
        {expense.notes && (
          <div className="text-xs text-slate-500 mt-1 line-clamp-1">{expense.notes}</div>
        )}
      </td>

      {/* Account */}
      <td className="px-6 py-4">
        {expense.account && (
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-100 text-xs font-medium text-indigo-700">
            {expense.account.code} — {expense.account.name}
          </span>
        )}
      </td>

      {/* Amount */}
      <td className="px-6 py-4 text-right">
        <div className="text-sm font-semibold text-slate-900">
          {formatAmount(Number(expense.amount))}
        </div>
        <div className="text-xs text-slate-500">{expense.currency}</div>
      </td>

      {/* TVA */}
      <td className="px-6 py-4 text-sm text-slate-600">
        {expense.tvaRate != null ? `${expense.tvaRate}%` : '—'}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {onEdit && (
            <button 
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors" 
              onClick={() => onEdit(expense.id)}
              title="Modifier"
            >
              <Edit2 className="w-4 h-4 text-blue-600" />
            </button>
          )}
          {onDelete && (
            <button 
              className="p-2 hover:bg-red-50 rounded-lg transition-colors" 
              onClick={() => onDelete(expense.id)}
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          )}
        </div>
      </td>
    </>
  );
}
