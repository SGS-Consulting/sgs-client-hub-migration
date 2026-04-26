import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "@/assets/sgs-logo.webp";

export type InvoicePdfData = {
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  notes?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  status?: string;
  client: {
    company_name: string;
    contact_name?: string | null;
    email?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export async function generateInvoicePdf(data: InvoicePdfData) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;

  // ===== Header: Logo + INVOICE =====
  try {
    const img = await loadImage(logo);
    const ratio = img.width / img.height;
    const h = 44;
    const w = h * ratio;
    doc.addImage(img, "PNG", margin, margin, w, h);
  } catch {
    /* skip logo if fails */
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(20, 24, 31);
  doc.text("FACTURA", pageW - margin, margin + 28, { align: "right" });

  // Divider
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.line(margin, margin + 70, pageW - margin, margin + 70);

  // ===== Bill to / Invoice meta =====
  const topY = margin + 96;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURAR A:", margin, topY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 24, 31);
  doc.setFontSize(10);
  const c = data.client;
  const clientLines = [
    c.company_name,
    c.contact_name || "",
    c.address_line1 || "",
    c.address_line2 || "",
    [c.city, c.state, c.zip].filter(Boolean).join(", "),
    c.email || "",
  ].filter(Boolean);
  clientLines.forEach((l, i) => doc.text(l, margin, topY + 16 + i * 13));

  // Right column meta
  const rightX = pageW - margin;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.setFont("helvetica", "bold");
  doc.text("Nº FACTURA:", rightX - 110, topY);
  doc.text("FECHA:", rightX - 110, topY + 16);
  doc.text("VENCIMIENTO:", rightX - 110, topY + 32);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 24, 31);
  doc.text(data.invoice_number || "—", rightX, topY, { align: "right" });
  doc.text(new Date(data.issue_date).toLocaleDateString(), rightX, topY + 16, { align: "right" });
  doc.text(
    data.due_date ? new Date(data.due_date).toLocaleDateString() : "—",
    rightX,
    topY + 32,
    { align: "right" },
  );

  // ===== Items table =====
  const tableY = topY + 16 + clientLines.length * 13 + 24;

  autoTable(doc, {
    startY: tableY,
    head: [["DESCRIPCIÓN", "PRECIO", "CANT.", "TOTAL"]],
    body: data.items.map((it) => [
      it.description,
      fmt(it.unit_price),
      String(it.quantity),
      fmt(it.line_total),
    ]),
    theme: "plain",
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [80, 80, 80],
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: { top: 8, right: 10, bottom: 8, left: 10 },
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [30, 30, 30],
      cellPadding: { top: 10, right: 10, bottom: 10, left: 10 },
      lineWidth: { bottom: 0.5 },
      lineColor: [230, 230, 230],
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 70 },
      2: { halign: "right", cellWidth: 50 },
      3: { halign: "right", cellWidth: 80 },
    },
  });

  // ===== Totals =====
  // @ts-expect-error - lastAutoTable injected by autotable
  const endY: number = doc.lastAutoTable.finalY + 16;
  const labelX = pageW - margin - 140;
  const valueX = pageW - margin;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Subtotal", labelX, endY);
  doc.setTextColor(20, 24, 31);
  doc.text(fmt(data.subtotal), valueX, endY, { align: "right" });

  doc.setTextColor(80);
  doc.text("Impuesto", labelX, endY + 16);
  doc.setTextColor(20, 24, 31);
  doc.text(fmt(data.tax), valueX, endY + 16, { align: "right" });

  doc.setDrawColor(200);
  doc.line(labelX, endY + 26, valueX, endY + 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("TOTAL", labelX, endY + 44);
  doc.text(fmt(data.total), valueX, endY + 44, { align: "right" });

  // ===== Notes =====
  if (data.notes) {
    const notesY = endY + 80;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.setFont("helvetica", "bold");
    doc.text("NOTAS", margin, notesY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.setFontSize(10);
    const wrapped = doc.splitTextToSize(data.notes, pageW - margin * 2);
    doc.text(wrapped, margin, notesY + 16);
  }

  // ===== Footer =====
  const footY = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(230);
  doc.line(margin, footY - 16, pageW - margin, footY - 16);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("SGS Consulting Group · Gracias por su confianza", pageW / 2, footY, { align: "center" });

  doc.save(`Factura-${data.invoice_number || "draft"}.pdf`);
}
