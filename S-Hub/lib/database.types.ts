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
      bookings: {
        Row: {
          accepted_at: string | null
          arrived_at: string | null
          bid_id: string | null
          cancelled_at: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          en_route_at: string | null
          id: string
          location_updated_at: string | null
          request_id: string
          status: string
          updated_at: string
          worker_id: string
          worker_lat: number | null
          worker_lng: number | null
        }
        Insert: {
          accepted_at?: string | null
          arrived_at?: string | null
          bid_id?: string | null
          cancelled_at?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          en_route_at?: string | null
          id?: string
          location_updated_at?: string | null
          request_id: string
          status?: string
          updated_at?: string
          worker_id: string
          worker_lat?: number | null
          worker_lng?: number | null
        }
        Update: {
          accepted_at?: string | null
          arrived_at?: string | null
          bid_id?: string | null
          cancelled_at?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          en_route_at?: string | null
          id?: string
          location_updated_at?: string | null
          request_id?: string
          status?: string
          updated_at?: string
          worker_id?: string
          worker_lat?: number | null
          worker_lng?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "worker_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          is_read: boolean
          message_text: string
          sender_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_text: string
          sender_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          rating_avg: number
          rating_count: number
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          rating_avg?: number
          rating_count?: number
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          category: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          initial_offer_price: number | null
          latitude: number | null
          location_region: string | null
          location_string: string | null
          longitude: number | null
          photos: string[]
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          initial_offer_price?: number | null
          latitude?: number | null
          location_region?: string | null
          location_string?: string | null
          longitude?: number | null
          photos?: string[]
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          initial_offer_price?: number | null
          latitude?: number | null
          location_region?: string | null
          location_string?: string | null
          longitude?: number | null
          photos?: string[]
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_bids: {
        Row: {
          counter_message: string | null
          counter_price: number | null
          created_at: string
          id: string
          message: string | null
          proposed_price: number
          request_id: string
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          counter_message?: string | null
          counter_price?: number | null
          created_at?: string
          id?: string
          message?: string | null
          proposed_price: number
          request_id: string
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          counter_message?: string | null
          counter_price?: number | null
          created_at?: string
          id?: string
          message?: string | null
          proposed_price?: number
          request_id?: string
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_bids_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_profiles: {
        Row: {
          address: string | null
          availability: Json
          bio: string | null
          created_at: string
          hourly_rate: number | null
          id: string
          latitude: number | null
          longitude: number | null
          per_job_rate: number | null
          rating_avg: number
          rating_count: number
          skills: string[]
          updated_at: string
          verification_status: string
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          availability?: Json
          bio?: string | null
          created_at?: string
          hourly_rate?: number | null
          id: string
          latitude?: number | null
          longitude?: number | null
          per_job_rate?: number | null
          rating_avg?: number
          rating_count?: number
          skills?: string[]
          updated_at?: string
          verification_status?: string
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          availability?: Json
          bio?: string | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          per_job_rate?: number | null
          rating_avg?: number
          rating_count?: number
          skills?: string[]
          updated_at?: string
          verification_status?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_verifications: {
        Row: {
          id: string
          id_document_url: string | null
          id_number: string | null
          id_type: string | null
          reviewed_at: string | null
          selfie_url: string | null
          status: string
          submitted_at: string
        }
        Insert: {
          id: string
          id_document_url?: string | null
          id_number?: string | null
          id_type?: string | null
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
        }
        Update: {
          id?: string
          id_document_url?: string | null
          id_number?: string | null
          id_type?: string | null
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_verifications_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_bid: {
        Args: { p_bid_id: string }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          bid_id: string | null
          cancelled_at: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          en_route_at: string | null
          id: string
          location_updated_at: string | null
          request_id: string
          status: string
          updated_at: string
          worker_id: string
          worker_lat: number | null
          worker_lng: number | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_verification: {
        Args: { min_seconds?: number }
        Returns: {
          id: string
          id_document_url: string | null
          id_number: string | null
          id_type: string | null
          reviewed_at: string | null
          selfie_url: string | null
          status: string
          submitted_at: string
        }
        SetofOptions: {
          from: "*"
          to: "worker_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
