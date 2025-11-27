import Tesseract from 'tesseract.js';

// PDF support temporarily disabled due to compatibility issues
// Will be re-enabled once pdfjs-dist configuration is fixed

export interface OcrResult {
  text: string;
  confidence: number;
}

/**
 * Extract text from image using Tesseract OCR
 */
export async function extractTextFromImage(buffer: Buffer): Promise<OcrResult> {
  try {
    console.log('[OCR] Starting image text extraction...');
    
    const result = await Tesseract.recognize(buffer, 'fra+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    console.log('[OCR] Text extraction completed');
    
    return {
      text: result.data.text,
      confidence: result.data.confidence / 100, // Convert 0-100 to 0-1
    };
  } catch (error: any) {
    console.error('[OCR] Error extracting text from image:', error);
    throw new Error(`OCR failed: ${error.message}`);
  }
}

/**
 * Extract text from PDF - TEMPORARILY DISABLED
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<OcrResult> {
  throw new Error('PDF support is temporarily disabled. Please use an image (JPG, PNG, WEBP) instead.');
}

/**
 * Main OCR function - detects file type and extracts text
 */
export async function extractTextFromReceipt(
  buffer: Buffer,
  mimetype: string
): Promise<OcrResult> {
  console.log(`[OCR] Processing file type: ${mimetype}`);

  // Temporalmente: solo imágenes (PDFs tienen problemas de compatibilidad)
  if (mimetype === 'application/pdf') {
    throw new Error('PDF support is temporarily disabled. Please upload an image (JPG, PNG, WEBP) instead.');
  }

  // For images (png, jpg, webp, etc.)
  if (mimetype.startsWith('image/')) {
    return extractTextFromImage(buffer);
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
}
