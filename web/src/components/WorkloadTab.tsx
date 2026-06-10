import React, { useState, useMemo, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Settings, X, Plus, Trash2, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import type { Project, VacationPeriod, ProjectPeriod } from '../types'
import { useWorkload } from '../hooks/useWorkload'
import { getPlannedDays } from '../utils'

// ── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

/** Count Mon-Fri non-holiday days between start and end (inclusive) */
function countWorkingDays(start: Date, end: Date, offDays?: Set<string>): number {
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endCopy = new Date(end)
  endCopy.setHours(0, 0, 0, 0)
  while (cur <= endCopy) {
    if (!isWeekend(cur) && !(offDays?.has(toDateStr(cur)))) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/** Gauss/Meeus algorithm — returns Easter Sunday */
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const ii = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * ii - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

/** Returns YYYY-MM-DD strings for all 11 French public holidays */
function getFrenchHolidays(year: number): Set<string> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (y: number, mo: number, d: number) => `${y}-${pad(mo)}-${pad(d)}`
  const shift = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
  const ds = (d: Date) => fmt(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const easter = easterSunday(year)
  return new Set([
    fmt(year, 1, 1),          // Jour de l'an
    ds(shift(easter, 1)),     // Lundi de Pâques
    fmt(year, 5, 1),          // Fête du Travail
    fmt(year, 5, 8),          // Victoire 1945
    ds(shift(easter, 39)),    // Ascension
    ds(shift(easter, 49)),    // Lundi de Pentecôte
    fmt(year, 7, 14),         // Fête nationale
    fmt(year, 8, 15),         // Assomption
    fmt(year, 11, 1),         // Toussaint
    fmt(year, 11, 11),        // Armistice
    fmt(year, 12, 25),        // Noël
  ])
}

const COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899',
  '#14b8a6', '#eab308', '#ef4444', '#6366f1', '#06b6d4',
]

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const DOW_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// ── load → HSL color (green=0% → red=80%+) ───────────────────────────────────

function loadBgColor(load: number): string {
  if (load <= 0) return 'transparent'
  const t = Math.min(load / 0.8, 1)
  const hue = Math.round(120 - 120 * t) // 120=green → 0=red
  return `hsla(${hue}, 70%, 35%, 0.55)`
}

function loadTextColor(load: number): string {
  if (load <= 0) return '#94a3b8' // slate-400
  const t = Math.min(load / 0.8, 1)
  const hue = Math.round(120 - 120 * t)
  return `hsl(${hue}, 80%, 70%)`
}

// ── types ─────────────────────────────────────────────────────────────────────

interface ProjectLoad {
  projectId: number
  projectRef: string
  projectTitle: string
  dailyLoad: number
  startStr: string
  endStr: string
  color: string
}

interface DayInfo {
  date: Date
  dateStr: string
  inMonth: boolean
  weekend: boolean
  vacation: boolean
  totalLoad: number
}

// ── build one month's grid (Mon-first, 6 rows) ────────────────────────────────

function buildMonthGrid(
  year: number,
  month: number,
  vacationDays: Set<string>,
  projectLoadData: ProjectLoad[],
): DayInfo[] {
  const firstDay = new Date(year, month, 1)
  const dow = firstDay.getDay()
  const offset = dow === 0 ? 6 : dow - 1
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - offset)

  const days: DayInfo[] = []
  const cur = new Date(startDate)

  for (let i = 0; i < 42; i++) {
    const dateStr = toDateStr(cur)
    const inMonth = cur.getMonth() === month
    const weekend = isWeekend(cur)
    const vacation = vacationDays.has(dateStr)

    let totalLoad = 0

    if (inMonth && !weekend && !vacation) {
      for (const pl of projectLoadData) {
        if (dateStr >= pl.startStr && dateStr <= pl.endStr) {
          totalLoad += pl.dailyLoad
        }
      }
    }

    days.push({ date: new Date(cur), dateStr, inMonth, weekend, vacation, totalLoad })
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

// ── mini month calendar ───────────────────────────────────────────────────────

const MiniMonth: React.FC<{
  year: number
  month: number
  vacationDays: Set<string>
  projectLoadData: ProjectLoad[]
  todayStr: string
  selectedDay: string | null
  onDayClick: (dateStr: string) => void
}> = React.memo(({ year, month, vacationDays, projectLoadData, todayStr, selectedDay, onDayClick }) => {
  const days = useMemo(
    () => buildMonthGrid(year, month, vacationDays, projectLoadData),
    [year, month, vacationDays, projectLoadData],
  )

  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-lg overflow-hidden">
      {/* Month header */}
      <div className="bg-slate-700/50 px-2 py-1 text-center">
        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">
          {MONTH_NAMES[month]}
        </span>
      </div>

      {/* DOW header */}
      <div className="grid grid-cols-7 border-b border-slate-700/30">
        {DOW_LABELS.map((l, i) => (
          <div key={i} className={`text-center py-0.5 text-[9px] font-semibold ${i >= 5 ? 'text-slate-600' : 'text-slate-500'}`}>
            {l}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const isToday = day.dateStr === todayStr
          const isSelected = day.dateStr === selectedDay
          const clickable = day.inMonth && !day.weekend
          const pct = Math.round(day.totalLoad * 100)

          // background
          let cellStyle: React.CSSProperties = {}
          if (!day.inMonth) {
            cellStyle = {}
          } else if (day.weekend || day.vacation) {
            cellStyle = { backgroundColor: 'rgba(15,23,42,0.4)' } // gray like weekend
          } else if (day.totalLoad > 0) {
            cellStyle = { backgroundColor: loadBgColor(day.totalLoad) }
          }

          if (isSelected) cellStyle = { ...cellStyle, outline: '2px solid #60a5fa', outlineOffset: '-2px' }

          const borderClass = `border-r border-b border-slate-700/20 ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}`

          return (
            <div
              key={idx}
              onClick={() => clickable && onDayClick(day.dateStr)}
              className={`flex flex-col items-center justify-start ${borderClass} ${clickable ? 'cursor-pointer' : ''} transition-opacity hover:opacity-80`}
              style={{ minHeight: 30, paddingTop: 2, paddingBottom: 2, ...cellStyle }}
              title={
                day.inMonth && !day.weekend
                  ? day.vacation
                    ? `Congé · ${day.date.toLocaleDateString('fr-FR')}`
                    : pct > 0
                      ? `${day.date.toLocaleDateString('fr-FR')} · ${pct}%`
                      : `${day.date.toLocaleDateString('fr-FR')} · libre`
                  : undefined
              }
            >
              {/* Day number */}
              {day.inMonth && (
                <span
                  className={`text-[10px] font-semibold leading-none w-4 h-4 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-500 text-white' : ''
                  }`}
                  style={!isToday ? {
                    color: day.weekend || day.vacation ? '#475569' : pct > 0 ? loadTextColor(day.totalLoad) : '#64748b'
                  } : undefined}
                >
                  {day.date.getDate()}
                </span>
              )}

              {/* % text */}
              {day.inMonth && !day.weekend && !day.vacation && pct > 0 && (
                <span
                  className="leading-none font-bold"
                  style={{ fontSize: 7, color: loadTextColor(day.totalLoad) }}
                >
                  {pct}%
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

// ── main component ────────────────────────────────────────────────────────────

interface WorkloadTabProps {
  allProjects: Project[]
}

export const WorkloadTab: React.FC<WorkloadTabProps> = ({ allProjects }) => {
  const {
    config, loading, vacationDays,
    addVacationPeriod, removeVacationPeriod, toggleVacationDay,
    updateParticipation, getParticipation,
  } = useWorkload()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [showConfig, setShowConfig] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [includeRd, setIncludeRd] = useState(false)
  const [includeOpp, setIncludeOpp] = useState(false)
  const [showOpp, setShowOpp] = useState(false)
  const [advancedSet, setAdvancedSet] = useState<Set<number>>(new Set())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const vacPanelRef = useRef<HTMLDivElement>(null)

  // Projects with dates (needed for calendar load spread)
  const eligibleProjects = useMemo(
    () => allProjects.filter((p) => p.date_start && p.date_end),
    [allProjects],
  )
  // Opportunities don't need global dates — they always use periods
  const oppProjects = useMemo(() => allProjects.filter((p) => p.status !== '2' && p.is_opportunity), [allProjects])
  const openProjects = useMemo(() => eligibleProjects.filter((p) => p.status !== '2' && !p.is_opportunity && !p.is_rd), [eligibleProjects])
  const rdProjects = useMemo(() => eligibleProjects.filter((p) => p.status !== '2' && p.is_rd), [eligibleProjects])
  const closedProjects = useMemo(() => eligibleProjects.filter((p) => p.status === '2' && !p.is_opportunity), [eligibleProjects])

  // Stable color by project id (all projects, including opps without dates)
  const colorMap = useMemo(() => {
    const m: Record<number, string> = {}
    allProjects.forEach((p) => { m[p.id] = COLORS[p.id % COLORS.length] })
    return m
  }, [allProjects])

  const holidayDays = useMemo(() => getFrenchHolidays(year), [year])
  const allOffDays = useMemo(() => new Set([...vacationDays, ...holidayDays]), [vacationDays, holidayDays])

  const projectLoadData = useMemo((): ProjectLoad[] => {
    return config.participations
      .filter((part) => part.active)
      .filter((part) => {
        const proj = allProjects.find((p) => p.id === part.project_id)
        if (!proj) return false
        if (proj.is_rd && !includeRd) return false
        if (proj.is_opportunity && !includeOpp) return false
        return true
      })
      .flatMap((part) => {
        const proj = allProjects.find((p) => p.id === part.project_id)
        if (!proj) return []
        const color = colorMap[proj.id] ?? COLORS[0]

        // Opportunities MUST use periods — no global-date fallback
        if (proj.is_opportunity) {
          if (!part.periods || part.periods.length === 0) return []
          return part.periods.flatMap((period) => {
            const start = new Date(period.start + 'T12:00:00')
            const end = new Date(period.end + 'T12:00:00')
            start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0)
            const wd = countWorkingDays(start, end, allOffDays)
            if (wd === 0 || period.days <= 0) return []
            return [{ projectId: proj.id, projectRef: proj.ref, projectTitle: proj.title, dailyLoad: period.days / wd, startStr: period.start, endStr: period.end, color }]
          })
        }

        if (part.periods && part.periods.length > 0) {
          return part.periods.flatMap((period) => {
            const start = new Date(period.start + 'T12:00:00')
            const end = new Date(period.end + 'T12:00:00')
            start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0)
            const wd = countWorkingDays(start, end, allOffDays)
            if (wd === 0 || period.days <= 0) return []
            return [{ projectId: proj.id, projectRef: proj.ref, projectTitle: proj.title, dailyLoad: period.days / wd, startStr: period.start, endStr: period.end, color }]
          })
        } else {
          const start = new Date(proj.date_start * 1000)
          const end = new Date(proj.date_end * 1000)
          start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0)
          const wd = countWorkingDays(start, end, allOffDays)
          if (wd === 0) return []
          return [{ projectId: proj.id, projectRef: proj.ref, projectTitle: proj.title, dailyLoad: part.days / wd, startStr: toDateStr(start), endStr: toDateStr(end), color }]
        }
      })
  }, [config.participations, allProjects, colorMap, includeRd, includeOpp, holidayDays, allOffDays])

  const todayStr = toDateStr(new Date())

  const handleDayClick = useCallback((dateStr: string) => {
    setSelectedDay((prev) => prev === dateStr ? null : dateStr)
  }, [])

  const toggleAdvanced = (id: number) =>
    setAdvancedSet((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-slate-400">Chargement…</div>
    </div>
  )

  const renderProjectRow = (proj: Project) => {
    const part = getParticipation(proj.id)
    const isActive = !!part?.active
    const hasEntry = !!part
    const color = colorMap[proj.id] ?? COLORS[0]
    const sd = new Date(proj.date_start * 1000).toLocaleDateString('fr-FR')
    const ed = new Date(proj.date_end * 1000).toLocaleDateString('fr-FR')
    const totalWd = countWorkingDays(new Date(proj.date_start * 1000), new Date(proj.date_end * 1000), holidayDays)
    const isAdv = advancedSet.has(proj.id)

    return (
      <div key={proj.id} className={`rounded-lg border transition-colors ${isActive ? 'bg-slate-700/60 border-slate-600/40' : 'bg-slate-700/20 border-slate-700/30'}`}>
        <div className="flex items-center gap-2 p-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? color : '#475569' }} />
          <input
            type="checkbox" checked={isActive}
            onChange={(e) => updateParticipation(proj.id, e.target.checked ? { active: true, days: part?.days ?? 1 } : { active: false })}
            className="w-3.5 h-3.5 flex-shrink-0 accent-blue-500"
          />
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-slate-500'}`}>{proj.title}</div>
            <div className="text-slate-500 text-[10px]">{proj.ref} · {sd} → {ed} · {totalWd}j ouvrés{proj.status === '2' ? ' · ✓ terminé' : ''}</div>
          </div>
          {hasEntry && !isAdv && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <input
                type="number" min={0.5} step={0.5} value={part!.days}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) updateParticipation(proj.id, { days: v }) }}
                className={`w-14 bg-slate-600 border border-slate-500 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-blue-500 ${isActive ? 'text-white' : 'text-slate-400'}`}
              />
              <span className="text-slate-400 text-xs">j</span>
              {getPlannedDays(proj) > 0 && (
                <span className="text-slate-600 text-[10px]" title="Jours totaux prévus sur le projet">
                  /{getPlannedDays(proj).toFixed(0)}
                </span>
              )}
            </div>
          )}
          {hasEntry && (
            <button onClick={() => toggleAdvanced(proj.id)} className={`text-[10px] px-2 py-0.5 rounded flex-shrink-0 transition-colors ${isAdv ? 'bg-violet-700/40 text-violet-300' : 'text-slate-500 hover:text-slate-300'}`}>
              {isAdv ? '▲' : '▶'} périodes
            </button>
          )}
        </div>

        {isAdv && hasEntry && (
          <div className="px-3 pb-3 border-t border-slate-700/30 pt-2 space-y-2">
            <div className="text-[10px] text-slate-400">
              Périodes personnalisées — total : <span className="text-white font-semibold">{(part!.periods ?? []).reduce((s, p) => s + p.days, 0)}j</span>.
              {' '}Laissez vide pour utiliser le lissage global ({part!.days}j).
            </div>
            {(part!.periods ?? []).map((period: ProjectPeriod, i: number) => {
              const wd = countWorkingDays(new Date(period.start + 'T12:00:00'), new Date(period.end + 'T12:00:00'), holidayDays)
              const updatePeriods = (newPeriods: ProjectPeriod[]) => {
                const totalDays = newPeriods.reduce((s, p) => s + p.days, 0)
                updateParticipation(proj.id, { periods: newPeriods, days: totalDays || part!.days })
              }
              return (
                <div key={i} className="flex items-center gap-1.5 bg-slate-800/50 rounded px-2 py-1 flex-wrap">
                  <span className="text-slate-400 text-[10px]">Du</span>
                  <input type="date" value={period.start}
                    onChange={(e) => { const np = [...(part!.periods ?? [])]; np[i] = { ...np[i], start: e.target.value }; updatePeriods(np) }}
                    className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-white text-[10px] focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-400 text-[10px]">au</span>
                  <input type="date" value={period.end}
                    onChange={(e) => { const np = [...(part!.periods ?? [])]; np[i] = { ...np[i], end: e.target.value }; updatePeriods(np) }}
                    className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-white text-[10px] focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-500 text-[10px]">({wd}j ouvrés) →</span>
                  <input type="number" min={0.5} step={0.5} value={period.days}
                    onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) { const np = [...(part!.periods ?? [])]; np[i] = { ...np[i], days: v }; updatePeriods(np) } }}
                    className="w-12 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-white text-[10px] focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-400 text-[10px]">j</span>
                  <button onClick={() => { const np = (part!.periods ?? []).filter((_: ProjectPeriod, j: number) => j !== i); updatePeriods(np) }} className="text-slate-600 hover:text-red-400 transition-colors ml-auto">
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            })}
            <button
              onClick={() => { const np = [...(part!.periods ?? []), { start: todayStr, end: todayStr, days: 1 }]; updateParticipation(proj.id, { periods: np }) }}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[10px] transition-colors"
            >
              <Plus size={11} /> Ajouter une période
            </button>
          </div>
        )}
      </div>
    )
  }

  const activeParticipations = config.participations.filter((p) => p.active)

  // ── opportunity row: periods mandatory, no global days input ──────────────
  const renderOppRow = (proj: Project) => {
    const part = getParticipation(proj.id)
    const isActive = !!part?.active
    const color = colorMap[proj.id] ?? COLORS[0]
    const sd = proj.date_start ? new Date(proj.date_start * 1000).toLocaleDateString('fr-FR') : null
    const ed = proj.date_end ? new Date(proj.date_end * 1000).toLocaleDateString('fr-FR') : null
    const hasPeriods = (part?.periods ?? []).length > 0

    const updatePeriods = (newPeriods: ProjectPeriod[]) => {
      const totalDays = newPeriods.reduce((s, p) => s + p.days, 0)
      updateParticipation(proj.id, { periods: newPeriods, days: totalDays || part?.days || 0 })
    }

    return (
      <div key={proj.id} className={`rounded-lg border transition-colors ${isActive ? 'bg-amber-950/30 border-amber-700/30' : 'bg-slate-700/20 border-slate-700/30'}`}>
        <div className="flex items-center gap-2 p-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? color : '#475569' }} />
          <input
            type="checkbox" checked={isActive}
            onChange={(e) => updateParticipation(proj.id, e.target.checked ? { active: true, days: part?.days ?? 0, periods: part?.periods ?? [] } : { active: false })}
            className="w-3.5 h-3.5 flex-shrink-0 accent-amber-500"
          />
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-slate-500'}`}>{proj.title}</div>
            <div className="text-slate-500 text-[10px]">{proj.ref}{sd && ed ? ` · ${sd} → ${ed}` : ''} · <span className="text-amber-600">potentiel</span></div>
          </div>
          {!hasPeriods && (
            <span className="text-[10px] text-amber-500 flex-shrink-0">⚠ définir période</span>
          )}
        </div>
        {!!part && (
          <div className="px-3 pb-3 border-t border-amber-900/30 pt-2 space-y-2">
            {(part.periods ?? []).map((period: ProjectPeriod, i: number) => {
              const wd = countWorkingDays(new Date(period.start + 'T12:00:00'), new Date(period.end + 'T12:00:00'), holidayDays)
              return (
                <div key={i} className="flex items-center gap-1.5 bg-slate-800/50 rounded px-2 py-1 flex-wrap">
                  <span className="text-slate-400 text-[10px]">Du</span>
                  <input type="date" value={period.start}
                    onChange={(e) => { const np = [...(part.periods ?? [])]; np[i] = { ...np[i], start: e.target.value }; updatePeriods(np) }}
                    className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-white text-[10px] focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-400 text-[10px]">au</span>
                  <input type="date" value={period.end}
                    onChange={(e) => { const np = [...(part.periods ?? [])]; np[i] = { ...np[i], end: e.target.value }; updatePeriods(np) }}
                    className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-white text-[10px] focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-500 text-[10px]">({wd}j ouvrés) →</span>
                  <input type="number" min={0.5} step={0.5} value={period.days}
                    onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) { const np = [...(part.periods ?? [])]; np[i] = { ...np[i], days: v }; updatePeriods(np) } }}
                    className="w-12 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-white text-[10px] focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-400 text-[10px]">j</span>
                  <button onClick={() => { const np = (part.periods ?? []).filter((_: ProjectPeriod, j: number) => j !== i); updatePeriods(np) }} className="text-slate-600 hover:text-red-400 transition-colors ml-auto">
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            })}
            <button
              onClick={() => { const np = [...(part.periods ?? []), { start: todayStr, end: todayStr, days: 1 }]; updateParticipation(proj.id, { periods: np }) }}
              className="flex items-center gap-1 text-amber-500 hover:text-amber-400 text-[10px] transition-colors"
            >
              <Plus size={11} /> Ajouter une période
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"><ChevronLeft size={16} /></button>
          <span className="text-2xl font-bold text-white w-16 text-center">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"><ChevronRight size={16} /></button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-16 h-3 rounded" style={{ background: 'linear-gradient(to right, hsla(120,70%,35%,0.55), hsla(60,70%,35%,0.55), hsla(0,70%,35%,0.55))' }} />
            <span>0% → 80%+</span>
          </div>
          {/* R&D toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-slate-400">Inclure R&D</span>
            <button
              role="switch"
              aria-checked={includeRd}
              onClick={() => setIncludeRd((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                includeRd ? 'bg-violet-600' : 'bg-slate-600'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                includeRd ? 'translate-x-4' : 'translate-x-1'
              }`} />
            </button>
          </label>
          {/* Opportunities toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-slate-400">Inclure opportunités</span>
            <button
              role="switch"
              aria-checked={includeOpp}
              onClick={() => setIncludeOpp((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                includeOpp ? 'bg-amber-500' : 'bg-slate-600'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                includeOpp ? 'translate-x-4' : 'translate-x-1'
              }`} />
            </button>
          </label>
          <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors text-sm">
            {showConfig ? <X size={14} /> : <Settings size={14} />}
            {showConfig ? 'Fermer' : 'Mes projets'}
          </button>
        </div>
      </div>

      {/* ── project config panel ── */}
      {showConfig && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Participation aux projets</h3>
            <p className="text-slate-400 text-xs mb-3">Cochez vos projets. Décocher conserve le nombre de jours (simulation). "Périodes" permet un lissage par tranche.</p>
          </div>

          {openProjects.length === 0 && closedProjects.length === 0 && rdProjects.length === 0 && oppProjects.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun projet avec dates de début et fin.</p>
          ) : (
            <>
              {openProjects.length > 0 && (
                <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                  {openProjects.map(renderProjectRow)}
                </div>
              )}

              {rdProjects.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-1.5">R&D ({rdProjects.length})</div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                    {rdProjects.map(renderProjectRow)}
                  </div>
                </div>
              )}

              {oppProjects.length > 0 && (
                <div>
                  <button onClick={() => setShowOpp(!showOpp)} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors mb-1.5">
                    {showOpp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    Opportunités ({oppProjects.length}) — charge potentielle, périodes obligatoires
                  </button>
                  {showOpp && (
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                      {oppProjects.map(renderOppRow)}
                    </div>
                  )}
                </div>
              )}

              {closedProjects.length > 0 && (
                <div>
                  <button onClick={() => setShowClosed(!showClosed)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors mb-2">
                    {showClosed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    Projets terminés ({closedProjects.length})
                  </button>
                  {showClosed && (
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                      {closedProjects.map(renderProjectRow)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeParticipations.length === 0 && !showConfig && (
        <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-xl p-6 text-center">
          <p className="text-slate-400 mb-1 text-sm">Aucun projet actif.</p>
          <p className="text-slate-500 text-xs">Cliquez sur "Mes projets" pour configurer.</p>
        </div>
      )}

      {/* ── 12-month grid ── */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
        {Array.from({ length: 12 }, (_, i) => (
          <MiniMonth
            key={i}
            year={year}
            month={i}
            vacationDays={allOffDays}
            projectLoadData={projectLoadData}
            todayStr={todayStr}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
          />
        ))}
      </div>

      {/* ── vacation manager ── */}
      <VacationManager
        ref={vacPanelRef}
        vacationPeriods={config.vacation_periods}
        vacationDays={vacationDays}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onAddPeriod={addVacationPeriod}
        onRemovePeriod={removeVacationPeriod}
        onToggleDay={toggleVacationDay}
        projectLoadData={projectLoadData}
        colorMap={colorMap}
      />

      {/* ── day detail modal ── */}
      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          vacationPeriods={config.vacation_periods}
          projectLoadData={projectLoadData}
          colorMap={colorMap}
          onClose={() => setSelectedDay(null)}
          onToggleDay={toggleVacationDay}
          onRemovePeriod={removeVacationPeriod}
        />
      )}
    </div>
  )
}

// ── vacation manager ──────────────────────────────────────────────────────────

interface VacationManagerProps {
  vacationPeriods: VacationPeriod[]
  vacationDays: Set<string>
  selectedDay: string | null
  onSelectDay: (d: string | null) => void
  onAddPeriod: (start: string, end: string, label?: string) => void
  onRemovePeriod: (id: string) => void
  onToggleDay: (d: string) => void
  projectLoadData: ProjectLoad[]
  colorMap: Record<number, string>
}

const VacationManager = React.forwardRef<HTMLDivElement, VacationManagerProps>(
  ({ vacationPeriods, vacationDays, selectedDay, onSelectDay, onAddPeriod, onRemovePeriod, onToggleDay, projectLoadData, colorMap }, ref) => {
    const [rangeStart, setRangeStart] = useState('')
    const [rangeEnd, setRangeEnd] = useState('')
    const [label, setLabel] = useState('')

    const sorted = useMemo(() => [...vacationPeriods].sort((a, b) => a.start.localeCompare(b.start)), [vacationPeriods])
    const totalDays = useMemo(() => vacationDays.size, [vacationDays])

    const fmtRange = (p: VacationPeriod) => {
      const s = new Date(p.start + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      if (p.start === p.end) return s
      const e = new Date(p.end + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
      return `${s} → ${e}`
    }

    const handleAdd = () => {
      if (!rangeStart) return
      const end = rangeEnd && rangeEnd >= rangeStart ? rangeEnd : rangeStart
      onAddPeriod(rangeStart, end, label.trim() || undefined)
      setRangeStart(''); setRangeEnd(''); setLabel('')
    }

    return (
      <div ref={ref} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <CalendarDays size={18} className="text-slate-400" />
            Congés
            {totalDays > 0 && (
              <span className="text-xs font-normal bg-slate-700 px-2 py-0.5 rounded-full text-slate-300">
                {totalDays} jour{totalDays > 1 ? 's' : ''} · {vacationPeriods.length} période{vacationPeriods.length > 1 ? 's' : ''}
              </span>
            )}
          </h3>
          {/* Add period form */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-xs">Du</span>
            <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-400 text-xs">au</span>
            <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} min={rangeStart}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
            />
            <input type="text" placeholder="Libellé (optionnel)" value={label} onChange={(e) => setLabel(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500 w-36"
            />
            <button onClick={handleAdd} disabled={!rangeStart}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} /> Ajouter
            </button>
          </div>
        </div>

        {/* Period list */}
        {sorted.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            Aucune période de congé.<br />
            <span className="text-xs">Utilisez le formulaire ci-dessus ou cliquez sur un jour du calendrier.</span>
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sorted.map((p) => {
              const wd = countWorkingDays(new Date(p.start + 'T12:00:00'), new Date(p.end + 'T12:00:00'))
              const isCovering = selectedDay ? selectedDay >= p.start && selectedDay <= p.end : false
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    // Select first day of the period for detail view
                    const first = new Date(p.start + 'T12:00:00')
                    while (isWeekend(first)) first.setDate(first.getDate() + 1)
                    onSelectDay(toDateStr(first) === selectedDay ? null : toDateStr(first))
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer border transition-colors ${
                    isCovering
                      ? 'bg-blue-600/30 border-blue-500/50 text-blue-200'
                      : 'bg-slate-700/50 border-slate-600/30 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="font-medium">{p.label ? `${p.label} · ` : ''}{fmtRange(p)}</span>
                  <span className="text-slate-500">{wd}j</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemovePeriod(p.id) }}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  },
)

// ── day detail modal ──────────────────────────────────────────────────────────

interface DayDetailModalProps {
  day: string
  vacationPeriods: VacationPeriod[]
  projectLoadData: ProjectLoad[]
  colorMap: Record<number, string>
  onClose: () => void
  onToggleDay: (d: string) => void
  onRemovePeriod: (id: string) => void
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({
  day, vacationPeriods, projectLoadData, colorMap, onClose, onToggleDay, onRemovePeriod,
}) => {
  const fmtFull = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const fmtRange = (p: VacationPeriod) => {
    const s = new Date(p.start + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    if (p.start === p.end) return s
    const e = new Date(p.end + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${s} → ${e}`
  }

  const coveringPeriod = vacationPeriods.find((p) => day >= p.start && day <= p.end) ?? null
  const loads = projectLoadData.filter((pl) => day >= pl.startStr && day <= pl.endStr)
  const totalLoad = loads.reduce((s, pl) => s + pl.dailyLoad, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-600/60 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white capitalize">{fmtFull(day)}</h2>
            {coveringPeriod && (
              <p className="text-teal-400 text-xs mt-0.5">
                Congé · {coveringPeriod.label ?? fmtRange(coveringPeriod)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 flex-shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Load breakdown */}
        {!coveringPeriod && (
          <div className="space-y-1.5">
            {loads.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucune charge prévue · journée libre.</p>
            ) : (
              <>
                {loads.map((pl) => {
                  const pct = Math.round(pl.dailyLoad * 100)
                  return (
                    <div key={pl.projectId} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorMap[pl.projectId] ?? COLORS[0] }} />
                      <span className="text-white text-sm flex-1 truncate">{pl.projectTitle}</span>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: loadTextColor(pl.dailyLoad) }}>{pct}%</span>
                    </div>
                  )
                })}
                <div className="flex justify-between items-center px-3 py-2 border-t border-slate-700 text-sm">
                  <span className="text-slate-400">Total</span>
                  <span className="font-bold" style={{ color: loadTextColor(totalLoad) }}>
                    {Math.round(totalLoad * 100)}%
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {coveringPeriod ? (
            <button
              onClick={() => { onRemovePeriod(coveringPeriod.id); onClose() }}
              className="flex-1 text-sm font-semibold px-4 py-2 rounded-xl bg-red-700/40 hover:bg-red-700/70 text-red-200 transition-colors"
            >
              Retirer la période de congé
            </button>
          ) : (
            <button
              onClick={() => { onToggleDay(day); onClose() }}
              className="flex-1 text-sm font-semibold px-4 py-2 rounded-xl bg-teal-700/40 hover:bg-teal-700/70 text-teal-200 transition-colors"
            >
              Poser un congé ce jour
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

