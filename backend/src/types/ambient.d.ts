declare module 'svg-to-pdfkit' {
  import { PDFDocument } from 'pdfkit';
  function SVGtoPDF(doc: PDFDocument, svg: string, x: number, y: number, options?: any): any;
  export = SVGtoPDF;
}

declare module 'swissqrbill/svg' {
  export interface SwissQRBillInput {
    currency: 'CHF' | 'EUR';
    amount: number;
    account: string; // IBAN
    creditor: {
      name: string;
      address: string;
      zip: string;
      city: string;
      country: string;
    };
    debtor?: {
      name: string;
      address: string;
      zip: string;
      city: string;
      country: string;
    };
    reference?: string;
    message?: string;
    language?: 'de' | 'fr' | 'it' | 'en';
  }

  export class SwissQRBill {
    constructor(input: SwissQRBillInput);
    toString(): string;
  }
}
