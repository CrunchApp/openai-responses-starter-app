# Vista Education Adviser - Active Context

## Current Development Status
- **Phase**: Profile Management Implementation
- **Status**: Building user profile features on the openai-responses-starter-app
- **Current Architecture**: Next.js frontend with Next.js API routes for backend functionality (monorepo)
- **Database Solution**: Supabase and the OpenAI Vector Store infrastructure for data storage
- **Implementation Approach**: Enhancing the Next.js starter app with profile management features

## Architectural Plan
- Using the openai-responses-starter-app as a foundation for both frontend and backend
- Utilizing Next.js API routes in a monorepo structure for backend functionality
- Using OpenAI Vector Store infrastructure for data storage and retrieval
- Future plan includes potential migration to FastAPI microservices and PostgreSQL when scaling beyond PoC

## Current Project Structure vs. Target Structure
- Current structure is based on the openai-responses-starter-app with the following additions:
  - Enhanced profile management features
  - Document extraction functionality
  - Supabase and Vector store integration for data storage
  - Extended API routes for recommendations
- Future/target structure (post-PoC) would be a microservice architecture with:
  - Next.js frontend (deployed on Vercel)
  - FastAPI backend (deployed on Heroku)
  - PostgreSQL database (Heroku add-on)

## Key Technical Decisions
- **Backend**: Decided to use Next.js API routes for the PoC instead of FastAPI microservices
  - Simplified deployment with single Vercel instance
  - Faster development with shared TypeScript types
  - Reduced infrastructure complexity
- **Database**: Decided to use Supabase and OpenAI Vector Store instead of PostgreSQL
  - Native integration with OpenAI features
  - Simplified vector search capabilities for recommendations
  - Reduced infrastructure requirements
  - Less setup overhead for the PoC phase

## Immediate Next Steps
1. Complete document extraction feature testing
2. Implement LinkedIn data import functionality
3. Develop the rule-based recommendation engine
4. Design and implement the chatbot interface
5. Enhance vector store operations for improved data retrieval
6. Plan and implement the user authentication system
   - Email/password authentication with secure password hashing
   - Google OAuth integration
   - LinkedIn OAuth integration

## Implementation Priorities
1. Complete frontend user profile management
2. Implement document processing and data extraction
3. Enhance vector store operations for recommendations
4. Implement authentication with social OAuth providers
5. External service integrations

## Active Tasks
- Testing document extraction functionality
- Improving profile wizard user experience
- Planning LinkedIn OAuth integration
- Enhancing vector store operations for efficient data retrieval
- Designing comprehensive data model for user profiles, education programs, and recommendations

## Recent Decisions
- Decided to use Next.js API routes for backend functionality instead of FastAPI
- Decided to use OpenAI Vector Store for data storage instead of PostgreSQL
- Implemented document extraction feature using OpenAI API
- Added profile wizard navigation enhancements for better UX
- Added degree level type to profile data schema
- Implemented file upload and document processing with progress tracking
- Decision to use the openai-responses-starter-app as the foundation for the entire application
- Implementation of memory-bank system for project context
- Decided to use Supabase-based authentication with social OAuth integration
- Designed comprehensive data model with entities for users, profiles, education history, work experience, career goals, education preferences, programs, institutions, recommendations, and feedback

## Recent Implementation Progress
- Created document extraction API endpoint (/api/profile/extract-from-documents)
- Implemented file upload component and document processing
- Enhanced profile wizard with improved navigation and tooltips
- Added extraction animation and progress tracking for better user feedback
- Added error handling for document processing
- Integrated vector store operations for data storage and retrieval

## Data Model Implementation Status
- Detailed data model created with 13 key entities:
  - Users: Authentication and basic user information
  - Profiles: Personal user information
  - Education: User's education history
  - WorkExperience: User's work history
  - CareerGoal: User's career objectives
  - EducationPreference: User's education preferences for recommendations
  - Program: Educational programs to recommend
  - Institution: Educational institutions offering programs
  - Recommendation: Links users to recommended programs with match scores
  - RecommendationFeedback: Stores user feedback on recommendations
  - Document: User-uploaded documents
  - Conversation: Chat conversations with the AI assistant
  - Message: Individual messages within conversations
- Defined relationships between entities, with important one-to-many relationships
- Prepared data structures with appropriate metadata for vector store implementation
- Added support for recommendation feedback to improve future matching
- Included verification tracking for education and work experience data

## Integration Points Status
- Document Upload: Implemented
- Document Extraction: Implemented
- Vector Store Operations: Partially implemented
- LinkedIn OAuth: Planned, not implemented
- Google Custom Search: Planned, not implemented
- OpenAI API Integration: Partially implemented (for document extraction)

## Known Challenges
- Vector store implementation for complex data relationships
- Managing vector store operations efficiently within API routes
- Implementation of social login (OAuth) workflows
- Cost optimization for OpenAI API usage
- Rule-based recommendation system design
- Ensuring data privacy and GDPR compliance

## Current Resources
- Starter app repository with Next.js setup
- Vista roadmap documentation
- OpenAI API documentation
- Vector store documentation
- OAuth provider documentation (Google, LinkedIn)

## Development Environment
- Windows development environment
- GitHub repository for version control
- Local development server
- Vector store for data storage

## Current Sprint Goals
- Complete profile management feature set
- Implement document extraction and processing
- Develop preliminary recommendation engine proof-of-concept
- Plan LinkedIn OAuth integration
- Design chatbot interface
- Enhance vector store operations

## Timeline
- Project setup: Completed (March 16-17, 2025)
- File upload implementation: Completed (March 18, 2025)
- Profile management: In progress (March 19-26, 2025)
- Document extraction: Completed (March 19, 2025)
- Vector store integration: In progress (March 23-28, 2025)
- Recommendation engine: Planned (March 27-31, 2025)
- Chatbot integration: Planned (April 1-5, 2025)
- External integrations: Planned (April 6-12, 2025)
- Testing and refinement: Planned (April 13-19, 2025)
- Initial deployment: Planned (April 20, 2025)
