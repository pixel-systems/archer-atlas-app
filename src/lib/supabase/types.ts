// Hand-maintained DB types. After deploying the SQL schema you can replace this
// file with `supabase gen types typescript --project-id <id>`.

export type ScrapeSource =
  | "members"
  | "member_details"
  | "awards"
  | "results_index"
  | "result_pdf"
  | "competitions"
  | "club_profiles"
  | "all";
export type ScrapeStatus = "running" | "success" | "failed" | "partial";
export type ClaimStatus = "pending" | "approved" | "rejected";
export type AppRole = "user" | "admin";

type Rels = [];

// ---------- Training journal row types (referenced by Database below) ----------

export interface TrainingFormatRow {
  id: string;
  code: string;
  organisation: "WA" | "IFAA" | "OTHER";
  name: string;
  discipline: string;
  scoring_type: string;
  max_score: number | null;
  default_distances: Array<{
    label: string;
    ends: number;
    arrows_per_end: number;
    max_per_arrow: number;
  }>;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export interface TrainingSessionRow {
  id: string;
  user_id: string;
  format_id: string;
  session_date: string;
  division: string | null;
  age_category: string | null;
  bow_style: string | null;
  location: string | null;
  weather: string | null;
  notes: string | null;
  total_score: number | null;
  total_arrows: number | null;
  bow_setup_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingSessionEndRow {
  id: string;
  session_id: string;
  sort_order: number;
  distance_label: string | null;
  end_number: number;
  arrows: string[];
  end_total: number | null;
  created_at: string;
}

// ---------- Equipment row types ----------

export type BowType =
  | "recurve"
  | "barebow"
  | "compound"
  | "longbow"
  | "traditional"
  | "horse_bow"
  | "crossbow"
  | "other";

export interface EquipmentRiserRow {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  length_inches: number | null;
  handedness: "RH" | "LH" | null;
  color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentLimbRow {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  length: "short" | "medium" | "long" | null;
  draw_weight_lbs: number | null;
  fitting: string | null;
  material: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentArrowRow {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  shaft_type: string | null;
  spine: string | null;
  length_inches: number | null;
  point_grain: number | null;
  pin: string | null;
  nock: string | null;
  fletching_type: string | null;
  fletching_length: string | null;
  fletching_color: string | null;
  quantity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentBowSetupRow {
  id: string;
  user_id: string;
  name: string;
  bow_type: BowType;
  brand: string | null;
  model: string | null;
  draw_weight_lbs: number | null;
  draw_length_inches: number | null;
  riser_id: string | null;
  limbs_id: string | null;
  arrows_id: string | null;
  is_default: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      clubs: {
        Row: {
          id: string;
          name: string;
          slug: string;
          code: string | null;
          logo_url: string | null;
          website_url: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          profile_scraped_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          code?: string | null;
          logo_url?: string | null;
          website_url?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          profile_scraped_at?: string | null;
          created_at?: string;
        };
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
          detail_scraped_at: string | null;
          detail_url: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["members"]["Row"],
          "id" | "created_at" | "detail_scraped_at" | "detail_url"
        > & {
          id?: string;
          created_at?: string;
          detail_scraped_at?: string | null;
          detail_url?: string | null;
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
          items_total: number | null;
          current_item: string | null;
          current_item_index: number | null;
          progress_updated_at: string | null;
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
          items_total?: number | null;
          current_item?: string | null;
          current_item_index?: number | null;
          progress_updated_at?: string | null;
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
      member_personal_bests: {
        Row: {
          id: string;
          member_id: string;
          score: number | null;
          achieved_on: string | null;
          competition_name: string | null;
          discipline: string | null;
          setup: string | null;
          category: string | null;
          division: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["member_personal_bests"]["Row"],
          "id" | "created_at"
        > & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["member_personal_bests"]["Insert"]>;
        Relationships: Rels;
      };
      member_season_results: {
        Row: {
          id: string;
          member_id: string;
          season: number;
          score: number | null;
          achieved_on: string | null;
          competition_name: string | null;
          discipline: string | null;
          setup: string | null;
          category: string | null;
          division: string | null;
          is_season_max: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["member_season_results"]["Row"],
          "id" | "created_at" | "is_season_max"
        > & {
          id?: string;
          created_at?: string;
          is_season_max?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["member_season_results"]["Insert"]>;
        Relationships: Rels;
      };
      training_formats: {
        Row: {
          id: string;
          code: string;
          organisation: "WA" | "IFAA" | "OTHER";
          name: string;
          discipline: string;
          scoring_type: string;
          max_score: number | null;
          default_distances: Array<{
            label: string;
            ends: number;
            arrows_per_end: number;
            max_per_arrow: number;
          }>;
          sort_order: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          organisation: "WA" | "IFAA" | "OTHER";
          name: string;
          discipline: string;
          scoring_type: string;
          max_score?: number | null;
          default_distances?: Array<{
            label: string;
            ends: number;
            arrows_per_end: number;
            max_per_arrow: number;
          }>;
          sort_order?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["training_formats"]["Insert"]>;
        Relationships: Rels;
      };
      training_sessions: {
        Row: {
          id: string;
          user_id: string;
          format_id: string;
          session_date: string;
          division: string | null;
          age_category: string | null;
          bow_style: string | null;
          location: string | null;
          weather: string | null;
          notes: string | null;
          total_score: number | null;
          total_arrows: number | null;
          bow_setup_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          format_id: string;
          session_date: string;
          division?: string | null;
          age_category?: string | null;
          bow_style?: string | null;
          location?: string | null;
          weather?: string | null;
          notes?: string | null;
          total_score?: number | null;
          total_arrows?: number | null;
          bow_setup_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["training_sessions"]["Insert"]>;
        Relationships: Rels;
      };
      training_session_ends: {
        Row: {
          id: string;
          session_id: string;
          sort_order: number;
          distance_label: string | null;
          end_number: number;
          arrows: string[];
          end_total: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          sort_order: number;
          distance_label?: string | null;
          end_number: number;
          arrows?: string[];
          end_total?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["training_session_ends"]["Insert"]>;
        Relationships: Rels;
      };
      equipment_risers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          model: string | null;
          length_inches: number | null;
          handedness: "RH" | "LH" | null;
          color: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["equipment_risers"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["equipment_risers"]["Insert"]>;
        Relationships: Rels;
      };
      equipment_limbs: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          model: string | null;
          length: "short" | "medium" | "long" | null;
          draw_weight_lbs: number | null;
          fitting: string | null;
          material: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["equipment_limbs"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["equipment_limbs"]["Insert"]>;
        Relationships: Rels;
      };
      equipment_arrows: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          model: string | null;
          shaft_type: string | null;
          spine: string | null;
          length_inches: number | null;
          point_grain: number | null;
          pin: string | null;
          nock: string | null;
          fletching_type: string | null;
          fletching_length: string | null;
          fletching_color: string | null;
          quantity: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["equipment_arrows"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["equipment_arrows"]["Insert"]>;
        Relationships: Rels;
      };
      equipment_bow_setups: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          bow_type: BowType;
          brand: string | null;
          model: string | null;
          draw_weight_lbs: number | null;
          draw_length_inches: number | null;
          riser_id: string | null;
          limbs_id: string | null;
          arrows_id: string | null;
          is_default: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["equipment_bow_setups"]["Row"],
          "id" | "created_at" | "updated_at" | "is_default"
        > & {
          id?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["equipment_bow_setups"]["Insert"]>;
        Relationships: Rels;
      };
    };
    Views: {
      competition_overview: {
        Row: {
          id: string;
          name: string;
          held_on: string | null;
          season: number | null;
          entries_count: number;
          athletes_count: number;
          clubs_count: number;
          top_score: number | null;
          disciplines: string[] | null;
          divisions: string[] | null;
          categories: string[] | null;
        };
        Relationships: Rels;
      };
      competition_entries: {
        Row: {
          competition_id: string;
          entry_id: string;
          member_id: string;
          license_number: string;
          first_name: string;
          last_name: string;
          club_id: string | null;
          club_name: string | null;
          club_slug: string | null;
          competition_name: string | null;
          achieved_on: string | null;
          season: number | null;
          score: number | null;
          discipline: string | null;
          setup: string | null;
          category: string | null;
          division: string | null;
          is_season_max: boolean | null;
        };
        Relationships: Rels;
      };
    };
    Functions: {
      refresh_competition_views: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: { [_ in never]: never };
  };
}

// ---------- Training journal (separate augmentation of Database typed surface) ----------
// (interfaces defined above the Database declaration)

