import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, Calendar, Clock, BarChart2 } from 'lucide-react'
import { usePointageReport } from '../hooks/usePointageReport'
import { LoadingSpinner } from './LoadingSpinner'
import type { PersonReportRow } from '../types'

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function fmtDays(n: number) {
  return n.toFixed(1) + ' j'
}

function fmtPct(a: number, b: number) {
  if (!b) return '—'
  return ((a / b) * 100).toFixed(0) + '%'
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string; icon: React.ReactNode }> = ({
  label, value, sub, color = 'text-slate-100', icon,
}) => (
  <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 flex items-start gap-4">
    <div className="text-slate-400 mt-0.5">{icon}</div>
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  </div>
)

// ── Month Bar ──────────────────────────────────────────────────────────────────

const MonthBar: React.FC<{
  monthKey: string
  pointage: number
  capacity: number
  isFuture: boolean
  isSelected: boolean
  onClick: () => void
}> = ({ monthKey, pointage, capacity, isFuture, isSelected, onClick }) => {
  const month = new Date(monthKey + 'T12:00:00').getMonth()
  const pct = capacity > 0 ? Math.min((pointage / capacity) * 100, 100) : 0
  const overloaded = capacity > 0 && pointage > capacity * 1.05

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 group transition-all ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
    >
      <span className="text-xs text-slate-400">{fmtDays(pointage)}</span>
      <div className="w-8 bg-slate-700 rounded-full overflow-hidden" style={{ height: '80px' }}>
        <div
          className={`w-full rounded-full transition-all ${
            isFuture ? 'bg-slate-600' :
            overloaded ? 'bg-red-500' :
            'bg-emerald-500'
          } ${isSelected ? 'ring-2 ring-white/30' : ''}`}
          style={{ height: `${Math.max(pct, 2)}%`, marginTop: `${100 - Math.max(pct, 2)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${isSelected ? 'text-slate-100' : 'text-slate-400'}`}>
        {MONTH_NAMES[month]}
      </span>
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

const PointageTab: React.FC = () => {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(() => toDateStr(new Date()))
  const { report, loading, error } = usePointageReport(year)

  const stats = useMemo(() => {
    if (!report) return null
    const gt = report.grand_total
    const cap = report.capacity_grand_total

    // Répartition par type de projet
    const byType: Record<string, number> = { PJ: 0, RD: 0, CA: 0, Autre: 0 }
    for (const row of report.rows) {
      const ref = row.project_ref.split(' ')[0]
      const pts = row.total.pointage
      if (ref.startsWith('PJ-')) byType['PJ'] += pts
      else if (ref.startsWith('RD-')) byType['RD'] += pts
      else if (ref.startsWith('CA-')) byType['CA'] += pts
      else byType['Autre'] += pts
    }

    // Répartition par projet
    const byProject: Record<string, { ref: string; title: string; total: number }> = {}
    for (const row of report.rows) {
      const key = row.project_ref.split(' ')[0]
      if (!byProject[key]) {
        const parts = row.project_ref.split(' ')
        byProject[key] = { ref: parts[0], title: parts.slice(1).join(' '), total: 0 }
      }
      byProject[key].total += row.total.pointage
    }
    const topProjects = Object.values(byProject)
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)

    const totalPointage = gt.pointage
    const liberablePct = totalPointage > 0 ? (gt.liberable / totalPointage) * 100 : 0
    const ecartRapport = gt.rapport - totalPointage

    return { totalPointage, byType, liberablePct, liberable: gt.liberable, ecartRapport, rapport: gt.rapport, absences: cap.absences, topProjects, grand_total: gt, capacity: cap }
  }, [report])

  // Détail du mois sélectionné
  const monthDetail = useMemo(() => {
    if (!report || !selectedMonth) return null
    const capacity = report.capacity_by_month[selectedMonth]
    const totals = report.totals_by_month[selectedMonth]
    if (!totals) return null

    // Rows avec pointage ce mois
    const rows: (PersonReportRow & { monthPointage: number })[] = report.rows
      .map(r => ({ ...r, monthPointage: r.by_month[selectedMonth]?.pointage ?? 0 }))
      .filter(r => r.monthPointage > 0)
      .sort((a, b) => b.monthPointage - a.monthPointage)

    // Répartition par type pour ce mois
    const byType: Record<string, number> = { PJ: 0, RD: 0, CA: 0, Autre: 0 }
    for (const row of rows) {
      const ref = row.project_ref.split(' ')[0]
      if (ref.startsWith('PJ-')) byType['PJ'] += row.monthPointage
      else if (ref.startsWith('RD-')) byType['RD'] += row.monthPointage
      else if (ref.startsWith('CA-')) byType['CA'] += row.monthPointage
      else byType['Autre'] += row.monthPointage
    }

    return { capacity, totals, rows, byType }
  }, [report, selectedMonth])

  if (loading) return <LoadingSpinner />
  if (error) return <div className="text-center py-12 text-red-400">Erreur : {error.message}</div>
  if (!report || !stats) return null

  const nowKey = toDateStr(new Date())

  return (
    <div className="space-y-8">
      {/* Header + year nav */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Pointage {year}</h2>
          <p className="text-sm text-slate-400 mt-1">{report.user.login}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-slate-200 font-semibold w-12 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} disabled={year >= currentYear}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jours pointés" value={fmtDays(stats.totalPointage)}
          sub={`${stats.capacity.working_days} j ouvrés · ${stats.absences} j absences`}
          color="text-emerald-400" icon={<Clock size={20} />} />
        <StatCard label="Jours libérables" value={fmtDays(stats.liberable)}
          sub={`${stats.liberablePct.toFixed(0)}% du pointage (FEDER/subvention)`}
          color="text-blue-400" icon={<TrendingUp size={20} />} />
        <StatCard label="Écart rapport" value={(stats.ecartRapport >= 0 ? '+' : '') + fmtDays(stats.ecartRapport)}
          sub={`Rapport: ${fmtDays(stats.rapport)} · Pointage: ${fmtDays(stats.totalPointage)}`}
          color={Math.abs(stats.ecartRapport) < 2 ? 'text-emerald-400' : 'text-amber-400'}
          icon={<BarChart2 size={20} />} />
        <StatCard label="Projets actifs" value={stats.topProjects.length.toString()}
          sub="avec pointage" color="text-slate-300" icon={<Calendar size={20} />} />
      </div>

      {/* Répartition PJ/RD/CA */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-4">Répartition du temps par type</p>
        <div className="flex gap-2 h-8 rounded-full overflow-hidden mb-4">
          {Object.entries(stats.byType).filter(([,v]) => v > 0).map(([type, days]) => {
            const pct = stats.totalPointage > 0 ? (days / stats.totalPointage) * 100 : 0
            const colors: Record<string, string> = { PJ: 'bg-blue-500', RD: 'bg-purple-500', CA: 'bg-slate-500', Autre: 'bg-amber-500' }
            return <div key={type} className={`${colors[type]} flex items-center justify-center text-xs font-semibold text-white`} style={{ width: `${pct}%` }} title={`${type}: ${fmtDays(days)}`}>
              {pct > 10 ? type : ''}
            </div>
          })}
        </div>
        <div className="flex gap-6 flex-wrap text-xs text-slate-400">
          {Object.entries(stats.byType).filter(([,v]) => v > 0).map(([type, days]) => {
            const pct = stats.totalPointage > 0 ? (days / stats.totalPointage) * 100 : 0
            const colors: Record<string, string> = { PJ: 'text-blue-400', RD: 'text-purple-400', CA: 'text-slate-400', Autre: 'text-amber-400' }
            return <span key={type} className={colors[type]}>{type} — {fmtDays(days)} ({pct.toFixed(0)}%)</span>
          })}
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-6">Par mois — cliquer pour détail</p>
        <div className="flex items-end justify-between gap-2 overflow-x-auto pb-2">
          {report.months.map(mk => {
            const cap = report.capacity_by_month[mk]
            const tot = report.totals_by_month[mk]
            if (!cap || !tot) return null
            return (
              <MonthBar key={mk} monthKey={mk}
                pointage={tot.pointage}
                capacity={cap.working_days}
                isFuture={cap.is_future}
                isSelected={selectedMonth === mk}
                onClick={() => setSelectedMonth(mk === selectedMonth ? null : mk)}
              />
            )
          })}
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-4 flex-wrap text-xs text-slate-500">
          <span><span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-1" />Pointage normal</span>
          <span><span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1" />Dépassé</span>
          <span><span className="inline-block w-2 h-2 bg-slate-600 rounded-full mr-1" />Futur / incomplet</span>
        </div>
      </div>

      {/* Month detail + top projects side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Month detail */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          {monthDetail ? (() => {
            const mk = selectedMonth!
            const monthIdx = new Date(mk + 'T12:00:00').getMonth()
            const { capacity, totals, rows, byType } = monthDetail
            const taux = capacity ? (totals.pointage / capacity.working_days) * 100 : 0
            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-200">
                    {MONTH_NAMES[monthIdx]} {year}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${
                    capacity?.is_future ? 'bg-slate-700 text-slate-400' :
                    taux >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {capacity?.is_future ? 'Futur' : taux.toFixed(0) + '%'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Ouvrés</p>
                    <p className="text-lg font-bold text-slate-200">{capacity?.working_days ?? '—'}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Pointés</p>
                    <p className="text-lg font-bold text-emerald-400">{totals.pointage.toFixed(1)}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Absences</p>
                    <p className="text-lg font-bold text-slate-300">{capacity?.absences ?? 0}</p>
                  </div>
                </div>
                {/* Répartition PJ/RD/CA du mois */}
                {totals.pointage > 0 && (
                  <div className="mb-4">
                    <div className="flex gap-1 h-5 rounded overflow-hidden mb-2">
                      {Object.entries(byType).filter(([,v]) => v > 0).map(([type, days]) => {
                        const pct = totals.pointage > 0 ? (days / totals.pointage) * 100 : 0
                        const colors: Record<string, string> = { PJ: 'bg-blue-500', RD: 'bg-purple-500', CA: 'bg-slate-500', Autre: 'bg-amber-500' }
                        return <div key={type} className={`${colors[type]} flex items-center justify-center text-xs font-semibold text-white`} style={{ width: `${pct}%` }} title={`${type}: ${fmtDays(days)}`}>
                          {pct > 12 ? type : ''}
                        </div>
                      })}
                    </div>
                    <div className="flex gap-3 flex-wrap text-xs">
                      {Object.entries(byType).filter(([,v]) => v > 0).map(([type, days]) => {
                        const pct = totals.pointage > 0 ? (days / totals.pointage) * 100 : 0
                        const colors: Record<string, string> = { PJ: 'text-blue-400', RD: 'text-purple-400', CA: 'text-slate-400', Autre: 'text-amber-400' }
                        return <span key={type} className={colors[type]}>{type} {fmtDays(days)} <span className="text-slate-600">({pct.toFixed(0)}%)</span></span>
                      })}
                    </div>
                  </div>
                )}
                {/* Progress bar */}
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
                  <div className={`h-full rounded-full transition-all ${
                    taux >= 80 ? 'bg-emerald-500' : taux >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                  }`} style={{ width: `${Math.min(taux, 100)}%` }} />
                </div>
                {/* Rows */}
                {rows.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {rows.map(row => (
                      <div key={row.task_id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-300 truncate block">{row.project_ref.split(' ')[0]}</span>
                          <span className="text-slate-500 truncate block">{row.task_label}</span>
                        </div>
                        <span className="text-emerald-400 font-semibold flex-shrink-0">{fmtDays(row.monthPointage)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Aucun pointage ce mois</p>
                )}
              </>
            )
          })() : (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-slate-500 text-sm">Cliquer sur un mois pour le détail</p>
            </div>
          )}
        </div>

        {/* Top projets */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-4">Répartition par projet</p>
          {stats.topProjects.length > 0 ? (
            <div className="space-y-3">
              {stats.topProjects.map(p => {
                const pct = stats.totalPointage > 0 ? (p.total / stats.totalPointage) * 100 : 0
                return (
                  <div key={p.ref}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex gap-2 items-baseline min-w-0">
                        <span className="text-slate-300 font-semibold flex-shrink-0">{p.ref}</span>
                        <span className="text-slate-500 truncate">{p.title}</span>
                      </div>
                      <span className="text-slate-300 font-semibold flex-shrink-0 ml-2">{fmtDays(p.total)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-8">Aucun pointage pour cette année</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PointageTab
