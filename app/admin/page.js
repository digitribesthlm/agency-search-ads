'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    pendingChanges: 0,
    approvedToday: 0,
    rejectedToday: 0,
    totalChanges: 0
  })
  const [isLoading, setIsLoading] = useState(true)

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
    fetchStats()
  }, [session, status])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      const [pendingRes, completedRes, allChangesRes] = await Promise.all([
        fetch('/api/search-ads/change?status=PENDING'),
        fetch('/api/search-ads/change?status=COMPLETED'),
        fetch('/api/search-ads/change')
      ])
      
      const pendingData = await pendingRes.json()
      const completedData = await completedRes.json()
      const allChangesData = await allChangesRes.json()
      
      if (pendingData.success && completedData.success && allChangesData.success) {
        const today = new Date().toDateString()
        const todayCompleted = completedData.data.filter(change => 
          change.completed_at && new Date(change.completed_at).toDateString() === today
        )
        
        setStats({
          pendingChanges: pendingData.data.length,
          approvedToday: todayCompleted.length,
          rejectedToday: 0, // We don't have rejection in this system
          totalChanges: allChangesData.data.length
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
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
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-base-content">Admin Dashboard</h1>
          <p className="text-base-content/70 mt-2">
            Manage pending changes and monitor system activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-warning">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title">Pending Changes</div>
            <div className="stat-value text-warning">{stats.pendingChanges}</div>
            <div className="stat-desc">Awaiting approval</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-success">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title">Completed Today</div>
            <div className="stat-value text-success">{stats.approvedToday}</div>
            <div className="stat-desc">Changes synced to Google Ads</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-error">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="stat-title">System Health</div>
            <div className="stat-value text-success">100%</div>
            <div className="stat-desc">Uptime</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-primary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="stat-title">Total Changes</div>
            <div className="stat-value text-primary">{stats.totalChanges}</div>
            <div className="stat-desc">All time</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-primary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pending Changes
              </h2>
              <p className="text-base-content/70 mb-4">
                Review and mark as complete changes that need Google Ads sync
              </p>
              <div className="card-actions">
                <Link href="/admin/pending-changes" className="btn btn-primary">
                  Review Changes
                </Link>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-secondary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Change Overview
              </h2>
              <p className="text-base-content/70 mb-4">
                Analytics and audit trail of all system changes
              </p>
              <div className="card-actions">
                <Link href="/admin/change-history" className="btn btn-secondary">
                  View Analytics
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card bg-base-100 shadow-lg mt-8">
          <div className="card-body">
            <h2 className="card-title">Recent Activity</h2>
            <div className="text-center py-8">
              <p className="text-base-content/70">Recent activity will be displayed here</p>
              <Link href="/admin/change-history" className="btn btn-outline btn-sm mt-4">
                View Full History
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

