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

    const { campaign_id } = params

    const { db } = await connectDB()

    // Get campaign info from first ad in the campaign
    const campaign = await db.collection('search_ads').findOne({
      campaign_id: campaign_id,
      account_id: session.user.accountId,
      status: { $ne: 'REMOVED' }
    })

    if (!campaign) {
      return NextResponse.json(
        { success: false, message: 'Campaign not found' },
        { status: 404 }
      )
    }

    const campaignData = {
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      account_id: campaign.account_id,
      account_name: campaign.account_name,
      status: 'ACTIVE',
      created_at: campaign.created_at
    }

    return NextResponse.json({
      success: true,
      data: campaignData
    })

  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

