'use client'

import { useState, useCallback } from 'react'
import AdsOverview from '@/components/ads/AdsOverview'
import AdsCampaigns from '@/components/ads/AdsCampaigns'
import AdsReports from '@/components/ads/AdsReports'
import AdsTikTokStats from '@/components/ads/AdsTikTokStats'

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
  { id: 'campaigns', label: 'Campagnes', icon: '🎯' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'reports', label: 'Rapports', icon: '📝' },
] as const

type TabId = typeof TABS[number]['id']

export default function AdsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab)
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ads & Performance</h1>
        <p className="text-sm text-white/50 mt-1">Gestion publicitaire et suivi des performances</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <span className="text-xs">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && <AdsOverview key={refreshKey} />}
        {activeTab === 'campaigns' && <AdsCampaigns key={refreshKey} />}
        {activeTab === 'tiktok' && <AdsTikTokStats key={refreshKey} />}
        {activeTab === 'reports' && <AdsReports key={refreshKey} />}
      </div>
    </div>
  )
}
