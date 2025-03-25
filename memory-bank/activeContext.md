# Vista Education Adviser - Active Context

## Current Development Status
- **Phase**: Authentication and Profile Management Implementation
- **Status**: Implementing user authentication with Supabase and profile management features
- **Current Architecture**: Next.js frontend with Next.js API routes for backend functionality (monorepo)
- **Database Solution**: Supabase for authentication and user data storage, OpenAI Vector Store for document storage
- **Implementation Approach**: Enhancing the Next.js starter app with authentication and profile management features

## Architectural Plan
- Using the openai-responses-starter-app as a foundation for both frontend and backend
- Utilizing Next.js API routes in a monorepo structure for backend functionality
- Using Supabase for authentication and relational data storage
- Using OpenAI Vector Store for document storage and retrieval
- Future plan includes potential migration to FastAPI microservices and PostgreSQL when scaling beyond PoC

## Current Project Structure vs. Target Structure
- Current structure is based on the openai-responses-starter-app with the following additions:
  - Supabase authentication integration
  - Enhanced profile management features
  - Document extraction functionality
  - Vector store integration for document storage
  - API routes for profile management and recommendations
- Target structure (post-PoC) would be a microservice architecture with:
  - Next.js frontend (deployed on Vercel)
  - FastAPI backend (deployed on Heroku)
  - PostgreSQL database (Heroku add-on)

## Key Technical Decisions
- **Authentication**: Decided to use Supabase for authentication with social OAuth integration
  - Implemented email/password authentication
  - Added support for Google and LinkedIn OAuth
  - Set up Row Level Security (RLS) policies for secure data access
- **Backend**: Decided to use Next.js API routes for the PoC instead of FastAPI microservices
  - Simplified deployment with single Vercel instance
  - Faster development with shared TypeScript types
  - Reduced infrastructure complexity
- **Database**: Decided to use Supabase for structured data and OpenAI Vector Store for document storage
  - Relational data stored in Supabase for better querying capabilities
  - Documents and unstructured data stored in Vector Store for AI operations
  - Applied appropriate database migrations for schema management

## Immediate Next Steps
1. Complete user authentication flow testing
2. Finalize profile management features
3. Implement LinkedIn data import functionality
4. Develop the rule-based recommendation engine
5. Design and implement the chatbot interface
6. Enhance vector store operations for improved data retrieval

## Implementation Priorities
1. Complete user authentication system
2. Finalize frontend user profile management
3. Implement document processing and data extraction
4. Enhance vector store operations for recommendations
5. Implement recommendation engine
6. Develop chatbot functionality

## Active Tasks
- Testing authentication flows with Supabase
- Improving profile wizard user experience
- Implementing LinkedIn OAuth integration
- Enhancing vector store operations for efficient data retrieval
- Designing comprehensive data model for user profiles, education programs, and recommendations

## Recent Decisions
- Implemented Supabase authentication with email/password and social OAuth
- Created database migrations for profile tables with proper RLS policies
- Implemented profile management API routes using Supabase
- Integrated OpenAI Vector Store for document storage
- Added support for uploading and managing user documents
- Implemented profile wizard with multi-step form for user onboarding

## Recent Implementation Progress
- Created Supabase database migrations for profile tables
- Implemented authentication flows with Supabase
- Developed API routes for profile management
- Created profile store using Zustand for state management
- Implemented profile wizard with multi-step form
- Added profile dashboard for viewing and editing profile information
- Integrated OpenAI Vector Store for document storage

## Data Model Implementation Status
- Created and implemented Supabase tables for user profiles:
  - `profiles`: Stores basic user information and references to complex data
  - Implemented proper RLS policies for data security
- Implemented TypeScript interfaces and Zod schemas for type safety
- Added support for JSON storage of complex data structures
- Integrated vector store for document storage with proper references

## Integration Points Status
- Supabase Authentication: Implemented
- Document Upload: Implemented
- Document Extraction: Implemented
- Vector Store Operations: Implemented
- LinkedIn OAuth: In progress
- Google OAuth: Implemented
- OpenAI API Integration: Implemented

## Known Challenges
- Managing Supabase RLS policies for secure data access
- Optimizing vector store operations for performance
- Implementing social login (OAuth) workflows
- Cost optimization for OpenAI API usage
- Rule-based recommendation system design
- Ensuring data privacy and GDPR compliance

## Current Resources
- Starter app repository with Next.js setup
- Vista roadmap documentation
- Supabase documentation and SDK
- OpenAI API documentation
- Vector store documentation
- OAuth provider documentation (Google, LinkedIn)

## Development Environment
- Windows development environment
- GitHub repository for version control
- Local development server with Supabase
- OpenAI account for Vector Store and API access

## Current Sprint Goals
- Complete authentication system implementation
- Finalize profile management feature set
- Implement document extraction and processing
- Develop preliminary recommendation engine proof-of-concept
- Implement LinkedIn OAuth integration
- Design chatbot interface
- Enhance vector store operations

## Timeline
- Project setup: Completed (March 16-17, 2025)
- File upload implementation: Completed (March 18, 2025)
- Profile management: Completed (March 19-26, 2025)
- Authentication implementation: Completed (March 20-25, 2025)
- Document extraction: Completed (March 19, 2025)
- Vector store integration: Completed (March 23-28, 2025)
- Recommendation engine: In progress (March 27-31, 2025)
- Chatbot integration: Planned (April 1-5, 2025)
- External integrations: Planned (April 6-12, 2025)
- Testing and refinement: Planned (April 13-19, 2025)
- Initial deployment: Planned (April 20, 2025)
