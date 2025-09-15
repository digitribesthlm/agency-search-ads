'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [campaign, setCampaign] = useState(null)
  const [adGroups, setAdGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hidePaused, setHidePaused] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (params.campaign_id) {
      fetchCampaignData()
    }
  }, [session, status, params.campaign_id])

  const fetchCampaignData = async () => {
    try {
      setIsLoading(true)
      const [campaignRes, adGroupsRes] = await Promise.all([
        fetch(`/api/search-campaigns/${params.campaign_id}`),
        fetch(`/api/search-campaigns/${params.campaign_id}/ad-groups`)
      ])
      
      const campaignData = await campaignRes.json()
      const adGroupsData = await adGroupsRes.json()
      
      if (campaignData.success) {
        setCampaign(campaignData.data)
      } else {
        setError(campaignData.message || 'Failed to load campaign')
      }
      
      if (adGroupsData.success) {
        setAdGroups(adGroupsData.data)
      } else {
        setError(adGroupsData.message || 'Failed to load ad groups')
      }
    } catch (err) {
      setError('Failed to load campaign data')
      console.error('Error fetching campaign data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusClasses = {
      'ACTIVE': 'badge-success',
      'PAUSED': 'badge-warning',
      'REMOVED': 'badge-error'
    }
    return `badge ${statusClasses[status] || 'badge-neutral'}`
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to login
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="alert alert-error max-w-md">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="alert alert-warning max-w-md">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>Campaign not found</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Navigation */}
      <div className="navbar bg-base-200 shadow-sm">
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-xl">
            Agency Search Ads
          </Link>
        </div>
        <div className="navbar-center">
          <div className="breadcrumbs text-sm">
            <ul>
              <li><Link href="/campaigns" className="link link-hover">Campaigns</Link></li>
              <li>{campaign.campaign_name}</li>
            </ul>
          </div>
        </div>
        <div className="navbar-end">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                <span className="text-sm font-bold">{session.user?.name?.[0] || 'U'}</span>
              </div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><a>Profile</a></li>
              <li><a>Settings</a></li>
              <li><a onClick={() => signOut()}>Logout</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Campaign Header */}
        <div className="card bg-base-100 shadow-lg mb-8">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{campaign.campaign_name}</h1>
                  <div className={getStatusBadge(campaign.status)}>
                    {campaign.status}
                  </div>
                </div>
                <p className="text-base-content/70 mb-2">
                  Account: {campaign.account_name} ({campaign.account_id})
                </p>
                <p className="text-sm text-base-content/50">
                  Campaign ID: {campaign.campaign_id} • Created: {new Date(campaign.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button className="btn btn-primary btn-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Ad Group
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-primary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="stat-title">Ad Groups</div>
            <div className="stat-value text-primary">{adGroups.length}</div>
            <div className="stat-desc">Total ad groups</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-secondary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="stat-title">Total Ads</div>
            <div className="stat-value text-secondary">
              {adGroups.reduce((sum, group) => sum + group.ad_count, 0)}
            </div>
            <div className="stat-desc">Responsive search ads</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-accent">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title">Active Groups</div>
            <div className="stat-value text-accent">
              {adGroups.filter(group => group.status === 'ACTIVE').length}
            </div>
            <div className="stat-desc">Currently serving</div>
          </div>
        </div>

        {/* Ad Groups List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Ad Groups</h2>
            <div className="flex gap-2">
              <label className="label cursor-pointer gap-3">
                <span className="label-text">Hide paused</span>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={hidePaused}
                  onChange={(e) => setHidePaused(e.target.checked)}
                />
              </label>
            </div>
          </div>

          {(() => {
            const filteredAdGroups = hidePaused ? adGroups.filter(group => group.status !== 'PAUSED') : adGroups
            if (filteredAdGroups.length === 0) {
              return (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-base-content/70 mb-2">No ad groups found</h3>
                  <p className="text-base-content/50 mb-4">{hidePaused ? 'Try showing paused ad groups' : 'Create your first ad group to get started'}</p>
                  {!hidePaused && <button className="btn btn-primary">Create Ad Group</button>}
                </div>
              )
            }
            return (
              filteredAdGroups.map((adGroup) => (
                <div key={adGroup.ad_group_id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="card-title text-lg">{adGroup.ad_group_name}</h3>
                          <div className={getStatusBadge(adGroup.status)}>
                            {adGroup.status}
                          </div>
                        </div>
                        <p className="text-sm text-base-content/50 mb-2">
                          Ad Group ID: {adGroup.ad_group_id}
                        </p>
                        <p className="text-sm text-base-content/50">
                          Created: {new Date(adGroup.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="stat py-0 px-3">
                          <div className="stat-title text-xs">Ads</div>
                          <div className="stat-value text-lg">{adGroup.ad_count}</div>
                        </div>
                      </div>
                    </div>
                    <div className="card-actions justify-end mt-4">
                      <Link 
                        href={`/campaigns/${campaign.campaign_id}/ad-groups/${adGroup.ad_group_id}`}
                        className="btn btn-primary btn-sm"
                      >
                        Manage Ads
                      </Link>
                      <button className="btn btn-ghost btn-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          })()}
        </div>
      </div>
    </div>
  )
}
