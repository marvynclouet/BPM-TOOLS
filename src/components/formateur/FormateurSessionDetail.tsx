'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

type AttendanceStatus = 'present' | 'absent' | 'retard'

interface Participant {
  id: string
  first_name: string
  last_name: string
}

interface Attendance {
  id?: string
  planning_id: string
  attendance_date: string
  lead_id: string
  status: AttendanceStatus
  comment?: string | null
}

interface Report {
  id?: string
  planning_id: string
  report_date: string
  content: string
}

interface Evaluation {
  id?: string
  planning_id: string
  lead_id: string
  evaluation_number: 1 | 2
  score: number
  comment?: string | null
}

interface TrainerOption {
  id: string
  full_name: string | null
  email: string
}

interface SessionData {
  id: string
  start_date: string
  end_date: string
  specific_dates: string[] | null
  trainer_id: string | null
  payment_status: string
  payment_amount: number
  participants: Participant[]
  attendances: Attendance[]
  reports: Report[]
  evaluations: Evaluation[]
}

interface FormateurSessionDetailProps {
  sessionId: string
  initialData: SessionData
  isAdmin: boolean
}

export default function FormateurSessionDetail({ sessionId, initialData, isAdmin }: FormateurSessionDetailProps) {
  const [data, setData] = useState(initialData)
  const [saving, setSaving] = useState(false)
  const [paymentUpdating, setPaymentUpdating] = useState(false)
  const [reportDrafts, setReportDrafts] = useState<Record<string, string>>({})
  const [trainers, setTrainers] = useState<TrainerOption[]>([])
  const [trainerUpdating, setTrainerUpdating] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/formateur/trainers')
      .then((r) => r.json())
      .then((list) => Array.isArray(list) && setTrainers(list))
      .catch(() => {})
  }, [isAdmin])

  const sessionDates = useMemo(() => {
    if (data.specific_dates && data.specific_dates.length > 0) {
      return data.specific_dates.map((d: string) => d.slice(0, 10))
    }
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    const out: string[] = []
    const d = new Date(start)
    while (d <= end) {
      out.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() + 1)
    }
    return out
  }, [data.start_date, data.end_date, data.specific_dates])

  const attendanceMap = useMemo(() => {
    const m: Record<string, Record<string, Attendance>> = {}
    data.attendances.forEach((a) => {
      if (!m[a.attendance_date]) m[a.attendance_date] = {}
      m[a.attendance_date][a.lead_id] = a
    })
    return m
  }, [data.attendances])

  const reportByDate = useMemo(() => {
    const m: Record<string, string> = {}
    data.reports.forEach((r) => { m[r.report_date] = r.content })
    return m
  }, [data.reports])

  const evaluationMap = useMemo(() => {
    const m: Record<string, Record<number, Evaluation>> = {}
    data.evaluations.forEach((e) => {
      const key = e.lead_id
      if (!m[key]) m[key] = {}
      m[key][e.evaluation_number] = e
    })
    return m
  }, [data.evaluations])

  const patch = async (payload: Partial<{ attendances: Partial<Attendance>[]; reports: Partial<Report>[]; evaluations: Partial<Evaluation>[]; payment_status?: string; trainer_id?: string | null }>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/formateur/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erreur')
      }
      const updated = await fetch(`/api/formateur/sessions/${sessionId}`).then((r) => r.json())
      setData(updated)
    } catch (e: any) {
      alert(e.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const setAttendance = (date: string, leadId: string, status: AttendanceStatus) => {
    const attendances = [...(data.attendances.filter((a) => !(a.attendance_date === date && a.lead_id === leadId))), { planning_id: sessionId, attendance_date: date, lead_id: leadId, status }]
    patch({ attendances: attendances.map((a) => ({ attendance_date: a.attendance_date, lead_id: a.lead_id, status: a.status, comment: a.comment })) })
  }

  const setReport = (date: string, content: string) => {
    const reports = data.reports.filter((r) => r.report_date !== date).concat([{ planning_id: sessionId, report_date: date, content }])
    patch({ reports: reports.map((r) => ({ report_date: r.report_date, content: r.content })) })
  }

  const setEvaluation = (leadId: string, evaluationNumber: 1 | 2, score: number, comment: string) => {
    const evals = data.evaluations.filter((e) => !(e.lead_id === leadId && e.evaluation_number === evaluationNumber))
    evals.push({ planning_id: sessionId, lead_id: leadId, evaluation_number: evaluationNumber, score, comment: comment || null } as Evaluation)
    patch({ evaluations: evals.map((e) => ({ lead_id: e.lead_id, evaluation_number: e.evaluation_number, score: e.score, comment: e.comment })) })
  }

  const markPaid = async () => {
    setPaymentUpdating(true)
    try {
      await patch({ payment_status: 'PAID' })
    } finally {
      setPaymentUpdating(false)
    }
  }

  const setTrainer = async (trainerId: string | null) => {
    setTrainerUpdating(true)
    try {
      const res = await fetch(`/api/formateur/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainer_id: trainerId || null }),
      })
      if (!res.ok) throw new Error('Erreur')
      const updated = await fetch(`/api/formateur/sessions/${sessionId}`).then((r) => r.json())
      setData(updated)
    } catch {
      alert("Erreur lors de l'assignation")
    } finally {
      setTrainerUpdating(false)
    }
  }

  const periodText = data.specific_dates?.length
    ? format(new Date(data.specific_dates[0]), 'dd MMM', { locale: fr }) +
      ' – ' +
      format(new Date(data.specific_dates[data.specific_dates.length - 1]), 'dd MMM yyyy', { locale: fr })
    : 'Du ' +
      format(new Date(data.start_date), 'dd MMM yyyy', { locale: fr }) +
      ' au ' +
      format(new Date(data.end_date), 'dd MMM yyyy', { locale: fr })

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <Link href="/dashboard/formateur" className="text-white/60 hover:text-white text-sm font-medium">
          ← Retour aux sessions
        </Link>
      </div>
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Session du {periodText}</h1>
        <p className="text-white/50 text-sm">Détail, appel, compte-rendu et évaluations</p>
      </div>

      {/* Infos + Paiement */}
      <div className="apple-card rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Informations</h2>
        <p className="text-white/80 text-sm">Période : {periodText}</p>
        <p className="text-white/80 text-sm mt-1">Participants : {data.participants.map((p) => `${p.first_name} ${p.last_name}`).join(', ') || '—'}</p>
        {isAdmin && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-white/70 text-sm">Formateur assigné :</label>
            <select
              value={data.trainer_id ?? ''}
              onChange={(e) => setTrainer(e.target.value || null)}
              disabled={trainerUpdating}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm disabled:opacity-50"
            >
              <option value="">— Aucun —</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.email}
                </option>
              ))}
            </select>
            {trainerUpdating && <span className="text-white/50 text-xs">Enregistrement…</span>}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${data.payment_status === 'PAID' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
            {data.payment_status === 'PAID' ? 'Payé' : 'À payer'} – {data.payment_amount} €
          </span>
          {isAdmin && data.payment_status !== 'PAID' && (
            <button onClick={markPaid} disabled={paymentUpdating} className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 text-sm font-medium disabled:opacity-50">
              {paymentUpdating ? '...' : 'Marquer comme payé'}
            </button>
          )}
        </div>
      </div>

      {/* Appel par jour */}
      <div className="apple-card rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Appel par jour</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 py-2 text-left text-white/60 font-medium">Participant</th>
                {sessionDates.map((d) => (
                  <th key={d} className="px-2 py-2 text-left text-white/60 font-medium whitespace-nowrap">{format(new Date(d), 'dd MMM', { locale: fr })}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.participants.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="px-2 py-2 text-white font-medium">{p.first_name} {p.last_name}</td>
                  {sessionDates.map((date) => {
                    const a = attendanceMap[date]?.[p.id]
                    const status = (a?.status || '') as AttendanceStatus | ''
                    return (
                      <td key={date} className="px-2 py-2">
                        <select
                          value={status || ''}
                          onChange={(e) => setAttendance(date, p.id, (e.target.value || 'present') as AttendanceStatus)}
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs min-w-[90px]"
                        >
                          <option value="">—</option>
                          <option value="present">Présent</option>
                          <option value="absent">Absent</option>
                          <option value="retard">Retard</option>
                        </select>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {saving && <p className="text-white/50 text-xs mt-2">Enregistrement…</p>}
      </div>

      {/* Compte-rendu par jour */}
      <div className="apple-card rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Compte-rendu par jour</h2>
        <div className="space-y-4">
          {sessionDates.map((date) => (
            <div key={date}>
              <label className="block text-white/70 text-sm font-medium mb-1">{format(new Date(date), 'EEEE dd MMM yyyy', { locale: fr })}</label>
              <textarea
                value={reportDrafts[date] ?? reportByDate[date] ?? ''}
                onChange={(e) => setReportDrafts((prev) => ({ ...prev, [date]: e.target.value }))}
                onBlur={(e) => {
                  const val = e.target.value
                  if ((reportByDate[date] ?? '') !== val) setReport(date, val)
                  setReportDrafts((prev) => ({ ...prev, [date]: undefined }))
                }}
                className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                placeholder="Compte-rendu du jour…"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Évaluations (2 blocs) */}
      <div className="apple-card rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Évaluations</h2>
        <p className="text-white/50 text-xs mb-4">2 évaluations par participant, note sur 5 + commentaire.</p>
        {[1, 2] as const.map((num) => (
          <div key={num} className="mb-6">
            <h3 className="text-base font-medium text-white/90 mb-3">Évaluation n°{num}</h3>
            <div className="space-y-3">
              {data.participants.map((p) => {
                const ev = evaluationMap[p.id]?.[num]
                return (
                  <div key={`${p.id}-${num}`} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white/5">
                    <span className="text-white font-medium w-40">{p.first_name} {p.last_name}</span>
                    <select
                      value={ev?.score ?? ''}
                      onChange={(e) => setEvaluation(p.id, num, Number(e.target.value), ev?.comment ?? '')}
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    >
                      <option value="">Note</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}/5</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Commentaire"
                      defaultValue={ev?.comment ?? ''}
                      onBlur={(e) => setEvaluation(p.id, num, (ev?.score && ev.score >= 1 && ev.score <= 5) ? ev.score : 1, e.target.value)}
                      className="flex-1 min-w-[120px] px-3 py-1.5 rounded bg-white/10 border border-white/20 text-white text-sm"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
