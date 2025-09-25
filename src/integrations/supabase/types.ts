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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      emergencies: {
        Row: {
          created_at: string
          destination_latitude: number | null
          destination_longitude: number | null
          driver_id: string | null
          eta_minutes: number | null
          id: string
          priority_level: number | null
          route: Json | null
          source_latitude: number | null
          source_longitude: number | null
          status: Database["public"]["Enums"]["emergency_status"] | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          driver_id?: string | null
          eta_minutes?: number | null
          id?: string
          priority_level?: number | null
          route?: Json | null
          source_latitude?: number | null
          source_longitude?: number | null
          status?: Database["public"]["Enums"]["emergency_status"] | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          driver_id?: string | null
          eta_minutes?: number | null
          id?: string
          priority_level?: number | null
          route?: Json | null
          source_latitude?: number | null
          source_longitude?: number | null
          status?: Database["public"]["Enums"]["emergency_status"] | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: []
      }
      intersections: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          roi_polygons: Json | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          roi_polygons?: Json | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          roi_polygons?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      lanes: {
        Row: {
          created_at: string
          current_count: number | null
          direction: string
          gst_time: number | null
          has_emergency: boolean | null
          id: string
          intersection_id: string
          lane_no: number
          signal_state: Database["public"]["Enums"]["signal_state"] | null
          updated_at: string
          vehicle_count: number | null
        }
        Insert: {
          created_at?: string
          current_count?: number | null
          direction: string
          gst_time?: number | null
          has_emergency?: boolean | null
          id?: string
          intersection_id: string
          lane_no: number
          signal_state?: Database["public"]["Enums"]["signal_state"] | null
          updated_at?: string
          vehicle_count?: number | null
        }
        Update: {
          created_at?: string
          current_count?: number | null
          direction?: string
          gst_time?: number | null
          has_emergency?: boolean | null
          id?: string
          intersection_id?: string
          lane_no?: number
          signal_state?: Database["public"]["Enums"]["signal_state"] | null
          updated_at?: string
          vehicle_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lanes_intersection_id_fkey"
            columns: ["intersection_id"]
            isOneToOne: false
            referencedRelation: "intersections"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          created_at: string
          emergency_id: string | null
          event_type: string
          id: string
          intersection_id: string | null
          message: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          emergency_id?: string | null
          event_type: string
          id?: string
          intersection_id?: string | null
          message: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          emergency_id?: string | null
          event_type?: string
          id?: string
          intersection_id?: string | null
          message?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_intersection_id_fkey"
            columns: ["intersection_id"]
            isOneToOne: false
            referencedRelation: "intersections"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      video_feeds: {
        Row: {
          created_at: string
          feed_url: string
          id: string
          intersection_id: string
          is_active: boolean | null
          lane_no: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          feed_url: string
          id?: string
          intersection_id: string
          is_active?: boolean | null
          lane_no: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          feed_url?: string
          id?: string
          intersection_id?: string
          is_active?: boolean | null
          lane_no?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_feeds_intersection_id_fkey"
            columns: ["intersection_id"]
            isOneToOne: false
            referencedRelation: "intersections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      emergency_status: "active" | "completed" | "cancelled"
      signal_state: "red" | "green" | "amber"
      user_role: "normal" | "authority" | "emergency"
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
      emergency_status: ["active", "completed", "cancelled"],
      signal_state: ["red", "green", "amber"],
      user_role: ["normal", "authority", "emergency"],
    },
  },
} as const
