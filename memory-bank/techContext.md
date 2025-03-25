# Vista Education Adviser - Technical Context

## Core Technology Stack

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Tailwind CSS with Shadcn UI components
- **State Management**: Zustand for global state management
- **Form Handling**: React Hook Form + Zod validation
- **Deployment**: Vercel

### Backend
- **Framework**: Next.js API Routes (monorepo structure) 
- **Database**: Supabase (PostgreSQL) for structured data and OpenAI Vector Store for documents
- **Authentication**: Supabase Auth with social OAuth (Google, LinkedIn)
- **API Documentation**: Swagger/OpenAPI
- **Deployment**: Vercel (unified with frontend)

## Technology Adaptation Plan
The project is being built upon the openai-responses-starter-app. This involves:

1. **Current Phase**:
   - Using the Next.js frontend and API routes from the starter app
   - Integrating Supabase for authentication and structured data storage
   - Utilizing OpenAI Vector Store for document storage and AI operations
   - Maintaining a monorepo structure for simplified development

2. **Future Transition Phase**:
   - The plan is to eventually migrate to a FastAPI backend with microservices
   - Transition fully to PostgreSQL database with SQLAlchemy ORM
   - Maintain compatibility during this future transition

## Technology Selection Rationale

### Database Selection: Supabase + OpenAI Vector Store vs. PostgreSQL Only
- **Current Decision**: Using Supabase (PostgreSQL) for structured data and OpenAI Vector Store for documents
- **Rationale**:
  - Supabase provides a fully-managed PostgreSQL database with authentication features
  - OpenAI Vector Store offers native integration with AI models for recommendation and chatbot features
  - Combined approach leverages strengths of both systems
  - Supabase handles relational data with proper RLS policies
  - Vector Store optimizes document storage for AI operations
- **Future Plan**:
  - Migrate fully to PostgreSQL with SQLAlchemy when scaling beyond PoC

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
- **Decision**: Supabase-based authentication with social OAuth
- **Implementation**:
  - Email/password authentication with secure password hashing
  - Google OAuth integration (completed)
  - LinkedIn OAuth integration (in progress)
  - Row Level Security (RLS) policies for secure data access
- **Rationale**:
  - Supabase provides a comprehensive authentication solution
  - Social OAuth providers offer simplified onboarding
  - RLS policies ensure proper data security

## Deployment Strategy
- **Current (PoC) Deployment**: Unified deployment on Vercel
  - Frontend and API routes deployed together
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
- **Package Manager**: npm for dependency management
- **Code Quality**: ESLint, TypeScript, Prettier
- **Environment Variables**: .env files (local) and deployment platform settings
- **Database**: Supabase project with local connection

## External Integrations
- **AI Provider**: OpenAI API (with option to support Anthropic in future)
- **Social Authentication**: 
  - Google OAuth (implemented)
  - LinkedIn OAuth (in progress)
- **Search Integration**: Google Custom Search API (planned)
- **Data Storage**: 
  - Supabase for structured data
  - OpenAI Vector Store for document storage and retrieval

## Current Dependencies
Based on the implementation, packages include:
- Next.js 14+
- React 18+
- TypeScript 5+
- Tailwind CSS
- Shadcn UI components
- Zustand for state management
- React Hook Form + Zod for form handling
- Supabase SDK for authentication and database access
- OpenAI SDK for AI and vector store operations
- Framer Motion for animations

## Component Boundaries and Responsibilities

### Frontend Components
- Organized by feature domains (auth, profile, recommendations, chat)
- Handle user interface, form validation, and state management
- Communicate with backend via API routes
- Implement proper authentication flows and protected routes

### Backend Services (Next.js API Routes)
- Handle data persistence using Supabase and Vector Store
- Manage authentication and authorization with Supabase
- Process business logic for profiles and recommendations
- Interface with OpenAI for AI operations and vector store management
- Implement secure data access with proper validation

### Database Structure
- Supabase tables with proper RLS policies
- JSON storage for complex data structures
- Vector store for document storage and embeddings
- Clear separation between structured and unstructured data

## Technical Constraints
- **Performance**: Keep initial page load times under 3 seconds
- **Accessibility**: Meet WCAG 2.1 AA standards
- **Responsiveness**: Support desktop, tablet, and mobile devices
- **API Limits**: 
  - OpenAI: Respect token limits and rate limits
  - Supabase: Stay within free tier limits for development
  - Social APIs: Adhere to OAuth token lifetimes and scopes
- **Security**: 
  - Implement proper authentication flows
  - Secure data access with RLS policies
  - Follow OWASP security guidelines
- **Cost Management**: Stay within free/low-cost tiers of services
  - Vercel: Free tier
  - Supabase: Free plan during development
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
- User documents stored in OpenAI Vector Store
- Document metadata tracked in Supabase
- Documents secured with proper access controls
- Support for common document formats (PDF, DOCX, JPG, PNG)
