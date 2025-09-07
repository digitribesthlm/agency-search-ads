import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { connectDB } from '../../../../lib/mongodb'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('Auth attempt for:', credentials.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials')
          return null
        }

        try {
          const { db } = await connectDB()
          console.log('Connected to database')
          
          const user = await db.collection('users').findOne({ 
            email: credentials.email,
            status: 'active'
          })

          if (!user) {
            console.log('User not found:', credentials.email)
            return null
          }

          console.log('User found:', user.email)

          // Check if password is plain text (not bcrypt hashed)
          const isPasswordValid = user.password === credentials.password

          if (!isPasswordValid) {
            console.log('Invalid password for:', credentials.email)
            return null
          }

          console.log('Login successful for:', credentials.email)

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            accountId: user['Account ID']
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.accountId = user.accountId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.accountId = token.accountId
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-key'
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
