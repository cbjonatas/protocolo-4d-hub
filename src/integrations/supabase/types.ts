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
      courses: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cycles: {
        Row: {
          course_id: string
          created_at: string
          description: string
          id: string
          number: number
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string
          id?: string
          number: number
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string
          id?: string
          number?: number
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_progress: {
        Row: {
          completed_at: string
          exam_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          exam_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          exam_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_progress_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress: {
        Row: {
          completed_at: string
          goal_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          goal_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          goal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "question_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          cycle_id: string
          description: string
          id: string
          is_active: boolean
          release_offset_days: number
          sort_order: number
          title: string
          updated_at: string
          video_file_path: string
          video_url: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          description?: string
          id?: string
          is_active?: boolean
          release_offset_days?: number
          sort_order?: number
          title: string
          updated_at?: string
          video_file_path?: string
          video_url?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          description?: string
          id?: string
          is_active?: boolean
          release_offset_days?: number
          sort_order?: number
          title?: string
          updated_at?: string
          video_file_path?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          file_path: string
          id: string
          lesson_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          lesson_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          lesson_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exams: {
        Row: {
          answer_key_path: string
          answer_key_url: string
          correction_url: string
          correction_video_url: string
          course_id: string
          created_at: string
          description: string
          external_url: string
          id: string
          number: number
          pdf_path: string
          release_offset_days: number
          sort_order: number
          title: string
        }
        Insert: {
          answer_key_path?: string
          answer_key_url?: string
          correction_url?: string
          correction_video_url?: string
          course_id: string
          created_at?: string
          description?: string
          external_url?: string
          id?: string
          number: number
          pdf_path?: string
          release_offset_days?: number
          sort_order?: number
          title: string
        }
        Update: {
          answer_key_path?: string
          answer_key_url?: string
          correction_url?: string
          correction_video_url?: string
          course_id?: string
          created_at?: string
          description?: string
          external_url?: string
          id?: string
          number?: number
          pdf_path?: string
          release_offset_days?: number
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_blocked: boolean
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          is_blocked?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_blocked?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      question_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_option_id: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_option_id?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "question_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      question_attempts: {
        Row: {
          correct_count: number
          created_at: string
          finished_at: string | null
          goal_id: string
          id: string
          total: number
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          finished_at?: string | null
          goal_id: string
          id?: string
          total?: number
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          finished_at?: string | null
          goal_id?: string
          id?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "question_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      question_goals: {
        Row: {
          created_at: string
          cycle_id: string
          description: string
          external_url: string
          id: string
          pdf_path: string
          question_count: number
          release_offset_days: number
          sort_order: number
          subject: string
          title: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          description?: string
          external_url?: string
          id?: string
          pdf_path?: string
          question_count?: number
          release_offset_days?: number
          sort_order?: number
          subject?: string
          title: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          description?: string
          external_url?: string
          id?: string
          pdf_path?: string
          question_count?: number
          release_offset_days?: number
          sort_order?: number
          subject?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_goals_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          content: string
          created_at: string
          id: string
          is_correct: boolean
          label: string
          order_index: number
          question_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_correct?: boolean
          label: string
          order_index?: number
          question_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          label?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          explanation: string
          goal_id: string
          id: string
          is_published: boolean
          order_index: number
          statement: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          explanation?: string
          goal_id: string
          id?: string
          is_published?: boolean
          order_index?: number
          statement: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          explanation?: string
          goal_id?: string
          id?: string
          is_published?: boolean
          order_index?: number
          statement?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "question_goals"
            referencedColumns: ["id"]
          },
        ]
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
      admin_delete_student: {
        Args: { p_user_id: string; p_email?: string }
        Returns: Json
      }
      admin_toggle_enrollment: {
        Args: { p_user_id?: string; p_course_id_or_slug?: string; p_action?: string; args?: Json }
        Returns: Json
      }
      delete_course: { Args: { p_course_id: string }; Returns: undefined }
      duplicate_course: {
        Args: { p_course_id: string; p_new_slug: string; p_new_title: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
