import React, { useEffect, useState } from 'react'
import type { RDItem } from '../hooks/useRDTimeline'
import RDItemModal from './RDItemModal'

interface RDManageModalProps {
  isOpen: boolean
  onClose: () => void
  items: RDItem[]
  onAdd: (item: RDItem) => void
  onUpdate: (id: string, item: RDItem) => void
  onDelete: (id: string) => void
  initialEditId?: string | null
}

export const RDManageModal: React.FC<RDManageModalProps> = ({ isOpen, onClose, items, onAdd, onUpdate, onDelete, initialEditId = null }) => {
  const [editing, setEditing] = useState<RDItem | null>(null)
  const [isItemModalOpen, setItemModalOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setEditing(null)
      setItemModalOpen(false)
      return
    }
    if (initialEditId) {
      const it = items.find((x) => x.id === initialEditId) || null
      if (it) {
        setEditing(it)
        setItemModalOpen(true)
      }
    }
  }, [isOpen, initialEditId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Gérer les échéances RD</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditing(null); setItemModalOpen(true) }} className="px-3 py-1.5 bg-blue-600 rounded text-white">Ajouter</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-700 rounded">Fermer</button>
          </div>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">{it.title}</div>
                <div className="text-xs text-slate-400">{new Date(it.date * 1000).toLocaleDateString('fr-FR')}</div>
                {it.details && <div className="text-xs text-slate-300 mt-1">{it.details}</div>}
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setEditing(it); setItemModalOpen(true) }} className="text-xs text-blue-400">Modifier</button>
                <button onClick={() => onDelete(it.id)} className="text-xs text-red-400">Supprimer</button>
              </div>
            </div>
          ))}
        </div>

        <RDItemModal isOpen={isItemModalOpen} onClose={() => setItemModalOpen(false)} onSave={(item) => {
          if (editing) onUpdate(editing.id, item)
          else onAdd(item)
          setItemModalOpen(false)
        }} initial={editing} />
      </div>
    </div>
  )
}

export default RDManageModal
