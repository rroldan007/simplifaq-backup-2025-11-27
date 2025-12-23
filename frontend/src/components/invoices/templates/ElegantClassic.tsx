import React from 'react';
import { LineDiscountDisplay } from './LineDiscountDisplay';

type Item = { 
  description: string; 
  quantity: number; 
  unitPrice: number; 
  total: number; 
  unit?: string;
  lineDiscountValue?: number;
  lineDiscountType?: 'PERCENT' | 'AMOUNT';
  subtotalBeforeDiscount?: number;
  discountAmount?: number;
};
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

export const ElegantClassic: React.FC<{ 
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
}> = ({ 
  data, 
  accentColor = '#000000', 
  showHeader = true,
  logoPosition = 'left',
  logoSize = 'medium',
  fontColorHeader = '#000000',
  fontColorBody = '#111111',
  tableHeadColor = '#FAFAFA'
}) => {
  const resolveDecimals = (unit?: string) => {
    if (!unit) return data.quantityDecimals;
    const normalized = unit.toLowerCase();
    return (normalized.includes('kg') || normalized.includes('kilogram')) ? 3 : data.quantityDecimals;
  };

  const logoSizeClass = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  }[logoSize];

  const logoImgSizeClass = {
    small: 'max-h-6 max-w-[1.5rem]',
    medium: 'max-h-10 max-w-[2.5rem]',
    large: 'max-h-14 max-w-[3.5rem]'
  }[logoSize];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header Section: White background by default to match PDF */}
      <div className={`px-6 py-6 ${logoPosition === 'center' ? 'text-center' : ''}`}
        style={{ color: fontColorHeader || '#1F2937' }}>
        <div className={`flex ${logoPosition === 'right' ? 'flex-row-reverse' : logoPosition === 'center' ? 'flex-col' : 'flex-row'} justify-between items-start gap-4`}>
          
          {/* Left Side: Logo + Company Info (side by side like PDF) */}
          <div className="flex items-start gap-3">
            {data.logoUrl && (
              <div className={`${logoSizeClass} flex-shrink-0 flex items-center justify-center`}>
                <img 
                  src={data.logoUrl} 
                  alt="Logo"
                  className={`${logoImgSizeClass} object-contain`}
                />
              </div>
            )}
            
            {/* Company Info next to logo (like PDF) */}
            <div className="text-xs" style={{ color: fontColorBody || '#1e293b' }}>
              {showHeader && <div className="font-bold mb-1 text-sm">{data.companyName}</div>}
              <div className="whitespace-pre-line opacity-80 leading-tight">{data.companyAddress}</div>
            </div>
          </div>

          {/* Right Side: Invoice Title & Number */}
          <div className="text-right">
            <div className="text-2xl font-bold mb-1" style={{ color: accentColor }}>FACTURE</div>
            <div className="text-sm opacity-70">#{data.invoiceNumber}</div>
            <div className="text-xs opacity-60 mt-2">
              <div>Émise: {data.issueDate}</div>
              <div>Échéance: {data.dueDate}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6" style={{ color: fontColorBody }}>
        {/* Client Info (Destinataire) */}
        <div className="mb-6">
          <div className="text-xs font-semibold mb-1 opacity-60" style={{ color: fontColorBody || '#1e293b' }}>Destinataire:</div>
          <div className="text-sm font-medium">{data.clientName}</div>
          <div className="text-xs opacity-80 whitespace-pre-line">{data.clientAddress}</div>
        </div>

        <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead
              className=""
              style={{ backgroundColor: tableHeadColor || accentColor, color: fontColorHeader || 'white' }}
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
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-4 py-2" style={{ color: fontColorBody || '#1e293b' }}>
                    <div>{it.description}</div>
                    <LineDiscountDisplay
                      lineDiscountValue={it.lineDiscountValue}
                      lineDiscountType={it.lineDiscountType}
                      discountAmount={it.discountAmount}
                      currency={data.currency}
                    />
                  </td>
                  <td className="px-4 py-2 text-right opacity-80">{it.quantity.toFixed(resolveDecimals(it.unit))}</td>
                  <td className="px-4 py-2 text-right opacity-80">{it.unitPrice.toFixed(2)} {data.currency}</td>
                  <td className="px-4 py-2 text-right font-medium" style={{ color: fontColorBody || '#1e293b' }}>{it.total.toFixed(2)} {data.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full md:w-72 space-y-1 text-sm">
            <div className="flex justify-between opacity-80">
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
            <div className="flex justify-between text-slate-600 mb-2">
              <span>TVA</span>
              <span>{data.tax.toFixed(2)} {data.currency}</span>
            </div>
            <div className="flex justify-between items-center text-base font-bold border-t-2 pt-2"
                 style={{ 
                   borderColor: accentColor
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
