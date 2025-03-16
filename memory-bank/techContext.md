# Vista Education Adviser - Technical Context

## Core Technology Stack

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Tailwind CSS
- **State Management**: React Context and/or Zustand
- **Form Handling**: React Hook Form + Zod validation
- **Deployment**: Vercel

### Backend (Planned)
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT + social OAuth
- **API Documentation**: Swagger/OpenAPI
- **Deployment**: Heroku

## Current Development Environment
- **Repository**: GitHub (cloned from openai-responses-starter-app)
- **Package Manager**: npm/yarn
- **Code Quality**: ESLint, TypeScript, Prettier
- **Environment Variables**: .env files (local) and deployment platform settings

## External Integrations
- **AI Provider**: OpenAI API
- **Social Authentication**: Google OAuth, LinkedIn OAuth
- **Search Integration**: Google Custom Search API
- **File Storage**: (TBD - local or cloud-based storage)

## Current Dependencies
Based on the starter app, packages include:
- Next.js
- React
- TypeScript
- Tailwind CSS
- OpenAI SDK/API clients

## Technical Constraints
- **Performance**: Keep initial page load times under 3 seconds
- **Accessibility**: Meet WCAG 2.1 AA standards
- **Responsiveness**: Support desktop, tablet, and mobile devices
- **API Limits**: 
  - OpenAI: Respect token limits and rate limits
  - Social APIs: Adhere to OAuth token lifetimes and scopes
- **Security**: OWASP Top 10 protection
- **Cost Management**: Stay within free/low-cost tiers of services

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- No support required for IE11 or earlier

## Development Workflow
- Feature branches
- Pull requests with code review
- TypeScript for type safety
- Automated testing (future implementation)

## Monitoring & Analytics
- Basic error logging
- User engagement tracking (future implementation)
- API performance monitoring
