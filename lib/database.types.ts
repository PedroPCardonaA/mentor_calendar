export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      calendar_shares: {
        Row: {
          collaborator_id: string | null
          created_at: string
          id: string
          invitee_email: string
          owner_id: string
          permission: string
          status: string
          updated_at: string
        }
        Insert: {
          collaborator_id?: string | null
          created_at?: string
          id?: string
          invitee_email: string
          owner_id: string
          permission?: string
          status?: string
          updated_at?: string
        }
        Update: {
          collaborator_id?: string | null
          created_at?: string
          id?: string
          invitee_email?: string
          owner_id?: string
          permission?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_shares_collaborator_id_fkey'
            columns: ['collaborator_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_shares_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kind: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      event_exceptions: {
        Row: {
          created_at: string
          end_at: string | null
          event_id: string
          id: string
          is_cancelled: boolean
          occurrence_start: string
          start_at: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          end_at?: string | null
          event_id: string
          id?: string
          is_cancelled?: boolean
          occurrence_start: string
          start_at?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          end_at?: string | null
          event_id?: string
          id?: string
          is_cancelled?: boolean
          occurrence_start?: string
          start_at?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_exceptions_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_at: string | null
          event_type: string
          id: string
          is_recurring: boolean
          owner_id: string
          recurrence_until: string | null
          rrule: string | null
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string | null
          event_type?: string
          id?: string
          is_recurring?: boolean
          owner_id: string
          recurrence_until?: string | null
          rrule?: string | null
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string | null
          event_type?: string
          id?: string
          is_recurring?: boolean
          owner_id?: string
          recurrence_until?: string | null
          rrule?: string | null
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'events_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_student_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_logs: {
        Row: {
          actual_end: string | null
          actual_minutes: number
          actual_start: string | null
          category_id: string | null
          event_id: string | null
          event_type: string
          id: string
          logged_at: string
          notes: string | null
          occurrence_start: string | null
          owner_id: string
          title: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_minutes?: number
          actual_start?: string | null
          category_id?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          logged_at?: string
          notes?: string | null
          occurrence_start?: string | null
          owner_id: string
          title?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_minutes?: number
          actual_start?: string | null
          category_id?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          logged_at?: string
          notes?: string | null
          occurrence_start?: string | null
          owner_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'time_logs_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_logs_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_logs_student_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_calendar: { Args: { cal_owner: string }; Returns: boolean }
      can_access_event: { Args: { eid: string }; Returns: boolean }
      can_edit_calendar: { Args: { cal_owner: string }; Returns: boolean }
      can_edit_event: { Args: { eid: string }; Returns: boolean }
      shares_calendar_with: { Args: { other: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ---------------------------------------------------------------------------
// Convenience row types
// ---------------------------------------------------------------------------
export type Profile = Tables<'profiles'>
export type CalendarShare = Tables<'calendar_shares'>
export type Category = Tables<'categories'>
export type Event = Tables<'events'>
export type EventException = Tables<'event_exceptions'>
export type TimeLog = Tables<'time_logs'>

// Domain literal unions (narrowed from DB string columns)
export type EventType = 'deadline' | 'lecture' | 'lab' | 'study' | 'other'
export type CategoryKind = 'course' | 'project' | 'other'
export type SharePermission = 'viewer' | 'editor'
export type ShareStatus = 'pending' | 'accepted' | 'declined'
