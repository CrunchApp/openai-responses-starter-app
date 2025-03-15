# Auth0 LinkedIn Integration Setup

This document outlines the steps required to set up the LinkedIn OAuth integration for the Vista Education Adviser using Auth0.

## Prerequisites

- An Auth0 account
- A LinkedIn Developer account

## Setup Steps

### 1. Create a LinkedIn App

1. Go to the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click "Create App"
3. Fill in the required information:
   - App name (e.g., "Vista Education Adviser")
   - LinkedIn Page (your company page or personal profile)
   - App logo
   - Business email
4. Click "Create App"
5. Navigate to the "Auth" tab
6. Add the Auth0 callback URL: `https://{YOUR_AUTH0_DOMAIN}/login/callback`
7. Request the following OAuth 2.0 scopes:
   - `r_emailaddress`
   - `r_liteprofile`
   - `r_basicprofile`
8. Save your changes
9. Make note of your Client ID and Client Secret

### 2. Configure Auth0

1. Log in to your [Auth0 Dashboard](https://manage.auth0.com/)
2. Go to "Applications" > "Applications" and create a new application or use an existing one
3. Select "Regular Web Application" if creating a new application
4. In the settings tab:
   - Add your application URLs:
     - Allowed Callback URLs: `http://localhost:3000, https://your-production-domain.com`
     - Allowed Logout URLs: `http://localhost:3000, https://your-production-domain.com`
     - Allowed Web Origins: `http://localhost:3000, https://your-production-domain.com`
5. Save your changes
6. Go to "Social Connections" (under "Authentication")
7. Find and click on LinkedIn
8. Configure the connection:
   - Set the "Client ID" to your LinkedIn app's client ID
   - Set the "Client Secret" to your LinkedIn app's client secret
   - Under "Permissions", enable the same scopes you requested in LinkedIn:
     - `r_emailaddress`
     - `r_liteprofile`
     - `r_basicprofile`
9. Save your changes and enable the connection
10. Make sure the connection is enabled for your application

### 3. Configure Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```env
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.linkedin.com/
```

Replace the placeholder values with your actual Auth0 domain and client ID.

## Testing the Integration

1. Run your application in development mode: `npm run dev`
2. Navigate to the profile setup page
3. Click "Import from LinkedIn"
4. You should be redirected to the Auth0 login screen, which will offer LinkedIn as a login option
5. After authenticating with LinkedIn, your profile data should be imported into the profile form

## Troubleshooting

- If you encounter CORS errors, make sure your Auth0 application has the correct Allowed Web Origins
- If authentication succeeds but profile data isn't imported, check the browser console for API errors and verify that the LinkedIn API endpoints are correct
- Ensure that your Auth0 application has the required LinkedIn scopes enabled
- Verify that your environment variables are correctly set

## Additional Resources

- [Auth0 Social Connections: LinkedIn](https://auth0.com/docs/connections/social/linkedin)
- [LinkedIn OAuth 2.0 Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [Auth0 React SDK Documentation](https://auth0.com/docs/quickstart/spa/react) 