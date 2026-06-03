"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  clienteNombre: string;
  clienteApellido: string;
  clienteTelefono: string;
  clienteEmail?: string | null;
  quintaNombre: string;
  fechaInicio: string;
  fechaFin: string;
  cantidadPersonas?: number | null;
  tieneMascota: boolean;
  motivoEvento?: string | null;
  montoTotal: number;
  saldoPendiente: number;
  sena?: number | null;
}

const fmtFecha = (iso: string) =>
  format(parseISO(iso), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

const fmtMonto = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

export function ConfirmacionPDF({
  clienteNombre,
  clienteApellido,
  clienteTelefono,
  clienteEmail,
  quintaNombre,
  fechaInicio,
  fechaFin,
  cantidadPersonas,
  tieneMascota,
  motivoEvento,
  montoTotal,
  saldoPendiente,
  sena,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");

      const nights = Math.round(
        (new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / 86400000,
      );

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const margin = 20;
      const contentW = W - margin * 2;
      let y = 20;

      const line = (thickness = 0.3) => {
        doc.setLineWidth(thickness);
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, W - margin, y);
        y += 5;
      };

      // Header
      doc.setFillColor(30, 30, 30);
      doc.rect(0, 0, W, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("QUINTAS MANAGER", W / 2, 15, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(quintaNombre, W / 2, 24, { align: "center" });

      y = 48;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("CONFIRMACIÓN DE RESERVA", W / 2, y, { align: "center" });
      y += 10;

      line(0.5);

      // Section helper
      const sectionTitle = (title: string) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(title.toUpperCase(), margin, y);
        y += 6;
        doc.setTextColor(30, 30, 30);
      };

      const field = (label: string, value: string) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(label + ":", margin, y);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(value, contentW - 35);
        doc.text(lines, margin + 35, y);
        y += lines.length * 5 + 2;
      };

      // Cliente
      sectionTitle("Datos del cliente");
      field("Nombre", `${clienteNombre} ${clienteApellido}`);
      field("Teléfono", clienteTelefono);
      if (clienteEmail) field("Email", clienteEmail);
      y += 3;
      line();

      // Reserva
      sectionTitle("Datos de la reserva");
      field("Quinta", quintaNombre);
      field("Ingreso", fmtFecha(fechaInicio));
      field("Salida", fmtFecha(fechaFin));
      field("Noches", String(nights));
      if (cantidadPersonas) field("Personas", String(cantidadPersonas));
      field("Mascota", tieneMascota ? "Sí" : "No");
      if (motivoEvento) field("Motivo", motivoEvento);
      y += 3;
      line();

      // Pago
      sectionTitle("Detalle de pago");
      field("Monto total", fmtMonto(montoTotal));
      if (sena) field("Seña abonada", fmtMonto(sena));
      field("Saldo pendiente", saldoPendiente > 0 ? fmtMonto(saldoPendiente) : "Saldado ✓");
      y += 3;
      line();

      // Footer text
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Ante cualquier consulta, comuníquese por WhatsApp.",
        W / 2,
        y + 4,
        { align: "center" },
      );
      y += 12;

      // Emission date
      const emitido = format(new Date(), "'Emitido el' d 'de' MMMM 'de' yyyy", { locale: es });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(emitido, W / 2, y, { align: "center" });

      // Footer bar
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 285, W, 12, "F");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Quintas Manager — Documento generado automáticamente", W / 2, 292, { align: "center" });

      const pdfBlob = doc.output("blob");
      const fileName = `confirmacion-${clienteApellido.toLowerCase()}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: "Confirmación de Reserva",
          text: `Confirmación de reserva — ${clienteNombre} ${clienteApellido}`,
        });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Error generando PDF:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      className="flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      Compartir confirmación
    </button>
  );
}
