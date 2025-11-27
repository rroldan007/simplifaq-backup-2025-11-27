import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { expensesApi, type Account, type Expense, type Currency, type TvaSummary } from '../../services/expensesApi';
import { ModernExpensesList } from '../../components/expenses/ModernExpensesList';

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfMonthISO = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };

const ExpensesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pnlData, setPnlData] = useState<{ revenue: number; charges: number; utilite: number; tva: number } | null>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [tvaSummary, setTvaSummary] = useState<TvaSummary | null>(null);
  const [tvaLoading, setTvaLoading] = useState(false);

  const [filters, setFilters] = useState<{ dateFrom: string; dateTo: string; accountId: string; currency: Currency; search?: string }>(() => ({
    dateFrom: sp.get('from') || startOfMonthISO(),
    dateTo: sp.get('to') || todayISO(),
    accountId: sp.get('acc') || '',
    currency: (sp.get('ccy') as Currency) || 'CHF',
    search: sp.get('q') || '',
  }));

  useEffect(() => {
    const params: any = { 
      from: filters.dateFrom, 
      to: filters.dateTo, 
      ccy: filters.currency 
    };
    if (filters.accountId) params.acc = filters.accountId;
    if (filters.search) params.q = filters.search;
    setSp(params, { replace: true });
  }, [filters, setSp]);

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [accs, exps] = await Promise.all([
        expensesApi.listAccounts(),
        expensesApi.listExpenses({ 
          dateFrom: filters.dateFrom, 
          dateTo: filters.dateTo, 
          accountId: filters.accountId || undefined 
        }),
      ]);
      setAccounts(accs);
      setExpenses(exps);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.accountId]);

  const loadPnL = useCallback(async () => {
    try {
      setPnlLoading(true);
      const res = await expensesApi.getPnL({ 
        dateFrom: filters.dateFrom, 
        dateTo: filters.dateTo, 
        currency: filters.currency 
      });
      setPnlData({ 
        revenue: res.revenue, 
        charges: res.charges, 
        utilite: res.utilite, 
        tva: res.tva 
      });
    } catch (e: any) {
      console.error('Error loading P&L:', e);
    } finally {
      setPnlLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.currency]);

  const loadTvaSummary = useCallback(async () => {
    try {
      setTvaLoading(true);
      const res = await expensesApi.getTvaSummary({ 
        dateFrom: filters.dateFrom, 
        dateTo: filters.dateTo, 
        currency: filters.currency 
      });
      setTvaSummary(res);
    } catch (e: any) {
      console.error('Error loading TVA summary:', e);
    } finally {
      setTvaLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.currency]);

  useEffect(() => { 
    loadExpenses();
    loadPnL();
    loadTvaSummary();
  }, [loadExpenses, loadPnL, loadTvaSummary]);

  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => {
      const hasChanges = Object.keys(newFilters).some(
        key => prev[key as keyof typeof prev] !== newFilters[key as keyof typeof newFilters]
      );
      return hasChanges ? { ...prev, ...newFilters } : prev;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadExpenses(), loadPnL(), loadTvaSummary()]);
  }, [loadExpenses, loadPnL, loadTvaSummary]);

  const handleEdit = useCallback((expenseId: string) => {
    navigate(`/expenses/${expenseId}/edit`);
  }, [navigate]);

  const handleDelete = useCallback(async (expenseId: string) => {
    if (!confirm('Supprimer cette charge ?')) return;
    try {
      await expensesApi.deleteExpense(expenseId);
      await handleRefresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur lors de la suppression');
    }
  }, [handleRefresh]);

  const handleCreateNew = useCallback(() => {
    navigate('/expenses/new');
  }, [navigate]);

  return (
    <ModernExpensesList
      expenses={expenses}
      accounts={accounts}
      loading={loading}
      error={error}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onCreateNew={handleCreateNew}
      onRefresh={handleRefresh}
      onFilterChange={handleFilterChange}
      currentFilters={filters}
      pnlData={pnlData}
      pnlLoading={pnlLoading}
      tvaSummary={tvaSummary}
      tvaLoading={tvaLoading}
    />
  );
};

export default ExpensesListPage;
