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
  const [showNewAdModal, setShowNewAdModal] = useState(false)
  const [campaignOptions, setCampaignOptions] = useState([])
  const [adGroupOptions, setAdGroupOptions] = useState([])
  const [form, setForm] = useState({
    campaign_id: '',
    campaign_name: '',
    ad_group_id: '',
    ad_group_name: '',
    headlines: [''],
    descriptions: [''],
    final_url: ''
  })
  const [formErrors, setFormErrors] = useState([])
  const [isSavingNewAd, setIsSavingNewAd] = useState(false)
  const [saveNotice, setSaveNotice] = useState('')

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
      'ENABLED': 'badge-success',
      'ACTIVE': 'badge-success', // Keep for backward compatibility
      'PAUSED': 'badge-warning',
      'REMOVED': 'badge-error',
      'PENDING': 'badge-warning'
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
      // Optimistic UI: mark this ad as PENDING locally
      setAds(prev => prev.map(a => a.ad_id === ad.ad_id ? { ...a, status: 'PENDING', _localPending: true } : a))
    } catch (err) {
      console.error('Status change error:', err)
      // Keep current UI, optionally surface a non-intrusive message later
    } finally {
      setSubmittingAdId(null)
    }
  }

  const openNewAdModal = async () => {
    try {
      setSaveNotice('')
      setFormErrors([])
      // Preselect current context
      const initial = {
        campaign_id: params.campaign_id,
        campaign_name: adGroup?.campaign_name || '',
        ad_group_id: params.ad_group_id,
        ad_group_name: adGroup?.ad_group_name || '',
        headlines: [''],
        descriptions: [''],
        final_url: ''
      }
      setForm(initial)
      // Fetch campaigns
      const resCampaigns = await fetch('/api/search-campaigns')
      const dataCampaigns = await resCampaigns.json()
      if (dataCampaigns.success) {
        setCampaignOptions(dataCampaigns.data.map(c => ({ id: c.campaign_id, name: c.campaign_name })))
      }
      // Fetch ad groups for selected campaign
      const resGroups = await fetch(`/api/search-campaigns/${params.campaign_id}/ad-groups`)
      const dataGroups = await resGroups.json()
      if (dataGroups.success) {
        setAdGroupOptions(dataGroups.data.map(g => ({ id: g.ad_group_id, name: g.ad_group_name })))
      }
      setShowNewAdModal(true)
    } catch (e) {
      console.error('Failed to initialize new ad modal', e)
    }
  }

  const handleCampaignChange = async (campaign_id) => {
    const selected = campaignOptions.find(c => c.id === campaign_id)
    setForm(prev => ({ ...prev, campaign_id, campaign_name: selected?.name || '', ad_group_id: '', ad_group_name: '' }))
    try {
      const res = await fetch(`/api/search-campaigns/${campaign_id}/ad-groups`)
      const data = await res.json()
      if (data.success) {
        setAdGroupOptions(data.data.map(g => ({ id: g.ad_group_id, name: g.ad_group_name })))
      }
    } catch (e) {
      console.error('Failed to load ad groups', e)
    }
  }

  const handleAdGroupChange = (ad_group_id) => {
    const selected = adGroupOptions.find(g => g.id === ad_group_id)
    setForm(prev => ({ ...prev, ad_group_id, ad_group_name: selected?.name || '' }))
  }

  const updateArrayField = (field, index, value) => {
    setForm(prev => {
      const arr = [...prev[field]]
      arr[index] = value
      return { ...prev, [field]: arr }
    })
  }

  const addArrayItem = (field, limit) => {
    setForm(prev => {
      if (prev[field].length >= limit) return prev
      return { ...prev, [field]: [...prev[field], ''] }
    })
  }

  const removeArrayItem = (field, index) => {
    setForm(prev => {
      const arr = prev[field].filter((_, i) => i !== index)
      return { ...prev, [field]: arr }
    })
  }

  const validateForm = () => {
    const errs = []
    if (!form.campaign_id) errs.push('Campaign is required')
    if (!form.ad_group_id) errs.push('Ad group is required')
    const trimmedHeadlines = form.headlines.map(h => (h || '').trim()).filter(h => h.length > 0)
    const trimmedDescriptions = form.descriptions.map(d => (d || '').trim()).filter(d => d.length > 0)
    if (trimmedHeadlines.length < 1) errs.push('At least one headline is required')
    if (trimmedDescriptions.length < 1) errs.push('At least one description is required')
    if (trimmedHeadlines.length > 15) errs.push('Maximum 15 headlines allowed')
    if (trimmedDescriptions.length > 4) errs.push('Maximum 4 descriptions allowed')
    if (new Set(trimmedHeadlines).size !== trimmedHeadlines.length) errs.push('Duplicate headlines not allowed')
    if (new Set(trimmedDescriptions).size !== trimmedDescriptions.length) errs.push('Duplicate descriptions not allowed')
    if (trimmedHeadlines.some(h => h.length > 30)) errs.push('Headlines must be 30 characters or less')
    if (trimmedDescriptions.some(d => d.length > 90)) errs.push('Descriptions must be 90 characters or less')
    if (!form.final_url || !(form.final_url || '').trim()) errs.push('Landing page URL is required')
    setFormErrors(errs)
    return errs.length === 0
  }

  const submitNewAd = async () => {
    try {
      setIsSavingNewAd(true)
      setSaveNotice('')
      if (!validateForm()) {
        setIsSavingNewAd(false)
        return
      }
      const payload = {
        campaign_id: form.campaign_id,
        campaign_name: form.campaign_name,
        ad_group_id: form.ad_group_id,
        ad_group_name: form.ad_group_name,
        ad_type: 'RESPONSIVE_SEARCH_AD',
        headlines: form.headlines.map(h => h.trim()).filter(Boolean),
        descriptions: form.descriptions.map(d => d.trim()).filter(Boolean),
        final_url: form.final_url.trim(),
        pending_action: 'CREATE_AD'
      }
      const res = await fetch('/api/pending-search-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create pending ad')
      }
      setSaveNotice('Change submitted for approval')
      // Optionally close modal after short delay
      setTimeout(() => setShowNewAdModal(false), 800)
    } catch (e) {
      console.error('Create ad error:', e)
      setFormErrors([e.message || 'Failed to create pending ad'])
    } finally {
      setIsSavingNewAd(false)
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
                <button className="btn btn-primary btn-sm" onClick={openNewAdModal}>
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
              {ads.filter(ad => ad.status === 'ENABLED' || ad.status === 'ACTIVE').length}
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
                      {ad.status === 'PENDING' ? (
                        <div className="tooltip" data-tip="Pending approval. The agency will handle this request.">
                          <div className={getStatusBadge(ad.status)}>
                            {ad.status}
                          </div>
                        </div>
                      ) : (
                        <div className={getStatusBadge(ad.status)}>
                          {ad.status}
                        </div>
                      )}
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
                    {(ad.status === 'ENABLED' || ad.status === 'ACTIVE') && (
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
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <NewAdModal
        visible={showNewAdModal}
        onClose={() => setShowNewAdModal(false)}
        form={form}
        setForm={setForm}
        formErrors={formErrors}
        isSaving={isSavingNewAd}
        saveNotice={saveNotice}
        campaignOptions={campaignOptions}
        adGroupOptions={adGroupOptions}
        onCampaignChange={handleCampaignChange}
        onAdGroupChange={handleAdGroupChange}
        onAddItem={addArrayItem}
        onUpdateItem={updateArrayField}
        onRemoveItem={removeArrayItem}
        onSubmit={submitNewAd}
      />
    </div>
  )
}

// New Ad Modal UI component appended below
function NewAdModal({ visible, onClose, form, setForm, formErrors, isSaving, saveNotice, campaignOptions, adGroupOptions, onCampaignChange, onAdGroupChange, onAddItem, onUpdateItem, onRemoveItem, onSubmit }) {
  if (!visible) return null
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <h3 className="font-bold text-lg mb-4">Create Responsive Search Ad</h3>

        {formErrors.length > 0 && (
          <div className="alert alert-error mb-4">
            <ul className="list-disc list-inside text-sm">
              {formErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {saveNotice && (
          <div className="alert alert-success mb-4 text-sm">{saveNotice}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div>
            <label className="label"><span className="label-text">Campaign</span></label>
            <select className="select select-bordered w-full"
              value={form.campaign_id}
              onChange={(e) => onCampaignChange(e.target.value)}
            >
              <option value="">Select campaign</option>
              {campaignOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label"><span className="label-text">Ad Group</span></label>
            <select className="select select-bordered w-full"
              value={form.ad_group_id}
              onChange={(e) => onAdGroupChange(e.target.value)}
            >
              <option value="">Select ad group</option>
              {adGroupOptions.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label"><span className="label-text">Headlines (max 15, 30 chars each)</span></label>
            {form.headlines.map((h, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input type="text" className="input input-bordered w-full"
                  maxLength={30}
                  value={h}
                  onChange={(e) => onUpdateItem('headlines', idx, e.target.value)}
                  placeholder={`Headline ${idx + 1}`}
                />
                <span className="text-xs text-base-content/50">{(h || '').length}/30</span>
                {form.headlines.length > 1 && (
                  <button className="btn btn-ghost btn-xs" onClick={() => onRemoveItem('headlines', idx)}>Remove</button>
                )}
              </div>
            ))}
            {form.headlines.length < 15 && (
              <button className="btn btn-ghost btn-sm" onClick={() => onAddItem('headlines', 15)}>Add headline</button>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="label"><span className="label-text">Descriptions (max 4, 90 chars each)</span></label>
            {form.descriptions.map((d, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input type="text" className="input input-bordered w-full"
                  maxLength={90}
                  value={d}
                  onChange={(e) => onUpdateItem('descriptions', idx, e.target.value)}
                  placeholder={`Description ${idx + 1}`}
                />
                <span className="text-xs text-base-content/50">{(d || '').length}/90</span>
                {form.descriptions.length > 1 && (
                  <button className="btn btn-ghost btn-xs" onClick={() => onRemoveItem('descriptions', idx)}>Remove</button>
                )}
              </div>
            ))}
            {form.descriptions.length < 4 && (
              <button className="btn btn-ghost btn-sm" onClick={() => onAddItem('descriptions', 4)}>Add description</button>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="label"><span className="label-text">Final URL</span></label>
            <input type="url" className="input input-bordered w-full"
              value={form.final_url}
              onChange={(e) => setForm(prev => ({ ...prev, final_url: e.target.value }))}
              placeholder="https://example.com/landing-page"
            />
          </div>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}
