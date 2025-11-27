import React from 'react';
import type { InvoicePreviewData } from './ElegantClassic';

export const FormalPro: React.FC<{ data: InvoicePreviewData; accentColor?: string; showHeader?: boolean }> = ({ data, accentColor = '#059669', showHeader = true }) => {
  const resolveDecimals = (unit?: string) => {
    if (!unit) return data.quantityDecimals;
    const normalized = unit.toLowerCase();
    return (normalized.includes('kg') || normalized.includes('kilogram')) ? 3 : data.quantityDecimals;
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-300 text-white"
        style={{ backgroundColor: accentColor }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.logoUrl && (
              <div className="w-10 h-10 bg-white rounded-md p-1 flex items-center justify-center">
                <img 
                  src={data.logoUrl}
                  alt={`${data.companyName} logo`}
                  className="max-h-8 max-w-8 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.classList.add('hidden');
                  }}
                />
              </div>
            )}
            {showHeader && <div className="text-lg font-semibold">{data.companyName}</div>}
          </div>
          <div className="text-right text-sm">
            <div>Facture #{data.invoiceNumber}</div>
            <div>Émise: {data.issueDate}</div>
            <div>Échéance: {data.dueDate}</div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="uppercase text-xs tracking-wide text-slate-500">Émetteur</div>
            <div className="mt-1 text-slate-800 whitespace-pre-line">{data.companyAddress}</div>
          </div>
          <div>
            <div className="uppercase text-xs tracking-wide text-slate-500">Destinataire</div>
            <div className="mt-1 text-slate-800 whitespace-pre-line">{data.clientName}\n{data.clientAddress}</div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-slate-600">
                <th className="text-left px-4 py-2 font-medium">Description</th>
                <th className="text-right px-4 py-2 font-medium">Qté</th>
                <th className="text-right px-4 py-2 font-medium">PU</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2 text-slate-800">{it.description}</td>
                  <td className="px-4 py-2 text-right">{it.quantity.toFixed(resolveDecimals(it.unit))}</td>
                  <td className="px-4 py-2 text-right">{it.unitPrice.toFixed(2)} {data.currency}</td>
                  <td className="px-4 py-2 text-right font-medium">{it.total.toFixed(2)} {data.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full md:w-72 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Sous-total</span>
              <span className="text-slate-800">{data.subtotal.toFixed(2)} {data.currency}</span>
            </div>
            {data.discount && data.discount.amount > 0 && (
              <div className="flex justify-between py-1 text-red-600">
                <span>
                  Rabais global ({data.discount.value}{data.discount.type === 'PERCENT' ? '%' : ' ' + data.currency})
                  {data.discount.note && <div className="text-xs text-slate-500 mt-0.5">{data.discount.note}</div>}
                </span>
                <span>-{data.discount.amount.toFixed(2)} {data.currency}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-slate-600">TVA</span>
              <span className="text-slate-800">{data.tax.toFixed(2)} {data.currency}</span>
            </div>
            <div className="flex justify-between py-2 mt-1 border-t">
              <span className="text-slate-900 font-semibold">Total</span>
              <span className="text-slate-900 font-semibold">{data.total.toFixed(2)} {data.currency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
