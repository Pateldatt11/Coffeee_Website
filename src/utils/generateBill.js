import jsPDF from 'jspdf';

const COMPANY_NAME = 'Brew Haven';

// Tries to load a coffee image for the PDF. Many image hosts (Freepik,
// Unsplash, Shutterstock, etc.) block canvas pixel access for cross-origin
// images (CORS). When that happens this returns null, and the caller
// falls back to printing just the coffee name.
const loadImageAsBase64 = (url) =>
  new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch (err) {
        resolve(null); // CORS-blocked — fall back to text
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

/**
 * order: { id, items, subtotal, tokenDiscount, walletUsed, tokensEarned,
 *          amount, paymentMethod, paymentId, createdAt }
 * contact: { name, email, phone, address }
 */
export const generateBillPDF = async (order, contact) => {
  if (!order) return;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 50;

  // Header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(COMPANY_NAME, 40, y);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Order Invoice', 40, y + 16);

  const billDate = order.createdAt?.toDate
    ? order.createdAt.toDate()
    : new Date(order.createdAt || Date.now());
  doc.text(`Bill Date: ${billDate.toLocaleDateString('en-IN')}`, pageWidth - 200, 50);
  doc.text(`Bill Time: ${billDate.toLocaleTimeString('en-IN')}`, pageWidth - 200, 64);
  doc.text(`Order ID: ${(order.id || 'N/A').toString().slice(-8).toUpperCase()}`, pageWidth - 200, 78);

  y += 40;
  doc.setDrawColor(200);
  doc.line(40, y, pageWidth - 40, y);
  y += 20;

  // Customer details
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Billed To', 40, y);
  y += 16;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Name: ${contact?.name || '-'}`, 40, y); y += 14;
  doc.text(`Email: ${contact?.email || '-'}`, 40, y); y += 14;
  doc.text(`Phone: ${contact?.phone || '-'}`, 40, y); y += 14;
  doc.text(`Address: ${contact?.address || '-'}`, 40, y, { maxWidth: pageWidth - 80 }); y += 28;

  doc.line(40, y, pageWidth - 40, y);
  y += 20;

  // Table header
  doc.setFont(undefined, 'bold');
  doc.text('Item', 40, y);
  doc.text('Qty', pageWidth - 220, y);
  doc.text('Price', pageWidth - 160, y);
  doc.text('Amount', pageWidth - 90, y);
  y += 10;
  doc.line(40, y, pageWidth - 40, y);
  y += 16;
  doc.setFont(undefined, 'normal');

  const items = order.items || [];
  for (const item of items) {
    const imgData = await loadImageAsBase64(item.img);
    const rowHeight = imgData ? 36 : 18;

    if (y + rowHeight > 780) { doc.addPage(); y = 50; }

    if (imgData) {
      try {
        doc.addImage(imgData, 'JPEG', 40, y - 10, 28, 28);
        doc.text(item.name || 'Item', 78, y + 8);
      } catch (err) {
        doc.text(item.name || 'Item', 40, y + 8);
      }
    } else {
      doc.text(item.name || 'Item', 40, y + 8);
    }

    doc.text(String(item.qty ?? 1), pageWidth - 220, y + 8);
    doc.text(`Rs ${item.price ?? 0}`, pageWidth - 160, y + 8);
    doc.text(`Rs ${(item.price ?? 0) * (item.qty ?? 1)}`, pageWidth - 90, y + 8);
    y += rowHeight;
  }

  y += 10;
  doc.line(40, y, pageWidth - 40, y);
  y += 20;

  const subtotal = order.subtotal ?? items.reduce((s, i) => s + (i.price ?? 0) * (i.qty ?? 1), 0);
  const tokenDiscount = order.tokenDiscount || 0;
  const walletUsed = order.walletUsed || 0;
  const finalTotal = order.amount ?? order.total ?? (subtotal - tokenDiscount - walletUsed);

  const printRight = (label, value, bold = false) => {
    doc.setFont(undefined, bold ? 'bold' : 'normal');
    doc.text(label, pageWidth - 220, y);
    doc.text(value, pageWidth - 90, y);
    y += 16;
  };

  printRight('Subtotal:', `Rs ${subtotal}`);
  if (tokenDiscount > 0) printRight('Gift Card / Token Discount:', `- Rs ${tokenDiscount}`);
  if (walletUsed > 0) printRight('Wallet Used:', `- Rs ${walletUsed}`);
  y += 4;
  doc.line(pageWidth - 220, y, pageWidth - 40, y);
  y += 16;
  printRight('Total Paid:', `Rs ${finalTotal}`, true);

  y += 30;
  doc.setFontSize(9);
  doc.text(`Payment Method: ${order.paymentMethod || '-'}`, 40, y);
  if (order.paymentId) { y += 14; doc.text(`Payment ID: ${order.paymentId}`, 40, y); }

  y += 30;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Thank you for ordering with Brew Haven!', 40, y);

  doc.save(`BrewHaven_Bill_${(order.id || Date.now()).toString().slice(-8)}.pdf`);
};