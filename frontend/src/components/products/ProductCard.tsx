import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Package, Eye, Pencil, Copy, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductCardProps {
  product: Product;
  onView?: (productId: string) => void;
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  onDuplicate?: (productId: string) => void;
  currency?: string;
}

export function ProductCard({
  product,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  currency = 'CHF'
}: ProductCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const getTvaRateLabel = (rate: number) => {
    const labels = {
      0: '0% (Exonéré)',
      2.6: '2.6% (Taux réduit)',
      3.8: '3.8% (Taux réduit spécial)',
      8.1: '8.1% (Taux normal)'
    };
    return labels[rate as keyof typeof labels] || `${rate}%`;
  };

  const getTvaRateColor = () => {
    // Use theme-friendly, consistent badge colors
    return 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]';
  };

  const getUnitLabel = (unit: string) => {
    const units = {
      'piece': 'pièce',
      'hour': 'heure',
      'day': 'jour',
      'month': 'mois',
      'year': 'année',
      'kg': 'kg',
      'liter': 'litre',
      'meter': 'mètre',
      'service': 'service',
      'license': 'licence'
    };
    return units[unit as keyof typeof units] || unit;
  };

  const calculatePriceWithTva = () => {
    return product.unitPrice * (1 + product.tvaRate / 100);
  };

  const getAvailableActions = () => {
    const actions = [];

    if (onView) {
      actions.push({
        label: 'Voir',
        onClick: () => onView(product.id),
        icon: <Eye className="w-4 h-4" />,
        variant: 'secondary' as const
      });
    }

    if (onEdit) {
      actions.push({
        label: 'Modifier',
        onClick: () => onEdit(product.id),
        icon: <Pencil className="w-4 h-4" />,
        variant: 'secondary' as const
      });
    }

    if (onDuplicate) {
      actions.push({
        label: 'Dupliquer',
        onClick: () => onDuplicate(product.id),
        icon: <Copy className="w-4 h-4" />,
        variant: 'secondary' as const
      });
    }

    if (onDelete && product.isActive) {
      actions.push({
        label: 'Supprimer',
        onClick: () => onDelete(product.id),
        icon: <Trash2 className="w-4 h-4" />,
        variant: 'error' as const
      });
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--color-bg-secondary)]">
            <Package className="w-6 h-6 text-[var(--color-text-secondary)]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                {product.name}
              </h3>
              <Badge variant={product.isActive ? 'success' : 'secondary'}>
                {product.isActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
            {product.description && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Information */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">
            Prix unitaire HT
          </p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">
            {formatCurrency(product.unitPrice)}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            par {getUnitLabel(product.unit)}
          </p>
        </div>
        
        <div>
          <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">
            Prix TTC
          </p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">
            {formatCurrency(calculatePriceWithTva())}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            TVA incluse
          </p>
        </div>
      </div>

      {/* Tax Information */}
      <div className="mb-4">
        <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">
          Taux de TVA
        </p>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTvaRateColor()}`}>
            {getTvaRateLabel(product.tvaRate)}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            +{formatCurrency(product.unitPrice * (product.tvaRate / 100))} TVA
          </span>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-[var(--color-text-secondary)]">Unité</p>
          <p className="font-medium text-[var(--color-text-primary)] capitalize">
            {getUnitLabel(product.unit)}
          </p>
        </div>
        
        <div>
          <p className="text-[var(--color-text-secondary)]">Créé le</p>
          <p className="font-medium text-[var(--color-text-primary)]">
            {formatDate(product.createdAt)}
          </p>
        </div>
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--color-border-primary)]">
          {actions.map((action, index) => (
            <button
              type="button"
              key={index}
              onClick={action.onClick}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors border border-[var(--color-border-primary)] ${
                action.variant === 'error'
                    ? 'text-error-theme bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)]'
                    : 'text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              <span className="mr-1 inline-flex items-center">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}