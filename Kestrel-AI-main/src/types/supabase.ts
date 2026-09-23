export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string | null
          financial_modeling_prep_key: string | null
          id: string
          market_data_key: string | null
          openai_key: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          financial_modeling_prep_key?: string | null
          id?: string
          market_data_key?: string | null
          openai_key?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          financial_modeling_prep_key?: string | null
          id?: string
          market_data_key?: string | null
          openai_key?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      company_data_cache: {
        Row: {
          cached_at: string | null
          created_at: string | null
          data: Json
          id: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          cached_at?: string | null
          created_at?: string | null
          data: Json
          id?: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          cached_at?: string | null
          created_at?: string | null
          data?: Json
          id?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      market_index_companies: {
        Row: {
          dividend_yield: number | null
          id: string
          index_name: string
          industry: string | null
          last_updated: string | null
          market_cap: number | null
          name: string
          price: number | null
          sector: string | null
          symbol: string
        }
        Insert: {
          dividend_yield?: number | null
          id?: string
          index_name: string
          industry?: string | null
          last_updated?: string | null
          market_cap?: number | null
          name: string
          price?: number | null
          sector?: string | null
          symbol: string
        }
        Update: {
          dividend_yield?: number | null
          id?: string
          index_name?: string
          industry?: string | null
          last_updated?: string | null
          market_cap?: number | null
          name?: string
          price?: number | null
          sector?: string | null
          symbol?: string
        }
        Relationships: []
      }
      query_results: {
        Row: {
          created_at: string | null
          id: string
          query_text: string
          result_data: Json | null
          sql_query: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query_text: string
          result_data?: Json | null
          sql_query?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query_text?: string
          result_data?: Json | null
          sql_query?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sp500_companies: {
        Row: {
          dividend_yield: number | null
          id: number
          industry: string | null
          last_updated: string | null
          market_cap: number | null
          name: string | null
          price: number | null
          sector: string | null
          symbol: string
        }
        Insert: {
          dividend_yield?: number | null
          id?: number
          industry?: string | null
          last_updated?: string | null
          market_cap?: number | null
          name?: string | null
          price?: number | null
          sector?: string | null
          symbol: string
        }
        Update: {
          dividend_yield?: number | null
          id?: number
          industry?: string | null
          last_updated?: string | null
          market_cap?: number | null
          name?: string | null
          price?: number | null
          sector?: string | null
          symbol?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
