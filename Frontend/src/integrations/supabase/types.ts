// export type Json =
//   | string
//   | number
//   | boolean
//   | null
//   | { [key: string]: Json | undefined }
//   | Json[]

// export type Database = {
//   // Allows to automatically instantiate createClient with right options
//   // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
//   __InternalSupabase: {
//     PostgrestVersion: "13.0.5"
//   }
//   public: {
//     Tables: {
//       finding_pocs: {
//         Row: {
//           file_name: string
//           file_path: string
//           finding_id: string
//           id: string
//           uploaded_at: string
//           uploaded_by: string
//         }
//         Insert: {
//           file_name: string
//           file_path: string
//           finding_id: string
//           id?: string
//           uploaded_at?: string
//           uploaded_by: string
//         }
//         Update: {
//           file_name?: string
//           file_path?: string
//           finding_id?: string
//           id?: string
//           uploaded_at?: string
//           uploaded_by?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "finding_pocs_finding_id_fkey"
//             columns: ["finding_id"]
//             isOneToOne: false
//             referencedRelation: "findings"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       findings: {
//         Row: {
//           affected_component: string | null
//           created_at: string
//           created_by: string
//           cvss_score: number | null
//           cwe_id: string | null
//           description: string | null
//           id: string
//           impact: string | null
//           project_id: string
//           remediation: string | null
//           retest_date: string | null
//           retest_notes: string | null
//           retest_status: string | null
//           retested_by: string | null
//           severity: string
//           status: string | null
//           steps_to_reproduce: string | null
//           title: string
//           updated_at: string
//         }
//         Insert: {
//           affected_component?: string | null
//           created_at?: string
//           created_by: string
//           cvss_score?: number | null
//           cwe_id?: string | null
//           description?: string | null
//           id?: string
//           impact?: string | null
//           project_id: string
//           remediation?: string | null
//           retest_date?: string | null
//           retest_notes?: string | null
//           retest_status?: string | null
//           retested_by?: string | null
//           severity: string
//           status?: string | null
//           steps_to_reproduce?: string | null
//           title: string
//           updated_at?: string
//         }
//         Update: {
//           affected_component?: string | null
//           created_at?: string
//           created_by?: string
//           cvss_score?: number | null
//           cwe_id?: string | null
//           description?: string | null
//           id?: string
//           impact?: string | null
//           project_id?: string
//           remediation?: string | null
//           retest_date?: string | null
//           retest_notes?: string | null
//           retest_status?: string | null
//           retested_by?: string | null
//           severity?: string
//           status?: string | null
//           steps_to_reproduce?: string | null
//           title?: string
//           updated_at?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "findings_project_id_fkey"
//             columns: ["project_id"]
//             isOneToOne: false
//             referencedRelation: "projects"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       profiles: {
//         Row: {
//           created_at: string
//           full_name: string | null
//           id: string
//           user_id: string
//           username: string
//         }
//         Insert: {
//           created_at?: string
//           full_name?: string | null
//           id?: string
//           user_id: string
//           username: string
//         }
//         Update: {
//           created_at?: string
//           full_name?: string | null
//           id?: string
//           user_id?: string
//           username?: string
//         }
//         Relationships: []
//       }
//       project_assignments: {
//         Row: {
//           assigned_at: string
//           id: string
//           project_id: string
//           user_id: string
//         }
//         Insert: {
//           assigned_at?: string
//           id?: string
//           project_id: string
//           user_id: string
//         }
//         Update: {
//           assigned_at?: string
//           id?: string
//           project_id?: string
//           user_id?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "project_assignments_project_id_fkey"
//             columns: ["project_id"]
//             isOneToOne: false
//             referencedRelation: "projects"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       projects: {
//         Row: {
//           client: string
//           created_at: string
//           created_by: string | null
//           domain: string | null
//           end_date: string | null
//           id: string
//           ip_addresses: string[] | null
//           name: string
//           start_date: string | null
//           status: string | null
//         }
//         Insert: {
//           client: string
//           created_at?: string
//           created_by?: string | null
//           domain?: string | null
//           end_date?: string | null
//           id?: string
//           ip_addresses?: string[] | null
//           name: string
//           start_date?: string | null
//           status?: string | null
//         }
//         Update: {
//           client?: string
//           created_at?: string
//           created_by?: string | null
//           domain?: string | null
//           end_date?: string | null
//           id?: string
//           ip_addresses?: string[] | null
//           name?: string
//           start_date?: string | null
//           status?: string | null
//         }
//         Relationships: []
//       }
//       user_roles: {
//         Row: {
//           id: string
//           role: Database["public"]["Enums"]["app_role"]
//           user_id: string
//         }
//         Insert: {
//           id?: string
//           role: Database["public"]["Enums"]["app_role"]
//           user_id: string
//         }
//         Update: {
//           id?: string
//           role?: Database["public"]["Enums"]["app_role"]
//           user_id?: string
//         }
//         Relationships: []
//       }
//     }
//     Views: {
//       [_ in never]: never
//     }
//     Functions: {
//       has_role: {
//         Args: {
//           _role: Database["public"]["Enums"]["app_role"]
//           _user_id: string
//         }
//         Returns: boolean
//       }
//       is_assigned_to_project: {
//         Args: { _project_id: string; _user_id: string }
//         Returns: boolean
//       }
//     }
//     Enums: {
//       app_role: "admin" | "manager" | "tester"
//     }
//     CompositeTypes: {
//       [_ in never]: never
//     }
//   }
// }

