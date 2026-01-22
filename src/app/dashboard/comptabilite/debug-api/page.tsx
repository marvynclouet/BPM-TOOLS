'use client'

import { useState } from 'react'

export default function DebugAPIPage() {
  const [leadId, setLeadId] = useState('2c5f58c7-92fe-4c4d-9eb5-440ea20a1651') // Abde CLouet
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAcompte = async () => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/leads/mark-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: leadId,
          paymentType: 'acompte',
        }),
      })

      const data = await response.json()
      setResult({
        status: response.status,
        ok: response.ok,
        data,
      })
    } catch (error: any) {
      setResult({
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const testComplet = async () => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/leads/mark-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: leadId,
          paymentType: 'complet',
        }),
      })

      const data = await response.json()
      setResult({
        status: response.status,
        ok: response.ok,
        data,
      })
    } catch (error: any) {
      setResult({
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Test API Mark Payment</h1>
      
      <div className="space-y-4 max-w-2xl">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">
            Lead ID
          </label>
          <input
            type="text"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={testAcompte}
            disabled={loading}
            className="px-6 py-3 bg-orange-500 text-white rounded font-medium hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading ? 'Test...' : 'Test Acompte'}
          </button>
          <button
            onClick={testComplet}
            disabled={loading}
            className="px-6 py-3 bg-green-500 text-white rounded font-medium hover:bg-green-600 transition disabled:opacity-50"
          >
            {loading ? 'Test...' : 'Test Complet'}
          </button>
        </div>

        {result && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">Résultat</h2>
            <pre className="text-sm text-white/70 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
