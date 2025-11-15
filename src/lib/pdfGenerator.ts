import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
    }).format(amount);
};

export const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-BO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

export const generateReciboVenta = (venta: {
    id: string;
    cliente: { nombre: string; apellido: string; cedula: string };
    terreno: { numero_lote: string; seccion: string; manzana: string; tipo: string };
    precio_total: number;
    tipo_pago: string;
    fecha_venta: string;
}) => {
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CEMENTERIO MONTE SAGRADO', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text('RECIBO DE VENTA', 105, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${formatDate(venta.fecha_venta)}`, 20, 40);
    doc.text(`Nro. Recibo: ${venta.id.substring(0, 8).toUpperCase()}`, 20, 46);

    // Línea separadora
    doc.line(20, 50, 190, 50);

    // Información del cliente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 20, 58);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${venta.cliente.nombre} ${venta.cliente.apellido}`, 20, 66);
    doc.text(`Cédula: ${venta.cliente.cedula}`, 20, 72);

    // Información del terreno
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL TERRENO', 20, 84);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Número de Lote: ${venta.terreno.numero_lote}`, 20, 92);
    doc.text(`Sección: ${venta.terreno.seccion}`, 20, 98);
    doc.text(`Manzana: ${venta.terreno.manzana}`, 20, 104);
    doc.text(`Tipo: ${venta.terreno.tipo}`, 20, 110);

    // Detalle de pago
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE PAGO', 20, 122);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Tipo de Pago: ${venta.tipo_pago === 'contado' ? 'Contado' : 'Crédito'}`, 20, 130);

    // Total
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatCurrency(venta.precio_total)}`, 20, 145);

    // Pie de página
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Gracias por su preferencia', 105, 280, { align: 'center' });

    return doc;
};

export const generateReciboPago = (pago: {
    id: string;
    cliente: { nombre: string; apellido: string; cedula: string };
    terreno: { numero_lote: string; seccion: string; manzana: string };
    numero_cuota: number;
    monto_cuota: number;
    monto_pagado: number;
    fecha_pago: string;
}) => {
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CEMENTERIO MONTE SAGRADO', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text('RECIBO DE PAGO', 105, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${formatDate(pago.fecha_pago)}`, 20, 40);
    doc.text(`Nro. Recibo: ${pago.id.substring(0, 8).toUpperCase()}`, 20, 46);

    // Línea separadora
    doc.line(20, 50, 190, 50);

    // Información del cliente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 20, 58);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${pago.cliente.nombre} ${pago.cliente.apellido}`, 20, 66);
    doc.text(`Cédula: ${pago.cliente.cedula}`, 20, 72);

    // Información del terreno
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL TERRENO', 20, 84);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Número de Lote: ${pago.terreno.numero_lote}`, 20, 92);
    doc.text(`Sección: ${pago.terreno.seccion}`, 20, 98);
    doc.text(`Manzana: ${pago.terreno.manzana}`, 20, 104);

    // Detalle de pago
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE PAGO', 20, 116);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Número de Cuota: ${pago.numero_cuota}`, 20, 124);
    doc.text(`Monto de Cuota: ${formatCurrency(pago.monto_cuota)}`, 20, 130);

    // Total pagado
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`MONTO PAGADO: ${formatCurrency(pago.monto_pagado)}`, 20, 145);

    // Pie de página
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Gracias por su pago puntual', 105, 280, { align: 'center' });

    return doc;
};

