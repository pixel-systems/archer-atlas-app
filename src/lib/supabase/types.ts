// Hand-maintained DB types. After deploying the SQL schema you can replace this
// file with `supabase gen types typescript --project-id <id>`.

export type ScrapeSource = "members" | "awards" | "results_index" | "result_pdf" | "all";
export type ScrapeStatus = "running" | "success" | "failed" | "partial";
export type ClaimStatus = "pending" | "approved" | "rejected";
export type AppRole = "user" | "admin";

type Rels = [];

export interface Database {
  public: {
    Tables: {
      clubs: {
        Row: { id: string; name: string; slug: string; created_at: string };
        Insert: { id?: string; name: string; slug: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["clubs"]["Insert"]>;
        Relationships: Rels;
      };
      members: {
        Row: {
          id: string;
          slz_id: number | null;
          license_number: string;
          first_name: string;
          last_name: string;
          birth_year: number | null;
          club_id: string | null;
          category_target: string | null;
          category_3d: string | null;
          last_scraped_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["members"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: Rels;
      };
      competitions: {
        Row: {
          id: string;
          name: string;
          held_on: string | null;
          season: number | null;
          source_url: string;
          kind: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["competitions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["competitions"]["Insert"]>;
        Relationships: Rels;
      };
      results: {
        Row: {
          id: string;
          competition_id: string;
          member_id: string | null;
          division: string | null;
          category: string | null;
          score: number | null;
          rank: number | null;
          raw: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["results"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["results"]["Insert"]>;
        Relationships: Rels;
      };
      awards: {
        Row: {
          id: string;
          member_id: string | null;
          award_type: string;
          award_level: string | null;
          year: number | null;
          source_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["awards"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["awards"]["Insert"]>;
        Relationships: Rels;
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          contact_email: string | null;
          member_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: Rels;
      };
      member_claims: {
        Row: {
          id: string;
          profile_id: string;
          member_id: string;
          status: ClaimStatus;
          note: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["member_claims"]["Row"],
          "id" | "created_at" | "decided_at" | "decided_by"
        > & {
          id?: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["member_claims"]["Insert"]>;
        Relationships: Rels;
      };
      scrape_runs: {
        Row: {
          id: string;
          source: ScrapeSource;
          status: ScrapeStatus;
          started_at: string;
          finished_at: string | null;
          items_processed: number;
          items_failed: number;
          errors: Record<string, unknown> | null;
          triggered_by: string | null;
        };
        Insert: {
          id?: string;
          source: ScrapeSource;
          status: ScrapeStatus;
          started_at?: string;
          finished_at?: string | null;
          items_processed?: number;
          items_failed?: number;
          errors?: Record<string, unknown> | null;
          triggered_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["scrape_runs"]["Insert"]>;
        Relationships: Rels;
      };
      app_roles: {
        Row: { user_id: string; role: AppRole; created_at: string };
        Insert: { user_id: string; role: AppRole; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["app_roles"]["Insert"]>;
        Relationships: Rels;
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
}
