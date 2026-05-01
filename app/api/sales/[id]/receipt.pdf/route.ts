import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { db } from "@/lib/db/db";
import { migrate } from "@/lib/db/migrate";
import { requireUserForRoute } from "@/lib/auth/route";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  migrate();
  const user = await requireUserForRoute();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const database = db();
  const sale = database
    .prepare(
      `
      SELECT s.id, s.status, s.currency, s.total, s.paid, s.created_at, s.closed_at, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE s.id=?
    `,
    )
    .get(id) as
    | { id: string; status: string; currency: string; total: string; paid: string; created_at: string; closed_at: string | null; customer_name: string | null }
    | undefined;
  if (!sale) return new NextResponse("Not found", { status: 404 });

  const items = database
    .prepare(
      `
      SELECT si.qty, si.price, si.total, p.name, p.sku
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      WHERE si.sale_id=?
      ORDER BY datetime(si.created_at) ASC
    `,
    )
    .all(id) as Array<{ qty: string; price: string; total: string; name: string; sku: string }>;

  const payments = database
    .prepare("SELECT method, amount, currency, created_at FROM payments WHERE sale_id=? ORDER BY datetime(created_at) ASC")
    .all(id) as Array<{ method: string; amount: string; currency: string; created_at: string }>;

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).text("UKT CRM • Чек", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#555");
  doc.text(`Чек: ${sale.id}`);
  doc.text(`Статус: ${sale.status}`);
  doc.text(`Дата: ${sale.created_at.slice(0, 19).replace("T", " ")}`);
  doc.text(`Клиент: ${sale.customer_name ?? "—"}`);
  doc.text(`Пользователь: ${user.name}`);
  doc.fillColor("#000");
  doc.moveDown();

  doc.fontSize(12).text("Позиции", { underline: false });
  doc.moveDown(0.5);

  const startX = doc.x;
  const col1 = startX;
  const col2 = startX + 260;
  const col3 = startX + 340;
  const col4 = startX + 410;

  doc.fontSize(10).fillColor("#555");
  doc.text("Товар", col1);
  doc.text("Кол-во", col2);
  doc.text("Цена", col3);
  doc.text("Сумма", col4);
  doc.fillColor("#000");
  doc.moveDown(0.4);
  doc.moveTo(startX, doc.y).lineTo(startX + 515, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown(0.6);

  doc.fontSize(10).strokeColor("#000");
  for (const it of items) {
    doc.text(`${it.name} (${it.sku})`, col1, doc.y, { width: 250 });
    doc.text(it.qty, col2, doc.y, { width: 60, align: "right" });
    doc.text(it.price, col3, doc.y, { width: 60, align: "right" });
    doc.text(it.total, col4, doc.y, { width: 80, align: "right" });
    doc.moveDown(0.6);
  }

  doc.moveDown(0.5);
  doc.moveTo(startX, doc.y).lineTo(startX + 515, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown();

  doc.fontSize(11).text(`Итого: ${sale.total} ${sale.currency}`, { align: "right" });
  doc.text(`Оплачено: ${sale.paid} ${sale.currency}`, { align: "right" });
  doc.moveDown();

  doc.fontSize(12).text("Оплата");
  doc.moveDown(0.5);
  if (payments.length === 0) {
    doc.fontSize(10).fillColor("#555").text("Нет оплат");
    doc.fillColor("#000");
  } else {
    doc.fontSize(10);
    for (const p of payments) {
      doc.text(`${p.method}: ${p.amount} ${p.currency}`);
    }
  }

  doc.end();

  const pdf = await pdfPromise;

  return new NextResponse(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"receipt-${sale.id}.pdf\"`,
      "Cache-Control": "no-store",
    },
  });
}
