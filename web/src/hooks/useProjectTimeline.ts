import { useMemo } from 'react'
import { differenceInDays, addMonths } from 'date-fns'
import type { Project } from '../types'

export interface TimelineItem {
  id: number
  ref: string
  title: string
  deadline: number
  daysUntilDeadline: number
  color: 'green' | 'orange' | 'red'
  positionPercent: number
}

export interface ProjectTimelineResult {
  minDate: number
  maxDate: number
  todayTimestamp: number
  todayPosition: number
  timelineItems: TimelineItem[]
}

export const useProjectTimeline = (projects: Project[]): ProjectTimelineResult => {
  return useMemo(() => {
    // Filter out closed projects
    const openProjects = projects.filter(
      (project) => project.status !== '2' && project.status !== 'closed'
    )

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    // Calculate timeline range: 2 months back, 4 months forward
    const minDate = addMonths(today, -2).getTime()
    const maxDate = addMonths(today, 4).getTime()

    // Filter projects with deadlines in the visible range
    const visibleProjects = openProjects.filter((project) => {
      const deadline = project.date_end * 1000
      return deadline >= minDate && deadline <= maxDate
    })

    // If no visible projects, return empty timeline
    if (visibleProjects.length === 0) {
      return {
        minDate,
        maxDate,
        todayTimestamp,
        todayPosition: ((todayTimestamp - minDate) / (maxDate - minDate)) * 100,
        timelineItems: [],
      }
    }

    // Build timeline items
    const timelineItems: TimelineItem[] = visibleProjects
      .map((project) => {
        const deadline = project.date_end * 1000 // Convert to milliseconds
        const daysUntilDeadline = differenceInDays(deadline, todayTimestamp)

        // Determine color based on days until deadline
        let color: 'green' | 'orange' | 'red'
        if (daysUntilDeadline > 30) {
          color = 'green'
        } else if (daysUntilDeadline >= 7) {
          color = 'orange'
        } else {
          color = 'red'
        }

        // Calculate position percent (0-100)
        const positionPercent = ((deadline - minDate) / (maxDate - minDate)) * 100

        return {
          id: project.id,
          ref: project.ref,
          title: project.title,
          deadline,
          daysUntilDeadline,
          color,
          positionPercent,
        }
      })
      .sort((a, b) => a.deadline - b.deadline)

    const todayPosition = ((todayTimestamp - minDate) / (maxDate - minDate)) * 100

    return {
      minDate,
      maxDate,
      todayTimestamp,
      todayPosition,
      timelineItems,
    }
  }, [projects])
}
