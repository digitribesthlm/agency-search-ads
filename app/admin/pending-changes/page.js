'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PendingChangesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [changes, setChanges] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('PENDING')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (session.user.role !== 'admin') {
      router.push('/')
      return
    }
    fetchChanges()
  }, [session, status, filterStatus])

  const fetchChanges = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/search-ads/change?status=${filterStatus}`)
      const data = await response.json()
      
      if (data.success) {
        setChanges(data.data)
      } else {
        setError(data.message || 'Failed to load changes')
      }
    } catch (err) {
      setError('Failed to load changes')
      console.error('Error fetching changes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkComplete = async (changeId) => {
    try {
      const response = await fetch('/api/search-ads/change/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_id: changeId })
      })
      
      const data = await response.json()
      if (data.success) {
        alert('Change marked as completed!')
        fetchChanges() // Refresh the list
      } else {
        alert(data.message || 'Failed to mark as complete')
      }
    } catch (err) {
      alert('Failed to mark as complete')
      console.error('Error marking complete:', err)
    }
  }

  const getActionBadge = (action) => {
    const actionClasses = {
      'ADD_HEADLINE': 'badge-primary',
      'EDIT_HEADLINE': 'badge-warning',
      'REMOVE_HEADLINE': 'badge-error',
      'ADD_DESCRIPTION': 'badge-secondary',
      'EDIT_DESCRIPTION': 'badge-warning',
      'REMOVE_DESCRIPTION': 'badge-error'
    }
    return `badge ${actionClasses[action] || 'badge-neutral'}`
  }

  const getStatusBadge = (status) => {
    const statusClasses = {
      'PENDING': 'badge-warning',
      'COMPLETED': 'badge-success'
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
        {/* Header */}
        <div className="card bg-base-100 shadow-lg mb-8">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Pending Changes</h1>
                <p className="text-base-content/70 mt-2">
                  Review and manage changes that need to be synced with Google Ads
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/admin" className="btn btn-outline">
                  Back to Admin
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <button 
            className={`tab ${filterStatus === 'PENDING' ? 'tab-active' : ''}`}
            onClick={() => setFilterStatus('PENDING')}
          >
            Pending Changes ({changes.filter(c => c.status === 'PENDING').length})
          </button>
          <button 
            className={`tab ${filterStatus === 'COMPLETED' ? 'tab-active' : ''}`}
            onClick={() => setFilterStatus('COMPLETED')}
          >
            Completed Changes ({changes.filter(c => c.status === 'COMPLETED').length})
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Changes List */}
        <div className="space-y-4">
          {changes.length === 0 ? (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body text-center py-12">
                <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">No {filterStatus.toLowerCase()} changes</h3>
                <p className="text-base-content/70">
                  {filterStatus === 'PENDING' 
                    ? 'All changes have been synced with Google Ads' 
                    : 'No completed changes yet'
                  }
                </p>
              </div>
            </div>
          ) : (
            changes.map((change) => (
              <div key={change.change_id} className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={getActionBadge(change.action)}>
                          {change.action.replace('_', ' ')}
                        </div>
                        <div className={getStatusBadge(change.status)}>
                          {change.status}
                        </div>
                        <div className="text-sm text-base-content/70">
                          {new Date(change.changed_at).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold text-sm text-base-content/70 mb-1">Campaign</h4>
                          <p className="text-sm">{change.campaign_name}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-base-content/70 mb-1">Ad Group</h4>
                          <p className="text-sm">{change.ad_group_name}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-base-content/70 mb-1">Field Changed</h4>
                          <p className="text-sm font-mono">{change.field_changed}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-base-content/70 mb-1">Changed By</h4>
                          <p className="text-sm">{change.changed_by}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {change.old_value && (
                          <div>
                            <h4 className="font-semibold text-sm text-base-content/70 mb-1">Old Value</h4>
                            <div className="p-3 bg-error/10 border border-error/20 rounded text-sm">
                              {change.old_value}
                            </div>
                          </div>
                        )}
                        {change.new_value && (
                          <div>
                            <h4 className="font-semibold text-sm text-base-content/70 mb-1">New Value</h4>
                            <div className="p-3 bg-success/10 border border-success/20 rounded text-sm">
                              {change.new_value}
                            </div>
                          </div>
                        )}
                      </div>

                      {change.status === 'COMPLETED' && change.completed_at && (
                        <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded">
                          <p className="text-sm text-success">
                            ✅ Completed by {change.completed_by} on {new Date(change.completed_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {change.status === 'PENDING' && (
                      <div className="ml-4">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleMarkComplete(change.change_id)}
                        >
                          Mark as Complete
                        </button>
                      </div>
                    )}
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