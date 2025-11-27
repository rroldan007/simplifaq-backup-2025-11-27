import React from 'react';
import { 
  Receipt, 
  Calendar, 
  DollarSign, 
  Edit2, 
  Trash2,
  FileText,
  User,
  Tag
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Expense } from '../../services/expensesApi';

interface ModernExpenseCardProps {
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

export function ModernExpenseCard({
  expense,
  onEdit,
  onDelete
}: ModernExpenseCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl border-2 border-indigo-200 hover:border-indigo-300 transition-all duration-200 overflow-hidden"
    >
      {/* Header with Amount */}
      <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Receipt className="w-7 h-7" />
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-600 mb-1">Montant</p>
            <p className="text-2xl font-bold text-indigo-900">
              {formatAmount(Number(expense.amount))}
            </p>
            <p className="text-xs text-slate-500">{expense.currency}</p>
          </div>
        </div>
        
        <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2">
          {expense.label}
        </h3>
        {expense.supplier && (
          <p className="text-sm text-slate-600 flex items-center gap-1">
            <User className="w-3 h-3" />
            {expense.supplier}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-3">
        {/* Date */}
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Date</p>
            <p className="text-sm text-slate-700 font-medium">{formatDate(expense.date)}</p>
          </div>
        </div>

        {/* Account */}
        {expense.account && (
          <div className="flex items-start gap-3">
            <Tag className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">Compte</p>
              <p className="text-sm text-slate-700 font-medium">
                {expense.account.code} — {expense.account.name}
              </p>
            </div>
          </div>
        )}

        {/* TVA */}
        {expense.tvaRate != null && (
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">TVA</p>
              <p className="text-sm text-slate-700 font-medium">{expense.tvaRate}%</p>
            </div>
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Notes</p>
            <p className="text-sm text-slate-600 line-clamp-2">{expense.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(expense.id)}
            className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            <span>Modifier</span>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(expense.id)}
            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
