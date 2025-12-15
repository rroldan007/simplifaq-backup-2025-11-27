import React from 'react';
import type { InvoicePreviewData } from './ElegantClassic';
import { LineDiscountDisplay } from './LineDiscountDisplay';

export const CreativePremium: React.FC<{ 
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
}> = ({ data, accentColor = '#8B5CF6', showHeader = true, headerBgColor, altRowColor }) => {
  const resolveDecimals = (unit?: string) => {
    if (!unit) return data.quantityDecimals;
    const normalized = unit.toLowerCase();
    return (normalized.includes('kg') || normalized.includes('kilogram')) ? 3 : data.quantityDecimals;
  };

  return (
    <div className="bg-white border border-rose-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 text-white"
        style={{ backgroundColor: accentColor }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-90">Facture</div>
            <div className="text-2xl font-bold">#{data.invoiceNumber}</div>
          </div>
          <div className="text-right text-sm opacity-95 flex flex-col items-end">
            <div className="flex items-center gap-2">
              {data.logoUrl && (
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg p-1 flex items-center justify-center">
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
              <div>
                {showHeader && <div className="font-semibold">{data.companyName}</div>}
              </div>
            </div>
            <div className="whitespace-pre-line mt-1">{data.companyAddress}</div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-slate-500">Destinataire</div>
            <div className="font-semibold text-slate-900">{data.clientName}</div>
            <div className="text-slate-700 whitespace-pre-line">{data.clientAddress}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Émise</div>
              <div className="font-medium text-slate-800">{data.issueDate}</div>
            </div>
            <div>
              <div className="text-slate-500">Échéance</div>
              <div className="font-medium text-slate-800">{data.dueDate}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-rose-50/60">
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
                  <td className="px-4 py-2 text-slate-800">
                    <div>{it.description}</div>
                    <LineDiscountDisplay
                      lineDiscountValue={it.lineDiscountValue}
                      lineDiscountType={it.lineDiscountType}
                      discountAmount={it.discountAmount}
                      currency={data.currency}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">{it.quantity.toFixed(resolveDecimals(it.unit))}</td>
                  <td className="px-4 py-2 text-right">{it.unitPrice.toFixed(2)} {data.currency}</td>
                  <td className="px-4 py-2 text-right font-medium">{it.total.toFixed(2)} {data.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full md:w-72 space-y-1 text-sm">
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
            <div className="flex justify-between text-base font-semibold border-t-2 pt-2"
                 style={{ 
                   borderColor: accentColor,
                   color: '#111827'
                 }}>
              <span>Total</span>
              <span>{data.total.toFixed(2)} {data.currency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
