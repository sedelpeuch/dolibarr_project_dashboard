import React, { useState } from 'react'
import useRDTimeline, { RDItem } from '../hooks/useRDTimeline'
import { formatDate } from '../utils'
import { Calendar } from 'lucide-react'
import { useMemo } from 'react'
import { differenceInDays, addMonths } from 'date-fns'
import RDManageModal from './RDManageModal'

export const RDTimeline: React.FC = () => {
  const { items, loading, error, addItem, updateItem, deleteItem } = useRDTimeline()
  const [isManageOpen, setManageOpen] = useState(false)
  const [initialEditId, setInitialEditId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const timeline = useMemo(() => {
    if (!items || items.length === 0) return { minDate: Date.now(), maxDate: Date.now(), todayPosition: 50, items: [] as any[] }

    const today = new Date()
    const minDate = Math.min(...items.map((i) => i.date * 1000))
    const maxDate = Math.max(...items.map((i) => i.date * 1000))
    // pad range
    const paddedMin = Math.min(minDate, today.getTime(), addMonths(today, -2).getTime())
    const paddedMax = Math.max(maxDate, today.getTime(), addMonths(today, 4).getTime())
    const range = Math.max(1, paddedMax - paddedMin)

    const tItems = items.map((it) => {
      const deadline = it.date * 1000
      const daysUntil = differenceInDays(new Date(deadline), today)
      const positionPercent = ((deadline - paddedMin) / range) * 100
      return { ...it, deadline, daysUntilDeadline: daysUntil, positionPercent }
    }).sort((a, b) => a.deadline - b.deadline)

    const todayPosition = ((today.getTime() - paddedMin) / range) * 100
    return { minDate: paddedMin, maxDate: paddedMax, todayPosition, items: tItems }
  }, [items])

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const getPointClasses = (days: number) => {
    if (days < 0) return 'bg-rose-500'
    if (days <= 7) return 'bg-rose-400'
    if (days <= 30) return 'bg-orange-400'
    if (days <= 90) return 'bg-yellow-400'
    return 'bg-slate-700'
  }

  if (loading) return <div>Chargement...</div>
  if (error) return <div>Erreur: {error}</div>

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar />
          <h3 className="font-semibold">Échéances RD</h3>
        </div>
        <div>
          <button onClick={() => { setInitialEditId(null); setManageOpen(true) }} className="flex items-center gap-2 bg-blue-600 px-3 py-1.5 rounded text-white">Gérer les échéances</button>
        </div>
      </div>

      <div className="relative pl-12">
        {/* vertical connecting line (under everything) */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-700/30 z-0" />

        

        {(() => {
          const sorted = [...timeline.items].sort((a, b) => a.deadline - b.deadline)
          const now = Date.now()
          // find first item with deadline > now
          let insertIndex = sorted.findIndex((it) => it.deadline > now)
          if (insertIndex === -1) insertIndex = sorted.length

          const nodes: JSX.Element[] = []
          sorted.forEach((it, i) => {
            if (i === insertIndex) {
              nodes.push(
                <div key="today-marker" className="grid grid-cols-[3rem_1fr_5rem] items-center gap-3 mb-2">
                  <div className="w-12" />
                  <div className="text-xs text-slate-400 text-center">— Aujourd'hui —</div>
                  <div />
                </div>
              )
            }

            const isSelected = selectedId === it.id
            nodes.push(
              <div key={it.id} className="grid grid-cols-[3rem_1fr_5rem] items-start gap-4 py-3">
                <div className="w-12 flex justify-center">
                  <div className={`${getPointClasses(it.daysUntilDeadline)} w-3 h-3 rounded-full ${isSelected ? 'ring-2 ring-blue-300' : ''} shadow-lg z-30`} />
                </div>

                <div className={`${isSelected ? 'bg-slate-800/60' : ''}`}>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{it.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{new Date(it.deadline).toLocaleDateString('fr-FR')}</div>
                    {it.details && <div className="text-xs text-slate-400 mt-1 truncate">{it.details}</div>}
                  </div>
                </div>

                <div className="flex items-start justify-end">
                  <div className={`text-xs font-medium ${it.daysUntilDeadline > 0 ? 'text-slate-300' : 'text-rose-400'}`}>{it.daysUntilDeadline > 0 ? `J-${it.daysUntilDeadline}` : 'Dépassé'}</div>
                </div>
              </div>
            )
          })

          if (insertIndex === sorted.length) {
            nodes.push(
              <div key="today-marker-end" className="flex items-center gap-3 mt-2">
                <div className="w-12 flex justify-center" />
                <div className="text-xs text-slate-400">— Aujourd'hui —</div>
              </div>
            )
          }

          return nodes
        })()}
      </div>

      <RDManageModal isOpen={isManageOpen} initialEditId={initialEditId} onClose={() => { setManageOpen(false); setInitialEditId(null) }} items={items} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />
    </div>
  )
}

export default RDTimeline
