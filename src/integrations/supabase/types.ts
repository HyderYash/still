export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Image Marking System Types
export type MarkerColor = "green" | "red" | "yellow" | "blue" | "purple" | "none";

export interface ImageMark {
  id: string;
  type: 'circle' | 'rectangle' | 'point';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: MarkerColor;
  comment?: string;
  author?: string;
  timestamp?: string;
}

// Database-backed image mark interface
export interface DatabaseImageMark {
  id: string;
  image_id: string;
  project_id: string;
  author_id: string;
  author_name: string;
  mark_type: 'circle' | 'rectangle' | 'point';
  x_coordinate: number;
  y_coordinate: number;
  radius?: number;
  width?: number;
  height?: number;
  color: MarkerColor;
  comment?: string;
  created_at: string;
  updated_at: string;
}

// Convert database mark to frontend mark
export const convertDatabaseMarkToFrontend = (dbMark: DatabaseImageMark): ImageMark => ({
  id: dbMark.id,
  type: dbMark.mark_type,
  x: dbMark.x_coordinate,
  y: dbMark.y_coordinate,
  width: dbMark.width,
  height: dbMark.height,
  radius: dbMark.radius,
  color: dbMark.color,
  comment: dbMark.comment || '',
  author: dbMark.author_name,
  timestamp: dbMark.created_at
});

// Convert frontend mark to database mark
export const convertFrontendMarkToDatabase = (
  mark: Omit<ImageMark, 'id' | 'timestamp'>,
  imageId: string,
  projectId: string,
  authorId: string,
  authorName: string
): Omit<DatabaseImageMark, 'id' | 'created_at' | 'updated_at'> => ({
  image_id: imageId,
  project_id: projectId,
  author_id: authorId,
  author_name: authorName,
  mark_type: mark.type,
  x_coordinate: Math.round(mark.x), // Ensure integer coordinates
  y_coordinate: Math.round(mark.y), // Ensure integer coordinates
  radius: mark.radius ? Math.round(mark.radius) : undefined, // Ensure integer radius
  width: mark.width ? Math.round(mark.width) : undefined, // Ensure integer width
  height: mark.height ? Math.round(mark.height) : undefined, // Ensure integer height
  color: mark.color,
  comment: mark.comment
});

export type Database = {
  public: {
    Tables: {
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      image_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_id: string | null
          is_reply_to: string | null
          time_marker: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_id?: string | null
          is_reply_to?: string | null
          time_marker?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_id?: string | null
          is_reply_to?: string | null
          time_marker?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_comments_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_comments_is_reply_to_fkey"
            columns: ["is_reply_to"]
            isOneToOne: false
            referencedRelation: "image_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      image_votes: {
        Row: {
          created_at: string
          id: string
          image_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string
          user_id?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          approved_by: string | null
          created_at: string
          file_name: string
          file_size_bytes: number | null
          folder_id: string | null
          height: number | null
          id: string
          is_approved: boolean | null
          mime_type: string | null
          original_file_name: string | null
          project_id: string
          s3_key: string
          updated_at: string
          user_id: string | null
          width: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          folder_id?: string | null
          height?: number | null
          id?: string
          is_approved?: boolean | null
          mime_type?: string | null
          original_file_name?: string | null
          project_id: string
          s3_key: string
          updated_at?: string
          user_id?: string | null
          width?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          folder_id?: string | null
          height?: number | null
          id?: string
          is_approved?: boolean | null
          mime_type?: string | null
          original_file_name?: string | null
          project_id?: string
          s3_key?: string
          updated_at?: string
          user_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "images_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          allowed_projects: number | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          order_sequence: number | null
          price_cents: number
          price_currency: string
          storage_limit_bytes: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          allowed_projects?: number | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          order_sequence?: number | null
          price_cents?: number
          price_currency?: string
          storage_limit_bytes: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          allowed_projects?: number | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          order_sequence?: number | null
          price_cents?: number
          price_currency?: string
          storage_limit_bytes?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          plan_id: string | null
          profile_page_text: string | null
          total_size_mb: number | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          plan_id?: string | null
          profile_page_text?: string | null
          total_size_mb?: number | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          plan_id?: string | null
          profile_page_text?: string | null
          total_size_mb?: number | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      project_shares: {
        Row: {
          created_at: string
          id: string
          project_id: string
          shared_by: string
          shared_with: string
          shared_with_user_id: string | null
          status: Database["public"]["Enums"]["share_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          shared_by: string
          shared_with: string
          shared_with_user_id?: string | null
          status?: Database["public"]["Enums"]["share_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          shared_by?: string
          shared_with?: string
          shared_with_user_id?: string | null
          status?: Database["public"]["Enums"]["share_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["project_visibility"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["project_visibility"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["project_visibility"]
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_storage_policies: {
        Args: { bucket_name: string }
        Returns: undefined
      }
      get_complete_user_projects: {
        Args:
        | { input_user_id: string; input_user_email: string }
        | {
          input_user_id: string
          input_user_email?: string
          ispublic?: boolean
        }
        Returns: {
          id: string
          name: string
          user_id: string
          visibility: string
          created_at: string
          updated_at: string
          formatted_date: string
          thumbnail_key: string
          thumbnail_id: string
          is_shared: boolean
          shared_by_id: string
          shared_by_name: string
          project_share_id: string
        }[]
      }
      get_image_vote_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          image_id: string
          vote_count: number
        }[]
      }
      increment_storage_usage: {
        Args: { user_id: string; size_mb: number }
        Returns: undefined
      }
      is_project_shared_with_current_user: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      is_username_available: {
        Args: { username: string }
        Returns: boolean
      }
    }
    Enums: {
      project_visibility: "public" | "private"
      share_request_status: "pending" | "accepted" | "rejected"
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
  public: {
    Enums: {
      project_visibility: ["public", "private"],
      share_request_status: ["pending", "accepted", "rejected"],
    },
  },
} as const
