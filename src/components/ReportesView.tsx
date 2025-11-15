import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Filter } from "lucide-react";
import { generateReporte, formatCurrency } from "@/lib/pdfGenerator";

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

export function ReportesView() {
    const [terrenos, setTerrenos] = useState<Terreno[]>([]);
    const [loading, setLoading] = useState(true);
    const [seccionFilter, setSeccionFilter] = useState<string>("");
    const [manzanaFilter, setManzanaFilter] = useState<string>("");
    const [estadoFilter, setEstadoFilter] = useState<string>("");
    const [secciones, setSecciones] = useState<string[]>([]);
    const [manzanas, setManzanas] = useState<string[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        loadTerrenos();
    }, []);

    useEffect(() => {
        // Extraer secciones y manzanas únicas
        const uniqueSecciones = [...new Set(terrenos.map(t => t.seccion))].sort();
        const uniqueManzanas = [...new Set(terrenos.map(t => t.manzana))].sort();
        setSecciones(uniqueSecciones);
        setManzanas(uniqueManzanas);
    }, [terrenos]);

    const loadTerrenos = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('terrenos')
                .select('*')
                .order('seccion', { ascending: true })
                .order('manzana', { ascending: true })
                .order('numero_lote', { ascending: true });

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

    const filteredTerrenos = terrenos.filter(terreno => {
        if (seccionFilter && terreno.seccion !== seccionFilter) return false;
        if (manzanaFilter && terreno.manzana !== manzanaFilter) return false;
        if (estadoFilter && terreno.estado !== estadoFilter) return false;
        return true;
    });

    const handleGeneratePDF = () => {
        const titulo = 'REPORTE DE TERRENOS';
        const filtros = {
            seccion: seccionFilter,
            manzana: manzanaFilter
        };

        const doc = generateReporte(titulo, filteredTerrenos, filtros);
        doc.save(`reporte_terrenos_${new Date().getTime()}.pdf`);

        toast({
            title: "PDF generado",
            description: "El reporte se ha descargado exitosamente",
        });
    };

    const clearFilters = () => {
        setSeccionFilter("");
        setManzanaFilter("");
        setEstadoFilter("");
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

    // Estadísticas
    const totalTerrenos = filteredTerrenos.length;
    const disponibles = filteredTerrenos.filter(t => t.estado === 'disponible').length;
    const vendidos = filteredTerrenos.filter(t => t.estado === 'vendido').length;
    const reservados = filteredTerrenos.filter(t => t.estado === 'reservado').length;
    const valorTotal = filteredTerrenos.reduce((sum, t) => sum + t.precio, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                        <FileText className="h-8 w-8" />
                        Reportes de Terrenos
                    </h2>
                    <p className="text-muted-foreground">
                        Genera reportes filtrados por sección o manzana
                    </p>
                </div>
                <Button onClick={handleGeneratePDF} disabled={filteredTerrenos.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                </Button>
            </div>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros
                    </CardTitle>
                    <CardDescription>
                        Filtra los terrenos por sección, manzana o estado
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="seccion">Sección</Label>
                            <Select value={seccionFilter} onValueChange={setSeccionFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas las secciones" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=" ">Todas</SelectItem>
                                    {secciones.map(seccion => (
                                        <SelectItem key={seccion} value={seccion}>
                                            Sección {seccion}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="manzana">Manzana</Label>
                            <Select value={manzanaFilter} onValueChange={setManzanaFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas las manzanas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=" ">Todas</SelectItem>
                                    {manzanas.map(manzana => (
                                        <SelectItem key={manzana} value={manzana}>
                                            Manzana {manzana}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="estado">Estado</Label>
                            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los estados" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=" ">Todos</SelectItem>
                                    <SelectItem value="disponible">Disponible</SelectItem>
                                    <SelectItem value="vendido">Vendido</SelectItem>
                                    <SelectItem value="reservado">Reservado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <Button variant="outline" onClick={clearFilters} className="w-full">
                                Limpiar Filtros
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Estadísticas */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTerrenos}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{disponibles}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{vendidos}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reservados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{reservados}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(valorTotal)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabla de resultados */}
            <Card>
                <CardHeader>
                    <CardTitle>Resultados</CardTitle>
                    <CardDescription>
                        {filteredTerrenos.length} terreno(s) encontrado(s)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Cargando terrenos...</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lote</TableHead>
                                    <TableHead>Sección</TableHead>
                                    <TableHead>Manzana</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Dimensiones</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTerrenos.map((terreno) => (
                                    <TableRow key={terreno.id}>
                                        <TableCell className="font-medium">
                                            {terreno.numero_lote}
                                        </TableCell>
                                        <TableCell>{terreno.seccion}</TableCell>
                                        <TableCell>{terreno.manzana}</TableCell>
                                        <TableCell>
                                            {getTipoBadge(terreno.tipo)}
                                        </TableCell>
                                        <TableCell>{formatCurrency(terreno.precio)}</TableCell>
                                        <TableCell>{terreno.dimensiones || "N/A"}</TableCell>
                                        <TableCell>
                                            {getEstadoBadge(terreno.estado)}
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
