/**
 * SignatureService
 * 
 * Handles digital signature drawing with:
 * - HTML5 Canvas-based signature pad
 * - Sign, clear, and submit buttons
 * - Signature timestamp capture
 * - Signature data export (PNG/SVG/base64)
 * - Validation for empty signatures
 */

export interface SignatureData {
  canvas: string; // Base64 encoded signature image
  timestamp: Date;
  signatureType: 'MOUSE' | 'TOUCH' | 'PEN';
  userName?: string;
  userEmail?: string;
}

export interface SignaturePadOptions {
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  penWidth?: number;
}

export class SignatureService {
  private static readonly DEFAULT_WIDTH = 600;
  private static readonly DEFAULT_HEIGHT = 200;
  private static readonly DEFAULT_PEN_COLOR = '#000000';
  private static readonly DEFAULT_BG_COLOR = '#ffffff';
  private static readonly DEFAULT_PEN_WIDTH = 2;

  /**
   * Create and initialize a signature canvas
   */
  static createCanvas(containerId: string, options: SignaturePadOptions = {}): HTMLCanvasElement {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    const canvas = document.createElement('canvas');
    const width = options.width || this.DEFAULT_WIDTH;
    const height = options.height || this.DEFAULT_HEIGHT;

    canvas.width = width;
    canvas.height = height;
    canvas.id = `${containerId}-canvas`;
    canvas.style.border = '2px solid #ccc';
    canvas.style.borderRadius = '4px';
    canvas.style.cursor = 'crosshair';
    canvas.style.backgroundColor = options.backgroundColor || this.DEFAULT_BG_COLOR;
    canvas.style.display = 'block';
    canvas.style.margin = '8px 0';

    // Fill with background color
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = options.backgroundColor || this.DEFAULT_BG_COLOR;
      ctx.fillRect(0, 0, width, height);
    }

    container.appendChild(canvas);

    // Setup event listeners
    this.setupDrawingListeners(canvas, options);

    return canvas;
  }

  /**
   * Setup mouse/touch drawing on canvas
   */
  private static setupDrawingListeners(canvas: HTMLCanvasElement, options: SignaturePadOptions): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const getCoords = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof TouchEvent) {
        const touch = e.touches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      } else {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawing = true;
      const { x, y } = getCoords(e);
      lastX = x;
      lastY = y;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;

      const { x, y } = getCoords(e);

      ctx.strokeStyle = options.penColor || this.DEFAULT_PEN_COLOR;
      ctx.lineWidth = options.penWidth || this.DEFAULT_PEN_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastX = x;
      lastY = y;

      e.preventDefault();
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
  }

  /**
   * Clear the canvas
   */
  static clearCanvas(canvasId: string, backgroundColor?: string): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = backgroundColor || this.DEFAULT_BG_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * Check if canvas has any signature drawn
   */
  static hasSignature(canvasId: string): boolean {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Check if any non-white/non-background pixels exist
    for (let i = 0; i < data.length; i += 4) {
      // If any pixel is not white (255, 255, 255), there's a signature
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
        return true;
      }
    }

    return false;
  }

  /**
   * Export signature as Base64 PNG
   */
  static exportAsBase64(canvasId: string): string {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Export signature as SVG
   */
  static exportAsSVG(canvasId: string): string {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }

    // Simple conversion: use canvas as-is and embed as image
    const base64 = this.exportAsBase64(canvasId);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <image href="${base64}" width="${canvas.width}" height="${canvas.height}"/>
    </svg>`;
  }

  /**
   * Get signature data with timestamp
   */
  static getSignatureData(canvasId: string, userName?: string, userEmail?: string): SignatureData {
    const signatureType: 'MOUSE' | 'TOUCH' | 'PEN' = 'MOUSE'; // Could detect from event type

    return {
      canvas: this.exportAsBase64(canvasId),
      timestamp: new Date(),
      signatureType,
      userName,
      userEmail,
    };
  }

  /**
   * Create a complete signature UI component
   */
  static createSignatureUI(
    containerId: string,
    options: SignaturePadOptions & { userName?: string; userEmail?: string } = {}
  ): {
    canvas: HTMLCanvasElement;
    signButton: HTMLButtonElement;
    clearButton: HTMLButtonElement;
    submitButton: HTMLButtonElement;
    timestampDisplay: HTMLElement;
  } {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    // Create canvas
    const canvas = this.createCanvas(containerId, options);

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.marginTop = '12px';
    buttonContainer.style.flexWrap = 'wrap';

    // Sign button (placeholder - logic handled by caller)
    const signButton = document.createElement('button');
    signButton.className = 'btn btn-primary';
    signButton.textContent = 'Sign';
    signButton.style.flex = '0 1 auto';

    // Clear button
    const clearButton = document.createElement('button');
    clearButton.className = 'btn';
    clearButton.textContent = 'Clear signature';
    clearButton.style.flex = '0 1 auto';
    clearButton.addEventListener('click', () => {
      this.clearCanvas(canvas.id);
      timestampDisplay.textContent = '';
    });

    // Submit button (placeholder - logic handled by caller)
    const submitButton = document.createElement('button');
    submitButton.className = 'btn btn-primary';
    submitButton.textContent = 'Submit signature';
    submitButton.style.flex = '0 1 auto';

    // Timestamp display
    const timestampDisplay = document.createElement('div');
    timestampDisplay.style.fontSize = '12px';
    timestampDisplay.style.color = '#666';
    timestampDisplay.style.marginTop = '8px';

    buttonContainer.appendChild(signButton);
    buttonContainer.appendChild(clearButton);
    buttonContainer.appendChild(submitButton);

    container.appendChild(buttonContainer);
    container.appendChild(timestampDisplay);

    return {
      canvas,
      signButton,
      clearButton,
      submitButton,
      timestampDisplay,
    };
  }

  /**
   * Display signature timestamp
   */
  static displayTimestamp(timestampElementId: string, timestamp?: Date): void {
    const element = document.getElementById(timestampElementId);
    if (!element) return;

    const date = timestamp || new Date();
    const formatted = date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    element.textContent = `Signed on: ${formatted}`;
  }

  /**
   * Validate signature data before submission
   */
  static validate(signatureData: SignatureData): { valid: boolean; error?: string } {
    if (!signatureData) {
      return { valid: false, error: 'Signature data is missing' };
    }

    if (!signatureData.canvas) {
      return { valid: false, error: 'Signature canvas data is missing' };
    }

    if (!signatureData.timestamp) {
      return { valid: false, error: 'Signature timestamp is missing' };
    }

    if (signatureData.canvas.length < 100) {
      return { valid: false, error: 'Signature appears to be empty' };
    }

    return { valid: true };
  }

  /**
   * Create preview of signature
   */
  static createPreview(signatureData: SignatureData, width: number = 200, height: number = 100): HTMLElement {
    const container = document.createElement('div');
    container.style.border = '1px solid #ccc';
    container.style.borderRadius = '4px';
    container.style.padding = '8px';

    const img = document.createElement('img');
    img.src = signatureData.canvas;
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    img.style.display = 'block';

    const timestamp = document.createElement('div');
    timestamp.style.fontSize = '12px';
    timestamp.style.color = '#666';
    timestamp.style.marginTop = '4px';
    timestamp.textContent = `Signed: ${new Date(signatureData.timestamp).toLocaleString()}`;

    if (signatureData.userName) {
      const name = document.createElement('div');
      name.style.fontSize = '12px';
      name.style.fontWeight = 'bold';
      name.textContent = signatureData.userName;
      container.appendChild(name);
    }

    container.appendChild(img);
    container.appendChild(timestamp);

    return container;
  }
}
