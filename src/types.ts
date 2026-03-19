export interface Team {
  id: number;
  name: string;
  logo_url: string;
  region: string;
  description: string;
  reference_links?: string;
  historical_records?: string;
}

export interface TournamentStage {
  id: number;
  tournament_id: number;
  name: string;
  format: string;
  group_count?: number | null;
  teams_per_group?: number | null;
  swiss_rounds?: number | null;
  swiss_in_groups?: boolean;
  stage_groups?: Record<string, number[]> | null;
}

export interface Match {
  id: number;
  tournament_id: number;
  stage: string;
  group_name?: string;
  round: number;
  team1_id: number;
  team2_id: number;
  team1_name: string;
  team1_logo: string;
  team2_name: string;
  team2_logo: string;
  team1_score: number;
  team2_score: number;
  status: string;
  match_date: string;
  report?: string;
  raw_report?: string;
}

export interface Tournament {
  id: number;
  name: string;
  game: string;
  start_date: string;
  end_date: string;
  prize_pool: string;
  status: string;
  description: string;
  format: string;
  teams?: Team[];
  matches?: Match[];
  stages?: TournamentStage[];
}
