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
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy with Alembic for migrations
- **Authentication**: JWT + social OAuth (Google, LinkedIn)
- **API Documentation**: Swagger/OpenAPI
- **Deployment**: Heroku

## Technology Adaptation Plan
The project is being built upon the openai-responses-starter-app while transitioning to the target architecture. This involves:

1. **Initial Phase** (Current):
   - Use and analyze the starter app's Next.js frontend structure
   - Begin setting up a separate FastAPI backend
   - Maintain compatibility with both systems during transition

2. **Transition Phase**:
   - Gradually migrate API functionality from Next.js API routes to FastAPI endpoints
   - Implement FastAPI backend with SQLAlchemy ORM (replacing any Drizzle usage)
   - Create database schemas using SQLAlchemy models
   - Maintain frontend using Next.js from the starter app

3. **Final Phase**:
   - Complete separation of frontend (Next.js) and backend (FastAPI)
   - Deploy frontend on Vercel and backend on Heroku
   - Implement all integrations using the microservice architecture

## Technology Selection Rationale

### ORM Selection: SQLAlchemy vs. Drizzle
- **Decision**: Using SQLAlchemy with PostgreSQL instead of Drizzle
- **Rationale**:
  - Better integration with Python FastAPI backend
  - More mature ecosystem for Python backend development
  - Alembic provides robust migration capabilities
  - Better documentation and community support in Python ecosystem

### Backend Framework: FastAPI
- **Decision**: Using FastAPI instead of any Node.js based framework
- **Rationale**:
  - Strong typing system via Pydantic
  - Built-in OpenAPI documentation generation
  - Excellent performance with asynchronous capabilities
  - Better ecosystem for ML/AI integration (relevant for future recommendation engine)

### Authentication Strategy
- **Decision**: JWT-based authentication with social OAuth
- **Rationale**:
  - Stateless authentication well-suited for microservice architecture
  - Social OAuth providers (Google, LinkedIn) offer simplified onboarding
  - JWT supports secure data exchange between separated frontend and backend

## Deployment Strategy
- **Frontend (Next.js)**: Deployed on Vercel
  - Leveraging free tier for PoC
  - Global CDN for improved performance
  - Optimized for Next.js applications
  - Simplified deployment pipeline

- **Backend (FastAPI)**: Deployed on Heroku
  - Using free dynos initially
  - PostgreSQL as a Heroku add-on
  - Easy scalability if needed
  - Simple deployment from GitHub

## Current Development Environment
- **Repository**: GitHub (cloned from openai-responses-starter-app)
- **Package Manager**: npm/yarn for frontend, pip for backend
- **Code Quality**: ESLint, TypeScript, Prettier for frontend; pylint, black for backend
- **Environment Variables**: .env files (local) and deployment platform settings

## External Integrations
- **AI Provider**: OpenAI API (with option to support Anthropic in future)
- **Social Authentication**: Google OAuth, LinkedIn OAuth
- **Search Integration**: Google Custom Search API
- **File Storage**: Cloud-based storage (specific provider TBD - likely AWS S3 or Firebase Storage)

## Current Dependencies
Based on the starter app, frontend packages include:
- Next.js
- React
- TypeScript
- Tailwind CSS
- OpenAI SDK/API clients

Backend dependencies will include:
- FastAPI
- SQLAlchemy
- Alembic (for migrations)
- Pydantic
- python-jose (for JWT)
- passlib (for password hashing)
- python-multipart (for file uploads)

## Component Boundaries and Responsibilities

### Frontend Components
- Responsible for UI presentation and state management
- Handle form validations and user interactions
- Make API calls to backend services

### Backend Services
- Handle data persistence and business logic
- Process authentication and authorization
- Integrate with external services (OpenAI, LinkedIn, etc.)
- Implement recommendation algorithms

### Server-Side Rendering (SSR) Components
- Next.js pages that require SSR will:
  - Make API calls to the FastAPI backend when data is needed
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
  - Heroku: Free dyno (with sleep limitations)
  - Vercel: Free tier
  - PostgreSQL: Heroku PostgreSQL free tier (10K rows limit)

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- No support required for IE11 or earlier

## Development Workflow
- Feature branches
- Pull requests with code review
- TypeScript for type safety on frontend
- Python type hints for backend
- Unit and integration testing

## Monitoring & Analytics
- Basic error logging
- User engagement tracking
- API performance monitoring

## Document Storage
- Initially, user documents will be stored in cloud storage (AWS S3 or Firebase Storage)
- Documents will be secured with proper access controls
- Long-term plan includes adding document processing capabilities
