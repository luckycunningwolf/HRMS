// This should be deployed as a serverless function (Vercel, Netlify, etc.)
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key (keep secret!)
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password, role, name, department } = req.body

  try {
    // Verify the admin user (you should implement proper admin verification)
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Create user with admin API
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        role: role,
        name: name,
        onboarding_completed: false
      }
    })

    if (createError) {
      return res.status(400).json({ error: createError.message })
    }

    // Create employee record
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert([{
        id: user.user.id,
        name: name,
        email: email,
        department: department,
        role: role,
        is_active: true,
        onboarding_completed: false,
        created_at: new Date().toISOString()
      }])

    if (employeeError) {
      console.error('Error creating employee record:', employeeError)
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert([{
        id: user.user.id,
        employee_id: user.user.id,
        role: role
      }])

    if (profileError) {
      console.error('Error creating user profile:', profileError)
    }

    res.status(200).json({ 
      message: 'User created successfully',
      user: {
        id: user.user.id,
        email: user.user.email,
        role: role
      }
    })

  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
