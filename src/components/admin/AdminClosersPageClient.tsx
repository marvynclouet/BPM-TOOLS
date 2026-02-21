'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

type Closer = {
  id: string
  email: string
  full_name: string | null
  created_at: string
  role?: string
}

export default function AdminClosersPageClient({
  closers: initialClosers,
}: {
  closers: Closer[]
}) {
  const router = useRouter()
  const [closers, setClosers] = useState<Closer[]>(initialClosers)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'closer' | 'admin' | 'formateur'>('closer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [editingCloser, setEditingCloser] = useState<Closer | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editFullName, setEditFullName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState<'closer' | 'admin' | 'formateur'>('closer')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/closers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim() || null,
          password: password.trim(),
          role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création')
        return
      }
      setSuccess(`Closer créé : ${data.user?.email || email}`)
      setEmail('')
      setFullName('')
      setPassword('')
      if (data.user) {
        setClosers(prev => [...prev, {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.full_name ?? null,
          created_at: new Date().toISOString(),
          role: data.user.role || 'closer',
        }])
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (c: Closer) => {
    setEditingCloser(c)
    setEditEmail(c.email)
    setEditFullName(c.full_name || '')
    setEditPassword('')
    setEditRole((c.role === 'admin' ? 'admin' : 'closer'))
    setEditError(null)
  }

  const handleRoleChange = async (userId: string, newRole: 'closer' | 'admin' | 'formateur') => {
    const c = closers.find(x => x.id === userId)
    if (!c || c.role === newRole) return
    setRoleChangingId(userId)
    try {
      const res = await fetch(`/api/admin/closers/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Erreur')
        return
      }
      setClosers(prev => prev.map(cl => cl.id === userId ? { ...cl, role: newRole } : cl))
      router.refresh()
    } finally {
      setRoleChangingId(null)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCloser) return
    setEditError(null)
    setEditLoading(true)
    try {
      const body: { email?: string; full_name?: string | null; password?: string; role?: 'closer' | 'admin' } = {
        email: editEmail.trim() || undefined,
        full_name: editFullName.trim() || null,
        role: editRole,
      }
      if (editPassword.trim().length >= 6) body.password = editPassword.trim()

      const res = await fetch(`/api/admin/closers/${editingCloser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEditError(data.error || 'Erreur lors de la modification')
        return
      }
      setClosers(prev =>
        prev.map(cl =>
          cl.id === editingCloser.id
            ? {
                ...cl,
                email: editEmail.trim() || cl.email,
                full_name: editFullName.trim() || null,
                role: editRole,
              }
            : cl
        )
      )
      setEditingCloser(null)
      router.refresh()
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="apple-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Nouveau compte (closer / admin / formateur)</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              {success}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="closer@example.com"
            />
          </div>
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-white/70 mb-1.5">
              Nom complet
            </label>
            <input
              id="full_name"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Jean Dupont"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
              Mot de passe *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="6 caractères minimum"
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-white/70 mb-1.5">
              Rôle
            </label>
            <select
              id="role"
              value={role}
              onChange={e => setRole(e.target.value as 'closer' | 'admin')}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="closer" className="bg-zinc-900">Closer</option>
              <option value="admin" className="bg-zinc-900">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer le compte'}
          </button>
        </form>
      </div>

      <div className="apple-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Closers, admins & formateurs</h2>
        <p className="text-white/50 text-xs mb-4">Gérez les rôles (Closer / Admin / Formateur) et modifiez les comptes.</p>
        {closers.length === 0 ? (
          <p className="text-white/50 text-sm">Aucun compte pour le moment.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {closers.map(c => (
              <li key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">{c.full_name || c.email}</span>
                  {c.full_name && (
                    <span className="text-white/50 text-sm">{c.email}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={c.role === 'admin' ? 'admin' : c.role === 'formateur' ? 'formateur' : 'closer'}
                    onChange={e => handleRoleChange(c.id, e.target.value as 'closer' | 'admin' | 'formateur')}
                    disabled={roleChangingId === c.id}
                    className="px-2 py-1.5 text-xs font-medium rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
                  >
                    <option value="closer" className="bg-zinc-900">Closer</option>
                    <option value="admin" className="bg-zinc-900">Admin</option>
                    <option value="formateur" className="bg-zinc-900">Formateur</option>
                  </select>
                  <span className="text-white/40 text-xs">
                    {format(new Date(c.created_at), 'd MMM yyyy', { locale: fr })}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition"
                  >
                    Modifier
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal modifier un closer */}
      {editingCloser && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => !editLoading && setEditingCloser(null)}
        >
          <div
            className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Modifier {editingCloser.full_name || editingCloser.email}
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Nom complet</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Nouveau mot de passe (laisser vide pour ne pas changer)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="6 caractères minimum"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Rôle</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as 'closer' | 'admin' | 'formateur')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="closer" className="bg-zinc-900">Closer</option>
                  <option value="admin" className="bg-zinc-900">Admin</option>
                  <option value="formateur" className="bg-zinc-900">Formateur</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => !editLoading && setEditingCloser(null)}
                  disabled={editLoading}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition disabled:opacity-50 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition disabled:opacity-50 text-sm"
                >
                  {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
