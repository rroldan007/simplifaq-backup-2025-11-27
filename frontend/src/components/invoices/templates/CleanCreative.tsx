import React from 'react';
import type { InvoicePreviewData } from './ElegantClassic';
import { LineDiscountDisplay } from './LineDiscountDisplay';

// CleanCreative: navy accent, airy spacing, subtle separators
export const CleanCreative: React.FC<{ 
  data: InvoicePreviewData; 
  accentColor?: string; 
  showHeader?: boolean;
  logoPosition?: 'left' | 'center' | 'right';
  logoSize?: 'small' | 'medium' | 'large';
  fontColorHeader?: string;
  fontColorBody?: string;
  tableHeadColor?: string;
  headerBgColor?: string;
  altRowColor?: string;
}> = ({ data, accentColor = '#6366F1', showHeader = true }) => {
  const resolveDecimals = (unit?: string) => {
    if (!unit) return data.quantityDecimals;
    const normalized = unit.toLowerCase();
    return (normalized.includes('kg') || normalized.includes('kilogram')) ? 3 : data.quantityDecimals;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {data.logoUrl && (
              <div className="w-12 h-12 rounded-md bg-slate-100 p-1 flex items-center justify-center">
                <img
                  src={data.logoUrl}
                  alt={`${data.companyName} logo`}
                  className="max-h-10 max-w-[2.5rem] object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.classList.add('hidden');
                  }}
                />
              </div>
            )}
            <div>
              {showHeader && <div className="text-2xl font-semibold text-slate-900">{data.companyName}</div>}
              <div className="text-xs text-slate-500 whitespace-pre-line">{data.companyAddress}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest font-semibold"
              style={{ color: accentColor }}>Facture</div>
            <div className="text-sm text-slate-700">#{data.invoiceNumber}</div>
            <div className="text-xs text-slate-500">Émise: {data.issueDate}</div>
            <div className="text-xs text-slate-500">Échéance: {data.dueDate}</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">De</div>
            <div className="mt-1 text-sm text-slate-800 whitespace-pre-line">{data.companyAddress}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">À</div>
            <div className="mt-1 text-sm text-slate-800 whitespace-pre-line">{data.clientName}\n{data.clientAddress}</div>
          </div>
        </div>

        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: `${accentColor}0D` }}>
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-slate-700">Description</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-700">Qté</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-700">PU</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="px-4 py-2 text-slate-800">
                    <div>{it.description}</div>
                    <LineDiscountDisplay
                      lineDiscountValue={it.lineDiscountValue}
                      lineDiscountType={it.lineDiscountType}
                      discountAmount={it.discountAmount}
                      currency={data.currency}
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700">{it.quantity.toFixed(resolveDecimals(it.unit))}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{it.unitPrice.toFixed(2)} {data.currency}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900">{it.total.toFixed(2)} {data.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full md:w-80">
            <div className="flex justify-between text-sm text-slate-600 py-1">
              <span>Sous-total</span>
              <span>{data.subtotal.toFixed(2)} {data.currency}</span>
            </div>
            {data.discount && data.discount.amount > 0 && (
              <div className="flex justify-between text-sm text-red-600 py-1">
                <span>
                  Rabais global ({data.discount.value}{data.discount.type === 'PERCENT' ? '%' : ' ' + data.currency})
                  {data.discount.note && <div className="text-xs text-slate-500 mt-0.5">{data.discount.note}</div>}
                </span>
                <span>-{data.discount.amount.toFixed(2)} {data.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-slate-600 py-1">
              <span>TVA</span>
              <span>{data.tax.toFixed(2)} {data.currency}</span>
            </div>
            <div className="mt-2 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-base font-semibold text-slate-900">Total</span>
              <span className="text-xl font-bold"
                style={{ color: accentColor }}>{data.total.toFixed(2)} {data.currency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
