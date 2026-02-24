/**
 * PrintService
 * 
 * Handles page printing with:
 * - A4 page size (portrait/landscape)
 * - Company logo and header on each page
 * - Page numbering (page x of y) for multi-page documents
 * - Hides navbars and browser UI
 */

export interface PrintOptions {
  title: string;
  orientation?: 'portrait' | 'landscape'; // default: portrait
  showPageNumbers?: boolean; // default: true
  companyLogo?: string; // URL to company logo
  companyName?: string;
  companyInfo?: string; // Contact/address info
}

export class PrintService {
  /**
   * Prepare page for printing by hiding UI elements
   */
  static prepareForPrint(): void {
    // Hide all navbars and sidebars
    const sidebars = document.querySelectorAll('aside, [class*="sidebar"], [class*="nav"]');
    sidebars.forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });

    // Hide team notes panel if present
    const notesPanel = document.querySelector('[class*="notes"]');
    if (notesPanel) {
      (notesPanel as HTMLElement).style.display = 'none';
    }
  }

  /**
   * Restore page to normal view after printing
   */
  static restoreAfterPrint(): void {
    const sidebars = document.querySelectorAll('aside, [class*="sidebar"], [class*="nav"]');
    sidebars.forEach((el) => {
      (el as HTMLElement).style.display = '';
    });

    const notesPanel = document.querySelector('[class*="notes"]');
    if (notesPanel) {
      (notesPanel as HTMLElement).style.display = '';
    }
  }

  /**
   * Apply print-specific styles to content
   */
  static applyPrintStyles(options: PrintOptions): HTMLStyleElement {
    const style = document.createElement('style');
    const orientation = options.orientation || 'portrait';
    const pageWidth = orientation === 'landscape' ? '297mm' : '210mm';
    const pageHeight = orientation === 'landscape' ? '210mm' : '297mm';

    style.innerHTML = `
      @media print {
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background: white;
          color: black;
        }

        /* Page setup */
        @page {
          size: ${pageWidth} ${pageHeight};
          margin: 15mm 10mm 15mm 10mm;
        }

        /* Hide non-print elements */
        aside, nav, [class*="sidebar"], [class*="SecondaryNav"], 
        [class*="Sidebar"], [class*="TeamNotes"], .no-print {
          display: none !important;
        }

        /* Main content full width */
        main, [role="main"] {
          width: 100%;
          max-width: 100%;
          padding: 0 !important;
          margin: 0 !important;
        }

        /* Print container */
        .print-container {
          page-break-after: always;
          margin-bottom: 20mm;
        }

        .print-container:last-child {
          page-break-after: avoid;
        }

        /* Page header */
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10mm;
          padding-bottom: 5mm;
          border-bottom: 1px solid #000;
          page-break-inside: avoid;
        }

        .print-header-logo {
          max-width: 30mm;
          max-height: 15mm;
        }

        .print-header-info {
          text-align: right;
          font-size: 9pt;
          line-height: 1.3;
        }

        .print-header-title {
          font-weight: bold;
          font-size: 10pt;
          margin-bottom: 2mm;
        }

        /* Page numbers */
        .print-page-number {
          text-align: center;
          font-size: 9pt;
          margin-top: 5mm;
          page-break-inside: avoid;
        }

        /* Tables for printing */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5mm;
        }

        th, td {
          border: 1px solid #ccc;
          padding: 3mm;
          font-size: 9pt;
          text-align: left;
        }

        th {
          background-color: #f3f4f6;
          font-weight: bold;
        }

        tr {
          page-break-inside: avoid;
        }

        /* Text formatting */
        p, div {
          margin: 2mm 0;
          page-break-inside: avoid;
        }

        h1 {
          font-size: 14pt;
          margin-bottom: 5mm;
          page-break-after: avoid;
        }

        h2 {
          font-size: 12pt;
          margin-top: 5mm;
          margin-bottom: 3mm;
          page-break-after: avoid;
        }

        h3, h4 {
          font-size: 10pt;
          margin-top: 3mm;
          margin-bottom: 2mm;
          page-break-after: avoid;
        }

        /* Colors and background */
        .pill, [class*="badge"] {
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          padding: 1mm 2mm;
          border-radius: 2mm;
          font-size: 8pt;
        }

        /* Links */
        a {
          color: #000;
          text-decoration: none;
        }

        /* Landscape orientation */
        ${orientation === 'landscape' ? `
          @page {
            size: landscape;
          }
        ` : ''}
      }

      @media screen {
        .print-container, .print-header, .print-page-number {
          display: none;
        }
      }
    `;

    document.head.appendChild(style);
    return style;
  }

  /**
   * Generate print header with logo and company info
   */
  static generatePrintHeader(options: PrintOptions): HTMLElement {
    const header = document.createElement('div');
    header.className = 'print-header';

    if (options.companyLogo) {
      const logo = document.createElement('img');
      logo.src = options.companyLogo;
      logo.className = 'print-header-logo';
      header.appendChild(logo);
    }

    const info = document.createElement('div');
    info.className = 'print-header-info';

    const title = document.createElement('div');
    title.className = 'print-header-title';
    title.textContent = options.companyName || 'Company';
    info.appendChild(title);

    if (options.companyInfo) {
      const detail = document.createElement('div');
      detail.textContent = options.companyInfo;
      info.appendChild(detail);
    }

    header.appendChild(info);
    return header;
  }

  /**
   * Generate page number footer (page x of y)
   */
  static generatePageNumbers(currentPage: number, totalPages: number): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'print-page-number';
    footer.textContent = `Page ${currentPage} of ${totalPages}`;
    return footer;
  }

  /**
   * Main print trigger: prepares, prints, and restores
   */
  static print(options: PrintOptions): void {
    this.prepareForPrint();
    const styleElement = this.applyPrintStyles(options);

    // Trigger print dialog after a brief delay to ensure styles are applied
    setTimeout(() => {
      window.print();

      // Restore after print dialog closes
      window.addEventListener('afterprint', () => {
        this.restoreAfterPrint();
        styleElement.remove();
      }, { once: true });
    }, 100);
  }

  /**
   * Wrap content in printable containers with headers and page numbers
   */
  static wrapContentForPrint(
    content: HTMLElement,
    options: PrintOptions & { totalPages?: number; currentPage?: number }
  ): DocumentFragment {
    const fragment = document.createDocumentFragment();

    const container = document.createElement('div');
    container.className = 'print-container';

    // Add header
    const header = this.generatePrintHeader(options);
    container.appendChild(header);

    // Add content
    container.appendChild(content.cloneNode(true));

    // Add page numbers if multi-page
    if (options.showPageNumbers !== false && options.totalPages && options.totalPages > 1) {
      const pageNum = this.generatePageNumbers(
        options.currentPage || 1,
        options.totalPages
      );
      container.appendChild(pageNum);
    }

    fragment.appendChild(container);
    return fragment;
  }
}
