import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, ShoppingCart, Eye } from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
}

interface Terreno {
  id: string;
  numero_lote: string;
  seccion: string;
  manzana: string;
  precio: number;
  tipo: string;
}

interface Venta {
  id: string;
  cliente_id: string;
  terreno_id: string;
  precio_total: number;
  tipo_pago: 'contado' | 'credito';
  fecha_venta: string;
  estado: 'activa' | 'pagada' | 'cancelada';
  observaciones: string | null;
  clientes: Cliente;
  terrenos: Terreno;
}

export function VentasView() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [terrenos, setTerrenos] = useState<Terreno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<string | null>(null);
  const [creditData, setCreditData] = useState({
    numCuotas: "",
    tasaInteres: "10"
  });
  const [formData, setFormData] = useState({
    cliente_id: "",
    terreno_id: "",
    precio_total: "",
    tipo_pago: "" as 'contado' | 'credito' | "",
    observaciones: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadVentas();
    loadClientes();
    loadTerrenosDisponibles();
  }, []);

  const loadVentas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          clientes (id, nombre, apellido, cedula),
          terrenos (id, numero_lote, seccion, manzana, precio, tipo)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVentas((data || []) as Venta[]);
    } catch (error) {
      console.error('Error loading ventas:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las ventas",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, apellido, cedula')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error loading clientes:', error);
    }
  };

  const loadTerrenosDisponibles = async () => {
    try {
      const { data, error } = await supabase
        .from('terrenos')
        .select('id, numero_lote, seccion, manzana, precio, tipo')
        .eq('estado', 'disponible')
        .order('numero_lote');

      if (error) throw error;
      setTerrenos(data || []);
    } catch (error) {
      console.error('Error loading terrenos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Crear la venta
      const { data: ventaData, error: ventaError } = await supabase
        .from('ventas')
        .insert([{
          ...formData,
          precio_total: parseFloat(formData.precio_total)
        }])
        .select()
        .single();

      if (ventaError) throw ventaError;

      // Actualizar estado del terreno a vendido
      const { error: terrenoError } = await supabase
        .from('terrenos')
        .update({ estado: 'vendido' })
        .eq('id', formData.terreno_id);

      if (terrenoError) throw terrenoError;

      toast({ title: "Venta registrada exitosamente" });

      // Si es a crédito, abrir diálogo para configurar cuotas
      if (formData.tipo_pago === 'credito') {
        setSelectedVenta(ventaData.id);
        setCreditDialogOpen(true);
      } else {
        setDialogOpen(false);
        resetForm();
      }

      loadVentas();
      loadTerrenosDisponibles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al registrar la venta",
      });
    }
  };

  const handleCreditSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedVenta) return;

      const { error } = await supabase.rpc('generar_cuotas_credito', {
        venta_uuid: selectedVenta,
        num_cuotas: parseInt(creditData.numCuotas),
        tasa_interes: parseFloat(creditData.tasaInteres) / 100
      });

      if (error) throw error;

      toast({ title: "Plan de crédito configurado exitosamente" });
      setCreditDialogOpen(false);
      setDialogOpen(false);
      resetForm();
      resetCreditForm();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al configurar el crédito",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      terreno_id: "",
      precio_total: "",
      tipo_pago: "",
      observaciones: "",
    });
  };

  const resetCreditForm = () => {
    setCreditData({
      numCuotas: "",
      tasaInteres: "10"
    });
    setSelectedVenta(null);
  };

  const handleTerrenoChange = (terrenoId: string) => {
    const terreno = terrenos.find(t => t.id === terrenoId);
    setFormData({
      ...formData,
      terreno_id: terrenoId,
      precio_total: terreno ? terreno.precio.toString() : ""
    });
  };

  const filteredVentas = ventas.filter(venta =>
    venta.clientes.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venta.clientes.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venta.clientes.cedula.includes(searchTerm) ||
    venta.terrenos.numero_lote.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNewVentaDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activa':
        return <Badge variant="default">Activa</Badge>;
      case 'pagada':
        return <Badge variant="secondary">Pagada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getTipoPagoBadge = (tipo: string) => {
    switch (tipo) {
      case 'contado':
        return <Badge variant="secondary">Contado</Badge>;
      case 'credito':
        return <Badge variant="outline">Crédito</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Gestión de Ventas
          </h2>
          <p className="text-muted-foreground">
            Registra y administra todas las ventas de terrenos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewVentaDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nueva Venta</DialogTitle>
              <DialogDescription>
                Registra una nueva venta de terreno
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente_id">Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre} {cliente.apellido} - {cliente.cedula}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terreno_id">Terreno *</Label>
                  <Select
                    value={formData.terreno_id}
                    onValueChange={handleTerrenoChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar terreno" />
                    </SelectTrigger>
                    <SelectContent>
                      {terrenos.map((terreno) => (
                        <SelectItem key={terreno.id} value={terreno.id}>
                          {terreno.numero_lote} - Secc. {terreno.seccion}, Mzn. {terreno.manzana} - {formatCurrency(terreno.precio)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio_total">Precio Total *</Label>
                  <Input
                    id="precio_total"
                    type="number"
                    step="0.01"
                    value={formData.precio_total}
                    onChange={(e) => setFormData({ ...formData, precio_total: e.target.value })}
                    placeholder="50000.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_pago">Tipo de Pago *</Label>
                  <Select
                    value={formData.tipo_pago}
                    onValueChange={(value: 'contado' | 'credito') => 
                      setFormData({ ...formData, tipo_pago: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contado">Pago al Contado</SelectItem>
                      <SelectItem value="credito">Pago a Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  Registrar Venta
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Diálogo para configuración de crédito */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Configurar Plan de Crédito</DialogTitle>
            <DialogDescription>
              Define las cuotas y la tasa de interés para el pago a crédito
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreditSetup}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="numCuotas">Número de Cuotas *</Label>
                <Input
                  id="numCuotas"
                  type="number"
                  min="1"
                  max="60"
                  value={creditData.numCuotas}
                  onChange={(e) => setCreditData({ ...creditData, numCuotas: e.target.value })}
                  placeholder="12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tasaInteres">Tasa de Interés Anual (%) *</Label>
                <Input
                  id="tasaInteres"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={creditData.tasaInteres}
                  onChange={(e) => setCreditData({ ...creditData, tasaInteres: e.target.value })}
                  placeholder="10.00"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Configurar Crédito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Ventas</CardTitle>
          <CardDescription>
            {ventas.length} venta(s) registrada(s)
          </CardDescription>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar por cliente o terreno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando ventas...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Terreno</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Tipo de Pago</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVentas.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell className="font-medium">
                      {venta.clientes.nombre} {venta.clientes.apellido}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        {venta.clientes.cedula}
                      </span>
                    </TableCell>
                    <TableCell>
                      {venta.terrenos.numero_lote}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        Secc. {venta.terrenos.seccion}, Mzn. {venta.terrenos.manzana}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(venta.precio_total)}</TableCell>
                    <TableCell>
                      {getTipoPagoBadge(venta.tipo_pago)}
                    </TableCell>
                    <TableCell>
                      {new Date(venta.fecha_venta).toLocaleDateString('es-DO')}
                    </TableCell>
                    <TableCell>
                      {getEstadoBadge(venta.estado)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}