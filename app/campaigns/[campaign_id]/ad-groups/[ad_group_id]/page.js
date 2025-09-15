'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function AdGroupPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [adGroup, setAdGroup] = useState(null)
  const [ads, setAds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submittingAdId, setSubmittingAdId] = useState(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (params.campaign_id && params.ad_group_id) {
      fetchAdGroupData()
    }
  }, [session, status, params.campaign_id, params.ad_group_id])

  const fetchAdGroupData = async () => {
    try {
      setIsLoading(true)
      const [adGroupRes, adsRes] = await Promise.all([
        fetch(`/api/search-campaigns/${params.campaign_id}/ad-groups/${params.ad_group_id}`),
        fetch(`/api/search-ads?campaign_id=${params.campaign_id}&ad_group_id=${params.ad_group_id}`)
      ])
      
      const adGroupData = await adGroupRes.json()
      const adsData = await adsRes.json()
      
      if (adGroupData.success) {
        setAdGroup(adGroupData.data)
      } else {
        setError(adGroupData.message || 'Failed to load ad group')
      }
      
      if (adsData.success) {
        setAds(adsData.data)
      } else {
        setError(adsData.message || 'Failed to load ads')
      }
    } catch (err) {
      setError('Failed to load ad group data')
      console.error('Error fetching ad group data:', err)
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

  const submitStatusChange = async (ad, pendingAction) => {
    try {
      setSubmittingAdId(ad.ad_id)
      const res = await fetch('/api/pending-search-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: ad.campaign_id,
          ad_group_id: ad.ad_group_id,
          pending_action: pendingAction,
          original_ad_id: ad.ad_id
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit status change')
      }
      // Simple feedback; keep live list unchanged, pending will reflect in admin
      alert('Change submitted for approval')
    } catch (err) {
      console.error('Status change error:', err)
      alert(err.message || 'Failed to submit status change')
    } finally {
      setSubmittingAdId(null)
    }
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

  if (!adGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="alert alert-warning max-w-md">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>Ad group not found</span>
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
              <li><Link href={`/campaigns/${params.campaign_id}`} className="link link-hover">{adGroup.campaign_name}</Link></li>
              <li>{adGroup.ad_group_name}</li>
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
        {/* Ad Group Header */}
        <div className="card bg-base-100 shadow-lg mb-8">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{adGroup.ad_group_name}</h1>
                  <div className={getStatusBadge(adGroup.status)}>
                    {adGroup.status}
                  </div>
                </div>
                <p className="text-base-content/70 mb-2">
                  Campaign: {adGroup.campaign_name}
                </p>
                <p className="text-sm text-base-content/50">
                  Ad Group ID: {adGroup.ad_group_id} • Created: {new Date(adGroup.created_at).toLocaleDateString()}
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
                  New Ad
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="stat-title">Total Ads</div>
            <div className="stat-value text-primary">{ads.length}</div>
            <div className="stat-desc">Responsive search ads</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-secondary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title">Active Ads</div>
            <div className="stat-value text-secondary">
              {ads.filter(ad => ad.status === 'ACTIVE').length}
            </div>
            <div className="stat-desc">Currently serving</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-accent">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title">Paused Ads</div>
            <div className="stat-value text-accent">
              {ads.filter(ad => ad.status === 'PAUSED').length}
            </div>
            <div className="stat-desc">Temporarily disabled</div>
          </div>
        </div>

        {/* Ads List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Responsive Search Ads</h2>
            <div className="flex gap-2">
              <select className="select select-bordered select-sm">
                <option>All Status</option>
                <option>Active</option>
                <option>Paused</option>
              </select>
              <button className="btn btn-outline btn-sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
              </button>
            </div>
          </div>

          {ads.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-xl font-semibold text-base-content/70 mb-2">No ads found</h3>
              <p className="text-base-content/50 mb-4">Create your first responsive search ad</p>
              <button className="btn btn-primary">Create Ad</button>
            </div>
          ) : (
            ads.map((ad) => (
              <div key={ad.ad_id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="card-title text-lg">Responsive Search Ad</h3>
                      <div className={getStatusBadge(ad.status)}>
                        {ad.status}
                      </div>
                    </div>
                    <div className="text-sm text-base-content/50">
                      Ad ID: {ad.ad_id}
                    </div>
                  </div>

                  {/* Headlines Preview */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-base-content/70 mb-2">
                      Headlines ({ad.headline_count}/15)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {ad.headlines.map((headline, index) => (
                        <div key={index} className="badge badge-outline">
                          {headline}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Descriptions Preview */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-base-content/70 mb-2">
                      Descriptions ({ad.description_count}/4)
                    </h4>
                    <div className="space-y-1">
                      {ad.descriptions.map((description, index) => (
                        <div key={index} className="text-sm text-base-content/80 p-2 bg-base-200 rounded">
                          {description}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final URL Preview */}
                  {ad.final_url && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-base-content/70 mb-2">
                        Landing Page
                      </h4>
                      <div className="text-sm text-primary p-2 bg-base-200 rounded break-all">
                        <a href={ad.final_url} target="_blank" rel="noopener noreferrer" className="link link-primary">
                          {ad.final_url}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="card-actions justify-end">
                    <Link 
                      href={`/campaigns/${params.campaign_id}/ad-groups/${params.ad_group_id}/ads/${ad.ad_id}`}
                      className="btn btn-primary btn-sm"
                    >
                      Edit Ad
                    </Link>
                    {ad.status === 'ACTIVE' && (
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={submittingAdId === ad.ad_id}
                        onClick={() => submitStatusChange(ad, 'PAUSE_AD')}
                      >
                        {submittingAdId === ad.ad_id ? 'Submitting...' : 'Pause'}
                      </button>
                    )}
                    {ad.status === 'PAUSED' && (
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={submittingAdId === ad.ad_id}
                        onClick={() => submitStatusChange(ad, 'RESUME_AD')}
                      >
                        {submittingAdId === ad.ad_id ? 'Submitting...' : 'Resume'}
                      </button>
                    )}
                    <button
                      className="btn btn-outline btn-sm btn-error"
                      disabled={submittingAdId === ad.ad_id}
                      onClick={() => submitStatusChange(ad, 'REMOVE_AD')}
                    >
                      {submittingAdId === ad.ad_id ? 'Submitting...' : 'Remove'}
                    </button>
                    <button className="btn btn-ghost btn-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Duplicate
                    </button>
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
          )}
        </div>
      </div>
    </div>
  )
}
