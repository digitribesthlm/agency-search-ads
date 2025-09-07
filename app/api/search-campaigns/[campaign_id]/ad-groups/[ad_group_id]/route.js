import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../auth/[...nextauth]/route'
import { connectDB } from '../../../../../../lib/mongodb'

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { campaign_id, ad_group_id } = params

    const { db } = await connectDB()

    // Get ad group info from first ad in the ad group
    const adGroup = await db.collection('search_ads').findOne({
      campaign_id: campaign_id,
      ad_group_id: ad_group_id,
      account_id: session.user.accountId,
      status: { $ne: 'REMOVED' }
    })

    if (!adGroup) {
      return NextResponse.json(
        { success: false, message: 'Ad group not found' },
        { status: 404 }
      )
    }

    const adGroupData = {
      ad_group_id: adGroup.ad_group_id,
      ad_group_name: adGroup.ad_group_name,
      campaign_id: adGroup.campaign_id,
      campaign_name: adGroup.campaign_name,
      status: 'ACTIVE',
      created_at: adGroup.created_at
    }

    return NextResponse.json({
      success: true,
      data: adGroupData
    })

  } catch (error) {
    console.error('Error fetching ad group:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
