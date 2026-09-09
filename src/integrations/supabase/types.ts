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
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount_mt: number
          created_at: string
          id: string
          paid: boolean
          payment_id: string
          referred_user_id: string
        }
        Insert: {
          affiliate_id: string
          amount_mt: number
          created_at?: string
          id?: string
          paid?: boolean
          payment_id: string
          referred_user_id: string
        }
        Update: {
          affiliate_id?: string
          amount_mt?: number
          created_at?: string
          id?: string
          paid?: boolean
          payment_id?: string
          referred_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          curso: string
          descricao: string
          id: string
          pages: number
          sections: Json
          status: string
          tema: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          curso?: string
          descricao?: string
          id?: string
          pages?: number
          sections?: Json
          status?: string
          tema: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          curso?: string
          descricao?: string
          id?: string
          pages?: number
          sections?: Json
          status?: string
          tema?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      history_items: {
        Row: {
          content: string | null
          created_at: string
          file_url: string | null
          href: string | null
          id: string
          kind: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          href?: string | null
          id?: string
          kind: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          href?: string | null
          id?: string
          kind?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["message_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mk_payouts: {
        Row: {
          amount_mt: number
          author_id: string
          created_at: string
          id: string
          numero_telefone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_mt: number
          author_id: string
          created_at?: string
          id?: string
          numero_telefone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_mt?: number
          author_id?: string
          created_at?: string
          id?: string
          numero_telefone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mk_payouts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mk_products: {
        Row: {
          author_id: string | null
          author_name: string
          created_at: string
          descricao: string
          disciplina: string
          ficheiro_url: string | null
          id: string
          nivel_ensino: Database["public"]["Enums"]["mk_level"]
          paginas: number
          preco_base: number
          rejeicao_motivo: string | null
          status: Database["public"]["Enums"]["mk_status"]
          tipo: Database["public"]["Enums"]["mk_type"]
          titulo: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          created_at?: string
          descricao?: string
          disciplina: string
          ficheiro_url?: string | null
          id?: string
          nivel_ensino: Database["public"]["Enums"]["mk_level"]
          paginas?: number
          preco_base: number
          rejeicao_motivo?: string | null
          status?: Database["public"]["Enums"]["mk_status"]
          tipo: Database["public"]["Enums"]["mk_type"]
          titulo: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          created_at?: string
          descricao?: string
          disciplina?: string
          ficheiro_url?: string | null
          id?: string
          nivel_ensino?: Database["public"]["Enums"]["mk_level"]
          paginas?: number
          preco_base?: number
          rejeicao_motivo?: string | null
          status?: Database["public"]["Enums"]["mk_status"]
          tipo?: Database["public"]["Enums"]["mk_type"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mk_products_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mk_sales: {
        Row: {
          author_id: string | null
          buyer_id: string | null
          buyer_name: string
          comissao_plataforma: number
          created_at: string
          erro_mensagem: string | null
          id: string
          metodo_pagamento: string
          mpesa_transaction_id: string | null
          numero_telefone: string | null
          preco_base: number
          product_id: string
          referencia_mpesa: string | null
          status_pagamento: Database["public"]["Enums"]["mk_pay_status"]
          updated_at: string
          valor_com_iva: number
          valor_iva: number
          valor_liquido_autor: number
        }
        Insert: {
          author_id?: string | null
          buyer_id?: string | null
          buyer_name?: string
          comissao_plataforma: number
          created_at?: string
          erro_mensagem?: string | null
          id?: string
          metodo_pagamento?: string
          mpesa_transaction_id?: string | null
          numero_telefone?: string | null
          preco_base: number
          product_id: string
          referencia_mpesa?: string | null
          status_pagamento?: Database["public"]["Enums"]["mk_pay_status"]
          updated_at?: string
          valor_com_iva: number
          valor_iva: number
          valor_liquido_autor: number
        }
        Update: {
          author_id?: string | null
          buyer_id?: string | null
          buyer_name?: string
          comissao_plataforma?: number
          created_at?: string
          erro_mensagem?: string | null
          id?: string
          metodo_pagamento?: string
          mpesa_transaction_id?: string | null
          numero_telefone?: string | null
          preco_base?: number
          product_id?: string
          referencia_mpesa?: string | null
          status_pagamento?: Database["public"]["Enums"]["mk_pay_status"]
          updated_at?: string
          valor_com_iva?: number
          valor_iva?: number
          valor_liquido_autor?: number
        }
        Relationships: [
          {
            foreignKeyName: "mk_sales_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mk_sales_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mk_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mk_products"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          api_response: Json | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          payment_reference: string
          phone_number: string
          plan: string
          provider: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          api_response?: Json | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payment_reference: string
          phone_number: string
          plan: string
          provider?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          api_response?: Json | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payment_reference?: string
          phone_number?: string
          plan?: string
          provider?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          affiliate_code: string
          apelido: string
          avatar_url: string | null
          created_at: string
          credits: number
          current_plan: string
          email: string
          emoji: string | null
          free_chats_used: number
          id: string
          nivel: Database["public"]["Enums"]["education_level"]
          nome: string
          plan_expires_at: string | null
          referred_by: string | null
          suspended: boolean
          telefone: string
          updated_at: string
        }
        Insert: {
          affiliate_code: string
          apelido: string
          avatar_url?: string | null
          created_at?: string
          credits?: number
          current_plan?: string
          email: string
          emoji?: string | null
          free_chats_used?: number
          id: string
          nivel?: Database["public"]["Enums"]["education_level"]
          nome: string
          plan_expires_at?: string | null
          referred_by?: string | null
          suspended?: boolean
          telefone: string
          updated_at?: string
        }
        Update: {
          affiliate_code?: string
          apelido?: string
          avatar_url?: string | null
          created_at?: string
          credits?: number
          current_plan?: string
          email?: string
          emoji?: string | null
          free_chats_used?: number
          id?: string
          nivel?: Database["public"]["Enums"]["education_level"]
          nome?: string
          plan_expires_at?: string | null
          referred_by?: string | null
          suspended?: boolean
          telefone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          content: string | null
          created_at: string
          href: string | null
          id: string
          kind: string
          ref: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          ref?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          ref?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          end_date: string
          id: string
          payment_id: string | null
          payment_reference: string | null
          plan: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          end_date: string
          id?: string
          payment_id?: string | null
          payment_reference?: string | null
          plan: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          end_date?: string
          id?: string
          payment_id?: string | null
          payment_reference?: string | null
          plan?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
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
      expire_subscriptions: { Args: never; Returns: undefined }
      generate_affiliate_code: { Args: never; Returns: string }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_commission_paid: { Args: { _id: string }; Returns: undefined }
      toggle_user_suspension: {
        Args: { _suspended: boolean; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      education_level: "secundario" | "superior"
      message_role: "user" | "assistant"
      mk_level: "secundario" | "universidade" | "instituto"
      mk_pay_status: "pendente" | "a_processar" | "confirmado" | "falhado"
      mk_status: "pendente" | "aprovado" | "rejeitado"
      mk_type: "ebook" | "modulo_exame" | "teste"
      payment_method: "mpesa" | "paypal" | "stripe"
      payment_status: "pendente" | "aprovado" | "rejeitado"
      plan_tier: "free" | "basico" | "premium" | "completo"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      education_level: ["secundario", "superior"],
      message_role: ["user", "assistant"],
      mk_level: ["secundario", "universidade", "instituto"],
      mk_pay_status: ["pendente", "a_processar", "confirmado", "falhado"],
      mk_status: ["pendente", "aprovado", "rejeitado"],
      mk_type: ["ebook", "modulo_exame", "teste"],
      payment_method: ["mpesa", "paypal", "stripe"],
      payment_status: ["pendente", "aprovado", "rejeitado"],
      plan_tier: ["free", "basico", "premium", "completo"],
    },
  },
} as const
