'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState('')
  const [session, setSession] = useState(null)

  const testLogin = async () => {
    setDebugInfo('Testing login...\n')
    
    try {
      const result = await signIn('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false
      })
      
      setDebugInfo(prev => prev + `Login result: ${JSON.stringify(result, null, 2)}\n`)
      
      if (result?.ok) {
        const sessionData = await getSession()
        setSession(sessionData)
        setDebugInfo(prev => prev + `Session: ${JSON.stringify(sessionData, null, 2)}\n`)
      }
    } catch (error) {
      setDebugInfo(prev => prev + `Error: ${error.message}\n`)
    }
  }

  const testSession = async () => {
    const sessionData = await getSession()
    setSession(sessionData)
    setDebugInfo(prev => prev + `Current session: ${JSON.stringify(sessionData, null, 2)}\n`)
  }

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug Login Issues</h1>
        
        <div className="space-y-4 mb-6">
          <button 
            onClick={testLogin}
            className="btn btn-primary"
          >
            Test Login
          </button>
          
          <button 
            onClick={testSession}
            className="btn btn-secondary"
          >
            Check Session
          </button>
        </div>

        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Debug Information</h2>
            <pre className="whitespace-pre-wrap text-sm">{debugInfo}</pre>
          </div>
        </div>

        {session && (
          <div className="card bg-base-200 mt-4">
            <div className="card-body">
              <h2 className="card-title">Current Session</h2>
              <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(session, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
