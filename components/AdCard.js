'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AdCard({ ad }) {
  const [isEditing, setIsEditing] = useState(false)
  const [headlines, setHeadlines] = useState(ad.headlines || [])
  const [descriptions, setDescriptions] = useState(ad.descriptions || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success">Active</span>
      case 'PAUSED':
        return <span className="badge badge-warning">Paused</span>
      case 'REMOVED':
        return <span className="badge badge-error">Removed</span>
      default:
        return <span className="badge badge-ghost">{status}</span>
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/search-ads/${ad.ad_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headlines: headlines.filter(h => h.trim() !== ''),
          descriptions: descriptions.filter(d => d.trim() !== '')
        }),
      })

      const result = await response.json()

      if (result.success) {
        setIsEditing(false)
        // Optionally refresh the page or update the ad data
        window.location.reload()
      } else {
        setError(result.message || 'Failed to update ad')
      }
    } catch (error) {
      setError('An error occurred while updating the ad')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setHeadlines(ad.headlines || [])
    setDescriptions(ad.descriptions || [])
    setIsEditing(false)
    setError('')
  }

  const addHeadline = () => {
    if (headlines.length < 15) {
      setHeadlines([...headlines, ''])
    }
  }

  const removeHeadline = (index) => {
    if (headlines.length > 1) {
      setHeadlines(headlines.filter((_, i) => i !== index))
    }
  }

  const updateHeadline = (index, value) => {
    const newHeadlines = [...headlines]
    newHeadlines[index] = value
    setHeadlines(newHeadlines)
  }

  const addDescription = () => {
    if (descriptions.length < 4) {
      setDescriptions([...descriptions, ''])
    }
  }

  const removeDescription = (index) => {
    if (descriptions.length > 1) {
      setDescriptions(descriptions.filter((_, i) => i !== index))
    }
  }

  const updateDescription = (index, value) => {
    const newDescriptions = [...descriptions]
    newDescriptions[index] = value
    setDescriptions(newDescriptions)
  }

  const getCharacterCountClass = (current, max) => {
    const percentage = (current / max) * 100
    if (percentage >= 90) return 'error'
    if (percentage >= 75) return 'warning'
    return ''
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-start mb-4">
          <h2 className="card-title text-lg">Ad {ad.ad_id}</h2>
          <div className="flex items-center space-x-2">
            {getStatusBadge(ad.status)}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-ghost btn-sm"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            {/* Headlines Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Headlines ({headlines.length}/15)</h3>
                {headlines.length < 15 && (
                  <button
                    onClick={addHeadline}
                    className="btn btn-ghost btn-xs"
                  >
                    + Add Headline
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {headlines.map((headline, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => updateHeadline(index, e.target.value)}
                      className="input input-bordered input-sm flex-1"
                      placeholder={`Headline ${index + 1}`}
                      maxLength={30}
                    />
                    <span className={`character-counter ${getCharacterCountClass(headline.length, 30)}`}>
                      {headline.length}/30
                    </span>
                    {headlines.length > 1 && (
                      <button
                        onClick={() => removeHeadline(index)}
                        className="btn btn-error btn-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Descriptions Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Descriptions ({descriptions.length}/4)</h3>
                {descriptions.length < 4 && (
                  <button
                    onClick={addDescription}
                    className="btn btn-ghost btn-xs"
                  >
                    + Add Description
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {descriptions.map((description, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <textarea
                      value={description}
                      onChange={(e) => updateDescription(index, e.target.value)}
                      className="textarea textarea-bordered textarea-sm flex-1"
                      placeholder={`Description ${index + 1}`}
                      maxLength={90}
                      rows={2}
                    />
                    <span className={`character-counter ${getCharacterCountClass(description.length, 90)}`}>
                      {description.length}/90
                    </span>
                    {descriptions.length > 1 && (
                      <button
                        onClick={() => removeDescription(index)}
                        className="btn btn-error btn-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancel}
                className="btn btn-ghost btn-sm"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={`btn btn-primary btn-sm ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Headlines Display */}
            <div>
              <h3 className="font-semibold mb-2">Headlines ({ad.headline_count})</h3>
              <div className="space-y-1">
                {ad.headlines?.map((headline, index) => (
                  <div key={index} className="text-sm p-2 bg-base-200 rounded">
                    {headline}
                  </div>
                ))}
              </div>
            </div>

            {/* Descriptions Display */}
            <div>
              <h3 className="font-semibold mb-2">Descriptions ({ad.description_count})</h3>
              <div className="space-y-1">
                {ad.descriptions?.map((description, index) => (
                  <div key={index} className="text-sm p-2 bg-base-200 rounded">
                    {description}
                  </div>
                ))}
              </div>
            </div>

            {/* Ad Info */}
            <div className="text-xs text-base-content/70 space-y-1">
              <div>Created: {new Date(ad.created_at).toLocaleDateString()}</div>
              <div>Last Modified: {new Date(ad.last_modified).toLocaleDateString()}</div>
              <div>Modified By: {ad.last_modified_by}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




