'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ChangeHistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [changes, setChanges] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: 'ALL',
    action: 'ALL',
    dateRange: 'ALL'
  })

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
  }, [session, status, filters])

  const fetchChanges = async () => {
    try {
      setIsLoading(true)
      let url = '/api/search-ads/change'
      const params = new URLSearchParams()
      
      if (filters.status !== 'ALL') {
        params.append('status', filters.status)
      }
      if (filters.action !== 'ALL') {
        params.append('action', filters.action)
      }
      
      if (params.toString()) {
        url += '?' + params.toString()
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        let filteredChanges = data.data
        
        // Filter by date range
        if (filters.dateRange !== 'ALL') {
          const now = new Date()
          const filterDate = new Date()
          
          switch (filters.dateRange) {
            case 'TODAY':
              filterDate.setHours(0, 0, 0, 0)
              break
            case 'WEEK':
              filterDate.setDate(now.getDate() - 7)
              break
            case 'MONTH':
              filterDate.setMonth(now.getMonth() - 1)
              break
          }
          
          filteredChanges = filteredChanges.filter(change => 
            new Date(change.changed_at) >= filterDate
          )
        }
        
        setChanges(filteredChanges)
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
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
              <li>Change History</li>
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
        {/* Header */}
        <div className="card bg-base-100 shadow-lg mb-8">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Change History</h1>
                <p className="text-base-content/70 mt-2">
                  Complete audit trail of all system changes
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/admin" className="btn btn-outline">
                  Back to Admin
                </Link>
                <Link href="/admin/pending-changes" className="btn btn-primary">
                  Pending Changes
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card bg-base-100 shadow-lg mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Action Type</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={filters.action}
                  onChange={(e) => setFilters({...filters, action: e.target.value})}
                >
                  <option value="ALL">All Actions</option>
                  <option value="ADD_HEADLINE">Add Headline</option>
                  <option value="EDIT_HEADLINE">Edit Headline</option>
                  <option value="REMOVE_HEADLINE">Remove Headline</option>
                  <option value="ADD_DESCRIPTION">Add Description</option>
                  <option value="EDIT_DESCRIPTION">Edit Description</option>
                  <option value="REMOVE_DESCRIPTION">Remove Description</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Date Range</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={filters.dateRange}
                  onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="WEEK">Last 7 Days</option>
                  <option value="MONTH">Last 30 Days</option>
                </select>
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

        {/* Changes List */}
        <div className="space-y-4">
          {changes.length === 0 ? (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body text-center py-12">
                <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">No changes found</h3>
                <p className="text-base-content/70">
                  No changes match your current filters
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
                          {formatDate(change.changed_at)}
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
                            ✅ Completed by {change.completed_by} on {formatDate(change.completed_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        <div className="card bg-base-100 shadow-lg mt-8">
          <div className="card-body">
            <h2 className="card-title">Summary</h2>
            <div className="stats stats-horizontal shadow">
              <div className="stat">
                <div className="stat-title">Total Changes</div>
                <div className="stat-value text-primary">{changes.length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Pending</div>
                <div className="stat-value text-warning">
                  {changes.filter(c => c.status === 'PENDING').length}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Completed</div>
                <div className="stat-value text-success">
                  {changes.filter(c => c.status === 'COMPLETED').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
