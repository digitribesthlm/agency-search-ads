import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { connectDB } from '../../../../lib/mongodb'

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { ad_id } = params

    const { db } = await connectDB()

    const ad = await db.collection('search_ads').findOne({
      ad_id: ad_id,
      account_id: session.user.accountId,
      status: { $ne: 'REMOVED' }
    })

    if (!ad) {
      return NextResponse.json(
        { success: false, message: 'Ad not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: ad
    })

  } catch (error) {
    console.error('Error fetching ad:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { ad_id } = params
    const updateData = await request.json()

    const { db } = await connectDB()

    // Validate headlines and descriptions
    if (updateData.headlines) {
      if (updateData.headlines.length === 0) {
        return NextResponse.json(
          { success: false, message: 'At least one headline is required' },
          { status: 400 }
        )
      }
      if (updateData.headlines.length > 15) {
        return NextResponse.json(
          { success: false, message: 'Maximum 15 headlines allowed' },
          { status: 400 }
        )
      }
      updateData.headline_count = updateData.headlines.length
    }

    if (updateData.descriptions) {
      if (updateData.descriptions.length === 0) {
        return NextResponse.json(
          { success: false, message: 'At least one description is required' },
          { status: 400 }
        )
      }
      if (updateData.descriptions.length > 4) {
        return NextResponse.json(
          { success: false, message: 'Maximum 4 descriptions allowed' },
          { status: 400 }
        )
      }
      updateData.description_count = updateData.descriptions.length
    }

    // Update ad
    const result = await db.collection('search_ads').updateOne(
      {
        ad_id: ad_id,
        account_id: session.user.accountId
      },
      {
        $set: {
          ...updateData,
          last_modified: new Date(),
          last_modified_by: session.user.email
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Ad not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Ad updated successfully'
    })

  } catch (error) {
    console.error('Error updating ad:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { ad_id } = params

    const { db } = await connectDB()

    // Mark as removed instead of actually deleting
    const result = await db.collection('search_ads').updateOne(
      {
        ad_id: ad_id,
        account_id: session.user.accountId
      },
      {
        $set: {
          status: 'REMOVED',
          last_modified: new Date(),
          last_modified_by: session.user.email
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Ad not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Ad removed successfully'
    })

  } catch (error) {
    console.error('Error removing ad:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

