"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import SignatureCanvas from "../../../../components/SignatureCanvas";
import { apiGet, apiPost } from "../../../../lib/api";

interface Props {
  params: { tender_id: string };
}

export default function GMApprovalPage({ params }: Props) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [acting, setActing] = useState<string>("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [returnReason, setReturnReason] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [boqForm, setBoqForm] = useState<any>(null);
  const [boqLoading, setBoqLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"letter" | "boq" | "tender-info">("letter");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [signatureDrawn, setSignatureDrawn] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const t = await apiGet(`/tenders/${params.tender_id}`);
      const pubData = await apiGet(`/tenders/${params.tender_id}/publishing-data?t=${Date.now()}`).catch(() => null);
      setData({ ...t, publishingData: pubData });
      
      // Load BOQ form if requisition exists
      if (t?.requisitionId) {
        setBoqLoading(true);
        try {
          const boq = await apiGet(`/requisitions/${t.requisitionId}/boq-form`).catch(() => null);
          setBoqForm(boq);
        } finally {
          setBoqLoading(false);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load tender");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params.tender_id]);

  useEffect(() => {
    if (data?.gmSignature?.signatureData) {
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setSignatureDrawn(true);
        };
        img.src = data.gmSignature.signatureData;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data]);

  const action = async (name: string, path: string, body: any = {}) => {
    setError("");
    setActing(name);
    try {
      const result = await apiPost(path, body);
      // Verify the action completed before redirecting
      if (result) {
        // Give server a moment to process
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push("/gm-approvals");
      }
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActing("");
    }
  };

  const handleSignatureSubmit = async (signatureData: string) => {
    await action("approve", `/tenders/${params.tender_id}/gm-approve-and-sign`, {
      signatureData,
      signatureType: "MOUSE",
    });
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);
    setLastPos({ x, y });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setLastPos({ x, y });
    setSignatureDrawn(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureDrawn(false);
    
    // Delete signature from database
    try {
      await apiPost(`/tenders/${params.tender_id}/gm-clear-signature`, {});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to clear signature");
    }
  };

  const submitSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");
    setError("");
    setActing("sign");
    try {
      await apiPost(`/tenders/${params.tender_id}/gm-sign`, {
        signatureData,
        signatureType: "MOUSE",
      });
      setError("");
      // Reload data to enable Approve button
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save signature");
    } finally {
      setActing("");
    }
  };

  const approveWithoutSignature = async () => {
    // Capture bid letter HTML for PDF generation
    const bidLetterDiv = document.querySelector('[data-bid-letter-content]');
    let bidLetterHtml = null;
    if (bidLetterDiv) {
      bidLetterHtml = bidLetterDiv.innerHTML;
    }

    await action("approve", `/tenders/${params.tender_id}/gm-approve-and-sign`, {
      signatureData: null,
      signatureType: "MOUSE",
      bidLetterHtml,
    });
  };

  if (loading) return <InternalPage title="GM / Review Tender"><p>Loading…</p></InternalPage>;
  if (!data) return <InternalPage title="GM / Review Tender"><p>Tender not found.</p></InternalPage>;

  const tenderDisplay = data.tender_id ? `TEN-${String(data.tender_id).padStart(5, "0")}` : params.tender_id;
  const section0 = data.publishingData?.section0Data || {};
  const metadata = section0.tender_metadata || {};
  const contact = section0.clarification_contact || {};
  const buyer = section0.buyer_information || {};

  return (
    <RequireRoles anyOf={["GENERAL_MANAGER", "SYS_ADMIN"]} title={`GM / Review ${tenderDisplay}`}>
      <InternalPage title={`GM / Review ${tenderDisplay}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {data?.status && <span className="pill">Status: {data.status}</span>}
            {data?.tender_id && <span className="pill">ID: TEN-{String(data.tender_id).padStart(5, "0")}</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link className="btn" href="/gm-approvals">Back</Link>
            <button className="btn" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "2px solid #ddd", flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setActiveTab("letter")} style={{ padding: "8px 16px", border: "none", background: activeTab === "letter" ? "var(--primary)" : "transparent", color: activeTab === "letter" ? "white" : "inherit", cursor: "pointer", fontWeight: activeTab === "letter" ? "bold" : "normal", borderBottom: activeTab === "letter" ? "2px solid var(--primary)" : "none", whiteSpace: "nowrap" }}>Bid Letter</button>
          <button onClick={() => setActiveTab("boq")} style={{ padding: "8px 16px", border: "none", background: activeTab === "boq" ? "var(--primary)" : "transparent", color: activeTab === "boq" ? "white" : "inherit", cursor: "pointer", fontWeight: activeTab === "boq" ? "bold" : "normal", borderBottom: activeTab === "boq" ? "2px solid var(--primary)" : "none", whiteSpace: "nowrap" }}>BoQ</button>
          <button onClick={() => setActiveTab("tender-info")} style={{ padding: "8px 16px", border: "none", background: activeTab === "tender-info" ? "var(--primary)" : "transparent", color: activeTab === "tender-info" ? "white" : "inherit", cursor: "pointer", fontWeight: activeTab === "tender-info" ? "bold" : "normal", borderBottom: activeTab === "tender-info" ? "2px solid var(--primary)" : "none", whiteSpace: "nowrap" }}>Tender Information</button>
          {activeTab === "letter" && (
            <button className="btn" style={{ marginLeft: "auto", fontSize: 12, padding: "4px 8px" }} onClick={() => {
              const bidLetterDiv = document.querySelector('[data-bid-letter-content]');
              if (bidLetterDiv) window.print();
            }}>
              📥 Download PDF
            </button>
          )}
        </div>

        {/* Bid Letter Tab */}
        {activeTab === "letter" && (
          <>
            {data && data.publishingData?.section0Data ? (
              <div data-bid-letter-content style={{ maxWidth: "900px", margin: "0 auto", fontFamily: "'Times New Roman', serif" }}>
                {/* Page 1 */}
                <div style={{ pageBreakAfter: "always", paddingBottom: 40, marginBottom: 40, borderBottom: "1px solid #ccc" }}>
                  {/* Page 1 Content */}
                  <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <h1 style={{ margin: "0 0 24px 0", fontSize: 24, fontWeight: 700 }}>Bid Documents</h1>
                    <p style={{ margin: "0 0 16px 0", fontSize: 14 }}>Issued on: {data.publishingData?.section0Data?.tender_metadata?.letter_date ? new Date(data.publishingData.section0Data.tender_metadata.letter_date).toLocaleDateString() : ""}</p>
                  </div>

                  <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <h2 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>To supply the commodities</h2>
                    <p style={{ margin: "0 0 24px 0", fontSize: 14, fontWeight: 600 }}>{data.publishingData?.section0Data?.tender_metadata?.tender_title || ""}</p>
                    <div style={{ borderBottom: "1px solid #000", margin: "0 0 24px 0" }}></div>
                    <div style={{ borderBottom: "1px solid #000", margin: "24px 0" }}></div>
                  </div>

                  <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                    <p><strong>General Competitive Bids:</strong> {data.publishingData?.section0Data?.tender_metadata?.publication_tender_number || ""}</p>
                    <p><strong>The Project:</strong> {data.publishingData?.section0Data?.tender_metadata?.tender_title || ""}</p>
                    <p><strong>Contracting Party:</strong> {data.publishingData?.section0Data?.buyer_information?.buyer_name || ""}</p>
                    <p><strong>Buyer:</strong> {data.publishingData?.section0Data?.buyer_information?.buyer_name || ""}</p>
                  </div>
                </div>

                {/* Page 2 */}
                <div style={{ paddingTop: 40 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 32 }}>
                    <p><strong>No.:</strong> {data.publishingData?.section0Data?.tender_metadata?.letter_number || ""}</p>
                    <p><strong>Date:</strong> {data.publishingData?.section0Data?.tender_metadata?.letter_date ? new Date(data.publishingData.section0Data.tender_metadata.letter_date).toLocaleDateString() : ""}</p>
                  </div>

                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>To / Gentlemen</p>
                    <p style={{ margin: "0", fontSize: 14, fontWeight: 700 }}>Sub. / {data.publishingData?.section0Data?.tender_metadata?.tender_title || ""} Tender Number {data.publishingData?.section0Data?.tender_metadata?.tender_number || ""}</p>
                  </div>

                  <div style={{ fontSize: 13, lineHeight: 2, marginBottom: 24, textAlign: "justify" }}>
                    <p>{data.publishingData?.section0Data?.tender_metadata?.company || ""} is pleased to invite qualified and experienced bidders to submit their bids to supply {data.publishingData?.section0Data?.tender_metadata?.tender_title || ""}, and note the following:</p>

                    <ol style={{ marginTop: 16, paddingLeft: 20 }}>
                      <li style={{ marginBottom: 16 }}>
                        The qualified bidders who want to obtain additional information shall call {data.publishingData?.section0Data?.tender_metadata?.company || ""} during working hours as shown in the instructions to bidders.
                      </li>
                      <li style={{ marginBottom: 16 }}>
                        The requisite qualification requirements: (Insert list of the requisite qualification requirements).
                      </li>
                      <li style={{ marginBottom: 16 }}>
                        Interested bidders can buy bid documents, after submitting written request to the address specified in the bid data sheet, and after paying the selling value of documents amounts to IQD {data.publishingData?.section0Data?.tender_metadata?.tender_doc_price ? `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(data.publishingData.section0Data.tender_metadata.tender_doc_price)}` : ""}.
                      </li>
                      <li>
                        {(() => {
                          const timeStr = data.publishingData?.section0Data?.tender_metadata?.submission_deadline_time || "";
                          let time12h = timeStr;
                          if (timeStr && timeStr.includes(':')) {
                            const [h, m] = timeStr.split(':').map(Number);
                            const suffix = h >= 12 ? 'PM' : 'AM';
                            const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                            time12h = `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
                          }
                          return <>The bids are delivered to the following address {data.publishingData?.section0Data?.tender_metadata?.company_address || ""} at the specified date {data.publishingData?.section0Data?.tender_metadata?.submission_deadline_date ? new Date(data.publishingData.section0Data.tender_metadata.submission_deadline_date).toLocaleDateString() : ""}. Late bids will be rejected, and the bids will be opened by the attendance of the bidders or their representatives. Attendance shall be at the following address {data.publishingData?.section0Data?.tender_metadata?.company_address || ""} at the time and date {data.publishingData?.section0Data?.tender_metadata?.submission_deadline_date ? new Date(data.publishingData.section0Data.tender_metadata.submission_deadline_date).toLocaleDateString() : ""} {time12h}.</>
                        })()}
                      </li>
                    </ol>
                  </div>

                  {/* Signature Section */}
                  <div style={{ marginTop: 48 }}>
                    <canvas
                      ref={canvasRef}
                      width={210}
                      height={75}
                      style={{
                        border: "2px solid #2563eb",
                        borderRadius: 4,
                        backgroundColor: "#fff",
                        display: "block",
                        marginBottom: 8,
                        cursor: "crosshair",
                      }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <button
                        className="btn"
                        onClick={clearCanvas}
                        disabled={acting !== ""}
                        style={{ fontSize: 12, padding: "4px 8px" }}
                      >
                        Clear
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={submitSignature}
                        disabled={!signatureDrawn || acting !== ""}
                        style={{ fontSize: 12, padding: "4px 8px" }}
                      >
                        {acting === "sign" ? "Saving..." : "Sign"}
                      </button>
                    </div>
                    <p style={{ margin: "0 0 4px 0", fontSize: 13, fontWeight: 600 }}>General Manager</p>
                    <p style={{ margin: "0", fontSize: 12, color: "#666" }}>Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 24 }}>
                <p>Bid letter data not available</p>
              </div>
            )}
          </>
        )}

        {/* BoQ Tab */}
        {activeTab === "boq" && (
          <>
            {boqLoading ? (
              <div style={{ padding: 24 }}>
                <p>Loading BoQ form...</p>
              </div>
            ) : boqForm ? (
              <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
                {/* Company Header */}
                {boqForm.tenant && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #000" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      {boqForm.tenant?.logoUrl && (
                        <img src={boqForm.tenant.logoUrl} alt="Logo" style={{ maxHeight: 60, maxWidth: 120 }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{boqForm.tenant?.legalName || "Company"}</div>
                        {boqForm.tenant?.phone && <div style={{ fontSize: 12 }}>{boqForm.tenant.phone}</div>}
                        {boqForm.tenant?.address && <div style={{ fontSize: 12, whiteSpace: "pre-line" }}>{boqForm.tenant.address}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 12 }}>
                      <div><strong>Date:</strong> {boqForm.requisition?.createdAt ? new Date(boqForm.requisition.createdAt).toLocaleDateString() : ""}</div>
                      <div><strong>Reference No.:</strong> REQ-{boqForm.requisition?.id}</div>
                    </div>
                  </div>
                )}

                {/* Requisition Details */}
                {boqForm.requisition && (
                  <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Requisition: {boqForm.requisition.title}</div>
                    {boqForm.requisition?.description && (
                      <div style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-line" }}>{boqForm.requisition.description}</div>
                    )}
                  </div>
                )}

                {/* Bill of Quantities Title */}
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Bill of Quantities</h2>
                </div>

                {/* Page Info */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                  <div>
                    <strong>Competitive Bid No.:</strong> {boqForm.requisition?.id}
                  </div>
                  <div>
                    <strong>Page No.:</strong> 1 of {boqForm.materials && boqForm.services ? 2 : 1}
                  </div>
                </div>

                {/* Materials Section */}
                {boqForm.materials && (
                  <div style={{ marginBottom: 32 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                      <thead>
                        <tr style={{ backgroundColor: "#e5e7eb" }}>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 50 }}>1</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>2</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 80 }}>3</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 80 }}>4</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 80 }}>5</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 120 }}>6</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 120 }}>7</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 100 }}>8</th>
                        </tr>
                        <tr style={{ backgroundColor: "#e5e7eb" }}>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Item No.</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Commodities Description</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Date of Delivery</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>UOM</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Quantities</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Unit Price DDP</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Total Price</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Country of Origin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boqForm.materials.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ border: "1px solid #000", padding: "8px 12px" }}>{item.itemNo}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px" }}>{item.description}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px" }}></td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px" }}>{item.uom}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right" }}>{item.quantity.toLocaleString()}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right" }}>{(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {boqForm.currency}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right" }}>{(item.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {boqForm.currency}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px" }}></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ backgroundColor: "#f0f9ff", fontWeight: 700 }}>
                          <td colSpan={6} style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right" }}>Total Price: Commodities</td>
                          <td style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right" }}>{(boqForm.materials.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {boqForm.currency}</td>
                          <td style={{ border: "1px solid #000", padding: "8px 12px" }}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Services Section */}
                {boqForm.services && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Schedule of Quantities and Completion – Services related to the Contract</h2>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                      <div>
                        <strong>National Competitive Bid No.:</strong> {boqForm.requisition?.id}
                      </div>
                      <div>
                        <strong>Page No.:</strong> {boqForm.materials ? 2 : 1} of {boqForm.materials && boqForm.services ? 2 : 1}
                      </div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                      <thead>
                        <tr style={{ backgroundColor: "#e5e7eb" }}>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 50 }}>1</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>2</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 80 }}>3</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 80 }}>4</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 80 }}>5</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 120 }}>6</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 120 }}>7</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700, width: 100 }}>8</th>
                        </tr>
                        <tr style={{ backgroundColor: "#e5e7eb" }}>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Item No.</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Services Description</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Date of Delivery</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>UOM</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Quantities</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Unit Price DDP</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Total Price</th>
                          <th style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "left", backgroundColor: "#f3f4f6", fontWeight: 700 }}>Country of Origin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boqForm.services.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ border: "1px solid #000", padding: "8px 12px" }}>{item.itemNo}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px" }}>{item.description}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px" }}></td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px" }}>{item.uom}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right" }}>{item.quantity.toLocaleString()}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right" }}>{(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {boqForm.currency}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right" }}>{(item.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {boqForm.currency}</td>
                            <td style={{ border: "1px solid #000", padding: "8px 12px" }}></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ backgroundColor: "#f0f9ff", fontWeight: 700 }}>
                          <td colSpan={6} style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right" }}>Total Price: Associated Services</td>
                          <td style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right" }}>{(boqForm.services.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {boqForm.currency}</td>
                          <td style={{ border: "1px solid #000", padding: "8px 12px" }}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Signatures Section */}
                {boqForm.boqSignatures && (
                  <div style={{ marginTop: 32 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12, borderBottom: "1px solid #000", paddingBottom: 4 }}>Signatures</div>
                    
                    {/* Officers Signatures */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
                      {boqForm.boqSignatures.filter((s: any) => s.role === "OFFICER").map((sig: any, i: number) => (
                        <div key={i}>
                          <div style={{ fontSize: 11, color: "#374151", marginBottom: 4 }}>{sig.fullName}</div>
                          {sig.signatureData ? (
                            <div>
                              <img src={sig.signatureData} alt="Signature" style={{ border: "1px solid #d1d5db", borderRadius: 4, maxWidth: 210, maxHeight: 75 }} />
                              <div style={{ fontSize: 10, color: "#059669", marginTop: 4 }}>
                                Signed: {new Date(sig.signedAt).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <canvas width={210} height={75} style={{ border: "1px solid #d1d5db", borderRadius: 4, backgroundColor: "#fff" }} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Manager Signature */}
                    {boqForm.boqSignatures.filter((s: any) => s.role === "MANAGER").map((sig: any, i: number) => (
                      <div key={i}>
                        <div style={{ fontSize: 11, color: "#374151", marginBottom: 4 }}>{sig.fullName}</div>
                        {sig.signatureData ? (
                          <div>
                            <img src={sig.signatureData} alt="Signature" style={{ border: "1px solid #d1d5db", borderRadius: 4, maxWidth: 210, maxHeight: 75 }} />
                            <div style={{ fontSize: 10, color: "#059669", marginTop: 4 }}>
                              Signed: {new Date(sig.signedAt).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <canvas width={210} height={75} style={{ border: "1px solid #d1d5db", borderRadius: 4, backgroundColor: "#fff" }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: 24 }}>
                <p>No BoQ form available</p>
              </div>
            )}
          </>
        )}

        {/* Tender Information Tab */}
        {activeTab === "tender-info" && (
          <>
            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>Tender Metadata</h3>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Publication Tender Number</div>
                  <div style={{ fontWeight: 600 }}>{metadata.publication_tender_number || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Tender Title</div>
                  <div style={{ fontWeight: 600 }}>{metadata.tender_title || "—"}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Tender Description</div>
                  <div style={{ backgroundColor: "#f9f9f9", padding: 8, borderRadius: 4, marginTop: 4, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {metadata.tender_description || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Submission Deadline Date</div>
                  <div style={{ fontWeight: 600 }}>{metadata.submission_deadline_date || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Submission Deadline Time</div>
                  <div style={{ fontWeight: 600 }}>{metadata.submission_deadline_time || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Opening Date</div>
                  <div style={{ fontWeight: 600 }}>{metadata.opening_date || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Letter Number</div>
                  <div style={{ fontWeight: 600 }}>{metadata.letter_number || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Letter Date</div>
                  <div style={{ fontWeight: 600 }}>{metadata.letter_date || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Tender Document Price (IQD)</div>
                  <div style={{ fontWeight: 600 }}>{metadata.tender_doc_price ? `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(metadata.tender_doc_price)}` : "—"}</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>Clarification Contact</h3>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Contact Name</div>
                  <div style={{ fontWeight: 600 }}>{contact.clarification_contact_name || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Email</div>
                  <div style={{ fontWeight: 600 }}>{contact.clarification_email || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Address</div>
                  <div style={{ fontWeight: 600 }}>{contact.clarification_address || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Phone</div>
                  <div style={{ fontWeight: 600 }}>{contact.clarification_phone || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>City</div>
                  <div style={{ fontWeight: 600 }}>{contact.clarification_city || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Postal Code</div>
                  <div style={{ fontWeight: 600 }}>{contact.clarification_postal_code || "—"}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Fax</div>
                  <div style={{ fontWeight: 600 }}>{contact.clarification_fax || "—"}</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>Buyer Information</h3>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Buyer Name</div>
                  <div style={{ fontWeight: 600 }}>{buyer.buyer_name || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Email</div>
                  <div style={{ fontWeight: 600 }}>{buyer.buyer_email || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Address</div>
                  <div style={{ fontWeight: 600 }}>{buyer.buyer_address || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Phone</div>
                  <div style={{ fontWeight: 600 }}>{buyer.buyer_phone || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>City</div>
                  <div style={{ fontWeight: 600 }}>{buyer.buyer_city || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Postal Code</div>
                  <div style={{ fontWeight: 600 }}>{buyer.buyer_postal_code || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Country</div>
                  <div style={{ fontWeight: 600 }}>{buyer.buyer_country || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Fax</div>
                  <div style={{ fontWeight: 600 }}>{buyer.buyer_fax || "—"}</div>
                </div>
              </div>
            </div>
          </>
        )}


        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button
            className="btn btn-primary"
            onClick={approveWithoutSignature}
            disabled={acting !== "" || !data?.gmSignature?.signatureData || data?.status === "TENDER_READY_FOR_PUBLISHING"}
          >
            {acting === "approve" ? "Approving..." : "✓ Approve"}
          </button>
          <button
            className="btn"
            onClick={() => setShowReturnModal(true)}
            disabled={acting !== "" || data?.status === "TENDER_READY_FOR_PUBLISHING"}
          >
            ↩️ Return to Officers
          </button>
          <button
            className="btn"
            onClick={() => setShowRejectModal(true)}
            disabled={acting !== "" || data?.status === "TENDER_READY_FOR_PUBLISHING"}
            style={{ color: "#b91c1c" }}
          >
            ✗ Reject
          </button>
        </div>

        {/* Return Modal */}
        {showReturnModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: "white",
              padding: 24,
              borderRadius: 8,
              maxWidth: 500,
              width: "90%",
            }}>
              <h3 style={{ marginTop: 0 }}>Return to Officers</h3>
              <p>Please provide reason for returning to officers:</p>
              <textarea
                className="input"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Enter reason..."
                style={{ width: "100%", minHeight: 100, marginBottom: 12, fontFamily: "monospace" }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  className="btn"
                  onClick={() => {
                    setShowReturnModal(false);
                    setReturnReason("");
                  }}
                  disabled={acting !== ""}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowReturnModal(false);
                    action("return", `/tenders/${params.tender_id}/gm-return`, { reason: returnReason });
                  }}
                  disabled={acting !== "" || !returnReason.trim()}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: "white",
              padding: 24,
              borderRadius: 8,
              maxWidth: 500,
              width: "90%",
            }}>
              <h3 style={{ marginTop: 0, color: "#b91c1c" }}>Reject Tender</h3>
              <p style={{ color: "#b91c1c" }}>This will close the tender. Please provide reason:</p>
              <textarea
                className="input"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                style={{ width: "100%", minHeight: 100, marginBottom: 12, fontFamily: "monospace" }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  className="btn"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                  disabled={acting !== ""}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setShowRejectModal(false);
                    action("reject", `/tenders/${params.tender_id}/gm-reject`, { reason: rejectReason });
                  }}
                  disabled={acting !== "" || !rejectReason.trim()}
                  style={{ color: "white", backgroundColor: "#b91c1c" }}
                >
                  Reject & Close
                </button>
              </div>
            </div>
          </div>
        )}
      </InternalPage>
    </RequireRoles>
  );
}
