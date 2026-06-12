import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pvlaruqwbaxdpdndwfvh.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bGFydXF3YmF4ZHBkbmR3ZnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODQ3NzUsImV4cCI6MjA5Njc2MDc3NX0.jc4mg206OGW0kEMS_0OGvx9cbAkS-5UfKRfG8ob8tLc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)