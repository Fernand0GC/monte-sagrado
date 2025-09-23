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
import { Plus, Edit, Trash2, Search, MapPin } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Terreno {
  id: string;
  numero_lote: string;
  seccion: string;
  manzana: string;
  precio: number;
  tipo: 'nicho' | 'boveda' | 'mausoleo';
  dimensiones: string | null;
  estado: 'disponible' | 'vendido' | 'reservado';
  descripcion: string | null;
}

export function TerrenosView() {
  const [terrenos, setTerrenos] = useState<Terreno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerreno, setEditingTerreno] = useState<Terreno | null>(null);
  const [formData, setFormData] = useState({
    numero_lote: "",
    seccion: "",
    manzana: "",
    precio: "",
    tipo: "" as 'nicho' | 'boveda' | 'mausoleo' | "",
    dimensiones: "",
    estado: "disponible" as 'disponible' | 'vendido' | 'reservado',
    descripcion: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTerrenos();
  }, []);

  const loadTerrenos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('terrenos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTerrenos((data || []) as Terreno[]);
    } catch (error) {
      console.error('Error loading terrenos:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los terrenos",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        precio: parseFloat(formData.precio)
      };

      if (editingTerreno) {
        const { error } = await supabase
          .from('terrenos')
          .update(dataToSave)
          .eq('id', editingTerreno.id);

        if (error) throw error;
        toast({ title: "Terreno actualizado exitosamente" });
      } else {
        const { error } = await supabase
          .from('terrenos')
          .insert([dataToSave]);

        if (error) throw error;
        toast({ title: "Terreno registrado exitosamente" });
      }

      setDialogOpen(false);
      setEditingTerreno(null);
      resetForm();
      loadTerrenos();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al guardar el terreno",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      numero_lote: "",
      seccion: "",
      manzana: "",
      precio: "",
      tipo: "",
      dimensiones: "",
      estado: "disponible",
      descripcion: "",
    });
  };

  const handleEdit = (terreno: Terreno) => {
    setEditingTerreno(terreno);
    setFormData({
      numero_lote: terreno.numero_lote,
      seccion: terreno.seccion,
      manzana: terreno.manzana,
      precio: terreno.precio.toString(),
      tipo: terreno.tipo,
      dimensiones: terreno.dimensiones || "",
      estado: terreno.estado,
      descripcion: terreno.descripcion || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (terreno: Terreno) => {
    try {
      const { error } = await supabase
        .from('terrenos')
        .delete()
        .eq('id', terreno.id);

      if (error) throw error;
      
      toast({ title: "Terreno eliminado exitosamente" });
      loadTerrenos();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al eliminar el terreno",
      });
    }
  };

  const filteredTerrenos = terrenos.filter(terreno =>
    terreno.numero_lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terreno.seccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terreno.manzana.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNewTerrenoDialog = () => {
    setEditingTerreno(null);
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
      case 'disponible':
        return <Badge variant="default">Disponible</Badge>;
      case 'vendido':
        return <Badge variant="destructive">Vendido</Badge>;
      case 'reservado':
        return <Badge variant="secondary">Reservado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'nicho':
        return <Badge variant="outline">Nicho</Badge>;
      case 'boveda':
        return <Badge variant="outline">Bóveda</Badge>;
      case 'mausoleo':
        return <Badge variant="outline">Mausoleo</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Gestión de Terrenos
          </h2>
          <p className="text-muted-foreground">
            Administra todos los lotes, nichos, bóvedas y mausoleos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewTerrenoDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Terreno
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingTerreno ? "Editar Terreno" : "Nuevo Terreno"}
              </DialogTitle>
              <DialogDescription>
                {editingTerreno 
                  ? "Modifica la información del terreno" 
                  : "Ingresa la información del nuevo terreno"
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero_lote">Número de Lote *</Label>
                    <Input
                      id="numero_lote"
                      value={formData.numero_lote}
                      onChange={(e) => setFormData({ ...formData, numero_lote: e.target.value })}
                      placeholder="A-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seccion">Sección *</Label>
                    <Input
                      id="seccion"
                      value={formData.seccion}
                      onChange={(e) => setFormData({ ...formData, seccion: e.target.value })}
                      placeholder="A"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manzana">Manzana *</Label>
                    <Input
                      id="manzana"
                      value={formData.manzana}
                      onChange={(e) => setFormData({ ...formData, manzana: e.target.value })}
                      placeholder="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="precio">Precio *</Label>
                    <Input
                      id="precio"
                      type="number"
                      step="0.01"
                      value={formData.precio}
                      onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                      placeholder="50000.00"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: 'nicho' | 'boveda' | 'mausoleo') => 
                        setFormData({ ...formData, tipo: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nicho">Nicho</SelectItem>
                        <SelectItem value="boveda">Bóveda</SelectItem>
                        <SelectItem value="mausoleo">Mausoleo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(value: 'disponible' | 'vendido' | 'reservado') => 
                        setFormData({ ...formData, estado: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="vendido">Vendido</SelectItem>
                        <SelectItem value="reservado">Reservado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensiones">Dimensiones</Label>
                  <Input
                    id="dimensiones"
                    value={formData.dimensiones}
                    onChange={(e) => setFormData({ ...formData, dimensiones: e.target.value })}
                    placeholder="2m x 1m x 2m"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción adicional del terreno..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingTerreno ? "Actualizar" : "Registrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Terrenos</CardTitle>
          <CardDescription>
            {terrenos.length} terreno(s) registrado(s)
          </CardDescription>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar por número de lote, sección o manzana..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando terrenos...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Dimensiones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTerrenos.map((terreno) => (
                  <TableRow key={terreno.id}>
                    <TableCell className="font-medium">
                      {terreno.numero_lote}
                    </TableCell>
                    <TableCell>
                      Sección {terreno.seccion}, Manzana {terreno.manzana}
                    </TableCell>
                    <TableCell>
                      {getTipoBadge(terreno.tipo)}
                    </TableCell>
                    <TableCell>{formatCurrency(terreno.precio)}</TableCell>
                    <TableCell>{terreno.dimensiones || "N/A"}</TableCell>
                    <TableCell>
                      {getEstadoBadge(terreno.estado)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(terreno)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar terreno?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente el terreno {terreno.numero_lote}.
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(terreno)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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