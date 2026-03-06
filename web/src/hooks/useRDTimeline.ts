import { useEffect, useState } from 'react'
import { API_URL } from '../config'

export interface RDItem {
  id: string
  year: number
  title: string
  date: number
  details?: string
}

export const useRDTimeline = () => {
  const [items, setItems] = useState<RDItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/rd-timeline`)
      const data = await res.json()
      setItems(data || [])
    } catch (e: any) {
      setError(e.message || 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const addItem = async (item: RDItem) => {
    setItems((s) => [...s, item])
    try {
      await fetch(`${API_URL}/rd-timeline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
    } catch (e) {
      // ignore for now
    }
  }

  const updateItem = async (id: string, item: RDItem) => {
    setItems((s) => s.map((it) => (it.id === id ? item : it)))
    try {
      await fetch(`${API_URL}/rd-timeline/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
    } catch (e) {
      // ignore
    }
  }

  const deleteItem = async (id: string) => {
    setItems((s) => s.filter((it) => it.id !== id))
    try {
      await fetch(`${API_URL}/rd-timeline/${id}`, { method: 'DELETE' })
    } catch (e) {
      // ignore
    }
  }

  return { items, loading, error, addItem, updateItem, deleteItem, refetch: fetchItems }
}

export default useRDTimeline
