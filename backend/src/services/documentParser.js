import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import markdownIt from 'markdown-it';

const md = markdownIt();

/**
 * Parse PDF file and extract text content
 * Note: Simplified version - for production use pdfjs-dist or similar
 */
export const parsePDF = async (filePath) => {
  try {
    // For now, return a placeholder
    // In production, integrate a proper PDF parser like pdfjs-dist
    return {
      text: '[PDF content would be extracted here with proper PDF parser]',
      metadata: {
        pages: 0,
        note: 'PDF parsing requires additional setup'
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};

/**
 * Parse Word document (.docx) and extract text content
 */
export const parseWord = async (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: fileBuffer });

    return {
      text: result.value || '',
      metadata: {
        warnings: result.messages.map((m) => m.message),
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse Word document: ${error.message}`);
  }
};

/**
 * Parse Excel file (.xlsx) and extract text content
 */
export const parseExcel = async (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheets = workbook.SheetNames;
    let text = '';

    sheets.forEach((sheetName) => {
      text += `\n=== Sheet: ${sheetName} ===\n`;
      const worksheet = workbook.Sheets[sheetName];
      const csvData = xlsx.utils.sheet_to_csv(worksheet);
      text += csvData;
    });

    return {
      text: text.trim(),
      metadata: {
        sheets: sheets,
        sheetCount: sheets.length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Parse plain text file
 */
export const parseText = async (filePath) => {
  try {
    const text = fs.readFileSync(filePath, 'utf-8');

    return {
      text: text || '',
      metadata: {
        encoding: 'utf-8',
        size: text.length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse text file: ${error.message}`);
  }
};

/**
 * Parse Markdown file
 */
export const parseMarkdown = async (filePath) => {
  try {
    const text = fs.readFileSync(filePath, 'utf-8');

    // Also convert to HTML for reference
    const html = md.render(text);

    return {
      text: text || '',
      metadata: {
        format: 'markdown',
        htmlLength: html.length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse Markdown file: ${error.message}`);
  }
};

/**
 * Main parser function - determines file type and calls appropriate parser
 */
export const parseDocument = async (filePath, documentType) => {
  const fileExt = path.extname(filePath).toLowerCase();

  try {
    let result;

    switch (documentType.toUpperCase()) {
      case 'PDF':
        result = await parsePDF(filePath);
        break;

      case 'WORD':
        result = await parseWord(filePath);
        break;

      case 'EXCEL':
        result = await parseExcel(filePath);
        break;

      case 'TXT':
        result = await parseText(filePath);
        break;

      case 'MARKDOWN':
        result = await parseMarkdown(filePath);
        break;

      default:
        // Auto-detect based on file extension
        if (['.pdf'].includes(fileExt)) {
          result = await parsePDF(filePath);
        } else if (['.docx', '.doc'].includes(fileExt)) {
          result = await parseWord(filePath);
        } else if (['.xlsx', '.xls'].includes(fileExt)) {
          result = await parseExcel(filePath);
        } else if (['.md'].includes(fileExt)) {
          result = await parseMarkdown(filePath);
        } else if (['.txt'].includes(fileExt)) {
          result = await parseText(filePath);
        } else {
          throw new Error(`Unsupported file type: ${documentType}`);
        }
    }

    return {
      success: true,
      content: result.text,
      metadata: result.metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      content: '',
      metadata: {},
    };
  }
};

/**
 * Determine document type from file extension
 */
export const getDocumentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();

  const typeMap = {
    '.pdf': 'PDF',
    '.docx': 'WORD',
    '.doc': 'WORD',
    '.xlsx': 'EXCEL',
    '.xls': 'EXCEL',
    '.txt': 'TXT',
    '.md': 'MARKDOWN',
  };

  return typeMap[ext] || 'TXT';
};
