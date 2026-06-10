import { useState, useEffect, useCallback, useMemo } from 'react'
import type { WorkloadConfig, ProjectParticipation, VacationPeriod } from '../types'
import { apiService } from '../api'

function _toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function _isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6
}

export function useWorkload() {
  const [config, setConfig] = useState<WorkloadConfig>({ participations: [], vacation_periods: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiService.getWorkload().then((raw: unknown) => {
      const anyRaw = raw as Record<string, unknown>
      let data: WorkloadConfig

      // Migration: old format had vacations: string[]
      if (!anyRaw.vacation_periods && Array.isArray(anyRaw.vacations)) {
        data = {
          participations: [],
          ...anyRaw,
          vacation_periods: (anyRaw.vacations as string[]).map((d) => ({
            id: `vp_m_${d}`,
            start: d,
            end: d,
          })),
        } as WorkloadConfig
      } else {
        data = {
          vacation_periods: [],
          participations: [],
          ...anyRaw,
        } as WorkloadConfig
      }

      // Ensure active field on all participations
      data.participations = data.participations.map((p) => ({
        active: true,
        ...p,
      }))

      setConfig(data)
      setLoading(false)
    })
  }, [])

  /** Set of individual working vacation days derived from periods */
  const vacationDays = useMemo(() => {
    const days = new Set<string>()
    for (const p of config.vacation_periods) {
      const cur = new Date(p.start + 'T12:00:00')
      const end = new Date(p.end + 'T12:00:00')
      while (cur <= end) {
        if (!_isWeekend(cur)) days.add(_toDateStr(cur))
        cur.setDate(cur.getDate() + 1)
      }
    }
    return days
  }, [config.vacation_periods])

  const saveConfig = useCallback(async (newConfig: WorkloadConfig) => {
    setConfig(newConfig)
    await apiService.saveWorkload(newConfig)
  }, [])

  /** Add a vacation period (or single day when start === end) */
  const addVacationPeriod = useCallback(
    async (start: string, end: string, label?: string) => {
      const id = `vp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      await saveConfig({
        ...config,
        vacation_periods: [...config.vacation_periods, { id, start, end, label }],
      })
    },
    [config, saveConfig],
  )

  /** Remove a vacation period by id */
  const removeVacationPeriod = useCallback(
    async (id: string) => {
      await saveConfig({
        ...config,
        vacation_periods: config.vacation_periods.filter((p) => p.id !== id),
      })
    },
    [config, saveConfig],
  )

  /**
   * Toggle a single day:
   * - If covered by a period → remove that period entirely
   * - If free → add a single-day period
   */
  const toggleVacationDay = useCallback(
    async (dateStr: string) => {
      if (vacationDays.has(dateStr)) {
        const newPeriods = config.vacation_periods.filter(
          (p) => !(dateStr >= p.start && dateStr <= p.end),
        )
        await saveConfig({ ...config, vacation_periods: newPeriods })
      } else {
        const id = `vp_${Date.now()}`
        await saveConfig({
          ...config,
          vacation_periods: [...config.vacation_periods, { id, start: dateStr, end: dateStr }],
        })
      }
    },
    [config, vacationDays, saveConfig],
  )

  /** Update fields of an existing participation (or create if missing) */
  const updateParticipation = useCallback(
    async (
      projectId: number,
      update: Partial<Omit<ProjectParticipation, 'project_id'>> | null,
    ) => {
      let newParts: ProjectParticipation[]
      if (update === null) {
        newParts = config.participations.filter((p) => p.project_id !== projectId)
      } else {
        const existing = config.participations.find((p) => p.project_id === projectId)
        if (existing) {
          newParts = config.participations.map((p) =>
            p.project_id === projectId ? { ...p, ...update } : p,
          )
        } else {
          newParts = [
            ...config.participations,
            { project_id: projectId, days: 1, active: true, ...update },
          ]
        }
      }
      await saveConfig({ ...config, participations: newParts })
    },
    [config, saveConfig],
  )

  const getParticipation = useCallback(
    (projectId: number): ProjectParticipation | null =>
      config.participations.find((p) => p.project_id === projectId) ?? null,
    [config],
  )

  return {
    config,
    loading,
    vacationDays,
    addVacationPeriod,
    removeVacationPeriod,
    toggleVacationDay,
    updateParticipation,
    getParticipation,
  }
}
