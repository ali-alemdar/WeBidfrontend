"use client";

import { useRef, useState } from "react";

interface SignatureCanvasProps {
  onSubmit: (signatureData: string) => void;
  isLoading?: boolean;
}

export default function SignatureCanvas({ onSubmit, isLoading = false }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");
    onSubmit(signatureData);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ border: "2px solid #ccc", borderRadius: 4, overflow: "hidden", backgroundColor: "white" }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          style={{ display: "block", cursor: "crosshair" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={clearCanvas} disabled={isLoading}>
          Clear
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Submitting..." : "Submit Signature"}
        </button>
      </div>
    </div>
  );
}
