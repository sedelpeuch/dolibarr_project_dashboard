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

export interface HealthWarning {
  code: string
  level: 'warning' | 'info'
}

export interface ProjectMember {
  id: number
  login: string
}

export interface PrevMonthValidation {
  status: string
  validated_at: string | null
  validated_by: string | null
  declared_progress: number | null
}

export interface MpTimesheets {
  total: number
  by_user: { login: string; duration: number }[]
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
  unittech_names: string[]
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
  isCoordinator?: boolean
  // Gaaspard enriched fields
  real_progress: number | null
  declared_progress: number | null
  last_validated_progress: number | null
  prev_month_progress: number | null
  prev_month_validation: PrevMonthValidation | null
  health_warnings: HealthWarning[]
  mp_timesheets: MpTimesheets | null
  coordinators: ProjectMember[]
  contributors: ProjectMember[]
}

export interface DashboardData {
  projects: Project[]
}

export interface VacationPeriod {
  id: string
  start: string // YYYY-MM-DD
  end: string   // YYYY-MM-DD
  label?: string
}

export interface ProjectPeriod {
  start: string // YYYY-MM-DD
  end: string   // YYYY-MM-DD
  days: number
}

export interface ProjectParticipation {
  project_id: number
  days: number
  active: boolean
  periods?: ProjectPeriod[]
}

export interface WorkloadConfig {
  participations: ProjectParticipation[]
  vacation_periods: VacationPeriod[]
}

export type TabType = 'projects' | 'opportunities' | 'rd' | 'meta-projects' | 'workload' | 'pointage'

export interface FilteredProjects {
  projects: Project[]
  opportunities: Project[]
  rd: Project[]
}
export interface PersonReportMonthData {
  pointage: number
  rapport: number
  rapport_set: boolean
  planned_workload: number
  planned_workload_set: boolean
  liberable: number
  lib_v2_pool: number
  reequilibre: number
  rnd_affectable: number
}

export interface PersonReportRow {
  task_id: number
  task_ref: string
  task_label: string
  project_ref: string
  project_rowid: number
  project_title: string
  planifiable: boolean
  subvention_source: string
  by_month: Record<string, PersonReportMonthData>
  total: PersonReportMonthData
}

export interface PersonReportCapacity {
  working_days: number
  absences: number
  theoretical_workdays: number
  is_future: boolean
  is_planned: boolean
}

export interface PersonReport {
  user: { rowid: number; login: string }
  year: number
  months: string[]
  rows: PersonReportRow[]
  totals_by_month: Record<string, PersonReportMonthData>
  grand_total: PersonReportMonthData
  capacity_by_month: Record<string, PersonReportCapacity>
  capacity_grand_total: { working_days: number; absences: number; theoretical_workdays: number }
}

export interface OpportunityStats {
  conversion_rate: number
  won_count: number
  lost_count: number
  open_count: number
  potential_amount: number
  total_amount: number
  real_projects: number
  weighted_open_amount: number
}

export interface OpportunitySummary {
  id: string | number
  ref: string
  title: string
  opp_amount: number
  opp_percent: number
  opp_status?: string
  status: string
  coordinators?: ProjectMember[]
  health_warnings?: HealthWarning[]
}

export interface OpportunityStageGroup {
  stage: string
  opportunities: OpportunitySummary[]
}