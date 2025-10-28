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
      battle_turns: {
        Row: {
          action: string
          battle_id: string
          created_at: string | null
          damage: number | null
          id: string
          is_critical: boolean | null
          move_id: string | null
          player_id: string
          turn_number: number
        }
        Insert: {
          action: string
          battle_id: string
          created_at?: string | null
          damage?: number | null
          id?: string
          is_critical?: boolean | null
          move_id?: string | null
          player_id: string
          turn_number: number
        }
        Update: {
          action?: string
          battle_id?: string
          created_at?: string | null
          damage?: number | null
          id?: string
          is_critical?: boolean | null
          move_id?: string | null
          player_id?: string
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_turns_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_turns_move_id_fkey"
            columns: ["move_id"]
            isOneToOne: false
            referencedRelation: "plant_moves"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          created_at: string | null
          current_turn: string | null
          id: string
          player1_current_hp: number
          player1_id: string
          player1_plant_id: string
          player2_current_hp: number | null
          player2_id: string | null
          player2_plant_id: string | null
          status: Database["public"]["Enums"]["battle_status"]
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_turn?: string | null
          id?: string
          player1_current_hp: number
          player1_id: string
          player1_plant_id: string
          player2_current_hp?: number | null
          player2_id?: string | null
          player2_plant_id?: string | null
          status?: Database["public"]["Enums"]["battle_status"]
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_turn?: string | null
          id?: string
          player1_current_hp?: number
          player1_id?: string
          player1_plant_id?: string
          player2_current_hp?: number | null
          player2_id?: string | null
          player2_plant_id?: string | null
          status?: Database["public"]["Enums"]["battle_status"]
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: []
      }
      plant_moves: {
        Row: {
          accuracy: number
          base_power: number
          description: string | null
          id: string
          move_type: Database["public"]["Enums"]["move_type"]
          name: string
          plant_category: string
        }
        Insert: {
          accuracy?: number
          base_power: number
          description?: string | null
          id?: string
          move_type: Database["public"]["Enums"]["move_type"]
          name: string
          plant_category: string
        }
        Update: {
          accuracy?: number
          base_power?: number
          description?: string | null
          id?: string
          move_type?: Database["public"]["Enums"]["move_type"]
          name?: string
          plant_category?: string
        }
        Relationships: []
      }
      plants: {
        Row: {
          category: string
          created_at: string | null
          defeats: number | null
          description: string | null
          health: number | null
          icon: string | null
          id: string
          image_url: string | null
          last_watered: string | null
          name: string
          position: string
          preferences: Json | null
          reminders_enabled: boolean | null
          total_waterings: number | null
          updated_at: string | null
          user_id: string
          victories: number | null
          watering_days: number
          watering_history: Json | null
        }
        Insert: {
          category: string
          created_at?: string | null
          defeats?: number | null
          description?: string | null
          health?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          last_watered?: string | null
          name: string
          position: string
          preferences?: Json | null
          reminders_enabled?: boolean | null
          total_waterings?: number | null
          updated_at?: string | null
          user_id: string
          victories?: number | null
          watering_days?: number
          watering_history?: Json | null
        }
        Update: {
          category?: string
          created_at?: string | null
          defeats?: number | null
          description?: string | null
          health?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          last_watered?: string | null
          name?: string
          position?: string
          preferences?: Json | null
          reminders_enabled?: boolean | null
          total_waterings?: number | null
          updated_at?: string | null
          user_id?: string
          victories?: number | null
          watering_days?: number
          watering_history?: Json | null
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
      battle_status: "waiting" | "active" | "finished"
      move_type: "water" | "sun" | "earth" | "wind"
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
      battle_status: ["waiting", "active", "finished"],
      move_type: ["water", "sun", "earth", "wind"],
    },
  },
} as const
