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

### Backend
- **Framework**: Next.js API Routes (monorepo structure) 
- **Database**: OpenAI Vector Store infrastructure
- **Authentication**: JWT + social OAuth (Google, LinkedIn)
- **API Documentation**: Swagger/OpenAPI
- **Deployment**: Vercel (unified with frontend)

## Technology Adaptation Plan
The project is being built upon the openai-responses-starter-app. This involves:

1. **Current Phase**:
   - Using the Next.js frontend and API routes from the starter app
   - Utilizing OpenAI Vector Store infrastructure for data storage
   - Maintaining a monorepo structure for simplified development

2. **Future Transition Phase**:
   - The plan is to eventually migrate to a FastAPI backend with microservices
   - Transition to PostgreSQL database with SQLAlchemy ORM (replacing OpenAI Vector Store)
   - Maintain compatibility during this future transition

## Technology Selection Rationale

### Database Selection: OpenAI Vector Store vs. PostgreSQL
- **Current Decision**: Using OpenAI Vector Store infrastructure
- **Rationale**:
  - Simplified development for the PoC phase
  - Native integration with OpenAI models for recommendation and chatbot features
  - Reduced infrastructure complexity for initial development
  - Faster development cycles with integrated vector search capabilities
- **Future Plan**:
  - Migrate to PostgreSQL with SQLAlchemy when scaling beyond PoC

### Backend Framework: Next.js API Routes vs. FastAPI
- **Current Decision**: Using Next.js API Routes in a monorepo structure
- **Rationale**:
  - Simplified deployment with a single Vercel instance
  - Faster development with shared types between frontend and API
  - Reduced complexity for the PoC phase
  - Leverages existing patterns from openai-responses-starter-app
- **Future Plan**:
  - Migrate to FastAPI microservices when scaling beyond PoC

### Authentication Strategy
- **Decision**: JWT-based authentication with social OAuth
- **Rationale**:
  - Stateless authentication well-suited for both current and future architecture
  - Social OAuth providers (Google, LinkedIn) offer simplified onboarding
  - JWT supports secure data exchange between frontend and backend

## Deployment Strategy
- **Current (PoC) Deployment**: Unified deployment on Vercel
  - Leveraging free tier for PoC
  - Global CDN for improved performance
  - Optimized for Next.js applications
  - Simplified deployment pipeline

- **Future Deployment**:
  - Frontend (Next.js): Deployed on Vercel
  - Backend (FastAPI): Deployed on Heroku
  - PostgreSQL as a Heroku add-on

## Current Development Environment
- **Repository**: GitHub (cloned from openai-responses-starter-app)
- **Package Manager**: npm/yarn for frontend and API routes
- **Code Quality**: ESLint, TypeScript, Prettier
- **Environment Variables**: .env files (local) and deployment platform settings

## External Integrations
- **AI Provider**: OpenAI API (with option to support Anthropic in future)
- **Social Authentication**: Google OAuth, LinkedIn OAuth
- **Search Integration**: Google Custom Search API
- **File Storage**: OpenAI Vector Store for document storage and retrieval

## Current Dependencies
Based on the starter app, packages include:
- Next.js
- React
- TypeScript
- Tailwind CSS
- OpenAI SDK/API clients
- Vector store clients

## Component Boundaries and Responsibilities

### Frontend Components
- Responsible for UI presentation and state management
- Handle form validations and user interactions
- Make API calls to backend services

### Backend Services (Next.js API Routes)
- Handle data persistence and business logic
- Process authentication and authorization
- Integrate with external services (OpenAI, LinkedIn, etc.)
- Implement recommendation algorithms
- Manage vector store operations

### Server-Side Rendering (SSR) Components
- Next.js pages that require SSR will:
  - Make API calls to local API routes when data is needed
  - Use appropriate authentication mechanisms for secure data access

## Technical Constraints
- **Performance**: Keep initial page load times under 3 seconds
- **Accessibility**: Meet WCAG 2.1 AA standards
- **Responsiveness**: Support desktop, tablet, and mobile devices
- **API Limits**: 
  - OpenAI: Respect token limits and rate limits
  - Social APIs: Adhere to OAuth token lifetimes and scopes
- **Security**: OWASP Top 10 protection
- **Cost Management**: Stay within free/low-cost tiers of services
  - Vercel: Free tier
  - OpenAI: Managed usage within budget constraints

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- No support required for IE11 or earlier

## Development Workflow
- Feature branches
- Pull requests with code review
- TypeScript for type safety
- Unit and integration testing

## Monitoring & Analytics
- Basic error logging
- User engagement tracking
- API performance monitoring

## Document Storage
- User documents will be stored in OpenAI Vector Store
- Documents will be secured with proper access controls
- Long-term plan includes adding document processing capabilities and migration to dedicated storage
