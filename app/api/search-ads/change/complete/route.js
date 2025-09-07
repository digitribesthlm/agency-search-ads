import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { connectDB } from '../../../../../lib/mongodb'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can mark changes as complete
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { change_id } = await request.json()

    if (!change_id) {
      return NextResponse.json(
        { success: false, message: 'Change ID is required' },
        { status: 400 }
      )
    }

    const { db } = await connectDB()

    // Update change status to completed
    const result = await db.collection('search_ad_changes').updateOne(
      { change_id: change_id },
      {
        $set: {
          status: 'COMPLETED',
          completed_at: new Date(),
          completed_by: session.user.email,
          needs_google_ads_update: false
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Change not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Change marked as completed'
    })

  } catch (error) {
    console.error('Error completing change:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
