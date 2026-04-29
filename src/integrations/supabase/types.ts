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
      activity_log: {
        Row: {
          actor_id: string | null
          client_id: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          acknowledged_at: string | null
          business_profile_data: Json | null
          client_id: string
          created_at: string
          ghl_pipeline_stage: string | null
          id: string
          is_active: boolean
          notes: string | null
          service_id: string
          started_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          business_profile_data?: Json | null
          client_id: string
          created_at?: string
          ghl_pipeline_stage?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          service_id: string
          started_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          business_profile_data?: Json | null
          client_id?: string
          created_at?: string
          ghl_pipeline_stage?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          service_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          ein: string | null
          email: string
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          formation_date: string | null
          id: string
          internal_notes: string | null
          phone: string | null
          state: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          user_id: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          ein?: string | null
          email: string
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          formation_date?: string | null
          id?: string
          internal_notes?: string | null
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          ein?: string | null
          email?: string
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          formation_date?: string | null
          id?: string
          internal_notes?: string | null
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      discovery_sessions: {
        Row: {
          attendees: string[]
          calendly_event_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          outcome_notes: string | null
          scheduled_at: string
        }
        Insert: {
          attendees?: string[]
          calendly_event_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          outcome_notes?: string | null
          scheduled_at: string
        }
        Update: {
          attendees?: string[]
          calendly_event_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          outcome_notes?: string | null
          scheduled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          client_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["document_status"]
          uploaded_by: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          client_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          uploaded_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          client_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          body: string
          client_id: string | null
          client_service_id: string | null
          created_at: string
          error_message: string | null
          id: string
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
          template_key: string | null
        }
        Insert: {
          body: string
          client_id?: string | null
          client_service_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject: string
          template_key?: string | null
        }
        Update: {
          body?: string
          client_id?: string | null
          client_service_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_variables: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          body_html: string
          body_variables?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          subject: string
          template_key: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_variables?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      intake_submissions: {
        Row: {
          company_name: string | null
          converted_client_id: string | null
          created_at: string
          email: string
          explanation: string | null
          first_name: string
          id: string
          incorporation_state: string | null
          last_name: string
          marketing_consent: boolean
          non_marketing_consent: boolean
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          services_of_interest: string[] | null
          status: string
        }
        Insert: {
          company_name?: string | null
          converted_client_id?: string | null
          created_at?: string
          email: string
          explanation?: string | null
          first_name: string
          id?: string
          incorporation_state?: string | null
          last_name: string
          marketing_consent?: boolean
          non_marketing_consent?: boolean
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_of_interest?: string[] | null
          status?: string
        }
        Update: {
          company_name?: string | null
          converted_client_id?: string | null
          created_at?: string
          email?: string
          explanation?: string | null
          first_name?: string
          id?: string
          incorporation_state?: string | null
          last_name?: string
          marketing_consent?: boolean
          non_marketing_consent?: boolean
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_of_interest?: string[] | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_submissions_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          payment_link_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          payment_link_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          payment_link_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_on: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_task_templates: {
        Row: {
          created_at: string
          default_due_offset_days: number | null
          default_priority: Database["public"]["Enums"]["task_priority"]
          description: string | null
          id: string
          service_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          default_due_offset_days?: number | null
          default_priority?: Database["public"]["Enums"]["task_priority"]
          description?: string | null
          id?: string
          service_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          default_due_offset_days?: number | null
          default_priority?: Database["public"]["Enums"]["task_priority"]
          description?: string | null
          id?: string
          service_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_task_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          created_at: string
          id: string
          is_done: boolean
          sort_order: number
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_done?: boolean
          sort_order?: number
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_done?: boolean
          sort_order?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          status: Database["public"]["Enums"]["support_status"]
          subject: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          status?: Database["public"]["Enums"]["support_status"]
          subject: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["support_status"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          client_id: string | null
          column_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          progress: number
          service_id: string | null
          sort_order: number
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          client_id?: string | null
          column_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          service_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          client_id?: string | null
          column_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          service_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "workspace_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          id: string
          logged_on: string
          minutes: number
          note: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_on?: string
          minutes: number
          note?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_on?: string
          minutes?: number
          note?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
      workspace_columns: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_done_column: boolean
          name: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_done_column?: boolean
          name: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_done_column?: boolean
          name?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_columns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          client_id: string | null
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          icon: string
          id: string
          name: string
          status: Database["public"]["Enums"]["workspace_status"]
          updated_at: string
          visibility: Database["public"]["Enums"]["workspace_visibility"]
        }
        Insert: {
          client_id?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          icon?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["workspace_status"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["workspace_visibility"]
        }
        Update: {
          client_id?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          icon?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["workspace_status"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["workspace_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_client_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_internal_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "client" | "finance" | "operations" | "staff"
      client_status: "prospect" | "active" | "inactive"
      document_category:
        | "contract"
        | "identification"
        | "tax"
        | "financial"
        | "legal"
        | "other"
        | "proposal"
        | "corporate_kit"
        | "current_structure"
        | "completion_certificate"
      document_status: "pending_review" | "approved" | "rejected"
      entity_type:
        | "LLC"
        | "S_Corp"
        | "C_Corp"
        | "Sole_Proprietor"
        | "Partnership"
        | "Other"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      payment_method: "bank_transfer" | "check" | "cash" | "card" | "other"
      support_status: "open" | "in_progress" | "resolved" | "closed"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "open" | "in_progress" | "pending" | "blocked" | "closed"
      workspace_member_role: "owner" | "editor" | "viewer"
      workspace_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "archived"
      workspace_visibility: "public" | "private"
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
      app_role: ["admin", "client", "finance", "operations", "staff"],
      client_status: ["prospect", "active", "inactive"],
      document_category: [
        "contract",
        "identification",
        "tax",
        "financial",
        "legal",
        "other",
        "proposal",
        "corporate_kit",
        "current_structure",
        "completion_certificate",
      ],
      document_status: ["pending_review", "approved", "rejected"],
      entity_type: [
        "LLC",
        "S_Corp",
        "C_Corp",
        "Sole_Proprietor",
        "Partnership",
        "Other",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      payment_method: ["bank_transfer", "check", "cash", "card", "other"],
      support_status: ["open", "in_progress", "resolved", "closed"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["open", "in_progress", "pending", "blocked", "closed"],
      workspace_member_role: ["owner", "editor", "viewer"],
      workspace_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "archived",
      ],
      workspace_visibility: ["public", "private"],
    },
  },
} as const
