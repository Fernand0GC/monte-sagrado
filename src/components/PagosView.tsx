"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Calendar, DollarSign, Download, FileText, ChevronDown, User, MapPin, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { generateReciboPago, generateReporteCredito } from "@/lib/pdfGenerator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PagoCredito {
    id: string;
    venta_id: string;
    numero_cuota: number;
    monto_cuota: number;
    fecha_vencimiento: string;
    fecha_pago: string | null;
    estado: string;
    monto_pagado: number | null;
    interes_aplicado: number | null;
    ventas: {
        clientes: {
            nombre: string;
            apellido: string;
            cedula: string;
        };
        terrenos: {
            numero_lote: string;
            seccion: string;
            manzana: string;
        };
    };
}

interface ClienteConPagos {
    cliente: {
        nombre: string;
        apellido: string;
        cedula: string;
    };
    terreno: {
        numero_lote: string;
        seccion: string;
        manzana: string;
    };
    pagos: PagoCredito[];
    totalPagado: number;
    totalPendiente: number;
    pagosPendientes: number;
    pagosVencidos: number;
}

export function PagosView() {
    const [pagos, setPagos] = useState<PagoCredito[]>([]);
    const [clientesConPagos, setClientesConPagos] = useState<ClienteConPagos[]>([]);
    const [filteredClientes, setFilteredClientes] = useState<ClienteConPagos[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [estadoFilter, setEstadoFilter] = useState<string>("todos");
    const [selectedPago, setSelectedPago] = useState<PagoCredito | null>(null);
    const [montoPago, setMontoPago] = useState("");
    const [loading, setLoading] = useState(true);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [expandedClientIndex, setExpandedClientIndex] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchPagos();
    }, []);

    useEffect(() => {
        const pagosAgrupados = pagos.reduce((acc, pago) => {
            const clienteKey = `${pago.ventas.clientes.nombre}_${pago.ventas.clientes.apellido}_${pago.ventas.clientes.cedula}`;

            if (!acc[clienteKey]) {
                acc[clienteKey] = {
                    cliente: pago.ventas.clientes,
                    terreno: pago.ventas.terrenos,
                    pagos: [],
                    totalPagado: 0,
                    totalPendiente: 0,
                    pagosPendientes: 0,
                    pagosVencidos: 0
                };
            }

            acc[clienteKey].pagos.push(pago);

            const pagado = pago.estado === "pagado" ? (pago.monto_pagado || 0) : 0;
            const pendiente = pago.estado !== "pagado" ? pago.monto_cuota : 0;
            const vencido = pago.estado !== "pagado" && new Date(pago.fecha_vencimiento) < new Date();

            acc[clienteKey].totalPagado += pagado;
            acc[clienteKey].totalPendiente += pendiente;
            if (pago.estado !== "pagado") acc[clienteKey].pagosPendientes++;
            if (vencido) acc[clienteKey].pagosVencidos++;

            return acc;
        }, {} as Record<string, ClienteConPagos>);

        const clientesArray = Object.values(pagosAgrupados).sort((a, b) =>
            a.cliente.apellido.localeCompare(b.cliente.apellido)
        );

        setClientesConPagos(clientesArray);
    }, [pagos]);

    useEffect(() => {
        let filtered = clientesConPagos.filter((cliente) => {
            const searchLower = searchTerm.toLowerCase();
            const clienteNombre = `${cliente.cliente.nombre} ${cliente.cliente.apellido}`.toLowerCase();
            const cedula = cliente.cliente.cedula.toLowerCase();
            const lote = `${cliente.terreno.seccion}-${cliente.terreno.manzana}-${cliente.terreno.numero_lote}`.toLowerCase();

            const matchesSearch = (
                clienteNombre.includes(searchLower) ||
                cedula.includes(searchLower) ||
                lote.includes(searchLower)
            );

            let matchesEstado = true;
            if (estadoFilter === "pendientes") {
                matchesEstado = cliente.pagosPendientes > 0;
            } else if (estadoFilter === "pagados") {
                matchesEstado = cliente.pagos.every(p => p.estado === "pagado");
            } else if (estadoFilter === "vencidos") {
                matchesEstado = cliente.pagosVencidos > 0;
            }

            return matchesSearch && matchesEstado;
        });

        setFilteredClientes(filtered);
    }, [searchTerm, clientesConPagos, estadoFilter]);

    const fetchPagos = async () => {
        try {
            const { data, error } = await supabase
                .from("pagos_credito")
                .select(`
          *,
          ventas (
            clientes (
              nombre,
              apellido,
              cedula
            ),
            terrenos (
              numero_lote,
              seccion,
              manzana
            )
          )
        `)
                .order("fecha_vencimiento", { ascending: true });

            if (error) throw error;
            setPagos(data || []);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los pagos",
            });
        } finally {
            setLoading(false);
        }
    };

    const registrarPago = async () => {
        if (!selectedPago || !montoPago) return;

        const montoNumerico = parseFloat(montoPago);
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Ingrese un monto válido",
            });
            return;
        }

        try {
            const fechaActual = new Date().toISOString();

            const { error } = await supabase
                .from("pagos_credito")
                .update({
                    fecha_pago: fechaActual,
                    monto_pagado: montoNumerico,
                    estado: montoNumerico >= selectedPago.monto_cuota ? "pagado" : "pendiente"
                })
                .eq("id", selectedPago.id);

            if (error) throw error;

            toast({
                title: "✓ Pago registrado",
                description: `Bs ${montoNumerico.toLocaleString()} para la cuota ${selectedPago.numero_cuota}`,
            });

            const doc = generateReciboPago({
                id: selectedPago.id,
                cliente: {
                    nombre: selectedPago.ventas.clientes.nombre,
                    apellido: selectedPago.ventas.clientes.apellido,
                    cedula: selectedPago.ventas.clientes.cedula
                },
                terreno: {
                    numero_lote: selectedPago.ventas.terrenos.numero_lote,
                    seccion: selectedPago.ventas.terrenos.seccion,
                    manzana: selectedPago.ventas.terrenos.manzana
                },
                numero_cuota: selectedPago.numero_cuota,
                monto_cuota: selectedPago.monto_cuota,
                monto_pagado: montoNumerico,
                fecha_pago: fechaActual
            });
            doc.save(`recibo_pago_${selectedPago.id.substring(0, 8)}.pdf`);

            setIsPaymentDialogOpen(false);
            setSelectedPago(null);
            setMontoPago("");
            fetchPagos();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo registrar el pago",
            });
        }
    };

    const generarReporteCliente = (cliente: ClienteConPagos) => {
        try {
            const doc = generateReporteCredito(
                cliente.cliente,
                cliente.terreno,
                cliente.pagos
            );
            doc.save(`reporte_credito_${cliente.cliente.cedula}.pdf`);
            toast({
                title: "✓ Reporte generado",
                description: `${cliente.cliente.nombre} ${cliente.cliente.apellido}`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo generar el reporte",
            });
        }
    };

    const getEstadoBadgeVariant = (estado: string, fechaVencimiento: string) => {
        if (estado === "pagado") return "default";
        const hoy = new Date();
        const vencimiento = new Date(fechaVencimiento);
        if (vencimiento < hoy) return "destructive";
        return "secondary";
    };

    const getEstadoText = (estado: string, fechaVencimiento: string) => {
        if (estado === "pagado") return "Pagado";
        const hoy = new Date();
        const vencimiento = new Date(fechaVencimiento);
        if (vencimiento < hoy) return "Vencido";
        return "Pendiente";
    };

    const calcularPorcentajePago = (cliente: ClienteConPagos) => {
        const totalCuotas = cliente.pagos.length;
        const cuotasPagadas = cliente.pagos.filter(p => p.estado === "pagado").length;
        return totalCuotas > 0 ? (cuotasPagadas / totalCuotas) * 100 : 0;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center space-y-2">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-muted-foreground">Cargando datos...</p>
                </div>
            </div>
        );
    }

    const pagosPendientes = pagos.filter(p => p.estado !== "pagado");
    const pagosVencidos = pagos.filter(p => {
        const hoy = new Date();
        const vencimiento = new Date(p.fecha_vencimiento);
        return p.estado !== "pagado" && vencimiento < hoy;
    });
    const totalPendiente = pagosPendientes.reduce((sum, p) => sum + p.monto_cuota, 0);

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="space-y-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Créditos</h1>
                    <p className="text-muted-foreground">Administre y realice seguimiento de los pagos a crédito</p>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Activos</CardTitle>
                            <User className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{clientesConPagos.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Clientes con crédito vigente</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pagos Vencidos</CardTitle>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-destructive">{pagosVencidos.length}</div>
                            <p className="text-xs text-destructive/70 mt-1">Requieren atención inmediata</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendiente</CardTitle>
                            <TrendingUp className="h-4 w-4 text-accent" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-accent">Bs {totalPendiente.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">Por cobrar</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Section */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar cliente, cédula o lote..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 border-0 bg-muted"
                                />
                            </div>
                            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                                <SelectTrigger className="w-full md:w-[200px] border-0 bg-muted">
                                    <SelectValue placeholder="Filtrar por estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos los estados</SelectItem>
                                    <SelectItem value="pendientes">Con Pendientes</SelectItem>
                                    <SelectItem value="pagados">Al Día</SelectItem>
                                    <SelectItem value="vencidos">Con Vencidos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Clientes List */}
                <div className="space-y-3">
                    {filteredClientes.length === 0 ? (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <User className="h-12 w-12 text-muted-foreground/30 mb-2" />
                                <p className="text-muted-foreground">No se encontraron clientes con los filtros seleccionados</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredClientes.map((cliente, index) => {
                            const clienteKey = `${cliente.cliente.cedula}-${index}`;
                            const isExpanded = expandedClientIndex === clienteKey;
                            const porcentajePago = calcularPorcentajePago(cliente);

                            return (
                                <Card key={clienteKey} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                    {/* Client Header */}
                                    <div
                                        className="p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => setExpandedClientIndex(isExpanded ? null : clienteKey)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-primary/10 p-2.5 rounded-lg">
                                                        <User className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-lg">
                                                            {cliente.cliente.nombre} {cliente.cliente.apellido}
                                                        </h3>
                                                        <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm text-muted-foreground mt-1">
                                                            <span>CI: {cliente.cliente.cedula}</span>
                                                            <span className="hidden md:inline">•</span>
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="h-3.5 w-3.5" />
                                                                Lote {cliente.terreno.numero_lote} - Secc. {cliente.terreno.seccion}, Mzn. {cliente.terreno.manzana}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Progreso de pagos</span>
                                                        <span className="font-medium">{Math.round(porcentajePago)}%</span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-2">
                                                        <div
                                                            className="bg-accent rounded-full h-2 transition-all"
                                                            style={{ width: `${porcentajePago}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:flex-row gap-6 items-end">
                                                {/* Badges */}
                                                <div className="flex gap-2 flex-wrap justify-end">
                                                    {cliente.pagosVencidos > 0 && (
                                                        <Badge variant="destructive" className="text-xs gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            {cliente.pagosVencidos} vencido(s)
                                                        </Badge>
                                                    )}
                                                    {cliente.pagosPendientes > 0 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {cliente.pagosPendientes} pendiente(s)
                                                        </Badge>
                                                    )}
                                                    {cliente.pagosPendientes === 0 && (
                                                        <Badge className="text-xs bg-accent text-accent-foreground gap-1">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Al día
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Total Pending */}
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Total Pendiente</p>
                                                    <p className="text-2xl font-bold text-foreground">
                                                        Bs {cliente.totalPendiente.toLocaleString()}
                                                    </p>
                                                </div>

                                                {/* Expand Button */}
                                                <ChevronDown
                                                    className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <>
                                            <div className="border-t border-border">
                                                {/* Summary */}
                                                <div className="px-6 py-4 bg-muted/30 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-1">
                                                        <p className="text-sm text-muted-foreground">Total Pagado</p>
                                                        <p className="text-xl font-semibold text-accent">
                                                            Bs {cliente.totalPagado.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm text-muted-foreground">Total Pendiente</p>
                                                        <p className="text-xl font-semibold text-destructive">
                                                            Bs {cliente.totalPendiente.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm text-muted-foreground">Cuotas Totales</p>
                                                        <p className="text-xl font-semibold">
                                                            {cliente.pagos.length} ({cliente.pagosPendientes} pendientes)
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Table */}
                                                <div className="px-6 py-4 space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-semibold text-sm">Detalles de Cuotas</h4>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => generarReporteCliente(cliente)}
                                                        >
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            Reporte
                                                        </Button>
                                                    </div>

                                                    <div className="overflow-x-auto rounded-lg border border-border">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="bg-muted border-b border-border">
                                                                    <th className="text-left p-3 font-semibold">Cuota</th>
                                                                    <th className="text-left p-3 font-semibold">Monto</th>
                                                                    <th className="text-left p-3 font-semibold">Vencimiento</th>
                                                                    <th className="text-left p-3 font-semibold">Estado</th>
                                                                    <th className="text-left p-3 font-semibold">Pagado</th>
                                                                    <th className="text-center p-3 font-semibold">Acción</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border">
                                                                {cliente.pagos.map((pago) => (
                                                                    <tr key={pago.id} className="hover:bg-muted/50 transition-colors">
                                                                        <td className="p-3 font-medium"># {pago.numero_cuota}</td>
                                                                        <td className="p-3">Bs {pago.monto_cuota.toLocaleString()}</td>
                                                                        <td className="p-3">
                                                                            {format(new Date(pago.fecha_vencimiento), "dd MMM yyyy", { locale: es })}
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <Badge variant={getEstadoBadgeVariant(pago.estado, pago.fecha_vencimiento)}>
                                                                                {getEstadoText(pago.estado, pago.fecha_vencimiento)}
                                                                            </Badge>
                                                                        </td>
                                                                        <td className="p-3">
                                                                            {pago.estado === "pagado" ? (
                                                                                <span className="text-accent font-medium">
                                                                                    Bs {(pago.monto_pagado || 0).toLocaleString()}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-muted-foreground">-</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-3 text-center">
                                                                            {pago.estado !== "pagado" && (
                                                                                <Dialog open={isPaymentDialogOpen && selectedPago?.id === pago.id} onOpenChange={setIsPaymentDialogOpen}>
                                                                                    <DialogTrigger asChild>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            className="h-8 px-3 text-xs"
                                                                                            onClick={() => {
                                                                                                setSelectedPago(pago);
                                                                                                setMontoPago(pago.monto_cuota.toString());
                                                                                            }}
                                                                                        >
                                                                                            Pagar
                                                                                        </Button>
                                                                                    </DialogTrigger>
                                                                                    <DialogContent className="sm:max-w-md">
                                                                                        <DialogHeader>
                                                                                            <DialogTitle>Registrar Pago de Cuota</DialogTitle>
                                                                                        </DialogHeader>
                                                                                        <div className="space-y-5">
                                                                                            {/* Client Info */}
                                                                                            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                                                                                                <div>
                                                                                                    <p className="text-xs text-muted-foreground">Cliente</p>
                                                                                                    <p className="font-semibold">
                                                                                                        {selectedPago?.ventas.clientes.nombre} {selectedPago?.ventas.clientes.apellido}
                                                                                                    </p>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <p className="text-xs text-muted-foreground">Cuota</p>
                                                                                                    <p className="font-semibold">Cuota # {selectedPago?.numero_cuota}</p>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <p className="text-xs text-muted-foreground">Monto de la Cuota</p>
                                                                                                    <p className="text-lg font-semibold text-primary">
                                                                                                        Bs {selectedPago?.monto_cuota.toLocaleString()}
                                                                                                    </p>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Payment Input */}
                                                                                            <div>
                                                                                                <Label htmlFor="monto" className="text-sm font-semibold">Monto a Pagar *</Label>
                                                                                                <Input
                                                                                                    id="monto"
                                                                                                    type="number"
                                                                                                    step="0.01"
                                                                                                    value={montoPago}
                                                                                                    onChange={(e) => setMontoPago(e.target.value)}
                                                                                                    placeholder="0.00"
                                                                                                    className="mt-2 text-lg"
                                                                                                />
                                                                                            </div>

                                                                                            {/* Actions */}
                                                                                            <div className="flex gap-2 justify-end pt-2">
                                                                                                <Button
                                                                                                    variant="outline"
                                                                                                    onClick={() => setIsPaymentDialogOpen(false)}
                                                                                                >
                                                                                                    Cancelar
                                                                                                </Button>
                                                                                                <Button onClick={registrarPago} className="gap-2">
                                                                                                    <DollarSign className="h-4 w-4" />
                                                                                                    Registrar Pago
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </DialogContent>
                                                                                </Dialog>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
