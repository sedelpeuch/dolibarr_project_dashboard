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

export interface Task {
  id: number
  ref: string
  label: string
  duration_effective: number
  planned_workload: number
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
