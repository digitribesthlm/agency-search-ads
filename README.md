# Agency Search Ads Management

A specialized application for managing Google Ads Search campaigns, focusing on ad management (headlines and descriptions). The application handles Responsive Search Ads with up to 15 headlines and 4 descriptions per ad.

## Features

- **Authentication**: Secure login with NextAuth and MongoDB
- **Campaign Management**: View and manage search campaigns
- **Ad Group Management**: Navigate through ad groups within campaigns
- **Ad Editing**: Edit headlines and descriptions with real-time character counting
- **Change Tracking**: Complete audit trail of all modifications
- **Role-Based Access**: Support for client and admin roles
- **Responsive Design**: Mobile-first design with DaisyUI components

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + DaisyUI
- **Authentication**: NextAuth.js
- **Database**: MongoDB
- **Language**: JavaScript (ES6+)

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd agency-search-ads
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/agency-search-ads
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

4. Create test data:
```bash
node scripts/create-test-data.js
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Test Users

The script creates two test users:
- **Admin**: admin@example.com (password: password123)
- **Client**: client@example.com (password: password123)

## Database Structure

### Collections

#### `users`
- User authentication and profile data
- Role-based access control (client/admin)
- Account association

#### `search_ads`
- Responsive Search Ads data
- Headlines (up to 15, max 30 chars each)
- Descriptions (up to 4, max 90 chars each)
- Status management (ACTIVE/PAUSED/REMOVED)

#### `search_ad_changes`
- Complete audit trail of all modifications
- Before/after values for all changes
- User and timestamp tracking

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Search Ads Management
- `GET /api/search-ads` - List ads with filtering
- `GET /api/search-ads/[adId]` - Get specific ad
- `PUT /api/search-ads/[adId]` - Update ad content
- `DELETE /api/search-ads/[adId]` - Mark ad as removed
- `PATCH /api/search-ads/[adId]/status` - Change ad status

### Campaign/Ad Group Management
- `GET /api/search-campaigns` - List campaigns
- `GET /api/search-campaigns/[campaignId]/ad-groups` - List ad groups

### Change Tracking
- `GET /api/search-changes` - List recent changes

## Usage

### Managing Ads

1. **Navigate to Campaigns**: Start from the dashboard to view all campaigns
2. **Select Ad Group**: Click on a campaign to see its ad groups
3. **Edit Ads**: Click on an ad group to manage individual ads
4. **Edit Content**: Click "Edit" on any ad to modify headlines and descriptions
5. **Save Changes**: All changes are automatically tracked and logged

### Validation Rules

- **Headlines**: 1-15 headlines, max 30 characters each, no duplicates
- **Descriptions**: 1-4 descriptions, max 90 characters each, no duplicates
- **Real-time validation**: Character counters and duplicate detection

### Change Tracking

All modifications are automatically logged with:
- Action type (ADD/EDIT/REMOVE)
- Field changed
- Before/after values
- User and timestamp
- Google Ads sync status

## Development

### Project Structure

```
app/
├── api/                 # API routes
├── auth/               # Authentication pages
├── dashboard/          # Main application pages
└── globals.css         # Global styles

components/
└── DashboardNav.js     # Navigation component
└── AdCard.js          # Ad editing component

lib/
├── auth.js            # NextAuth configuration
├── data.js            # Database operations
└── mongodb.js         # MongoDB connection

scripts/
└── create-test-data.js # Test data creation
```

### Key Features

- **Real-time Character Counting**: Visual feedback for headline/description limits
- **Inline Editing**: Edit ads directly in the interface
- **Status Management**: Pause/resume/remove ads with confirmation
- **Change History**: Complete audit trail for administrators
- **Responsive Design**: Works on all device sizes

## Security

- All API routes require authentication
- User permissions validated for all operations
- Input sanitization and validation
- No hardcoded credentials or bypasses
- Role-based access control

## Contributing

1. Follow the coding standards in `.cursorrules`
2. Use JavaScript (not TypeScript)
3. Implement proper error handling
4. Add validation for all inputs
5. Test all functionality thoroughly

## License

Private - All rights reserved




