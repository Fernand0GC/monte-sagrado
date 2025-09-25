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
import { Search, CreditCard, Calendar, DollarSign } from "lucide-react";

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

export default function PagosView() {
  const [pagos, setPagos] = useState<PagoCredito[]>([]);
  const [filteredPagos, setFilteredPagos] = useState<PagoCredito[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPago, setSelectedPago] = useState<PagoCredito | null>(null);
  const [montoPago, setMontoPago] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPagos();
  }, []);

  useEffect(() => {
    const filtered = pagos.filter((pago) => {
      const searchLower = searchTerm.toLowerCase();
      const clienteNombre = `${pago.ventas.clientes.nombre} ${pago.ventas.clientes.apellido}`.toLowerCase();
      const cedula = pago.ventas.clientes.cedula.toLowerCase();
      const lote = `${pago.ventas.terrenos.seccion}-${pago.ventas.terrenos.manzana}-${pago.ventas.terrenos.numero_lote}`.toLowerCase();
      
      return (
        clienteNombre.includes(searchLower) ||
        cedula.includes(searchLower) ||
        lote.includes(searchLower) ||
        pago.numero_cuota.toString().includes(searchLower)
      );
    });
    setFilteredPagos(filtered);
  }, [searchTerm, pagos]);

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

    try {
      const montoNumerico = parseFloat(montoPago);
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
        title: "Pago registrado",
        description: `Se registró el pago de $${montoNumerico.toLocaleString()} para la cuota ${selectedPago.numero_cuota}`,
      });

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

  if (loading) {
    return <div className="p-6">Cargando pagos...</div>;
  }

  const pagosPendientes = pagos.filter(p => p.estado !== "pagado");
  const pagosVencidos = pagos.filter(p => {
    const hoy = new Date();
    const vencimiento = new Date(p.fecha_vencimiento);
    return p.estado !== "pagado" && vencimiento < hoy;
  });
  const totalPendiente = pagosPendientes.reduce((sum, p) => sum + p.monto_cuota, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagosPendientes.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Vencidos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pagosVencidos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPendiente.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, cédula, lote o número de cuota..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos de Crédito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Terreno</th>
                  <th className="text-left p-2">Cuota</th>
                  <th className="text-left p-2">Monto</th>
                  <th className="text-left p-2">Vencimiento</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-left p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPagos.map((pago) => (
                  <tr key={pago.id} className="border-b">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">
                          {pago.ventas.clientes.nombre} {pago.ventas.clientes.apellido}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {pago.ventas.clientes.cedula}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      {pago.ventas.terrenos.seccion}-{pago.ventas.terrenos.manzana}-{pago.ventas.terrenos.numero_lote}
                    </td>
                    <td className="p-2">{pago.numero_cuota}</td>
                    <td className="p-2">${pago.monto_cuota.toLocaleString()}</td>
                    <td className="p-2">
                      {format(new Date(pago.fecha_vencimiento), "dd/MM/yyyy", { locale: es })}
                    </td>
                    <td className="p-2">
                      <Badge variant={getEstadoBadgeVariant(pago.estado, pago.fecha_vencimiento)}>
                        {getEstadoText(pago.estado, pago.fecha_vencimiento)}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {pago.estado !== "pagado" && (
                        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPago(pago);
                                setMontoPago(pago.monto_cuota.toString());
                              }}
                            >
                              Registrar Pago
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Registrar Pago</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Cliente</Label>
                                <p className="text-sm">
                                  {selectedPago?.ventas.clientes.nombre} {selectedPago?.ventas.clientes.apellido}
                                </p>
                              </div>
                              <div>
                                <Label>Cuota</Label>
                                <p className="text-sm">Cuota #{selectedPago?.numero_cuota}</p>
                              </div>
                              <div>
                                <Label>Monto de la Cuota</Label>
                                <p className="text-sm">${selectedPago?.monto_cuota.toLocaleString()}</p>
                              </div>
                              <div>
                                <Label htmlFor="monto">Monto a Pagar</Label>
                                <Input
                                  id="monto"
                                  type="number"
                                  step="0.01"
                                  value={montoPago}
                                  onChange={(e) => setMontoPago(e.target.value)}
                                  placeholder="Ingrese el monto"
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setIsPaymentDialogOpen(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button onClick={registrarPago}>
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
        </CardContent>
      </Card>
    </div>
  );
}