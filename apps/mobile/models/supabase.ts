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
      account_removal_requests: {
        Row: {
          created_at: string
          id: number
          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          categories: Json | null
          content_status: Database["public"]["Enums"]["content_status"]
          created_at: string
          created_by: string | null
          debrief_heading: string | null
          debrief_photo_label: string | null
          debrief_question_1: string | null
          debrief_question_2: string | null
          description: string | null
          draft_payload: Json | null
          estimated_duration: string | null
          id: number
          image: string | null
          intro_captain: string | null
          intro_captain_pose: string | null
          intro_character_avatar_url: string | null
          intro_character_name: string | null
          intro_dialogue: string | null
          intro_urgent_message: string | null
          last_compass_generation_id: number | null
          mission_type: string | null
          name: string
          optional_items: string | null
          prep_checklist: Json | null
          preparation_message: string | null
          reminder_message: string | null
          safety_notes: string | null
          steps: Json | null
          title: string
          updated_at: string
          updated_by: string | null
          xp: number | null
        }
        Insert: {
          categories?: Json | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          created_by?: string | null
          debrief_heading?: string | null
          debrief_photo_label?: string | null
          debrief_question_1?: string | null
          debrief_question_2?: string | null
          description?: string | null
          draft_payload?: Json | null
          estimated_duration?: string | null
          id?: number
          image?: string | null
          intro_captain?: string | null
          intro_captain_pose?: string | null
          intro_character_avatar_url?: string | null
          intro_character_name?: string | null
          intro_dialogue?: string | null
          intro_urgent_message?: string | null
          last_compass_generation_id?: number | null
          mission_type?: string | null
          name: string
          optional_items?: string | null
          prep_checklist?: Json | null
          preparation_message?: string | null
          reminder_message?: string | null
          safety_notes?: string | null
          steps?: Json | null
          title: string
          updated_at?: string
          updated_by?: string | null
          xp?: number | null
        }
        Update: {
          categories?: Json | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          created_by?: string | null
          debrief_heading?: string | null
          debrief_photo_label?: string | null
          debrief_question_1?: string | null
          debrief_question_2?: string | null
          description?: string | null
          draft_payload?: Json | null
          estimated_duration?: string | null
          id?: number
          image?: string | null
          intro_captain?: string | null
          intro_captain_pose?: string | null
          intro_character_avatar_url?: string | null
          intro_character_name?: string | null
          intro_dialogue?: string | null
          intro_urgent_message?: string | null
          last_compass_generation_id?: number | null
          mission_type?: string | null
          name?: string
          optional_items?: string | null
          prep_checklist?: Json | null
          preparation_message?: string | null
          reminder_message?: string | null
          safety_notes?: string | null
          steps?: Json | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_last_compass_generation_id_fkey"
            columns: ["last_compass_generation_id"]
            isOneToOne: false
            referencedRelation: "compass_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_reactions: {
        Row: {
          activity_progress_id: number
          created_at: string | null
          id: number
          profile_id: number
          reaction_type: string
        }
        Insert: {
          activity_progress_id: number
          created_at?: string | null
          id?: number
          profile_id: number
          reaction_type: string
        }
        Update: {
          activity_progress_id?: number
          created_at?: string | null
          id?: number
          profile_id?: number
          reaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_reactions_activity_progress_id_fkey"
            columns: ["activity_progress_id"]
            isOneToOne: false
            referencedRelation: "user_activity_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      approvals: {
        Row: {
          actor_user_id: string | null
          created_at: string
          entity_id: number
          entity_type: string
          from_status: Database["public"]["Enums"]["content_status"]
          id: number
          note: string | null
          to_status: Database["public"]["Enums"]["content_status"]
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          entity_id: number
          entity_type: string
          from_status: Database["public"]["Enums"]["content_status"]
          id?: never
          note?: string | null
          to_status: Database["public"]["Enums"]["content_status"]
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          entity_id?: number
          entity_type?: string
          from_status?: Database["public"]["Enums"]["content_status"]
          id?: never
          note?: string | null
          to_status?: Database["public"]["Enums"]["content_status"]
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_type: string
          category: string
          chapter_id: number | null
          content_status: Database["public"]["Enums"]["content_status"]
          created_at: string
          description: string
          id: number
          image_url: string
          is_active: boolean
          is_hidden_until_awarded: boolean
          local_image_path: string | null
          name: string
          requirement_category: string | null
          requirement_type: string
          requirement_value: number
          season_id: number | null
          sort_group: string
          uses_custom_image: boolean
        }
        Insert: {
          badge_type?: string
          category: string
          chapter_id?: number | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          description: string
          id?: number
          image_url: string
          is_active?: boolean
          is_hidden_until_awarded?: boolean
          local_image_path?: string | null
          name: string
          requirement_category?: string | null
          requirement_type: string
          requirement_value: number
          season_id?: number | null
          sort_group?: string
          uses_custom_image?: boolean
        }
        Update: {
          badge_type?: string
          category?: string
          chapter_id?: number | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          description?: string
          id?: number
          image_url?: string
          is_active?: boolean
          is_hidden_until_awarded?: boolean
          local_image_path?: string | null
          name?: string
          requirement_category?: string | null
          requirement_type?: string
          requirement_value?: number
          season_id?: number | null
          sort_group?: string
          uses_custom_image?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "badges_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_reaction_rate_buckets: {
        Row: {
          bucket_second_utc: string
          session_id: number
          user_id: string
        }
        Insert: {
          bucket_second_utc: string
          session_id: number
          user_id: string
        }
        Update: {
          bucket_second_utc?: string
          session_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campfire_reaction_rate_buckets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "campfire_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_reaction_totals: {
        Row: {
          count: number
          emoji: string
          session_id: number
          updated_at: string
        }
        Insert: {
          count?: number
          emoji: string
          session_id: number
          updated_at?: string
        }
        Update: {
          count?: number
          emoji?: string
          session_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campfire_reaction_totals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "campfire_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_reactions: {
        Row: {
          created_at: string
          created_second_utc: string | null
          emoji: string
          id: string
          playhead_ms: number | null
          session_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          created_second_utc?: string | null
          emoji: string
          id?: string
          playhead_ms?: number | null
          session_id: number
          user_id?: string
        }
        Update: {
          created_at?: string
          created_second_utc?: string | null
          emoji?: string
          id?: string
          playhead_ms?: number | null
          session_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campfire_reactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "campfire_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_session_components: {
        Row: {
          created_at: string
          data: Json
          duration: number
          id: number
          session_id: number
          start_time: number
          track_id: number
          type: Database["public"]["Enums"]["campfire_component_type"]
        }
        Insert: {
          created_at?: string
          data?: Json
          duration?: number
          id?: number
          session_id: number
          start_time?: number
          track_id: number
          type: Database["public"]["Enums"]["campfire_component_type"]
        }
        Update: {
          created_at?: string
          data?: Json
          duration?: number
          id?: number
          session_id?: number
          start_time?: number
          track_id?: number
          type?: Database["public"]["Enums"]["campfire_component_type"]
        }
        Relationships: [
          {
            foreignKeyName: "campfire_session_components_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "campfire_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campfire_session_components_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "campfire_session_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_session_tracks: {
        Row: {
          created_at: string
          id: number
          name: string
          position: number
          session_id: number
          type: Database["public"]["Enums"]["campfire_component_type"]
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          position?: number
          session_id: number
          type: Database["public"]["Enums"]["campfire_component_type"]
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          position?: number
          session_id?: number
          type?: Database["public"]["Enums"]["campfire_component_type"]
        }
        Relationships: [
          {
            foreignKeyName: "campfire_session_tracks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "campfire_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_sessions: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          id: number
          missions: number[]
          scheduled_at: string | null
          status: Database["public"]["Enums"]["campfire_session_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: number
          missions?: number[]
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campfire_session_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: number
          missions?: number[]
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campfire_session_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      captains: {
        Row: {
          avatar_url: string
          created_at: string
          id: number
          name: string
          pose_options: string[]
          slug: string
          updated_at: string
          voice_guide: string
        }
        Insert: {
          avatar_url: string
          created_at?: string
          id?: never
          name: string
          pose_options?: string[]
          slug: string
          updated_at?: string
          voice_guide: string
        }
        Update: {
          avatar_url?: string
          created_at?: string
          id?: never
          name?: string
          pose_options?: string[]
          slug?: string
          updated_at?: string
          voice_guide?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          icon: string | null
          id: number
          name: string
        }
        Insert: {
          icon?: string | null
          id?: number
          name: string
        }
        Update: {
          icon?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      chapter_activities: {
        Row: {
          activity_id: number
          chapter_id: number
          created_at: string
          id: number
          order: number
        }
        Insert: {
          activity_id: number
          chapter_id: number
          created_at?: string
          id?: number
          order?: number
        }
        Update: {
          activity_id?: number
          chapter_id?: number
          created_at?: string
          id?: number
          order?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapter_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_activities_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_notification_send_log: {
        Row: {
          chapter_id: number
          id: string
          kind: string
          sent_at: string
        }
        Insert: {
          chapter_id: number
          id?: string
          kind: string
          sent_at?: string
        }
        Update: {
          chapter_id?: number
          id?: string
          kind?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_notification_send_log_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          arc_position: string | null
          body: string | null
          body_parts: string[]
          body_slides: Json
          content_status: Database["public"]["Enums"]["content_status"]
          created_at: string
          created_by: string | null
          draft_payload: Json | null
          id: number
          image: string | null
          last_compass_generation_id: number | null
          season_id: number
          summary: string | null
          title: string
          unlock_date: string
          updated_at: string
          updated_by: string | null
          week_number: number
        }
        Insert: {
          arc_position?: string | null
          body?: string | null
          body_parts?: string[]
          body_slides?: Json
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          created_by?: string | null
          draft_payload?: Json | null
          id?: number
          image?: string | null
          last_compass_generation_id?: number | null
          season_id: number
          summary?: string | null
          title: string
          unlock_date: string
          updated_at?: string
          updated_by?: string | null
          week_number: number
        }
        Update: {
          arc_position?: string | null
          body?: string | null
          body_parts?: string[]
          body_slides?: Json
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          created_by?: string | null
          draft_payload?: Json | null
          id?: number
          image?: string | null
          last_compass_generation_id?: number | null
          season_id?: number
          summary?: string | null
          title?: string
          unlock_date?: string
          updated_at?: string
          updated_by?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapters_last_compass_generation_id_fkey"
            columns: ["last_compass_generation_id"]
            isOneToOne: false
            referencedRelation: "compass_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      compass_generations: {
        Row: {
          accepted: boolean | null
          accepted_at: string | null
          accepted_by: string | null
          action: string
          cost_usd: number | null
          created_at: string
          created_by: string | null
          entity_id: number | null
          entity_type: string | null
          id: number
          input: Json
          model: string
          output: Json
          system_prompt_version: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          accepted?: boolean | null
          accepted_at?: string | null
          accepted_by?: string | null
          action: string
          cost_usd?: number | null
          created_at?: string
          created_by?: string | null
          entity_id?: number | null
          entity_type?: string | null
          id?: never
          input: Json
          model: string
          output: Json
          system_prompt_version?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          accepted?: boolean | null
          accepted_at?: string | null
          accepted_by?: string | null
          action?: string
          cost_usd?: number | null
          created_at?: string
          created_by?: string | null
          entity_id?: number | null
          entity_type?: string | null
          id?: never
          input?: Json
          model?: string
          output?: Json
          system_prompt_version?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: []
      }
      explore_collectible_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: number
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: number
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: number
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      explore_collectibles: {
        Row: {
          category_id: number | null
          created_at: string
          description: string | null
          flavor_text: string | null
          id: number
          image_url: string
          is_active: boolean
          name: string
          rarity: Database["public"]["Enums"]["explore_collectible_rarity"]
          updated_at: string
          weight: number
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          description?: string | null
          flavor_text?: string | null
          id?: number
          image_url: string
          is_active?: boolean
          name: string
          rarity?: Database["public"]["Enums"]["explore_collectible_rarity"]
          updated_at?: string
          weight?: number
        }
        Update: {
          category_id?: number | null
          created_at?: string
          description?: string | null
          flavor_text?: string | null
          id?: number
          image_url?: string
          is_active?: boolean
          name?: string
          rarity?: Database["public"]["Enums"]["explore_collectible_rarity"]
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "explore_collectibles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "explore_collectible_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      explore_locations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: number
          image_url: string | null
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          radius_meters: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          radius_meters?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          radius_meters?: number
          updated_at?: string
        }
        Relationships: []
      }
      explore_profile_collectibles: {
        Row: {
          collectible_id: number
          count: number
          first_discovered_at: string
          first_discovered_location_id: number | null
          first_shiny_discovered_at: string | null
          id: number
          profile_id: number
          updated_at: string
        }
        Insert: {
          collectible_id: number
          count?: number
          first_discovered_at?: string
          first_discovered_location_id?: number | null
          first_shiny_discovered_at?: string | null
          id?: number
          profile_id: number
          updated_at?: string
        }
        Update: {
          collectible_id?: number
          count?: number
          first_discovered_at?: string
          first_discovered_location_id?: number | null
          first_shiny_discovered_at?: string | null
          id?: number
          profile_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "explore_profile_collectibles_collectible_id_fkey"
            columns: ["collectible_id"]
            isOneToOne: false
            referencedRelation: "explore_collectibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explore_profile_collectibles_first_discovered_location_id_fkey"
            columns: ["first_discovered_location_id"]
            isOneToOne: false
            referencedRelation: "explore_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explore_profile_collectibles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      explore_visits: {
        Row: {
          collectible_id: number
          created_at: string
          distance_meters: number
          id: number
          is_new_collectible: boolean
          is_shiny: boolean
          location_id: number
          profile_id: number
          submitted_accuracy_meters: number | null
          submitted_latitude: number
          submitted_longitude: number
          xp_awarded: number
        }
        Insert: {
          collectible_id: number
          created_at?: string
          distance_meters: number
          id?: number
          is_new_collectible: boolean
          is_shiny?: boolean
          location_id: number
          profile_id: number
          submitted_accuracy_meters?: number | null
          submitted_latitude: number
          submitted_longitude: number
          xp_awarded?: number
        }
        Update: {
          collectible_id?: number
          created_at?: string
          distance_meters?: number
          id?: number
          is_new_collectible?: boolean
          is_shiny?: boolean
          location_id?: number
          profile_id?: number
          submitted_accuracy_meters?: number | null
          submitted_latitude?: number
          submitted_longitude?: number
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "explore_visits_collectible_id_fkey"
            columns: ["collectible_id"]
            isOneToOne: false
            referencedRelation: "explore_collectibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explore_visits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "explore_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explore_visits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      image_assets: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: number
          entity_type: string
          id: number
          notes: string | null
          prompt: string | null
          prompt_status: string
          slot_key: string | null
          status: string
          storage_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: number
          entity_type: string
          id?: never
          notes?: string | null
          prompt?: string | null
          prompt_status?: string
          slot_key?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: number
          entity_type?: string
          id?: never
          notes?: string | null
          prompt?: string | null
          prompt_status?: string
          slot_key?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          activity_tag: string
          created_at: string
          entry_date: string
          id: number
          notes: string | null
          photo_url: string | null
          profile_id: number
          title: string
          user_id: string
        }
        Insert: {
          activity_tag?: string
          created_at?: string
          entry_date?: string
          id?: number
          notes?: string | null
          photo_url?: string | null
          profile_id: number
          title: string
          user_id: string
        }
        Update: {
          activity_tag?: string
          created_at?: string
          entry_date?: string
          id?: number
          notes?: string | null
          photo_url?: string | null
          profile_id?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prompt_asked: {
        Row: {
          asked_at: string
          user_id: string
        }
        Insert: {
          asked_at?: string
          user_id: string
        }
        Update: {
          asked_at?: string
          user_id?: string
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
      parent_resources: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_url: string
          id: number
          sort_order: number
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_url: string
          id?: number
          sort_order?: number
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_url?: string
          id?: number
          sort_order?: number
          title?: string
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
          team_contribution: number | null
          user_id: string
          xp: number
        }
        Insert: {
          colour: string
          created_at?: string
          id?: number
          name: string
          nickname?: string | null
          team_contribution?: number | null
          user_id: string
          xp?: number
        }
        Update: {
          colour?: string
          created_at?: string
          id?: number
          name?: string
          nickname?: string | null
          team_contribution?: number | null
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_id: string
          enabled: boolean
          expo_push_token: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          enabled?: boolean
          expo_push_token: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          enabled?: boolean
          expo_push_token?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      revisions: {
        Row: {
          actor_user_id: string | null
          created_at: string
          entity_id: number
          entity_type: string
          id: number
          snapshot: Json
          summary: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          entity_id: number
          entity_type: string
          id?: never
          snapshot: Json
          summary?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          entity_id?: number
          entity_type?: string
          id?: never
          snapshot?: Json
          summary?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          brief: string | null
          concept_summary: string | null
          content_status: Database["public"]["Enums"]["content_status"]
          created_at: string
          created_by: string | null
          draft_payload: Json | null
          hero_image: string | null
          id: number
          last_compass_generation_id: number | null
          name: string | null
          publish_at: string | null
          slug: string | null
          story: string | null
          story_parts: string[]
          story_slides: Json
          target_age_max: number | null
          target_age_min: number | null
          theme_keywords: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brief?: string | null
          concept_summary?: string | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          created_by?: string | null
          draft_payload?: Json | null
          hero_image?: string | null
          id?: number
          last_compass_generation_id?: number | null
          name?: string | null
          publish_at?: string | null
          slug?: string | null
          story?: string | null
          story_parts?: string[]
          story_slides?: Json
          target_age_max?: number | null
          target_age_min?: number | null
          theme_keywords?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brief?: string | null
          concept_summary?: string | null
          content_status?: Database["public"]["Enums"]["content_status"]
          created_at?: string
          created_by?: string | null
          draft_payload?: Json | null
          hero_image?: string | null
          id?: number
          last_compass_generation_id?: number | null
          name?: string | null
          publish_at?: string | null
          slug?: string | null
          story?: string | null
          story_parts?: string[]
          story_slides?: Json
          target_age_max?: number | null
          target_age_min?: number | null
          theme_keywords?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_last_compass_generation_id_fkey"
            columns: ["last_compass_generation_id"]
            isOneToOne: false
            referencedRelation: "compass_generations"
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
      user_achievements: {
        Row: {
          created_at: string
          id: number
          message: string
          profile_id: number
          source: string
          source_id: number
          team_id: number
          xp: number
        }
        Insert: {
          created_at?: string
          id?: number
          message: string
          profile_id: number
          source: string
          source_id: number
          team_id: number
          xp?: number
        }
        Update: {
          created_at?: string
          id?: number
          message?: string
          profile_id?: number
          source?: string
          source_id?: number
          team_id?: number
          xp?: number
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
      user_activity_photos: {
        Row: {
          activity_id: number | null
          photo_id: number
          photo_url: string
          profile_id: number
          reason: string | null
          status: number
          uploaded_at: string
          user_activity_id: number
        }
        Insert: {
          activity_id?: number | null
          photo_id?: number
          photo_url: string
          profile_id: number
          reason?: string | null
          status?: number
          uploaded_at?: string
          user_activity_id: number
        }
        Update: {
          activity_id?: number | null
          photo_id?: number
          photo_url?: string
          profile_id?: number
          reason?: string | null
          status?: number
          uploaded_at?: string
          user_activity_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_photos_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_photos_user_activity_id_fkey"
            columns: ["user_activity_id"]
            isOneToOne: false
            referencedRelation: "user_activity_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_progress: {
        Row: {
          activity_id: number
          completed_at: string | null
          debrief_answer_1: string | null
          debrief_answer_2: string | null
          id: number
          notes: string | null
          profile_id: number
        }
        Insert: {
          activity_id: number
          completed_at?: string | null
          debrief_answer_1?: string | null
          debrief_answer_2?: string | null
          id?: number
          notes?: string | null
          profile_id: number
        }
        Update: {
          activity_id?: number
          completed_at?: string | null
          debrief_answer_1?: string | null
          debrief_answer_2?: string | null
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
      user_badges: {
        Row: {
          badge_id: number
          created_at: string
          earned_at: string
          grant_reason: string | null
          grant_type: string
          granted_by: string | null
          id: number
          profile_id: number
          user_id: string
        }
        Insert: {
          badge_id: number
          created_at?: string
          earned_at?: string
          grant_reason?: string | null
          grant_type?: string
          granted_by?: string | null
          id?: number
          profile_id: number
          user_id: string
        }
        Update: {
          badge_id?: number
          created_at?: string
          earned_at?: string
          grant_reason?: string | null
          grant_type?: string
          granted_by?: string | null
          id?: number
          profile_id?: number
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
      user_data: {
        Row: {
          last_seen_season_id: number | null
          start_mission_step: number
          team: number | null
          user_id: string
          weekly_email: boolean
        }
        Insert: {
          last_seen_season_id?: number | null
          start_mission_step?: number
          team?: number | null
          user_id: string
          weekly_email?: boolean
        }
        Update: {
          last_seen_season_id?: number | null
          start_mission_step?: number
          team?: number | null
          user_id?: string
          weekly_email?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_data_last_seen_season_id_fkey"
            columns: ["last_seen_season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_data_team_fkey"
            columns: ["team"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          app_build: string | null
          app_environment: string | null
          app_version: string | null
          created_at: string
          device_model: string | null
          device_platform: string | null
          extra: Json | null
          handled: boolean | null
          handled_at: string | null
          handled_by: string | null
          id: number
          message: string | null
          profile_id: number | null
          screen: string | null
          source: string | null
          team_id: number | null
          user_id: string | null
        }
        Insert: {
          app_build?: string | null
          app_environment?: string | null
          app_version?: string | null
          created_at?: string
          device_model?: string | null
          device_platform?: string | null
          extra?: Json | null
          handled?: boolean | null
          handled_at?: string | null
          handled_by?: string | null
          id?: number
          message?: string | null
          profile_id?: number | null
          screen?: string | null
          source?: string | null
          team_id?: number | null
          user_id?: string | null
        }
        Update: {
          app_build?: string | null
          app_environment?: string | null
          app_version?: string | null
          created_at?: string
          device_model?: string | null
          device_platform?: string | null
          extra?: Json | null
          handled?: boolean | null
          handled_at?: string | null
          handled_by?: string | null
          id?: number
          message?: string | null
          profile_id?: number | null
          screen?: string | null
          source?: string | null
          team_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: number
          name: string | null
          notes: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          name?: string | null
          notes?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          name?: string | null
          notes?: string | null
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      profile_public: {
        Row: {
          id: number | null
          nickname: string | null
          team_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_team_xp: {
        Args: { team_id: number; xp_amount: number }
        Returns: undefined
      }
      can_access_campfire_topic: { Args: { topic: string }; Returns: boolean }
      can_send_campfire_reaction: {
        Args: { p_session_id: number }
        Returns: boolean
      }
      check_in_to_explore_location: {
        Args: {
          p_accuracy_meters: number
          p_latitude: number
          p_location_id: number
          p_longitude: number
          p_profile_id: number
        }
        Returns: {
          collectible_flavor_text: string
          collectible_id: number
          collectible_image_url: string
          collectible_name: string
          collectible_rarity: Database["public"]["Enums"]["explore_collectible_rarity"]
          distance_meters: number
          failure_reason: string
          is_first_shiny: boolean
          is_new_collectible: boolean
          is_shiny: boolean
          new_count: number
          new_profile_xp: number
          success: boolean
          xp_awarded: number
        }[]
      }
      evaluate_and_award_badges: {
        Args: { p_profile_id: number }
        Returns: {
          badge_id: number
          badge_type: string
          category: string
          description: string
          image_url: string
          name: string
          requirement_category: string
          requirement_type: string
          requirement_value: number
          sort_group: string
        }[]
      }
      get_campfire_reaction_total: {
        Args: { p_session_id: number }
        Returns: number
      }
      get_profile_badge_progress: {
        Args: { p_profile_id: number }
        Returns: {
          badge_id: number
          badge_type: string
          category: string
          description: string
          earned: boolean
          earned_at: string
          image_url: string
          is_active: boolean
          is_hidden_until_awarded: boolean
          name: string
          progress_percent: number
          progress_value: number
          requirement_category: string
          requirement_type: string
          requirement_value: number
          sort_group: string
        }[]
      }
      get_profile_stat_value: {
        Args: {
          p_profile_id: number
          p_requirement_category?: string
          p_requirement_type: string
        }
        Returns: number
      }
      get_push_enabled: { Args: { p_device_id: string }; Returns: boolean }
      get_team_xp: { Args: { team_id: number }; Returns: number }
      grant_badge_to_profile: {
        Args: { p_badge_id: number; p_profile_id: number; p_reason?: string }
        Returns: {
          badge_id: number
          profile_id: number
          user_badge_id: number
        }[]
      }
      profile_public_info: {
        Args: never
        Returns: {
          id: number
          nickname: string
          team_name: string
        }[]
      }
      record_campfire_reaction: {
        Args: { p_emoji: string; p_session_id: number }
        Returns: boolean
      }
      revoke_user_sessions: { Args: { p_user_id: string }; Returns: undefined }
      set_push_enabled: {
        Args: {
          p_device_id: string
          p_enabled: boolean
          p_expo_push_token?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      campfire_component_type:
        | "audio"
        | "subtitle"
        | "mission_card"
        | "submission"
      campfire_session_status:
        | "draft"
        | "scheduled"
        | "live"
        | "replay"
        | "archived"
      content_status:
        | "concept"
        | "outline"
        | "drafting"
        | "in_review"
        | "approved"
        | "published"
        | "archived"
      explore_collectible_rarity:
        | "common"
        | "uncommon"
        | "rare"
        | "epic"
        | "legendary"
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
      campfire_component_type: [
        "audio",
        "subtitle",
        "mission_card",
        "submission",
      ],
      campfire_session_status: [
        "draft",
        "scheduled",
        "live",
        "replay",
        "archived",
      ],
      content_status: [
        "concept",
        "outline",
        "drafting",
        "in_review",
        "approved",
        "published",
        "archived",
      ],
      explore_collectible_rarity: [
        "common",
        "uncommon",
        "rare",
        "epic",
        "legendary",
      ],
    },
  },
} as const

