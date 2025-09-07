import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '../../../lib/mongodb'

export async function POST(request) {
  try {
    const { name, email, password, role = 'client' } = await request.json()

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const { db } = await connectDB()

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = {
      name,
      email,
      password: hashedPassword,
      role,
      status: 'active',
      created_at: new Date(),
      last_login: null,
      'Account ID': '3729097555' // Default account for now
    }

    const result = await db.collection('users').insertOne(user)

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: { id: result.insertedId }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
