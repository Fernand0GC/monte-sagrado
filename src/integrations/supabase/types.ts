export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          activo: boolean
          apellido: string
          cedula: string
          created_at: string
          direccion: string | null
          email: string | null
          fecha_registro: string
          id: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido: string
          cedula: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          fecha_registro?: string
          id?: string
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          cedula?: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          fecha_registro?: string
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clientes_historial: {
        Row: {
          apellido: string
          cedula: string
          cliente_id_original: string
          created_at: string
          direccion: string | null
          eliminado_por: string | null
          email: string | null
          fecha_eliminacion: string
          fecha_registro: string
          id: string
          motivo_eliminacion: string | null
          nombre: string
          telefono: string | null
        }
        Insert: {
          apellido: string
          cedula: string
          cliente_id_original: string
          created_at?: string
          direccion?: string | null
          eliminado_por?: string | null
          email?: string | null
          fecha_eliminacion?: string
          fecha_registro: string
          id?: string
          motivo_eliminacion?: string | null
          nombre: string
          telefono?: string | null
        }
        Update: {
          apellido?: string
          cedula?: string
          cliente_id_original?: string
          created_at?: string
          direccion?: string | null
          eliminado_por?: string | null
          email?: string | null
          fecha_eliminacion?: string
          fecha_registro?: string
          id?: string
          motivo_eliminacion?: string | null
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      pagos_credito: {
        Row: {
          created_at: string
          estado: string
          fecha_pago: string | null
          fecha_vencimiento: string
          id: string
          interes_aplicado: number | null
          monto_cuota: number
          monto_pagado: number | null
          numero_cuota: number
          updated_at: string
          venta_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha_pago?: string | null
          fecha_vencimiento: string
          id?: string
          interes_aplicado?: number | null
          monto_cuota: number
          monto_pagado?: number | null
          numero_cuota: number
          updated_at?: string
          venta_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string
          id?: string
          interes_aplicado?: number | null
          monto_cuota?: number
          monto_pagado?: number | null
          numero_cuota?: number
          updated_at?: string
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_credito_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      terrenos: {
        Row: {
          created_at: string
          descripcion: string | null
          dimensiones: string | null
          estado: string
          id: string
          manzana: string
          numero_lote: string
          precio: number
          seccion: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          dimensiones?: string | null
          estado?: string
          id?: string
          manzana: string
          numero_lote: string
          precio: number
          seccion: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          dimensiones?: string | null
          estado?: string
          id?: string
          manzana?: string
          numero_lote?: string
          precio?: number
          seccion?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      ventas: {
        Row: {
          cliente_id: string
          created_at: string
          estado: string
          fecha_venta: string
          id: string
          observaciones: string | null
          precio_total: number
          terreno_id: string
          tipo_pago: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          estado?: string
          fecha_venta?: string
          id?: string
          observaciones?: string | null
          precio_total: number
          terreno_id: string
          tipo_pago: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          estado?: string
          fecha_venta?: string
          id?: string
          observaciones?: string | null
          precio_total?: number
          terreno_id?: string
          tipo_pago?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_terreno_id_fkey"
            columns: ["terreno_id"]
            isOneToOne: false
            referencedRelation: "terrenos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generar_cuotas_credito: {
        Args: { num_cuotas: number; tasa_interes?: number; venta_uuid: string }
        Returns: undefined
      }
      mover_cliente_a_historial: {
        Args: { cliente_uuid: string; motivo?: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
