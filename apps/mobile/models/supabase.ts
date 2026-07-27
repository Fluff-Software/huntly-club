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
    PostgrestVersion: "14.1"
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
          release_date: string | null
          reminder_message: string | null
          safety_notes: string | null
          session_order: number | null
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
          release_date?: string | null
          reminder_message?: string | null
          safety_notes?: string | null
          session_order?: number | null
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
          release_date?: string | null
          reminder_message?: string | null
          safety_notes?: string | null
          session_order?: number | null
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
          live_ended_at: string | null
          live_started_at: string | null
          missions: number[]
          scheduled_at: string | null
          show_viewer_count: boolean
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
          live_ended_at?: string | null
          live_started_at?: string | null
          missions?: number[]
          scheduled_at?: string | null
          show_viewer_count?: boolean
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
          live_ended_at?: string | null
          live_started_at?: string | null
          missions?: number[]
          scheduled_at?: string | null
          show_viewer_count?: boolean
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
      explore_cards: {
        Row: {
          base_weight: number
          category: Database["public"]["Enums"]["explore_card_category"]
          created_at: string
          description: string
          habitat_weights: Json
          id: string
          image_path: string
          is_active: boolean
          name: string
          rarity: Database["public"]["Enums"]["explore_card_rarity"]
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_weight: number
          category: Database["public"]["Enums"]["explore_card_category"]
          created_at?: string
          description?: string
          habitat_weights?: Json
          id?: string
          image_path?: string
          is_active?: boolean
          name: string
          rarity: Database["public"]["Enums"]["explore_card_rarity"]
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_weight?: number
          category?: Database["public"]["Enums"]["explore_card_category"]
          created_at?: string
          description?: string
          habitat_weights?: Json
          id?: string
          image_path?: string
          is_active?: boolean
          name?: string
          rarity?: Database["public"]["Enums"]["explore_card_rarity"]
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      explore_profile_cards: {
        Row: {
          card_id: string
          count: number
          created_at: string
          first_collected_at: string
          id: string
          last_collected_at: string
          profile_id: number
          updated_at: string
        }
        Insert: {
          card_id: string
          count?: number
          created_at?: string
          first_collected_at?: string
          id?: string
          last_collected_at?: string
          profile_id: number
          updated_at?: string
        }
        Update: {
          card_id?: string
          count?: number
          created_at?: string
          first_collected_at?: string
          id?: string
          last_collected_at?: string
          profile_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "explore_profile_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "explore_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explore_profile_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      explore_stop_claims: {
        Row: {
          awarded_card_id: string | null
          claimed_at: string
          created_at: string
          environment_profile: Json
          generation_version: number
          id: string
          idempotency_key: string | null
          profile_id: number
          reported_accuracy_metres: number
          reported_latitude: number
          reported_longitude: number
          source_type: string
          stop_id: string
          user_id: string
          verified_distance_metres: number
        }
        Insert: {
          awarded_card_id?: string | null
          claimed_at?: string
          created_at?: string
          environment_profile?: Json
          generation_version: number
          id?: string
          idempotency_key?: string | null
          profile_id: number
          reported_accuracy_metres: number
          reported_latitude: number
          reported_longitude: number
          source_type: string
          stop_id: string
          user_id: string
          verified_distance_metres: number
        }
        Update: {
          awarded_card_id?: string | null
          claimed_at?: string
          created_at?: string
          environment_profile?: Json
          generation_version?: number
          id?: string
          idempotency_key?: string | null
          profile_id?: number
          reported_accuracy_metres?: number
          reported_latitude?: number
          reported_longitude?: number
          source_type?: string
          stop_id?: string
          user_id?: string
          verified_distance_metres?: number
        }
        Relationships: [
          {
            foreignKeyName: "explore_stop_claims_awarded_card_id_fkey"
            columns: ["awarded_card_id"]
            isOneToOne: false
            referencedRelation: "explore_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explore_stop_claims_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      huntly_account_deletion_requests: {
        Row: {
          completed_at: string | null
          email: string | null
          firebase_user_id: string
          id: string
          requested_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          email?: string | null
          firebase_user_id: string
          id?: string
          requested_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          email?: string | null
          firebase_user_id?: string
          id?: string
          requested_at?: string
          status?: string
        }
        Relationships: []
      }
      huntly_activities: {
        Row: {
          activity_type: string
          date_time: string
          id: string
          item_id: string | null
          mongo_id: string | null
          points_awarded: number
          profile_id: string
        }
        Insert: {
          activity_type: string
          date_time?: string
          id?: string
          item_id?: string | null
          mongo_id?: string | null
          points_awarded?: number
          profile_id: string
        }
        Update: {
          activity_type?: string
          date_time?: string
          id?: string
          item_id?: string | null
          mongo_id?: string | null
          points_awarded?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "huntly_activities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "huntly_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      huntly_badge_rules: {
        Row: {
          badge_id_ref: string
          created_at: string
          description: string | null
          filter: Json | null
          id: string
          image_url: string | null
          locked: boolean
          mongo_id: string | null
          name: string
          property_match: string | null
          quantity: number | null
          type: string
          updated_at: string
        }
        Insert: {
          badge_id_ref: string
          created_at?: string
          description?: string | null
          filter?: Json | null
          id?: string
          image_url?: string | null
          locked?: boolean
          mongo_id?: string | null
          name: string
          property_match?: string | null
          quantity?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          badge_id_ref?: string
          created_at?: string
          description?: string | null
          filter?: Json | null
          id?: string
          image_url?: string | null
          locked?: boolean
          mongo_id?: string | null
          name?: string
          property_match?: string | null
          quantity?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      huntly_badges: {
        Row: {
          badge_rule_id: string | null
          created_at: string
          date_earned_at: string | null
          description: string | null
          id: string
          image_url: string | null
          mongo_id: string | null
          name: string
          profile_id: string
        }
        Insert: {
          badge_rule_id?: string | null
          created_at?: string
          date_earned_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          mongo_id?: string | null
          name: string
          profile_id: string
        }
        Update: {
          badge_rule_id?: string | null
          created_at?: string
          date_earned_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          mongo_id?: string | null
          name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "huntly_badges_badge_rule_id_fkey"
            columns: ["badge_rule_id"]
            isOneToOne: false
            referencedRelation: "huntly_badge_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "huntly_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      huntly_notification_tokens: {
        Row: {
          firebase_user_id: string
          id: string
          token: string
          updated_at: string
        }
        Insert: {
          firebase_user_id: string
          id?: string
          token: string
          updated_at?: string
        }
        Update: {
          firebase_user_id?: string
          id?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      huntly_profile_states: {
        Row: {
          all_time_photo_count: number
          created_at: string
          id: string
          mongo_id: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          all_time_photo_count?: number
          created_at?: string
          id?: string
          mongo_id?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          all_time_photo_count?: number
          created_at?: string
          id?: string
          mongo_id?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "huntly_profile_states_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "huntly_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      huntly_profiles: {
        Row: {
          area_code: string | null
          created_at: string
          firebase_user_id: string
          id: string
          mongo_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          area_code?: string | null
          created_at?: string
          firebase_user_id: string
          id?: string
          mongo_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          area_code?: string | null
          created_at?: string
          firebase_user_id?: string
          id?: string
          mongo_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      huntly_quest_groups: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          lock_id: string | null
          lockable: boolean
          mongo_id: string | null
          name: string
          on_completion: Json | null
          published: boolean
          tags: string[]
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          lock_id?: string | null
          lockable?: boolean
          mongo_id?: string | null
          name: string
          on_completion?: Json | null
          published?: boolean
          tags?: string[]
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          lock_id?: string | null
          lockable?: boolean
          mongo_id?: string | null
          name?: string
          on_completion?: Json | null
          published?: boolean
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "huntly_quest_groups_lock_id_fkey"
            columns: ["lock_id"]
            isOneToOne: false
            referencedRelation: "huntly_quest_locks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quest_groups_lock_id_fkey"
            columns: ["lock_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quest_locks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      huntly_quest_items: {
        Row: {
          answer: string | null
          branded: boolean
          created_at: string
          description: string | null
          findable_mongo_id: string | null
          hint: string | null
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          mongo_id: string | null
          name: string
          order: number | null
          quest_id: string
          question: string | null
          tags: string[]
          updated_at: string
          warning: Json | null
        }
        Insert: {
          answer?: string | null
          branded?: boolean
          created_at?: string
          description?: string | null
          findable_mongo_id?: string | null
          hint?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          mongo_id?: string | null
          name: string
          order?: number | null
          quest_id: string
          question?: string | null
          tags?: string[]
          updated_at?: string
          warning?: Json | null
        }
        Update: {
          answer?: string | null
          branded?: boolean
          created_at?: string
          description?: string | null
          findable_mongo_id?: string | null
          hint?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          mongo_id?: string | null
          name?: string
          order?: number | null
          quest_id?: string
          question?: string | null
          tags?: string[]
          updated_at?: string
          warning?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "huntly_quest_items_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "huntly_quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quest_items_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quests_public"
            referencedColumns: ["id"]
          },
        ]
      }
      huntly_quest_locks: {
        Row: {
          code: string | null
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_radius: number | null
          mongo_id: string | null
          permanent_unlock: boolean
          types: string[]
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_radius?: number | null
          mongo_id?: string | null
          permanent_unlock?: boolean
          types?: string[]
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_radius?: number | null
          mongo_id?: string | null
          permanent_unlock?: boolean
          types?: string[]
        }
        Relationships: []
      }
      huntly_quest_states: {
        Row: {
          complete: boolean
          created_at: string
          found_items: string[]
          id: string
          is_current: boolean
          mongo_id: string | null
          profile_id: string
          quest_id: string
          updated_at: string
        }
        Insert: {
          complete?: boolean
          created_at?: string
          found_items?: string[]
          id?: string
          is_current?: boolean
          mongo_id?: string | null
          profile_id: string
          quest_id: string
          updated_at?: string
        }
        Update: {
          complete?: boolean
          created_at?: string
          found_items?: string[]
          id?: string
          is_current?: boolean
          mongo_id?: string | null
          profile_id?: string
          quest_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "huntly_quest_states_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "huntly_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quest_states_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "huntly_quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quest_states_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quests_public"
            referencedColumns: ["id"]
          },
        ]
      }
      huntly_quests: {
        Row: {
          attraction_address: string | null
          attraction_bio: string | null
          attraction_colour_hex: string | null
          attraction_fun_facts: string[]
          attraction_image_url: string | null
          attraction_lat: number | null
          attraction_lng: number | null
          attraction_logo_url: string | null
          attraction_name: string | null
          attraction_website: string | null
          attraction_website_label: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          group_id: string | null
          id: string
          is_grouped: boolean
          last_notified: string | null
          lock_id: string | null
          lockable: boolean
          mongo_id: string | null
          name: string
          on_completion: Json | null
          published: boolean
          tags: string[]
          tile_image_url: string | null
          updated_at: string
        }
        Insert: {
          attraction_address?: string | null
          attraction_bio?: string | null
          attraction_colour_hex?: string | null
          attraction_fun_facts?: string[]
          attraction_image_url?: string | null
          attraction_lat?: number | null
          attraction_lng?: number | null
          attraction_logo_url?: string | null
          attraction_name?: string | null
          attraction_website?: string | null
          attraction_website_label?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_grouped?: boolean
          last_notified?: string | null
          lock_id?: string | null
          lockable?: boolean
          mongo_id?: string | null
          name: string
          on_completion?: Json | null
          published?: boolean
          tags?: string[]
          tile_image_url?: string | null
          updated_at?: string
        }
        Update: {
          attraction_address?: string | null
          attraction_bio?: string | null
          attraction_colour_hex?: string | null
          attraction_fun_facts?: string[]
          attraction_image_url?: string | null
          attraction_lat?: number | null
          attraction_lng?: number | null
          attraction_logo_url?: string | null
          attraction_name?: string | null
          attraction_website?: string | null
          attraction_website_label?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_grouped?: boolean
          last_notified?: string | null
          lock_id?: string | null
          lockable?: boolean
          mongo_id?: string | null
          name?: string
          on_completion?: Json | null
          published?: boolean
          tags?: string[]
          tile_image_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "huntly_quests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "huntly_quest_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quest_groups_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quests_lock_id_fkey"
            columns: ["lock_id"]
            isOneToOne: false
            referencedRelation: "huntly_quest_locks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quests_lock_id_fkey"
            columns: ["lock_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quest_locks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      huntly_settings: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      huntly_unlock_logs: {
        Row: {
          created_at: string
          firebase_user_id: string
          id: string
          item_id: string
          mongo_id: string | null
          type: string
          unlock_source: string | null
        }
        Insert: {
          created_at?: string
          firebase_user_id: string
          id?: string
          item_id: string
          mongo_id?: string | null
          type: string
          unlock_source?: string | null
        }
        Update: {
          created_at?: string
          firebase_user_id?: string
          id?: string
          item_id?: string
          mongo_id?: string | null
          type?: string
          unlock_source?: string | null
        }
        Relationships: []
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
      scavenger_quest_states: {
        Row: {
          complete: boolean
          created_at: string
          found_items: string[]
          id: number
          is_current: boolean
          items_rewarded: string[]
          profile_id: number
          quest_id: string
          updated_at: string
        }
        Insert: {
          complete?: boolean
          created_at?: string
          found_items?: string[]
          id?: number
          is_current?: boolean
          items_rewarded?: string[]
          profile_id: number
          quest_id: string
          updated_at?: string
        }
        Update: {
          complete?: boolean
          created_at?: string
          found_items?: string[]
          id?: number
          is_current?: boolean
          items_rewarded?: string[]
          profile_id?: number
          quest_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scavenger_quest_states_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scavenger_quest_states_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "huntly_quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scavenger_quest_states_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quests_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scavenger_session_photos: {
        Row: {
          created_at: string
          id: number
          item_name: string | null
          photo_url: string
          profile_id: number
          quest_id: string
          quest_item_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          item_name?: string | null
          photo_url: string
          profile_id: number
          quest_id: string
          quest_item_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          item_name?: string | null
          photo_url?: string
          profile_id?: number
          quest_id?: string
          quest_item_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scavenger_session_photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scavenger_session_photos_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "huntly_quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scavenger_session_photos_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quests_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scavenger_session_photos_quest_item_id_fkey"
            columns: ["quest_item_id"]
            isOneToOne: false
            referencedRelation: "huntly_quest_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scavenger_session_photos_quest_item_id_fkey"
            columns: ["quest_item_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quest_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scavenger_unlocks: {
        Row: {
          created_at: string
          id: number
          item_id: string
          type: string
          unlock_source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          item_id: string
          type: string
          unlock_source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          item_id?: string
          type?: string
          unlock_source?: string | null
          user_id?: string
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
      team_monthly_winners: {
        Row: {
          created_at: string
          id: number
          month: number
          team_id: number
          total_xp: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: number
          month: number
          team_id: number
          total_xp?: number
          year: number
        }
        Update: {
          created_at?: string
          id?: number
          month?: number
          team_id?: number
          total_xp?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_monthly_winners_team_id_fkey"
            columns: ["team_id"]
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
      temporary_submission_photos: {
        Row: {
          id: number
          photo_url: string
          sort_order: number
          temporary_submission_id: number
        }
        Insert: {
          id?: number
          photo_url: string
          sort_order?: number
          temporary_submission_id: number
        }
        Update: {
          id?: number
          photo_url?: string
          sort_order?: number
          temporary_submission_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "temporary_submission_photos_temporary_submission_id_fkey"
            columns: ["temporary_submission_id"]
            isOneToOne: false
            referencedRelation: "temporary_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      temporary_submissions: {
        Row: {
          activity_id: number
          created_at: string
          display_name: string
          id: number
          submitted_at: string
          team_id: number
          team_xp_awarded: number
          updated_at: string
          xp: number
        }
        Insert: {
          activity_id: number
          created_at?: string
          display_name: string
          id?: number
          submitted_at?: string
          team_id: number
          team_xp_awarded?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          activity_id?: number
          created_at?: string
          display_name?: string
          id?: number
          submitted_at?: string
          team_id?: number
          team_xp_awarded?: number
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "temporary_submissions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporary_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          first_mission_activity_id: number | null
          last_seen_season_id: number | null
          start_mission_step: number
          subscription_exempt: boolean
          team: number | null
          user_id: string
          weekly_email: boolean
        }
        Insert: {
          first_mission_activity_id?: number | null
          last_seen_season_id?: number | null
          start_mission_step?: number
          subscription_exempt?: boolean
          team?: number | null
          user_id: string
          weekly_email?: boolean
        }
        Update: {
          first_mission_activity_id?: number | null
          last_seen_season_id?: number | null
          start_mission_step?: number
          subscription_exempt?: boolean
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
      scavenger_quest_groups_public: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string | null
          lock_id: string | null
          lockable: boolean | null
          name: string | null
          on_completion: Json | null
          published: boolean | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string | null
          lock_id?: string | null
          lockable?: boolean | null
          name?: string | null
          on_completion?: Json | null
          published?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string | null
          lock_id?: string | null
          lockable?: boolean | null
          name?: string | null
          on_completion?: Json | null
          published?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "huntly_quest_groups_lock_id_fkey"
            columns: ["lock_id"]
            isOneToOne: false
            referencedRelation: "huntly_quest_locks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quest_groups_lock_id_fkey"
            columns: ["lock_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quest_locks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scavenger_quest_items_public: {
        Row: {
          branded: boolean | null
          created_at: string | null
          description: string | null
          has_question: boolean | null
          hint: string | null
          id: string | null
          image_url: string | null
          lat: number | null
          lng: number | null
          name: string | null
          order: number | null
          quest_id: string | null
          question: string | null
          tags: string[] | null
          updated_at: string | null
          warning: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "huntly_quest_items_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "huntly_quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quest_items_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quests_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scavenger_quest_locks_public: {
        Row: {
          id: string | null
          location_lat: number | null
          location_lng: number | null
          location_radius: number | null
          permanent_unlock: boolean | null
          requires_code: boolean | null
          requires_location: boolean | null
          types: string[] | null
        }
        Insert: {
          id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_radius?: number | null
          permanent_unlock?: boolean | null
          requires_code?: never
          requires_location?: never
          types?: string[] | null
        }
        Update: {
          id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_radius?: number | null
          permanent_unlock?: boolean | null
          requires_code?: never
          requires_location?: never
          types?: string[] | null
        }
        Relationships: []
      }
      scavenger_quests_public: {
        Row: {
          attraction_address: string | null
          attraction_bio: string | null
          attraction_colour_hex: string | null
          attraction_fun_facts: string[] | null
          attraction_image_url: string | null
          attraction_lat: number | null
          attraction_lng: number | null
          attraction_logo_url: string | null
          attraction_name: string | null
          attraction_website: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          group_id: string | null
          id: string | null
          is_grouped: boolean | null
          lock_id: string | null
          lockable: boolean | null
          name: string | null
          on_completion: Json | null
          published: boolean | null
          tags: string[] | null
          tile_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          attraction_address?: string | null
          attraction_bio?: string | null
          attraction_colour_hex?: string | null
          attraction_fun_facts?: string[] | null
          attraction_image_url?: string | null
          attraction_lat?: number | null
          attraction_lng?: number | null
          attraction_logo_url?: string | null
          attraction_name?: string | null
          attraction_website?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string | null
          is_grouped?: boolean | null
          lock_id?: string | null
          lockable?: boolean | null
          name?: string | null
          on_completion?: Json | null
          published?: boolean | null
          tags?: string[] | null
          tile_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          attraction_address?: string | null
          attraction_bio?: string | null
          attraction_colour_hex?: string | null
          attraction_fun_facts?: string[] | null
          attraction_image_url?: string | null
          attraction_lat?: number | null
          attraction_lng?: number | null
          attraction_logo_url?: string | null
          attraction_name?: string | null
          attraction_website?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string | null
          is_grouped?: boolean | null
          lock_id?: string | null
          lockable?: boolean | null
          name?: string | null
          on_completion?: Json | null
          published?: boolean | null
          tags?: string[] | null
          tile_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "huntly_quests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "huntly_quest_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quest_groups_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quests_lock_id_fkey"
            columns: ["lock_id"]
            isOneToOne: false
            referencedRelation: "huntly_quest_locks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "huntly_quests_lock_id_fkey"
            columns: ["lock_id"]
            isOneToOne: false
            referencedRelation: "scavenger_quest_locks_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_team_xp: {
        Args: { team_id: number; xp_amount: number }
        Returns: undefined
      }
      campfire_schedule_tick: { Args: never; Returns: undefined }
      can_access_campfire_topic: { Args: { topic: string }; Returns: boolean }
      can_send_campfire_reaction: {
        Args: { p_session_id: number }
        Returns: boolean
      }
      claim_explore_stop: {
        Args: {
          p_environment_profile: Json
          p_generation_version: number
          p_idempotency_key?: string
          p_profile_id: number
          p_reported_accuracy_metres: number
          p_reported_latitude: number
          p_reported_longitude: number
          p_source_type: string
          p_stop_id: string
          p_user_id: string
          p_verified_distance_metres: number
        }
        Returns: Json
      }
      end_campfire_session_live: {
        Args: { target_session_id: number }
        Returns: {
          created_at: string
          description: string | null
          duration: number | null
          id: number
          live_ended_at: string | null
          live_started_at: string | null
          missions: number[]
          scheduled_at: string | null
          show_viewer_count: boolean
          status: Database["public"]["Enums"]["campfire_session_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campfire_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
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
      explore_card_environment_multiplier: {
        Args: {
          p_habitat_weights: Json
          p_min_multiplier?: number
          p_stop_environment: Json
        }
        Returns: number
      }
      explore_card_matched_environments: {
        Args: { p_habitat_weights: Json; p_stop_environment: Json }
        Returns: string[]
      }
      explore_card_public_json: {
        Args: { p_card: Database["public"]["Tables"]["explore_cards"]["Row"] }
        Returns: Json
      }
      get_campfire_reaction_total: {
        Args: { p_session_id: number }
        Returns: number
      }
      get_explore_claimed_stop_ids: {
        Args: { p_profile_id: number }
        Returns: string[]
      }
      get_explore_profile_card_collection: {
        Args: { p_profile_id: number }
        Returns: Json
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
      get_random_club_photos: {
        Args: { p_count?: number; p_exclude_ids?: number[] }
        Returns: {
          activity_title: string
          nickname: string
          photo_id: number
          photo_url: string
          profile_id: number
          team_name: string
        }[]
      }
      get_server_now: { Args: never; Returns: string }
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
      scavenger_assert_profile_owner: {
        Args: { p_profile_id: number }
        Returns: string
      }
      scavenger_discard_session_photos: {
        Args: { p_profile_id: number; p_quest_id: string }
        Returns: Json
      }
      scavenger_distance_meters: {
        Args: { p_lat1: number; p_lat2: number; p_lng1: number; p_lng2: number }
        Returns: number
      }
      scavenger_end_session: {
        Args: { p_profile_id: number; p_quest_id: string }
        Returns: Json
      }
      scavenger_ensure_quest_state: {
        Args: { p_profile_id: number; p_quest_id: string }
        Returns: {
          complete: boolean
          created_at: string
          found_items: string[]
          id: number
          is_current: boolean
          items_rewarded: string[]
          profile_id: number
          quest_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "scavenger_quest_states"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      scavenger_get_lock_for_target: {
        Args: { p_item_id: string; p_type: string }
        Returns: {
          code: string | null
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_radius: number | null
          mongo_id: string | null
          permanent_unlock: boolean
          types: string[]
        }
        SetofOptions: {
          from: "*"
          to: "huntly_quest_locks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      scavenger_group_completion_status: {
        Args: { p_group_id: string; p_profile_id: number }
        Returns: Json
      }
      scavenger_is_play_unlocked: {
        Args: { p_item_id: string; p_type: string }
        Returns: boolean
      }
      scavenger_mark_item_found: {
        Args: { p_item_id: string; p_profile_id: number }
        Returns: Json
      }
      scavenger_record_unlock: {
        Args: { p_item_id: string; p_source: string; p_type: string }
        Returns: undefined
      }
      scavenger_restart_quest: {
        Args: { p_profile_id: number; p_quest_id: string }
        Returns: {
          complete: boolean
          created_at: string
          found_items: string[]
          id: number
          is_current: boolean
          items_rewarded: string[]
          profile_id: number
          quest_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "scavenger_quest_states"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      scavenger_unlock_with_code: {
        Args: { p_code: string; p_item_id: string; p_type: string }
        Returns: Json
      }
      scavenger_unlock_with_location: {
        Args: {
          p_item_id: string
          p_lat: number
          p_lng: number
          p_type: string
        }
        Returns: Json
      }
      scavenger_validate_item_answer: {
        Args: { p_answer: string; p_item_id: string; p_profile_id: number }
        Returns: Json
      }
      set_push_enabled: {
        Args: {
          p_device_id: string
          p_enabled: boolean
          p_expo_push_token?: string
        }
        Returns: undefined
      }
      start_campfire_session_live: {
        Args: { target_session_id: number }
        Returns: {
          created_at: string
          description: string | null
          duration: number | null
          id: number
          live_ended_at: string | null
          live_started_at: string | null
          missions: number[]
          scheduled_at: string | null
          show_viewer_count: boolean
          status: Database["public"]["Enums"]["campfire_session_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campfire_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      campfire_component_type:
        | "audio"
        | "subtitle"
        | "mission_card"
        | "submission"
        | "captain"
        | "video"
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
      explore_card_category: "animal" | "habitat" | "flora_wildlife"
      explore_card_rarity: "common" | "uncommon" | "rare" | "very_rare"
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
        "captain",
        "video",
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
      explore_card_category: ["animal", "habitat", "flora_wildlife"],
      explore_card_rarity: ["common", "uncommon", "rare", "very_rare"],
    },
  },
} as const
