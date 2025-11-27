import { Request, Response } from 'express';
import { featureFlags } from '../features/featureFlags';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

/**
 * Controlador mejorado de facturas con soporte para feature flags
 */

export const generateInvoicePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;
    const { template: preferredTemplate } = req.query as { template?: string };

    // Verificar si el usuario tiene acceso al nuevo sistema de facturación
    const useNewSystem = req.featureFlags?.isNewInvoiceSystemEnabled || false;
    const template = req.featureFlags?.getInvoiceTemplate(preferredTemplate) || 'modern';
    const usePuppeteer = req.featureFlags?.shouldUsePuppeteer || false;

    console.log(`[InvoiceV2] Generating PDF - New System: ${useNewSystem}, Template: ${template}, Puppeteer: ${usePuppeteer}`);

    // Obtener la factura de la base de datos
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        user: true,
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Verificar que el usuario tiene permiso para ver esta factura
    if (invoice.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    let pdfBuffer: Buffer;

    if (useNewSystem) {
      // Usar el nuevo sistema de generación de PDF
      if (usePuppeteer) {
        // Generar con Puppeteer (nuevo método)
        pdfBuffer = await generateWithPuppeteer(invoice, template);
      } else {
        // Usar el método actual (PDFKit) como fallback
        pdfBuffer = await generateWithPdfKit(invoice, template);
      }
    } else {
      // Usar el sistema legado
      pdfBuffer = await generateWithLegacySystem(invoice);
    }

    // Enviar el PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);

  } catch (error: unknown) {
    console.error('[InvoiceV2] Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Error generating PDF',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

// Funciones auxiliares de ejemplo
async function generateWithPuppeteer(invoice: any, template: string): Promise<Buffer> {
  console.log(`[InvoiceV2] Generating with Puppeteer using template: ${template}`);
  // Implementación real usando Puppeteer
  // ...
  return Buffer.from('PDF generado con Puppeteer');
}

async function generateWithPdfKit(invoice: any, template: string): Promise<Buffer> {
  console.log(`[InvoiceV2] Generating with PDFKit using template: ${template}`);
  // Implementación real usando PDFKit
  // ...
  return Buffer.from('PDF generado con PDFKit');
}

async function generateWithLegacySystem(invoice: any): Promise<Buffer> {
  console.log('[InvoiceV2] Using legacy PDF generation system');
  // Implementación del sistema legado
  // ...
  return Buffer.from('PDF generado con el sistema legado');
}

// Middleware para verificar características
// Este middleware puede usarse para proteger rutas basadas en feature flags
export const requireFeature = (featurePath: string) => {
  return (req: Request, res: Response, next: Function) => {
    if (req.featureFlags?.isEnabled(featurePath)) {
      return next();
    }
    
    res.status(403).json({
      error: 'Feature not available',
      feature: featurePath,
      available: false
    });
  };
};

// Ejemplo de cómo usar el middleware con una ruta
// router.get('/invoices/:id/pdf', 
//   injectFeatureFlags, 
//   requireFeature('newInvoiceSystem.enabled'), 
//   generateInvoicePDF
// );
