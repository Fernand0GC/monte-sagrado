-- Crear tabla de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  cedula TEXT UNIQUE NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  fecha_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de terrenos/lotes
CREATE TABLE public.terrenos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_lote TEXT UNIQUE NOT NULL,
  seccion TEXT NOT NULL,
  manzana TEXT NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('nicho', 'boveda', 'mausoleo')),
  dimensiones TEXT,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'vendido', 'reservado')),
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de ventas
CREATE TABLE public.ventas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  terreno_id UUID NOT NULL REFERENCES public.terrenos(id),
  precio_total DECIMAL(12,2) NOT NULL,
  tipo_pago TEXT NOT NULL CHECK (tipo_pago IN ('contado', 'credito')),
  fecha_venta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pagada', 'cancelada')),
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de pagos para créditos
CREATE TABLE public.pagos_credito (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venta_id UUID NOT NULL REFERENCES public.ventas(id),
  numero_cuota INTEGER NOT NULL,
  monto_cuota DECIMAL(12,2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago TIMESTAMP WITH TIME ZONE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido')),
  monto_pagado DECIMAL(12,2) DEFAULT 0,
  interes_aplicado DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de historial de clientes eliminados
CREATE TABLE public.clientes_historial (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id_original UUID NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  cedula TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  fecha_registro TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_eliminacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  motivo_eliminacion TEXT,
  eliminado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terrenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_historial ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para usuarios autenticados (administradores)
-- Clientes
CREATE POLICY "Administradores pueden gestionar clientes" 
ON public.clientes 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Terrenos
CREATE POLICY "Administradores pueden gestionar terrenos" 
ON public.terrenos 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Ventas
CREATE POLICY "Administradores pueden gestionar ventas" 
ON public.ventas 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Pagos de crédito
CREATE POLICY "Administradores pueden gestionar pagos" 
ON public.pagos_credito 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Historial de clientes
CREATE POLICY "Administradores pueden ver historial" 
ON public.clientes_historial 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Crear función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Crear triggers para actualizar timestamps
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_terrenos_updated_at
  BEFORE UPDATE ON public.terrenos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ventas_updated_at
  BEFORE UPDATE ON public.ventas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pagos_credito_updated_at
  BEFORE UPDATE ON public.pagos_credito
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Crear función para mover cliente al historial
CREATE OR REPLACE FUNCTION public.mover_cliente_a_historial(
  cliente_uuid UUID,
  motivo TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  cliente_record RECORD;
BEGIN
  -- Obtener datos del cliente
  SELECT * INTO cliente_record FROM public.clientes WHERE id = cliente_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;
  
  -- Insertar en historial
  INSERT INTO public.clientes_historial (
    cliente_id_original,
    nombre,
    apellido,
    cedula,
    telefono,
    email,
    direccion,
    fecha_registro,
    motivo_eliminacion,
    eliminado_por
  ) VALUES (
    cliente_record.id,
    cliente_record.nombre,
    cliente_record.apellido,
    cliente_record.cedula,
    cliente_record.telefono,
    cliente_record.email,
    cliente_record.direccion,
    cliente_record.fecha_registro,
    motivo,
    auth.uid()
  );
  
  -- Marcar cliente como inactivo en lugar de eliminarlo
  UPDATE public.clientes SET activo = false WHERE id = cliente_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear función para calcular cuotas de crédito
CREATE OR REPLACE FUNCTION public.generar_cuotas_credito(
  venta_uuid UUID,
  num_cuotas INTEGER,
  tasa_interes DECIMAL DEFAULT 0.10
)
RETURNS VOID AS $$
DECLARE
  venta_record RECORD;
  monto_con_interes DECIMAL;
  monto_cuota DECIMAL;
  i INTEGER;
BEGIN
  -- Obtener datos de la venta
  SELECT * INTO venta_record FROM public.ventas WHERE id = venta_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;
  
  -- Calcular monto total con interés
  monto_con_interes := venta_record.precio_total * (1 + tasa_interes);
  monto_cuota := monto_con_interes / num_cuotas;
  
  -- Generar cuotas
  FOR i IN 1..num_cuotas LOOP
    INSERT INTO public.pagos_credito (
      venta_id,
      numero_cuota,
      monto_cuota,
      fecha_vencimiento,
      interes_aplicado
    ) VALUES (
      venta_uuid,
      i,
      monto_cuota,
      (venta_record.fecha_venta + INTERVAL '1 month' * i)::DATE,
      venta_record.precio_total * tasa_interes / num_cuotas
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;