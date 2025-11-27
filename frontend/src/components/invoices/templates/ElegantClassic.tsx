import React from 'react';

type Item = { description: string; quantity: number; unitPrice: number; total: number; unit?: string };
export type InvoicePreviewData = {
  companyName: string;
  companyAddress: string;
  clientName: string;
  clientAddress: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: Item[];
  currency: string;
  subtotal: number;
  discount?: {
    value: number;
    type: 'PERCENT' | 'AMOUNT';
    amount: number;
    note?: string;
  };
  tax: number;
  total: number;
  logoUrl?: string; // URL opcional para el logo de la empresa
  quantityDecimals: 2 | 3;
};

export const ElegantClassic: React.FC<{ data: InvoicePreviewData; accentColor?: string; showHeader?: boolean }> = ({ data, accentColor = '#4F46E5', showHeader = true }) => {
  const resolveDecimals = (unit?: string) => {
    if (!unit) return data.quantityDecimals;
    const normalized = unit.toLowerCase();
    return (normalized.includes('kg') || normalized.includes('kilogram')) ? 3 : data.quantityDecimals;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="text-white px-6 py-4"
        style={{ backgroundColor: accentColor }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {data.logoUrl && (
              <div className="w-12 h-12 bg-white rounded-md p-1 flex items-center justify-center">
                <img 
                  src={data.logoUrl} 
                  alt={`${data.companyName} logo`}
                  className="max-h-10 max-w-[2.5rem] object-contain"
                  onError={(e) => {
                    // Si falla la carga de la imagen, ocultar el contenedor
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.classList.add('hidden');
                  }}
                />
              </div>
            )}
            {showHeader && <h2 className="text-xl font-semibold">{data.companyName}</h2>}
          </div>
          <div className="text-sm opacity-90">
            <div>Facture #{data.invoiceNumber}</div>
            <div>Émise: {data.issueDate}</div>
            <div>Échéance: {data.dueDate}</div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="font-semibold text-slate-800 mb-1">De</div>
            <div className="text-slate-700 whitespace-pre-line">{data.companyAddress}</div>
          </div>
          <div>
            <div className="font-semibold text-slate-800 mb-1">À</div>
            <div className="text-slate-700 whitespace-pre-line">{data.clientName}\n{data.clientAddress}</div>
          </div>
        </div>

        <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead
              className="text-white"
              style={{ backgroundColor: accentColor }}
            >
              <tr>
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
            <div className="flex justify-between text-slate-800 text-base font-semibold border-t pt-2">
              <span>Total</span>
              <span style={{ color: accentColor }}>{data.total.toFixed(2)} {data.currency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
