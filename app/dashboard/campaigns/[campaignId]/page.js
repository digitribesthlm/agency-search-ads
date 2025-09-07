import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdGroups } from '../../../../lib/data'

export default async function CampaignDetailPage({ params }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  const { campaignId } = params
  const adGroups = await getAdGroups(campaignId, session.user.accountId)

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/campaigns" className="btn btn-ghost btn-sm">
          ← Back to Campaigns
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Campaign: {campaignId}</h1>
          <p className="text-sm text-base-content/70">
            Account: {session.user.accountId}
          </p>
        </div>
      </div>

      {adGroups.length === 0 ? (
        <div className="hero bg-base-100 rounded-lg shadow">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <h2 className="text-2xl font-bold">No Ad Groups Found</h2>
              <p className="py-6">
                No ad groups found for this campaign. Contact your administrator to set up ad groups.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adGroups.map((adGroup) => (
            <div key={adGroup.ad_group_id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">{adGroup.ad_group_name}</h2>
                <p className="text-sm text-base-content/70">
                  Ad Group ID: {adGroup.ad_group_id}
                </p>
                <div className="stats stats-horizontal shadow mt-4">
                  <div className="stat py-2">
                    <div className="stat-title text-xs">Total Ads</div>
                    <div className="stat-value text-lg">{adGroup.adCount}</div>
                  </div>
                </div>
                <div className="card-actions justify-end mt-4">
                  <Link 
                    href={`/dashboard/campaigns/${campaignId}/ad-groups/${adGroup.ad_group_id}`}
                    className="btn btn-primary btn-sm"
                  >
                    Manage Ads
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


