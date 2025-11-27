import React from 'react';
import type { InvoicePreviewData } from './ElegantClassic';

export const MinimalModern: React.FC<{ data: InvoicePreviewData; accentColor?: string; showHeader?: boolean }> = ({ data, accentColor = '#3B82F6', showHeader = true }) => {
  const resolveDecimals = (unit?: string) => {
    if (!unit) return data.quantityDecimals;
    const normalized = unit.toLowerCase();
    return (normalized.includes('kg') || normalized.includes('kilogram')) ? 3 : data.quantityDecimals;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {data.logoUrl && (
              <div className="w-12 h-12 rounded bg-slate-100 p-1 flex items-center justify-center">
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
              {showHeader && <div className="text-lg font-semibold text-slate-900">{data.companyName}</div>}
              <div className="text-xs text-slate-500 whitespace-pre-line">{data.companyAddress}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.3em] font-semibold text-slate-500">Facture</div>
            <div className="text-xs text-slate-500">#{data.invoiceNumber}</div>
            <div className="text-[11px] text-slate-500">Émise: {data.issueDate}</div>
            <div className="text-[11px] text-slate-500">Échéance: {data.dueDate}</div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 pb-4">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">De</div>
            <div className="text-slate-800 whitespace-pre-line leading-relaxed">{data.companyAddress}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">Facturé à</div>
            <div className="text-slate-800 font-medium">{data.clientName}</div>
            <div className="text-slate-600 whitespace-pre-line leading-relaxed">{data.clientAddress}</div>
          </div>
        </div>

        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: '#F8FAFC' }} className="text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-right px-4 py-3 font-medium">Qté</th>
                <th className="text-right px-4 py-3 font-medium">PU</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-800">{it.description}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{it.quantity.toFixed(resolveDecimals(it.unit))}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{it.unitPrice.toFixed(2)} {data.currency}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{it.total.toFixed(2)} {data.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full md:w-64 text-sm space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Sous-total</span>
              <span>{data.subtotal.toFixed(2)} {data.currency}</span>
            </div>
            {data.discount && data.discount.amount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>
                  Rabais global ({data.discount.value}{data.discount.type === 'PERCENT' ? '%' : ' ' + data.currency})
                  {data.discount.note && <div className="text-xs text-slate-500 mt-0.5">{data.discount.note}</div>}
                </span>
                <span>-{data.discount.amount.toFixed(2)} {data.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>TVA</span>
              <span>{data.tax.toFixed(2)} {data.currency}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200 pt-3">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="font-semibold text-base" style={{ color: accentColor }}>{data.total.toFixed(2)} {data.currency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