// type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

// type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

// export type Tables<
//   DefaultSchemaTableNameOrOptions extends
//     | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
//     | { schema: keyof DatabaseWithoutInternals },
//   TableName extends DefaultSchemaTableNameOrOptions extends {
//     schema: keyof DatabaseWithoutInternals
//   }
//     ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
//         DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
//     : never = never,
// > = DefaultSchemaTableNameOrOptions extends {
//   schema: keyof DatabaseWithoutInternals
// }
//   ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
//       DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
//       Row: infer R
//     }
//     ? R
//     : never
//   : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
//         DefaultSchema["Views"])
//     ? (DefaultSchema["Tables"] &
//         DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
//         Row: infer R
//       }
//       ? R
//       : never
//     : never

// export type TablesInsert<
//   DefaultSchemaTableNameOrOptions extends
//     | keyof DefaultSchema["Tables"]
//     | { schema: keyof DatabaseWithoutInternals },
//   TableName extends DefaultSchemaTableNameOrOptions extends {
//     schema: keyof DatabaseWithoutInternals
//   }
//     ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
//     : never = never,
// > = DefaultSchemaTableNameOrOptions extends {
//   schema: keyof DatabaseWithoutInternals
// }
//   ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
//       Insert: infer I
//     }
//     ? I
//     : never
//   : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
//     ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
//         Insert: infer I
//       }
//       ? I
//       : never
//     : never

// export type TablesUpdate<
//   DefaultSchemaTableNameOrOptions extends
//     | keyof DefaultSchema["Tables"]
//     | { schema: keyof DatabaseWithoutInternals },
//   TableName extends DefaultSchemaTableNameOrOptions extends {
//     schema: keyof DatabaseWithoutInternals
//   }
//     ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
//     : never = never,
// > = DefaultSchemaTableNameOrOptions extends {
//   schema: keyof DatabaseWithoutInternals
// }
//   ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
//       Update: infer U
//     }
//     ? U
//     : never
//   : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
//     ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
//         Update: infer U
//       }
//       ? U
//       : never
//     : never

// export type Enums<
//   DefaultSchemaEnumNameOrOptions extends
//     | keyof DefaultSchema["Enums"]
//     | { schema: keyof DatabaseWithoutInternals },
//   EnumName extends DefaultSchemaEnumNameOrOptions extends {
//     schema: keyof DatabaseWithoutInternals
//   }
//     ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
//     : never = never,
// > = DefaultSchemaEnumNameOrOptions extends {
//   schema: keyof DatabaseWithoutInternals
// }
//   ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
//   : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
//     ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
//     : never

// export type CompositeTypes<
//   PublicCompositeTypeNameOrOptions extends
//     | keyof DefaultSchema["CompositeTypes"]
//     | { schema: keyof DatabaseWithoutInternals },
//   CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
//     schema: keyof DatabaseWithoutInternals
//   }
//     ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
//     : never = never,
// > = PublicCompositeTypeNameOrOptions extends {
//   schema: keyof DatabaseWithoutInternals
// }
//   ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
//   : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
//     ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
//     : never

// export const Constants = {
//   public: {
//     Enums: {
//       app_role: ["admin", "manager", "tester"],
//     },
//   },
// } as const