export const generateReporte = (
    titulo: string,
    terrenos: Array<{
        numero_lote: string;
        seccion: string;
        manzana: string;
        tipo: string;
        precio: number;
        estado: string;
        dimensiones?: string | null;
    }>,
    filtros?: { seccion?: string; manzana?: string }
) => {
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CEMENTERIO MONTE SAGRADO', 105, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.text(titulo, 105, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${formatDate(new Date())}`, 20, 40);

    // Filtros aplicados
    if (filtros) {
        let filtroTexto = 'Filtros: ';
        if (filtros.seccion) filtroTexto += `Sección: ${filtros.seccion} `;
        if (filtros.manzana) filtroTexto += `Manzana: ${filtros.manzana}`;
        doc.text(filtroTexto, 20, 46);
    }

    // Tabla de terrenos
    autoTable(doc, {
        startY: 55,
        head: [['Lote', 'Sección', 'Manzana', 'Tipo', 'Precio', 'Estado', 'Dimensiones']],
        body: terrenos.map(t => [
            t.numero_lote,
            t.seccion,
            t.manzana,
            t.tipo,
            formatCurrency(t.precio),
            t.estado,
            t.dimensiones || 'N/A'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
    });

    // Resumen
    const finalY = (doc as any).lastAutoTable.finalY || 55;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de terrenos: ${terrenos.length}`, 20, finalY + 10);

    const totalValor = terrenos.reduce((sum, t) => sum + t.precio, 0);
    doc.text(`Valor total: ${formatCurrency(totalValor)}`, 20, finalY + 16);

    return doc;
};

export const generateReporteCredito = (
    cliente: { nombre: string; apellido: string; cedula: string },
    terreno: { numero_lote: string; seccion: string; manzana: string },
    pagos: Array<{
        numero_cuota: number;
        monto_cuota: number;
        fecha_vencimiento: string;
        fecha_pago: string | null;
        monto_pagado: number | null;
        estado: string;
    }>
) => {
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CEMENTERIO MONTE SAGRADO', 105, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.text('REPORTE DE CRÉDITO', 105, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de emisión: ${formatDate(new Date())}`, 20, 40);

    // Información del cliente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 20, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${cliente.nombre} ${cliente.apellido}`, 20, 58);
    doc.text(`Cédula: ${cliente.cedula}`, 20, 64);

    // Información del terreno
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL TERRENO', 20, 74);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Número de Lote: ${terreno.numero_lote}`, 20, 82);
    doc.text(`Sección: ${terreno.seccion}`, 20, 88);
    doc.text(`Manzana: ${terreno.manzana}`, 20, 94);

    // Tabla de pagos
    autoTable(doc, {
        startY: 104,
        head: [['Cuota', 'Monto', 'Vencimiento', 'Fecha Pago', 'Pagado', 'Estado']],
        body: pagos.map(p => [
            p.numero_cuota.toString(),
            formatCurrency(p.monto_cuota),
            formatDate(p.fecha_vencimiento),
            p.fecha_pago ? formatDate(p.fecha_pago) : 'Pendiente',
            p.monto_pagado ? formatCurrency(p.monto_pagado) : '-',
            p.estado === 'pagado' ? 'Pagado' : 'Pendiente'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
    });

    // Resumen
    const finalY = (doc as any).lastAutoTable.finalY || 104;
    const totalCuotas = pagos.length;
    const cuotasPagadas = pagos.filter(p => p.estado === 'pagado').length;
    const cuotasPendientes = totalCuotas - cuotasPagadas;
    const totalPagado = pagos.reduce((sum, p) => sum + (p.monto_pagado || 0), 0);
    const totalPendiente = pagos.filter(p => p.estado !== 'pagado').reduce((sum, p) => sum + p.monto_cuota, 0);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN', 20, finalY + 10);

    doc.setFont('helvetica', 'normal');
    doc.text(`Total de cuotas: ${totalCuotas}`, 20, finalY + 18);
    doc.text(`Cuotas pagadas: ${cuotasPagadas}`, 20, finalY + 24);
    doc.text(`Cuotas pendientes: ${cuotasPendientes}`, 20, finalY + 30);
    doc.text(`Total pagado: ${formatCurrency(totalPagado)}`, 20, finalY + 36);
    doc.text(`Total pendiente: ${formatCurrency(totalPendiente)}`, 20, finalY + 42);

    return doc;
};
