import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, History } from "lucide-react";

interface ClienteHistorial {
  id: string;
  cliente_id_original: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  fecha_registro: string;
  fecha_eliminacion: string;
  motivo_eliminacion: string | null;
}

export function HistorialView() {
  const [historial, setHistorial] = useState<ClienteHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadHistorial();
  }, []);

  const loadHistorial = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes_historial')
        .select('*')
        .order('fecha_eliminacion', { ascending: false });

      if (error) throw error;
      setHistorial(data || []);
    } catch (error) {
      console.error('Error loading historial:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el historial de clientes",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistorial = historial.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cedula.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8" />
          Historial de Clientes
        </h2>
        <p className="text-muted-foreground">
          Registro de todos los clientes que han sido eliminados del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes Eliminados</CardTitle>
          <CardDescription>
            {historial.length} cliente(s) en el historial
          </CardDescription>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, apellido o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <p>Cargando historial...</p>
            </div>
          ) : historial.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">No hay clientes en el historial</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead>Fecha Eliminación</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistorial.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">
                      {cliente.nombre} {cliente.apellido}
                    </TableCell>
                    <TableCell>{cliente.cedula}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {cliente.telefono && (
                          <div>{cliente.telefono}</div>
                        )}
                        {cliente.email && (
                          <div className="text-muted-foreground">{cliente.email}</div>
                        )}
                        {!cliente.telefono && !cliente.email && (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(cliente.fecha_registro).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(cliente.fecha_eliminacion).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {cliente.motivo_eliminacion || "No especificado"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        Eliminado
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filteredHistorial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {historial.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Eliminados
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {historial.filter(c => 
                    new Date(c.fecha_eliminacion).getMonth() === new Date().getMonth() &&
                    new Date(c.fecha_eliminacion).getFullYear() === new Date().getFullYear()
                  ).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Este Mes
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {historial.filter(c => 
                    new Date(c.fecha_eliminacion).getFullYear() === new Date().getFullYear()
                  ).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Este Año
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}