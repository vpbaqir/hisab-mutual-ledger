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
      confirmations: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          id: string
          repayment_id: string | null
          transaction_id: string
          type: Database["public"]["Enums"]["confirmation_type"]
          user_id: string
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: string
          repayment_id?: string | null
          transaction_id: string
          type?: Database["public"]["Enums"]["confirmation_type"]
          user_id: string
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: string
          repayment_id?: string | null
          transaction_id?: string
          type?: Database["public"]["Enums"]["confirmation_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_snapshots: {
        Row: {
          avatar_snapshot: string | null
          created_at: string
          id: string
          name_snapshot: string
          phone_snapshot: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          avatar_snapshot?: string | null
          created_at?: string
          id?: string
          name_snapshot: string
          phone_snapshot: string
          transaction_id: string
          user_id: string
        }
        Update: {
          avatar_snapshot?: string | null
          created_at?: string
          id?: string
          name_snapshot?: string
          phone_snapshot?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_snapshots_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_demo: boolean
          phone: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          is_demo?: boolean
          phone: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_demo?: boolean
          phone?: string
        }
        Relationships: []
      }
      repayments: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          id: string
          initiated_by: string
          status: Database["public"]["Enums"]["repayment_status"]
          transaction_id: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          initiated_by: string
          status?: Database["public"]["Enums"]["repayment_status"]
          transaction_id: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          initiated_by?: string
          status?: Database["public"]["Enums"]["repayment_status"]
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repayments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          activated_at: string | null
          amount: number
          borrower_id: string | null
          counterparty_name: string
          counterparty_phone: string
          created_at: string
          creator_id: string
          due_date: string | null
          id: string
          invite_token: string
          is_demo: boolean
          lender_id: string | null
          note: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["transaction_status"]
        }
        Insert: {
          activated_at?: string | null
          amount: number
          borrower_id?: string | null
          counterparty_name?: string
          counterparty_phone?: string
          created_at?: string
          creator_id: string
          due_date?: string | null
          id?: string
          invite_token?: string
          is_demo?: boolean
          lender_id?: string | null
          note?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
        }
        Update: {
          activated_at?: string | null
          amount?: number
          borrower_id?: string | null
          counterparty_name?: string
          counterparty_phone?: string
          created_at?: string
          creator_id?: string
          due_date?: string | null
          id?: string
          invite_token?: string
          is_demo?: boolean
          lender_id?: string | null
          note?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_transaction: { Args: { _tx: string }; Returns: boolean }
      current_phone: { Args: never; Returns: string }
      shares_transaction: { Args: { _other: string }; Returns: boolean }
    }
    Enums: {
      confirmation_type: "create" | "repayment"
      repayment_status: "pending" | "confirmed" | "rejected"
      transaction_status:
        | "pending"
        | "active"
        | "partial"
        | "settled"
        | "disputed"
        | "rejected"
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
      confirmation_type: ["create", "repayment"],
      repayment_status: ["pending", "confirmed", "rejected"],
      transaction_status: [
        "pending",
        "active",
        "partial",
        "settled",
        "disputed",
        "rejected",
      ],
    },
  },
} as const
