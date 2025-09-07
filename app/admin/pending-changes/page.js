'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PendingChangesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pendingChanges, setPendingChanges] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (session.user.role !== 'admin') {
      router.push('/campaigns')
      return
    }
    fetchPendingChanges()
  }, [session, status])

  const fetchPendingChanges = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/pending-search-ads?approval_status=PENDING')
      const data = await response.json()
      
      if (data.success) {
        setPendingChanges(data.data)
      }
    } catch (error) {
      console.error('Error fetching pending changes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (pendingId) => {
    try {
      setIsProcessing(true)
      const response = await fetch(`/api/pending-search-ads/${pendingId}/approve`, {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        await fetchPendingChanges() // Refresh the list
        alert('Change approved successfully!')
      } else {
        alert('Error approving change: ' + data.message)
      }
    } catch (error) {
      alert('Error approving change')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (pendingId) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    try {
      setIsProcessing(true)
      const response = await fetch(`/api/pending-search-ads/${pendingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: reason })
      })
      const data = await response.json()
      
      if (data.success) {
        await fetchPendingChanges() // Refresh the list
        alert('Change rejected successfully!')
      } else {
        alert('Error rejecting change: ' + data.message)
      }
    } catch (error) {
      alert('Error rejecting change')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusClasses = {
      'PENDING_APPROVAL': 'badge-warning',
      'APPROVED': 'badge-success',
      'REJECTED': 'badge-error'
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

  if (!session || session.user.role !== 'admin') {
    return null // Will redirect
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
              <li><Link href="/admin" className="link link-hover">Admin</Link></li>
              <li>Pending Changes</li>
            </ul>
          </div>
        </div>
        <div className="navbar-end">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                <span className="text-sm font-bold">{session.user?.name?.[0] || 'A'}</span>
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
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-base-content">Pending Changes</h1>
            <p className="text-base-content/70 mt-2">
              Review and approve customer modifications to search ads
            </p>
          </div>
          <button 
            className="btn btn-outline"
            onClick={fetchPendingChanges}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Pending Changes List */}
        <div className="space-y-4">
          {pendingChanges.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-base-content/70 mb-2">No pending changes</h3>
              <p className="text-base-content/50">All changes have been processed</p>
            </div>
          ) : (
            pendingChanges.map((change) => (
              <div key={change._id} className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="card-title text-lg">
                          {change.pending_action === 'CREATE_AD' ? 'New Ad' : 'Ad Modification'}
                        </h3>
                        <div className={getStatusBadge(change.approval_status)}>
                          {change.approval_status}
                        </div>
                      </div>
                      <p className="text-base-content/70 mb-2">
                        {change.campaign_name} → {change.ad_group_name}
                      </p>
                      <p className="text-sm text-base-content/50">
                        Requested by: {change.created_by} • {new Date(change.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Headlines Preview */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-base-content/70 mb-2">
                      Headlines ({change.headline_count}/15)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {change.headlines.map((headline, index) => (
                        <div key={index} className="badge badge-outline">
                          {headline}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Descriptions Preview */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-base-content/70 mb-2">
                      Descriptions ({change.description_count}/4)
                    </h4>
                    <div className="space-y-1">
                      {change.descriptions.map((description, index) => (
                        <div key={index} className="text-sm text-base-content/80 p-2 bg-base-200 rounded">
                          {description}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final URL Preview */}
                  {change.final_url && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-base-content/70 mb-2">
                        Landing Page
                      </h4>
                      <div className="text-sm text-primary p-2 bg-base-200 rounded break-all">
                        <a href={change.final_url} target="_blank" rel="noopener noreferrer" className="link link-primary">
                          {change.final_url}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="card-actions justify-end">
                    <button 
                      className="btn btn-error btn-sm"
                      onClick={() => handleReject(change.ad_id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Reject'}
                    </button>
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => handleApprove(change.ad_id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Approve'}
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
