import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting avatar upload process...')
    
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('User authenticated:', user.id)

    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      console.error('No file provided in the request')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('File received:', file.name, 'Size:', file.size, 'Type:', file.type)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type)
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size)
      return NextResponse.json(
        { error: 'File size exceeds 2MB limit' },
        { status: 400 }
      )
    }

    // Generate a unique file path
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/${Date.now()}.${fileExt}`
    
    console.log('Uploading to path:', filePath)
    
    // Upload the file to the user-avatar bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-avatar')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (uploadError) {
      console.error('Error uploading avatar to storage:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload avatar: ${uploadError.message}` },
        { status: 500 }
      )
    }
    
    console.log('File uploaded successfully:', uploadData)
    
    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('user-avatar')
      .getPublicUrl(filePath)
    
    const avatarUrl = urlData.publicUrl
    console.log('Generated public URL:', avatarUrl)
    
    // Update user metadata with new avatar URL
    const { data, error } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl }
    })
    
    if (error) {
      console.error('Error updating user metadata:', error)
      return NextResponse.json(
        { error: `Failed to update avatar metadata: ${error.message}` },
        { status: 500 }
      )
    }
    
    console.log('User metadata updated successfully')
    
    return NextResponse.json({ 
      success: true,
      avatarUrl: data.user.user_metadata.avatar_url 
    })
  } catch (error) {
    console.error('Unexpected error in avatar upload route:', error)
    return NextResponse.json(
      { error: 'Internal server error during avatar upload' },
      { status: 500 }
    )
  }
} 