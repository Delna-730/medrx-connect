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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      medicines: {
        Row: {
          batch_number: string | null
          category_id: string | null
          created_at: string
          current_stock: number
          description: string | null
          expiry_date: string | null
          generic_name: string | null
          gst_percent: number
          hsn_code: string | null
          id: string
          image_url: string | null
          is_active: boolean
          manufacturer: string
          manufacturing_date: string | null
          minimum_stock_alert: number
          mrp: number
          name: string
          pack_size: string | null
          strip_size: number | null
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          batch_number?: string | null
          category_id?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          expiry_date?: string | null
          generic_name?: string | null
          gst_percent?: number
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          manufacturer: string
          manufacturing_date?: string | null
          minimum_stock_alert?: number
          mrp?: number
          name: string
          pack_size?: string | null
          strip_size?: number | null
          updated_at?: string
          wholesale_price?: number
        }
        Update: {
          batch_number?: string | null
          category_id?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          expiry_date?: string | null
          generic_name?: string | null
          gst_percent?: number
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          manufacturer?: string
          manufacturing_date?: string | null
          minimum_stock_alert?: number
          mrp?: number
          name?: string
          pack_size?: string | null
          strip_size?: number | null
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      retailers: {
        Row: {
          address: string
          approved_at: string | null
          approved_by: string | null
          city: string
          contact_email: string
          contact_phone: string
          created_at: string
          credit_limit: number
          drug_license_number: string
          gst_number: string | null
          id: string
          outstanding_balance: number
          owner_name: string
          pharmacy_name: string
          pincode: string
          rejection_reason: string | null
          state: string
          status: Database["public"]["Enums"]["retailer_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          approved_at?: string | null
          approved_by?: string | null
          city: string
          contact_email: string
          contact_phone: string
          created_at?: string
          credit_limit?: number
          drug_license_number: string
          gst_number?: string | null
          id?: string
          outstanding_balance?: number
          owner_name: string
          pharmacy_name: string
          pincode: string
          rejection_reason?: string | null
          state: string
          status?: Database["public"]["Enums"]["retailer_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          approved_at?: string | null
          approved_by?: string | null
          city?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          credit_limit?: number
          drug_license_number?: string
          gst_number?: string | null
          id?: string
          outstanding_balance?: number
          owner_name?: string
          pharmacy_name?: string
          pincode?: string
          rejection_reason?: string | null
          state?: string
          status?: Database["public"]["Enums"]["retailer_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "retailer"
      retailer_status: "pending" | "approved" | "rejected"
      stock_status: "in_stock" | "low_stock" | "out_of_stock"
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
    Enums: {
      app_role: ["admin", "retailer"],
      retailer_status: ["pending", "approved", "rejected"],
      stock_status: ["in_stock", "low_stock", "out_of_stock"],
    },
  },
} as const
