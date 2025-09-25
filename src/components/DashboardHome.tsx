import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, MapPin, ShoppingCart, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalClientes: number;
  terrenosDisponibles: number;
  totalVentas: number;
  ingresosMensuales: number;
  ventasEsteMes: number;
  clientesActivos: number;
}

export function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    terrenosDisponibles: 0,
    totalVentas: 0,
    ingresosMensuales: 0,
    ventasEsteMes: 0,
    clientesActivos: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // Obtener clientes activos
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id')
        .eq('activo', true);

      // Obtener terrenos disponibles
      const { data: terrenosData } = await supabase
        .from('terrenos')
        .select('id')
        .eq('estado', 'disponible');

      // Obtener total de ventas
      const { data: ventasData } = await supabase
        .from('ventas')
        .select('id, precio_total, fecha_venta')
        .neq('estado', 'cancelada');

      // Calcular ingresos del mes actual
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Obtener ventas al contado del mes (se incluye el monto completo)
      const { data: ventasContadoData } = await supabase
        .from('ventas')
        .select('precio_total')
        .eq('tipo_pago', 'contado')
        .gte('fecha_venta', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
        .lt('fecha_venta', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .neq('estado', 'cancelada');

      // Obtener pagos realmente efectuados en el mes para ventas a crédito
      const { data: pagosCreditoData } = await supabase
        .from('pagos_credito')
        .select('monto_pagado')
        .not('fecha_pago', 'is', null)
        .gte('fecha_pago', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
        .lt('fecha_pago', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`);

      const ingresosContado = ventasContadoData?.reduce((sum, venta) => sum + Number(venta.precio_total), 0) || 0;
      const ingresosCredito = pagosCreditoData?.reduce((sum, pago) => sum + Number(pago.monto_pagado), 0) || 0;
      const ingresosMensuales = ingresosContado + ingresosCredito;

      // Para las ventas del mes, contar todas las ventas sin importar tipo de pago
      const { data: ventasMesData } = await supabase
        .from('ventas')
        .select('id')
        .gte('fecha_venta', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
        .lt('fecha_venta', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .neq('estado', 'cancelada');
      const ventasEsteMes = ventasMesData?.length || 0;

      setStats({
        totalClientes: clientesData?.length || 0,
        terrenosDisponibles: terrenosData?.length || 0,
        totalVentas: ventasData?.length || 0,
        ingresosMensuales,
        ventasEsteMes,
        clientesActivos: clientesData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las estadísticas del dashboard",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cargando...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-6 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-sage/10 to-mint/10 p-6 rounded-lg">
          <h2 className="text-3xl font-bold text-sage">Dashboard</h2>
          <p className="text-earth">
            Resumen general del sistema Monte Sagrado
          </p>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-sage/20 hover:shadow-lg hover:shadow-sage/10 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-sage/5">
            <CardTitle className="text-sm font-medium text-sage">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-sage" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-earth">{stats.clientesActivos}</div>
            <p className="text-xs text-muted-foreground">
              Total de clientes registrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-mint/30 hover:shadow-lg hover:shadow-mint/10 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-mint/10">
            <CardTitle className="text-sm font-medium text-sage">Terrenos Disponibles</CardTitle>
            <MapPin className="h-4 w-4 text-sage" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-earth">{stats.terrenosDisponibles}</div>
            <p className="text-xs text-muted-foreground">
              Lotes listos para venta
            </p>
          </CardContent>
        </Card>

        <Card className="border-earth/30 hover:shadow-lg hover:shadow-earth/10 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-earth/5">
            <CardTitle className="text-sm font-medium text-earth">Total Ventas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-earth" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-sage">{stats.totalVentas}</div>
            <p className="text-xs text-muted-foreground">
              Ventas realizadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-sage/30 bg-gradient-to-br from-sage/5 to-mint/5 hover:shadow-lg hover:shadow-sage/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-sage">Ingresos del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-sage" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-earth">{formatCurrency(stats.ingresosMensuales)}</div>
            <p className="text-xs text-muted-foreground">
              Ingresos de {new Date().toLocaleDateString('es-DO', { month: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-mint/30 hover:shadow-lg hover:shadow-mint/10 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-mint/10">
            <CardTitle className="text-sm font-medium text-sage">Ventas Este Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-sage" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-earth">{stats.ventasEsteMes}</div>
            <p className="text-xs text-muted-foreground">
              Transacciones del mes actual
            </p>
          </CardContent>
        </Card>

        <Card className="border-earth/20 hover:shadow-lg hover:shadow-earth/10 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-earth/5">
            <CardTitle className="text-sm font-medium text-earth">Fecha Actual</CardTitle>
            <Calendar className="h-4 w-4 text-earth" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-lg font-bold text-sage">
              {new Date().toLocaleDateString('es-DO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}