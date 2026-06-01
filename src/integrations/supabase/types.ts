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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      request_bids: {
        Row: {
          amount: string
          created_at: string
          helper_id: string
          id: string
          note: string
          request_id: string
          status: Database["public"]["Enums"]["bid_status"]
          updated_at: string
        }
        Insert: {
          amount?: string
          created_at?: string
          helper_id: string
          id?: string
          note?: string
          request_id: string
          status?: Database["public"]["Enums"]["bid_status"]
          updated_at?: string
        }
        Update: {
          amount?: string
          created_at?: string
          helper_id?: string
          id?: string
          note?: string
          request_id?: string
          status?: Database["public"]["Enums"]["bid_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          photo_urls: string[]
          request_id: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          id?: string
          photo_urls?: string[]
          request_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          photo_urls?: string[]
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_ratings: {
        Row: {
          comment: string
          created_at: string
          id: string
          request_id: string
          requester_id: string
          stars: number
          taker_id: string
          updated_at: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          request_id: string
          requester_id: string
          stars: number
          taker_id: string
          updated_at?: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          request_id?: string
          requester_id?: string
          stars?: number
          taker_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          amount_cents: number | null
          completed_at: string | null
          created_at: string
          currency: string
          description: string
          fee_settled_at: string | null
          id: string
          lat: number
          lng: number
          location_label: string
          paid_at: string | null
          payment_status: string
          paypal_order_id: string | null
          paypal_payout_batch_id: string | null
          platform_fee_cents: number | null
          released_at: string | null
          reward: string
          taken_at: string | null
          taken_by: string | null
          taker_completed_at: string | null
          taker_payment_note: string
          taker_payment_qr_url: string | null
          taker_paypal_email: string | null
          title: string
          type: Database["public"]["Enums"]["request_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string
          fee_settled_at?: string | null
          id?: string
          lat: number
          lng: number
          location_label?: string
          paid_at?: string | null
          payment_status?: string
          paypal_order_id?: string | null
          paypal_payout_batch_id?: string | null
          platform_fee_cents?: number | null
          released_at?: string | null
          reward?: string
          taken_at?: string | null
          taken_by?: string | null
          taker_completed_at?: string | null
          taker_payment_note?: string
          taker_payment_qr_url?: string | null
          taker_paypal_email?: string | null
          title: string
          type: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string
          fee_settled_at?: string | null
          id?: string
          lat?: number
          lng?: number
          location_label?: string
          paid_at?: string | null
          payment_status?: string
          paypal_order_id?: string | null
          paypal_payout_batch_id?: string | null
          platform_fee_cents?: number | null
          released_at?: string | null
          reward?: string
          taken_at?: string | null
          taken_by?: string | null
          taker_completed_at?: string | null
          taker_payment_note?: string
          taker_payment_qr_url?: string | null
          taker_paypal_email?: string | null
          title?: string
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          current_period_end: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
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
      accept_request_bid: {
        Args: { _bid_id: string }
        Returns: {
          amount: string
          created_at: string
          helper_id: string
          id: string
          note: string
          request_id: string
          status: Database["public"]["Enums"]["bid_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "request_bids"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_view_request_bids: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_paid_user: { Args: { _user_id: string }; Returns: boolean }
      is_request_participant: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
      list_request_bids: {
        Args: { _request_id: string }
        Returns: {
          amount: string
          created_at: string
          helper_avatar_url: string
          helper_display_name: string
          helper_id: string
          id: string
          note: string
          request_id: string
          status: Database["public"]["Enums"]["bid_status"]
        }[]
      }
      orders_taken_this_month: { Args: { _user_id: string }; Returns: number }
      requests_posted_this_month: {
        Args: { _user_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      bid_status: "pending" | "accepted" | "rejected" | "withdrawn"
      request_type:
        | "snap"
        | "knowledge"
        | "action"
        | "object"
        | "rental"
        | "anything"
      subscription_tier: "free" | "paid"
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
      app_role: ["admin", "moderator", "user"],
      bid_status: ["pending", "accepted", "rejected", "withdrawn"],
      request_type: [
        "snap",
        "knowledge",
        "action",
        "object",
        "rental",
        "anything",
      ],
      subscription_tier: ["free", "paid"],
    },
  },
} as const
