'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function AdEditPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [ad, setAd] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [editingHeadline, setEditingHeadline] = useState(null)
  const [editingDescription, setEditingDescription] = useState(null)
  const [newHeadline, setNewHeadline] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [finalUrl, setFinalUrl] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (params.ad_id) {
      fetchAdData()
    }
  }, [session, status, params.ad_id])

  const fetchAdData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/search-ads/${params.ad_id}`)
      const data = await response.json()
      
      if (data.success) {
        setAd(data.data)
      } else {
        setError(data.message || 'Failed to load ad')
      }
    } catch (err) {
      setError('Failed to load ad data')
      console.error('Error fetching ad data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddHeadline = () => {
    if (ad.headlines.length >= 15) {
      setError('Maximum 15 headlines allowed')
      return
    }
    if (!newHeadline.trim()) {
      setError('Headline cannot be empty')
      return
    }
    if (newHeadline.length > 30) {
      setError('Headline cannot exceed 30 characters')
      return
    }
    if (ad.headlines.includes(newHeadline)) {
      setError('Duplicate headline not allowed')
      return
    }

    const updatedAd = {
      ...ad,
      headlines: [...ad.headlines, newHeadline],
      headline_count: ad.headline_count + 1
    }
    setAd(updatedAd)
    setNewHeadline('')
    setError(null)
  }

  const handleEditHeadline = (index) => {
    setEditingHeadline(index)
    setNewHeadline(ad.headlines[index])
  }

  const handleSaveHeadline = () => {
    if (!newHeadline.trim()) {
      setError('Headline cannot be empty')
      return
    }
    if (newHeadline.length > 30) {
      setError('Headline cannot exceed 30 characters')
      return
    }
    if (ad.headlines.includes(newHeadline) && ad.headlines[editingHeadline] !== newHeadline) {
      setError('Duplicate headline not allowed')
      return
    }

    const updatedHeadlines = [...ad.headlines]
    updatedHeadlines[editingHeadline] = newHeadline
    setAd({
      ...ad,
      headlines: updatedHeadlines
    })
    setEditingHeadline(null)
    setNewHeadline('')
    setError(null)
  }

  const handleRemoveHeadline = (index) => {
    if (ad.headlines.length <= 1) {
      setError('At least one headline is required')
      return
    }

    const updatedHeadlines = ad.headlines.filter((_, i) => i !== index)
    setAd({
      ...ad,
      headlines: updatedHeadlines,
      headline_count: ad.headline_count - 1
    })
    setError(null)
  }

  const handleAddDescription = () => {
    if (ad.descriptions.length >= 4) {
      setError('Maximum 4 descriptions allowed')
      return
    }
    if (!newDescription.trim()) {
      setError('Description cannot be empty')
      return
    }
    if (newDescription.length > 90) {
      setError('Description cannot exceed 90 characters')
      return
    }
    if (ad.descriptions.includes(newDescription)) {
      setError('Duplicate description not allowed')
      return
    }

    const updatedAd = {
      ...ad,
      descriptions: [...ad.descriptions, newDescription],
      description_count: ad.description_count + 1
    }
    setAd(updatedAd)
    setNewDescription('')
    setError(null)
  }

  const handleEditDescription = (index) => {
    setEditingDescription(index)
    setNewDescription(ad.descriptions[index])
  }

  const handleSaveDescription = () => {
    if (!newDescription.trim()) {
      setError('Description cannot be empty')
      return
    }
    if (newDescription.length > 90) {
      setError('Description cannot exceed 90 characters')
      return
    }
    if (ad.descriptions.includes(newDescription) && ad.descriptions[editingDescription] !== newDescription) {
      setError('Duplicate description not allowed')
      return
    }

    const updatedDescriptions = [...ad.descriptions]
    updatedDescriptions[editingDescription] = newDescription
    setAd({
      ...ad,
      descriptions: updatedDescriptions
    })
    setEditingDescription(null)
    setNewDescription('')
    setError(null)
  }

  const handleRemoveDescription = (index) => {
    if (ad.descriptions.length <= 1) {
      setError('At least one description is required')
      return
    }

    const updatedDescriptions = ad.descriptions.filter((_, i) => i !== index)
    setAd({
      ...ad,
      descriptions: updatedDescriptions,
      description_count: ad.description_count - 1
    })
    setError(null)
  }

  const handleSaveAd = async () => {
    setIsSaving(true)
    try {
      // Create pending modification instead of direct edit
      const pendingData = {
        ...ad,
        original_ad_id: params.ad_id,
        pending_action: 'MODIFY_AD',
        campaign_name: ad.campaign_name,
        ad_group_name: ad.ad_group_name
      }

      const response = await fetch('/api/pending-search-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setError(null)
        alert('Changes submitted for approval! You will be notified once reviewed.')
        router.back() // Go back to ad group page
      } else {
        setError(data.message || 'Failed to submit changes')
      }
    } catch (err) {
      setError('Failed to submit changes')
    } finally {
      setIsSaving(false)
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

  if (error && !ad) {
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

  if (!ad) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="alert alert-warning max-w-md">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>Ad not found</span>
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
              <li><Link href={`/campaigns/${params.campaign_id}`} className="link link-hover">{ad.campaign_name}</Link></li>
              <li><Link href={`/campaigns/${params.campaign_id}/ad-groups/${params.ad_group_id}`} className="link link-hover">{ad.ad_group_name}</Link></li>
              <li>Edit Ad</li>
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
        {/* Ad Header */}
        <div className="card bg-base-100 shadow-lg mb-8">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">Edit Responsive Search Ad</h1>
                  <div className={getStatusBadge(ad.status)}>
                    {ad.status}
                  </div>
                </div>
                <p className="text-base-content/70 mb-2">
                  {ad.campaign_name} → {ad.ad_group_name}
                </p>
                <p className="text-sm text-base-content/50">
                  Ad ID: {ad.ad_id}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => router.back()}
                >
                  Cancel
                </button>
                <button 
                  className={`btn btn-primary btn-sm ${isSaving ? 'loading' : ''}`}
                  onClick={handleSaveAd}
                  disabled={isSaving}
                >
                  {isSaving ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Headlines Section */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Headlines</h2>
                <div className="badge badge-primary">
                  {ad.headline_count}/15
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                {ad.headlines.map((headline, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                    {editingHeadline === index ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={newHeadline}
                          onChange={(e) => setNewHeadline(e.target.value)}
                          maxLength={30}
                        />
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={handleSaveHeadline}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingHeadline(null)
                            setNewHeadline('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{headline}</div>
                          <div className="text-xs text-base-content/50">
                            {headline.length}/30 characters
                          </div>
                        </div>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleEditHeadline(index)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => handleRemoveHeadline(index)}
                          disabled={ad.headlines.length <= 1}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {ad.headlines.length < 15 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new headline..."
                    className="input input-bordered flex-1"
                    value={newHeadline}
                    onChange={(e) => setNewHeadline(e.target.value)}
                    maxLength={30}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddHeadline()}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={handleAddHeadline}
                    disabled={!newHeadline.trim()}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Descriptions Section */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Descriptions</h2>
                <div className="badge badge-secondary">
                  {ad.description_count}/4
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                {ad.descriptions.map((description, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-base-200 rounded-lg">
                    {editingDescription === index ? (
                      <div className="flex-1 flex gap-2">
                        <textarea
                          className="textarea textarea-bordered flex-1"
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          maxLength={90}
                          rows={3}
                        />
                        <div className="flex flex-col gap-1">
                          <button 
                            className="btn btn-success btn-sm"
                            onClick={handleSaveDescription}
                          >
                            Save
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingDescription(null)
                              setNewDescription('')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{description}</div>
                          <div className="text-xs text-base-content/50">
                            {description.length}/90 characters
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleEditDescription(index)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() => handleRemoveDescription(index)}
                            disabled={ad.descriptions.length <= 1}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {ad.descriptions.length < 4 && (
                <div className="flex gap-2">
                  <textarea
                    placeholder="Add new description..."
                    className="textarea textarea-bordered flex-1"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    maxLength={90}
                    rows={3}
                  />
                  <button 
                    className="btn btn-secondary"
                    onClick={handleAddDescription}
                    disabled={!newDescription.trim()}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Final URL Section */}
        <div className="card bg-base-100 shadow-lg mt-8">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Landing Page URL</h2>
              <div className="badge badge-accent">
                Final URL
              </div>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Final URL (Landing Page)</span>
              </label>
              <input
                type="url"
                placeholder="https://example.com/landing-page"
                className="input input-bordered w-full"
                value={ad.final_url || ''}
                onChange={(e) => setAd({
                  ...ad,
                  final_url: e.target.value
                })}
              />
              <label className="label">
                <span className="label-text-alt">The URL where users will land when they click your ad</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
