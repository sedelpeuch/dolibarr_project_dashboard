/**
 * Centralized type definitions for the entire application
 */

export interface Invoice {
  id: number
  ref: string
  total: number
  total_ht: number
  date_validation: number | null
  status: string | number
}

export interface ProposalLine {
  description: string
  total: number
  rang: number
}

export interface Proposal {
  id: number
  ref: string
  total: number
  total_ht: number
  date_creation: number | null
  date_signature: number | null
  delivery_date: number | null
  status: string | number
  cond_reglement_doc: string
  lines: ProposalLine[]
}

export interface TimespentLine {
  id: number
  date: number
  duration: number
  user_id: number
  user_name: string
}

export interface Task {
  id: number
  ref: string
  label: string
  duration_effective: number
  planned_workload: number
  timespent_lines?: TimespentLine[]
}

export interface TimespentByUser {
  user_id: number
  user_name: string
  total_duration: number
}

export interface Project {
  id: number
  ref: string
  title: string
  client_id: string
  client_name: string
  client_code: string
  client_address: string
  client_zip: string
  client_town: string
  client_country_code: string
  status: string
  date_start: number
  date_end: number
  budget_total: number
  total_invoiced: number
  budget_remaining: number
  is_opportunity: boolean
  is_rd: boolean
  description: string
  unittech: number[]
  wp_days: number
  rd_days: number
  budget_amount: number
  opp_amount: number
  opp_percent: number
  time_spent_total: number
  invoices: Invoice[]
  proposals: Proposal[]
  tasks: Task[]
  timespent_by_user: TimespentByUser[]
}

export interface DashboardData {
  projects: Project[]
}

export type TabType = 'projects' | 'opportunities' | 'rd' | 'meta-projects'

export interface FilteredProjects {
  projects: Project[]
  opportunities: Project[]
  rd: Project[]
}
export interface OpportunityStats {
  open_count: number
  won_count: number
  lost_count: number
  conversion_rate: number
  total_open_amount: number
  weighted_open_amount: number
  potential_amount: number
  lost_amount: number
}

export interface OpportunitySummary {
  id: string
  ref: string
  title: string
  opp_amount: number
  opp_percent: number
  opp_status?: string
  status: string
}

export interface OpportunityStageGroup {
  stage: string
  opportunities: OpportunitySummary[]
}