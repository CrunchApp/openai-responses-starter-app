import { NextRequest, NextResponse } from 'next/server';

// LinkedIn API endpoint for fetching profile data
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2/me';
const LINKEDIN_EMAIL_API_URL = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))';
const LINKEDIN_EDUCATION_API_URL = 'https://api.linkedin.com/v2/educations?q=members&projection=(elements*(schoolName,degree,fieldOfStudy,startDate,endDate))';
const LINKEDIN_POSITIONS_API_URL = 'https://api.linkedin.com/v2/positions?q=members&projection=(elements*(title,company,startDate,endDate,industry))';
const LINKEDIN_SKILLS_API_URL = 'https://api.linkedin.com/v2/skills?q=members&projection=(elements*(name))';

export async function GET(request: NextRequest) {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 }
      );
    }
    
    // Extract the token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Make parallel requests to LinkedIn APIs
    const [profileResponse, emailResponse, educationResponse, positionsResponse, skillsResponse] = await Promise.all([
      fetch(LINKEDIN_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }),
      fetch(LINKEDIN_EMAIL_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }),
      fetch(LINKEDIN_EDUCATION_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }),
      fetch(LINKEDIN_POSITIONS_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }),
      fetch(LINKEDIN_SKILLS_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }),
    ]);
    
    // Check if all responses were successful
    if (!profileResponse.ok) {
      console.error('LinkedIn profile API error:', await profileResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch LinkedIn profile data' },
        { status: 500 }
      );
    }
    
    // Parse the response data
    const profileData = await profileResponse.json();
    let emailData = null;
    let educationData = null;
    let positionsData = null;
    let skillsData = null;
    
    if (emailResponse.ok) {
      emailData = await emailResponse.json();
    }
    
    if (educationResponse.ok) {
      educationData = await educationResponse.json();
    }
    
    if (positionsResponse.ok) {
      positionsData = await positionsResponse.json();
    }
    
    if (skillsResponse.ok) {
      skillsData = await skillsResponse.json();
    }
    
    // Extract and combine the data
    const combinedData = {
      firstName: profileData.localizedFirstName,
      lastName: profileData.localizedLastName,
      profileUrl: `https://www.linkedin.com/in/${profileData.id}`,
      email: emailData?.elements?.[0]?.['handle~']?.emailAddress,
      education: educationData?.elements || [],
      positions: positionsData?.elements || [],
      skills: skillsData?.elements || [],
    };
    
    // Return the combined data
    return NextResponse.json(combinedData);
  } catch (error) {
    console.error('Error in LinkedIn profile API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 