export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cashout_request: {
        Row: {
          account_no_enc: string | null
          bank_code: string | null
          clover_amount: number
          fee_krw: number
          gross_krw: number
          id: number
          member_id: string
          net_krw: number
          paid_at: string | null
          payout_id: string | null
          requested_at: string
          risk_flag: Database["public"]["Enums"]["risk_flag_enum"]
          status: Database["public"]["Enums"]["cashout_status_enum"]
          withholding_krw: number
        }
        Insert: {
          account_no_enc?: string | null
          bank_code?: string | null
          clover_amount: number
          fee_krw: number
          gross_krw: number
          id?: never
          member_id: string
          net_krw: number
          paid_at?: string | null
          payout_id?: string | null
          requested_at?: string
          risk_flag?: Database["public"]["Enums"]["risk_flag_enum"]
          status?: Database["public"]["Enums"]["cashout_status_enum"]
          withholding_krw: number
        }
        Update: {
          account_no_enc?: string | null
          bank_code?: string | null
          clover_amount?: number
          fee_krw?: number
          gross_krw?: number
          id?: never
          member_id?: string
          net_krw?: number
          paid_at?: string | null
          payout_id?: string | null
          requested_at?: string
          risk_flag?: Database["public"]["Enums"]["risk_flag_enum"]
          status?: Database["public"]["Enums"]["cashout_status_enum"]
          withholding_krw?: number
        }
        Relationships: [
          {
            foreignKeyName: "cashout_request_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      cheer: {
        Row: {
          clover_amount: number
          created_at: string
          deleted_at: string | null
          display_name: string | null
          goal_id: number
          id: number
          is_anonymous: boolean
          is_welcome: boolean
          message: string | null
          payment_id: number | null
          status: Database["public"]["Enums"]["cheer_status_enum"]
          supporter_ci: string | null
        }
        Insert: {
          clover_amount: number
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          goal_id: number
          id?: never
          is_anonymous?: boolean
          is_welcome?: boolean
          message?: string | null
          payment_id?: number | null
          status?: Database["public"]["Enums"]["cheer_status_enum"]
          supporter_ci?: string | null
        }
        Update: {
          clover_amount?: number
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          goal_id?: number
          id?: never
          is_anonymous?: boolean
          is_welcome?: boolean
          message?: string | null
          payment_id?: number | null
          status?: Database["public"]["Enums"]["cheer_status_enum"]
          supporter_ci?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cheer_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheer_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheer_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment"
            referencedColumns: ["id"]
          },
        ]
      }
      clover_balance: {
        Row: {
          clover_count: number
          member_id: string
          updated_at: string
        }
        Insert: {
          clover_count?: number
          member_id: string
          updated_at?: string
        }
        Update: {
          clover_count?: number
          member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clover_balance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      clover_ledger: {
        Row: {
          balance_after: number
          clover_delta: number
          created_at: string
          entry_type: Database["public"]["Enums"]["clover_entry_type_enum"]
          id: number
          member_id: string
          ref_id: number | null
          ref_type: string | null
        }
        Insert: {
          balance_after: number
          clover_delta: number
          created_at?: string
          entry_type: Database["public"]["Enums"]["clover_entry_type_enum"]
          id?: never
          member_id: string
          ref_id?: number | null
          ref_type?: string | null
        }
        Update: {
          balance_after?: number
          clover_delta?: number
          created_at?: string
          entry_type?: Database["public"]["Enums"]["clover_entry_type_enum"]
          id?: never
          member_id?: string
          ref_id?: number | null
          ref_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clover_ledger_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      goal: {
        Row: {
          closed_at: string | null
          created_at: string
          deleted_at: string | null
          due_date: string
          id: number
          member_id: string
          reason: string | null
          slug: string
          status: Database["public"]["Enums"]["goal_status_enum"]
          title: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date: string
          id?: never
          member_id: string
          reason?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["goal_status_enum"]
          title: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string
          id?: never
          member_id?: string
          reason?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["goal_status_enum"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verification: {
        Row: {
          birth_date: string | null
          ci: string | null
          di: string | null
          id: number
          is_adult: boolean
          member_id: string
          provider: string
          real_name: string | null
          verified_at: string
        }
        Insert: {
          birth_date?: string | null
          ci?: string | null
          di?: string | null
          id?: never
          is_adult?: boolean
          member_id: string
          provider?: string
          real_name?: string | null
          verified_at?: string
        }
        Update: {
          birth_date?: string | null
          ci?: string | null
          di?: string | null
          id?: never
          is_adult?: boolean
          member_id?: string
          provider?: string
          real_name?: string | null
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verification_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      lead: {
        Row: {
          campaign: string | null
          consented_at: string
          content: string | null
          created_at: string
          email: string | null
          id: number
          instagram_handle: string | null
          landing_path: string | null
          medium: string | null
          referrer: string | null
          source: string
          status: string
          submitter_hash: string | null
        }
        Insert: {
          campaign?: string | null
          consented_at: string
          content?: string | null
          created_at?: string
          email?: string | null
          id?: number
          instagram_handle?: string | null
          landing_path?: string | null
          medium?: string | null
          referrer?: string | null
          source?: string
          status?: string
          submitter_hash?: string | null
        }
        Update: {
          campaign?: string | null
          consented_at?: string
          content?: string | null
          created_at?: string
          email?: string | null
          id?: number
          instagram_handle?: string | null
          landing_path?: string | null
          medium?: string | null
          referrer?: string | null
          source?: string
          status?: string
          submitter_hash?: string | null
        }
        Relationships: []
      }
      member: {
        Row: {
          birth_date: string | null
          ci: string | null
          created_at: string
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status_enum"]
          nickname: string | null
          phone: string | null
          profile_image: string | null
          provider: string | null
          provider_id: string | null
        }
        Insert: {
          birth_date?: string | null
          ci?: string | null
          created_at?: string
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status_enum"]
          nickname?: string | null
          phone?: string | null
          profile_image?: string | null
          provider?: string | null
          provider_id?: string | null
        }
        Update: {
          birth_date?: string | null
          ci?: string | null
          created_at?: string
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status_enum"]
          nickname?: string | null
          phone?: string | null
          profile_image?: string | null
          provider?: string | null
          provider_id?: string | null
        }
        Relationships: []
      }
      notification: {
        Row: {
          alimtalk_status:
            | Database["public"]["Enums"]["alimtalk_status_enum"]
            | null
          channel: Database["public"]["Enums"]["notification_channel_enum"]
          created_at: string
          id: number
          member_id: string
          read: boolean
          type: Database["public"]["Enums"]["notification_type_enum"]
        }
        Insert: {
          alimtalk_status?:
            | Database["public"]["Enums"]["alimtalk_status_enum"]
            | null
          channel: Database["public"]["Enums"]["notification_channel_enum"]
          created_at?: string
          id?: never
          member_id: string
          read?: boolean
          type: Database["public"]["Enums"]["notification_type_enum"]
        }
        Update: {
          alimtalk_status?:
            | Database["public"]["Enums"]["alimtalk_status_enum"]
            | null
          channel?: Database["public"]["Enums"]["notification_channel_enum"]
          created_at?: string
          id?: never
          member_id?: string
          read?: boolean
          type?: Database["public"]["Enums"]["notification_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      payment: {
        Row: {
          amount_krw: number
          approved_at: string | null
          cancel_reconcile_required_at: string | null
          created_at: string
          id: number
          method: string | null
          order_id: string
          partial_cancel_reviewed_at: string | null
          payment_key: string | null
          pg_customer_key: string
          raw_response: Json | null
          receipt_url: string | null
          request_fingerprint: Json | null
          request_key: string | null
          status: Database["public"]["Enums"]["payment_status_enum"]
        }
        Insert: {
          amount_krw: number
          approved_at?: string | null
          cancel_reconcile_required_at?: string | null
          created_at?: string
          id?: never
          method?: string | null
          order_id: string
          partial_cancel_reviewed_at?: string | null
          payment_key?: string | null
          pg_customer_key?: string
          raw_response?: Json | null
          receipt_url?: string | null
          request_fingerprint?: Json | null
          request_key?: string | null
          status?: Database["public"]["Enums"]["payment_status_enum"]
        }
        Update: {
          amount_krw?: number
          approved_at?: string | null
          cancel_reconcile_required_at?: string | null
          created_at?: string
          id?: never
          method?: string | null
          order_id?: string
          partial_cancel_reviewed_at?: string | null
          payment_key?: string | null
          pg_customer_key?: string
          raw_response?: Json | null
          receipt_url?: string | null
          request_fingerprint?: Json | null
          request_key?: string | null
          status?: Database["public"]["Enums"]["payment_status_enum"]
        }
        Relationships: []
      }
      payment_log: {
        Row: {
          created_at: string
          detail: Json | null
          from_status: Database["public"]["Enums"]["payment_status_enum"] | null
          id: number
          payment_id: number
          to_status: Database["public"]["Enums"]["payment_status_enum"]
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          from_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          id?: never
          payment_id: number
          to_status: Database["public"]["Enums"]["payment_status_enum"]
        }
        Update: {
          created_at?: string
          detail?: Json | null
          from_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          id?: never
          payment_id?: number
          to_status?: Database["public"]["Enums"]["payment_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_log_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment"
            referencedColumns: ["id"]
          },
        ]
      }
      report: {
        Row: {
          created_at: string
          id: number
          reason: string
          reporter_ref: string | null
          status: Database["public"]["Enums"]["report_status_enum"]
          target_id: number
          target_type: Database["public"]["Enums"]["report_target_type_enum"]
        }
        Insert: {
          created_at?: string
          id?: never
          reason: string
          reporter_ref?: string | null
          status?: Database["public"]["Enums"]["report_status_enum"]
          target_id: number
          target_type: Database["public"]["Enums"]["report_target_type_enum"]
        }
        Update: {
          created_at?: string
          id?: never
          reason?: string
          reporter_ref?: string | null
          status?: Database["public"]["Enums"]["report_status_enum"]
          target_id?: number
          target_type?: Database["public"]["Enums"]["report_target_type_enum"]
        }
        Relationships: []
      }
      risk_event: {
        Row: {
          created_at: string
          detail: Json | null
          id: number
          member_id: string
          resolved: boolean
          type: string
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          id?: never
          member_id: string
          resolved?: boolean
          type: string
        }
        Update: {
          created_at?: string
          detail?: Json | null
          id?: never
          member_id?: string
          resolved?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_event_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      share_event: {
        Row: {
          channel: string
          created_at: string
          goal_id: number
          id: number
        }
        Insert: {
          channel: string
          created_at?: string
          goal_id: number
          id?: never
        }
        Update: {
          channel?: string
          created_at?: string
          goal_id?: number
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "share_event_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_event_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_public"
            referencedColumns: ["id"]
          },
        ]
      }
      wordmap_render_cache: {
        Row: {
          goal_id: number
          id: number
          image_url: string
          rendered_at: string
          word_count: number
        }
        Insert: {
          goal_id: number
          id?: never
          image_url: string
          rendered_at?: string
          word_count?: number
        }
        Update: {
          goal_id?: number
          id?: never
          image_url?: string
          rendered_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "wordmap_render_cache_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordmap_render_cache_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      goal_public: {
        Row: {
          cheer_count: number | null
          closed_at: string | null
          created_at: string | null
          due_date: string | null
          id: number | null
          reason: string | null
          slug: string | null
          status: Database["public"]["Enums"]["goal_status_enum"] | null
          title: string | null
        }
        Insert: {
          cheer_count?: never
          closed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: number | null
          reason?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["goal_status_enum"] | null
          title?: string | null
        }
        Update: {
          cheer_count?: never
          closed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: number | null
          reason?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["goal_status_enum"] | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      capture_lead: {
        Args: {
          p_campaign: string
          p_consented_at: string
          p_content: string
          p_email: string
          p_instagram_handle: string
          p_landing_path: string
          p_medium: string
          p_referrer: string
          p_source: string
          p_submitter_hash: string
        }
        Returns: {
          is_duplicate: boolean
          lead_id: number
        }[]
      }
      clover_eligibility: {
        Args: { p_member_id: string }
        Returns: {
          min_cashout_clover: number
          payable_amount: number
          reached_threshold: boolean
          total_balance: number
          welcome_amount: number
        }[]
      }
      confirm_cheer_payment: {
        Args: {
          p_amount_krw: number
          p_approved_at: string
          p_method: string
          p_order_id: string
          p_payment_key: string
          p_raw_response: Json
          p_receipt_url: string
        }
        Returns: {
          cheer_id: number
          display_name: string
          goal_title: string
          member_id: string
          payment_id: number
        }[]
      }
      create_cheer_order: {
        Args: {
          p_amount_krw: number
          p_clover_amount: number
          p_display_name: string
          p_goal_id: number
          p_is_anonymous: boolean
          p_message: string
          p_order_id: string
          p_pg_customer_key: string
          p_request_key?: string
        }
        Returns: {
          cheer_id: number
          is_replay: boolean
          order_id: string
          payment_id: number
        }[]
      }
      expire_stale_cheer_payments: { Args: never; Returns: number }
      get_wordmap: {
        Args: { p_goal_id: number }
        Returns: {
          word: string
          word_count: number
        }[]
      }
      update_goal: {
        Args: {
          p_due_date: string
          p_goal_id: number
          p_reason: string | null
          p_title: string
        }
        Returns: Database["public"]["Tables"]["goal"]["Row"]
      }
      min_cashout_clover: { Args: never; Returns: number }
      reconcile_canceled_payment: {
        Args: {
          p_amount_krw: number
          p_detail: Json
          p_order_id: string
          p_payment_key: string
        }
        Returns: {
          idempotent: boolean
          payment_id: number
          payment_status: Database["public"]["Enums"]["payment_status_enum"]
          review_required: boolean
        }[]
      }
      record_partial_cancel_review: {
        Args: {
          p_amount_krw: number
          p_detail: Json
          p_order_id: string
          p_payment_key: string
        }
        Returns: boolean
      }
      record_payment_compensation: {
        Args: {
          p_amount_krw: number
          p_detail: Json
          p_order_id: string
          p_payment_key: string
          p_target_status: Database["public"]["Enums"]["payment_status_enum"]
        }
        Returns: {
          payment_id: number
          status: Database["public"]["Enums"]["payment_status_enum"]
        }[]
      }
      welcome_clover_amount: { Args: never; Returns: number }
    }
    Enums: {
      alimtalk_status_enum: "SENT" | "FAILED"
      cashout_status_enum:
        | "REQUESTED"
        | "KYC_PENDING"
        | "APPROVED"
        | "PAYOUT_SENT"
        | "PAID"
        | "REJECTED"
        | "FAILED"
      cheer_status_enum: "PENDING" | "CONFIRMED" | "REFUNDED" | "EXPIRED"
      clover_entry_type_enum:
        | "EARN"
        | "CASHOUT_HOLD"
        | "CASHOUT_SETTLED"
        | "CASHOUT_REVERSAL"
        | "REFUND_REVERSAL"
        | "WELCOME_GRANT"
      goal_status_enum: "ACTIVE" | "CLOSED" | "DELETED"
      kyc_status_enum: "NONE" | "VERIFIED"
      notification_channel_enum: "ALIMTALK" | "INAPP"
      notification_type_enum:
        | "CHEER_RECEIVED"
        | "CASHOUT_REQUESTED"
        | "CASHOUT_PAID"
      payment_status_enum: "READY" | "DONE" | "CANCELED" | "FAILED" | "EXPIRED"
      report_status_enum: "OPEN" | "RESOLVED_DELETED" | "DISMISSED"
      report_target_type_enum: "GOAL" | "CHEER"
      risk_flag_enum: "CLEAR" | "REVIEW" | "BLOCKED"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      alimtalk_status_enum: ["SENT", "FAILED"],
      cashout_status_enum: [
        "REQUESTED",
        "KYC_PENDING",
        "APPROVED",
        "PAYOUT_SENT",
        "PAID",
        "REJECTED",
        "FAILED",
      ],
      cheer_status_enum: ["PENDING", "CONFIRMED", "REFUNDED", "EXPIRED"],
      clover_entry_type_enum: [
        "EARN",
        "CASHOUT_HOLD",
        "CASHOUT_SETTLED",
        "CASHOUT_REVERSAL",
        "REFUND_REVERSAL",
        "WELCOME_GRANT",
      ],
      goal_status_enum: ["ACTIVE", "CLOSED", "DELETED"],
      kyc_status_enum: ["NONE", "VERIFIED"],
      notification_channel_enum: ["ALIMTALK", "INAPP"],
      notification_type_enum: [
        "CHEER_RECEIVED",
        "CASHOUT_REQUESTED",
        "CASHOUT_PAID",
      ],
      payment_status_enum: ["READY", "DONE", "CANCELED", "FAILED", "EXPIRED"],
      report_status_enum: ["OPEN", "RESOLVED_DELETED", "DISMISSED"],
      report_target_type_enum: ["GOAL", "CHEER"],
      risk_flag_enum: ["CLEAR", "REVIEW", "BLOCKED"],
    },
  },
} as const
