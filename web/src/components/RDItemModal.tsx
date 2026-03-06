import React, { useState, useEffect } from 'react'
import type { RDItem } from '../hooks/useRDTimeline'

interface RDItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: RDItem) => void
  initial?: RDItem | null
}

export const RDItemModal: React.FC<RDItemModalProps> = ({ isOpen, onClose, onSave, initial }) => {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [details, setDetails] = useState('')

  useEffect(() => {
    if (initial) {
      setTitle(initial.title)
      setDate(new Date(initial.date * 1000).toISOString().slice(0, 10))
      setDetails(initial.details || '')
    } else {
      setTitle('')
      setDate('')
      setDetails('')
    }
  }, [initial, isOpen])

  if (!isOpen) return null

  const submit = () => {
    if (!title || !date) return
    const ts = Math.floor(new Date(date).getTime() / 1000)
    const item: RDItem = initial
      ? { ...initial, title, date: ts, details }
      : { id: `rd_${Date.now()}`, year: new Date(date).getFullYear(), title, date: ts, details }
    onSave(item)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">{initial ? 'Modifier' : 'Ajouter'} échéance RD</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Titre</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 p-2 bg-slate-800 rounded" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full mt-1 p-2 bg-slate-800 rounded" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Détails</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} className="w-full mt-1 p-2 bg-slate-800 rounded" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded">Annuler</button>
          <button onClick={submit} className="px-4 py-2 bg-blue-600 rounded text-white">Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

export default RDItemModal
