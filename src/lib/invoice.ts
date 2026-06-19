import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SELLER = {
  name: "T K Pharma",
  address: "Koothattukulam, Ernakulam",
  contact: "",
};

export interface InvoiceOrder {
  order_number: string;
  created_at: string;
  shipping_address: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  payment_status: string;
  status: string;
  notes?: string | null;
}

export interface InvoiceRetailer {
  pharmacy_name: string;
  owner_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  gst_number?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export interface InvoiceItem {
  medicine_name: string;
  hsn_code?: string | null;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  line_total: number;
}

export function generateInvoicePDF(order: InvoiceOrder, retailer: InvoiceRetailer, items: InvoiceItem[]) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(SELLER.name, 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(SELLER.address, 14, 25);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", w - 14, 18, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #: ${order.order_number}`, w - 14, 25, { align: "right" });
  doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, w - 14, 30, { align: "right" });
  doc.text(`Status: ${order.status} • ${order.payment_status}`, w - 14, 35, { align: "right" });

  // Bill To
  doc.setDrawColor(220);
  doc.line(14, 42, w - 14, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 14, 50);
  doc.setFont("helvetica", "normal");
  let y = 56;
  doc.text(retailer.pharmacy_name, 14, y); y += 5;
  if (retailer.owner_name) { doc.text(retailer.owner_name, 14, y); y += 5; }
  if (retailer.address) { doc.text(`${retailer.address}, ${retailer.city ?? ""} ${retailer.state ?? ""} ${retailer.pincode ?? ""}`.trim(), 14, y); y += 5; }
  if (retailer.contact_phone) { doc.text(`Ph: ${retailer.contact_phone}`, 14, y); y += 5; }
  if (retailer.gst_number) { doc.text(`GSTIN: ${retailer.gst_number}`, 14, y); y += 5; }

  // Ship To
  doc.setFont("helvetica", "bold");
  doc.text("Ship To:", w / 2 + 5, 50);
  doc.setFont("helvetica", "normal");
  const shipLines = doc.splitTextToSize(order.shipping_address, w / 2 - 20);
  doc.text(shipLines, w / 2 + 5, 56);

  // Items
  autoTable(doc, {
    startY: Math.max(y + 4, 90),
    head: [["#", "Medicine", "HSN", "Qty", "Price", "GST%", "Total"]],
    body: items.map((it, i) => [
      String(i + 1),
      it.medicine_name,
      it.hsn_code ?? "-",
      String(it.quantity),
      `${Number(it.unit_price).toFixed(2)}`,
      `${it.gst_percent}%`,
      `${Number(it.line_total).toFixed(2)}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const labelX = w - 70;
  const valX = w - 14;
  doc.setFontSize(10);
  doc.text("Subtotal:", labelX, finalY);
  doc.text(`Rs. ${Number(order.subtotal).toFixed(2)}`, valX, finalY, { align: "right" });
  doc.text("GST:", labelX, finalY + 6);
  doc.text(`Rs. ${Number(order.gst_amount).toFixed(2)}`, valX, finalY + 6, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total:", labelX, finalY + 14);
  doc.text(`Rs. ${Number(order.total_amount).toFixed(2)}`, valX, finalY + 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("This is a computer generated invoice.", 14, doc.internal.pageSize.getHeight() - 10);

  doc.save(`${order.order_number}.pdf`);
}
