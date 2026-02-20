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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      activities: {
        Row: {
          created_at: string
          description: string | null
          hints: string[] | null
          id: number
          image: string | null
          long_description: string | null
          name: string
          photo_required: boolean | null
          tips: string[] | null
          title: string
          trivia: string | null
          xp: number | null
          categories: number[]
        }
        Insert: {
          created_at?: string
          description?: string | null
          hints?: string[] | null
          id?: number
          image?: string | null
          long_description?: string | null
          name: string
          photo_required?: boolean | null
          tips?: string[] | null
          title: string
          trivia?: string | null
          xp?: number | null
          categories?: number[]
        }
        Update: {
          created_at?: string
          description?: string | null
          hints?: string[] | null
          id?: number
          image?: string | null
          long_description?: string | null
          name?: string
          photo_required?: boolean | null
          tips?: string[] | null
          title?: string
          trivia?: string | null
          xp?: number | null
          categories?: number[]
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: number
          icon: string | null
          name: string | null
        }
        Insert: {
          id?: number
          icon?: string | null
          name: string | null
        }
        Update: {
          id?: number
          icon?: string | null
          name?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          created_at: string
          description: string
          id: number
          image_url: string
          local_image_path: string | null
          name: string
          requirement_type: string
          requirement_value: number
          uses_custom_image: boolean
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: number
          image_url: string
          local_image_path?: string | null
          name: string
          requirement_type: string
          requirement_value: number
          uses_custom_image?: boolean
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: number
          image_url?: string
          local_image_path?: string | null
          name?: string
          requirement_type?: string
          requirement_value?: number
          uses_custom_image?: boolean
        }
        Relationships: []
      }
      pack_activities: {
        Row: {
          activity_id: number
          created_at: string
          id: number
          order: number
          pack_id: number
        }
        Insert: {
          activity_id: number
          created_at?: string
          id?: number
          order?: number
          pack_id: number
        }
        Update: {
          activity_id?: number
          created_at?: string
          id?: number
          order?: number
          pack_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pack_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_activities_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
      packs: {
        Row: {
          colour: string | null
          created_at: string
          id: number
          name: string
        }
        Insert: {
          colour?: string | null
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          colour?: string | null
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          colour: string
          created_at: string
          id: number
          name: string
          nickname: string | null
          team: number
          user_id: string
          xp: number
        }
        Insert: {
          colour: string
          created_at?: string
          id?: number
          name: string
          nickname?: string | null
          team: number
          user_id: string
          xp?: number
        }
        Update: {
          colour?: string
          created_at?: string
          id?: number
          name?: string
          nickname?: string | null
          team?: number
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_fkey"
            columns: ["team"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          colour: string | null
          created_at: string
          id: number
          mascot_name: string
          name: string
          team_xp: number
        }
        Insert: {
          colour?: string | null
          created_at?: string
          id?: number
          mascot_name: string
          name: string
          team_xp?: number
        }
        Update: {
          colour?: string | null
          created_at?: string
          id?: number
          mascot_name?: string
          name?: string
          team_xp?: number
        }
        Relationships: []
      }
      user_activity_progress: {
        Row: {
          activity_id: number
          completed_at: string | null
          id: number
          notes: string | null
          profile_id: number
        }
        Insert: {
          activity_id: number
          completed_at?: string | null
          id?: number
          notes?: string | null
          profile_id: number
        }
        Update: {
          activity_id?: number
          completed_at?: string | null
          id?: number
          notes?: string | null
          profile_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_progress_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          id: number
          profile_id: number
          team_id: number
          source: string
          source_id: number
          message: string
          xp: number
          created_at: string
        }
        Insert: {
          id?: number
          profile_id: number
          team_id: number
          source: string
          source_id: number
          message: string
          xp?: number
          created_at?: string
        }
        Update: {
          id?: number
          profile_id?: number
          team_id?: number
          source?: string
          source_id?: number
          message?: string
          xp?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: number
          created_at: string
          earned_at: string
          id: number
          profile_id: number | null
          user_id: string
        }
        Insert: {
          badge_id: number
          created_at?: string
          earned_at?: string
          id?: number
          profile_id?: number | null
          user_id: string
        }
        Update: {
          badge_id?: number
          created_at?: string
          earned_at?: string
          id?: number
          profile_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
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
      add_team_xp: {
        Args: { team_id: number; xp_amount: number }
        Returns: undefined
      }
      get_team_xp: {
        Args: { team_id: number }
        Returns: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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

