import React from 'react';
import type { InvoicePreviewData } from './ElegantClassic';
import { LineDiscountDisplay } from './LineDiscountDisplay';

export const FormalPro: React.FC<{ 
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
  accentColor = '#2563EB', 
  showHeader = true,
  logoSize = 'medium',
  fontColorHeader = '#1E3A8A',
  fontColorBody = '#334155',
  tableHeadColor = '#EFF6FF',
  headerBgColor = '#EFF6FF',
  altRowColor = '#F8FAFC'
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
    <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
      {/* Header: Modern Blue with light blue background */}
      <div className={`px-6 py-6 border-b border-slate-300`}
        style={{ backgroundColor: headerBgColor, color: fontColorHeader }}>
        
        <div className="flex justify-between items-start gap-4">
          
          {/* Left Side: Company Info (full details like PDF) */}
          <div className="text-xs" style={{ color: fontColorBody }}>
            {showHeader && <div className="font-bold mb-1 text-sm" style={{ color: accentColor }}>{data.companyName}</div>}
            <div className="whitespace-pre-line opacity-80 leading-tight">{data.companyAddress}</div>
          </div>

          {/* Right Side: Logo + Invoice Title */}
          <div className="text-right flex flex-col items-end gap-2">
            {data.logoUrl && (
              <div className={`${logoSizeClass} flex items-center justify-center`}>
                <img 
                  src={data.logoUrl}
                  alt="Logo"
                  className={`${logoImgSizeClass} object-contain`}
                />
              </div>
            )}
            <div>
              <div className="font-bold text-2xl mb-1" style={{ color: accentColor }}>FACTURE</div>
              <div className="text-sm opacity-70">#{data.invoiceNumber}</div>
              <div className="text-xs opacity-60 mt-1">
                <div>Émise: {data.issueDate}</div>
                <div>Échéance: {data.dueDate}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6" style={{ color: fontColorBody }}>
        {/* Client Info (Destinataire) - Below header like PDF */}
        <div className="mb-6">
          <div className="uppercase text-xs tracking-wide text-slate-500 mb-1">Destinataire:</div>
          <div className="text-sm font-medium">{data.clientName}</div>
          <div className="text-xs opacity-80 whitespace-pre-line">{data.clientAddress}</div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="" style={{ backgroundColor: tableHeadColor }}>
              <tr style={{ color: fontColorHeader }}>
                <th className="text-left px-4 py-2 font-medium">Description</th>
                <th className="text-right px-4 py-2 font-medium">Qté</th>
                <th className="text-right px-4 py-2 font-medium">PU</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={i} className="border-t border-slate-100" 
                    style={{ backgroundColor: i % 2 !== 0 ? altRowColor : 'transparent' }}>
                  <td className="px-4 py-2" style={{ color: fontColorBody }}>
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
                  <td className="px-4 py-2 text-right font-medium" style={{ color: fontColorBody }}>{it.total.toFixed(2)} {data.currency}</td>
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
            <div className="flex justify-between py-1 mb-2">
              <span className="text-slate-600">TVA</span>
              <span className="text-slate-800">{data.tax.toFixed(2)} {data.currency}</span>
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
