import puppeteer, { Browser, Page } from 'puppeteer';
import { TemplateRenderer, TemplateData } from './TemplateRenderer';

export {};

export class PuppeteerPDFService {
  private browser: Browser | null = null;
  private renderer: TemplateRenderer;

  constructor() {
    this.renderer = new TemplateRenderer();
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }
  }

  async generatePDF(data: TemplateData): Promise<Buffer> {
    await this.initialize();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      // Renderizar HTML del template
      const html = await this.renderer.render(data);

      // Configurar página
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      // Generar PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        },
        preferCSSPageSize: true
      });

      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async generatePreviewImage(data: TemplateData): Promise<Buffer> {
    await this.initialize();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      const html = await this.renderer.render(data);

      await page.setViewport({
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123 // A4 height in pixels at 96 DPI
      });

      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true
      });

      return Buffer.from(screenshot);
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
let pdfService: PuppeteerPDFService | null = null;

export function getPuppeteerPDFService(): PuppeteerPDFService {
  if (!pdfService) {
    pdfService = new PuppeteerPDFService();
  }
  return pdfService;
}
