# Vista Education Adviser - Active Context

## Current Development Status
- **Phase**: Profile Management Implementation
- **Status**: Building user profile features on the openai-responses-starter-app
- **Current Architecture**: Next.js frontend with API routes for backend functionality
- **Implementation Approach**: Enhancing the Next.js starter app with profile management features

## Architectural Transition Plan
- Using the openai-responses-starter-app as a foundation for the Next.js frontend
- Building a separate FastAPI backend service to implement the microservice architecture
- The starter app's API routes will be gradually replaced with calls to the FastAPI backend

## Current Project Structure vs. Target Structure
- Current structure is based on the openai-responses-starter-app
- Target structure is a microservice architecture with:
  - Next.js frontend (deployed on Vercel)
  - FastAPI backend (deployed on Heroku)
  - PostgreSQL database (Heroku add-on)

## Immediate Next Steps
1. Complete document extraction feature testing
2. Implement LinkedIn data import functionality
3. Develop the rule-based recommendation engine
4. Design and implement the chatbot interface
5. Set up the FastAPI backend project structure as outlined in the roadmap
6. Plan and implement the user authentication system
   - Email/password authentication with secure password hashing
   - Google OAuth integration
   - LinkedIn OAuth integration

## Implementation Priorities
1. Complete frontend user profile management
2. Implement document processing and data extraction
3. Backend API setup and authentication (FastAPI)
4. Database schema implementation (SQLAlchemy with PostgreSQL)
5. External service integrations

## Active Tasks
- Testing document extraction functionality
- Improving profile wizard user experience
- Planning LinkedIn OAuth integration
- Designing database schemas for user profiles and authentication
- Designing comprehensive data model for user profiles, education programs, and recommendations

## Recent Decisions
- Implemented document extraction feature using OpenAI API
- Added profile wizard navigation enhancements for better UX
- Added degree level type to profile data schema
- Implemented file upload and document processing with progress tracking
- Decision to use the openai-responses-starter-app as the foundation for the frontend
- Implementation of a separate FastAPI backend rather than using the starter app's API routes
- Implementation of memory-bank system for project context
- Selected FastAPI with SQLAlchemy for the backend over other alternatives
- Decided to use JWT-based authentication with social OAuth integration
- Chosen to implement file storage in cloud storage (AWS S3 or Firebase)
- Designed comprehensive data model with entities for users, profiles, education history, work experience, career goals, education preferences, programs, institutions, recommendations, and feedback

## Recent Implementation Progress
- Created document extraction API endpoint (/api/profile/extract-from-documents)
- Implemented file upload component and document processing
- Enhanced profile wizard with improved navigation and tooltips
- Added extraction animation and progress tracking for better user feedback
- Added error handling for document processing

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
- Prepared schema with appropriate data types for PostgreSQL implementation
- Added support for recommendation feedback to improve future matching
- Included verification tracking for education and work experience data

## Integration Points Status
- Document Upload: Implemented
- Document Extraction: Implemented
- LinkedIn OAuth: Planned, not implemented
- Google Custom Search: Planned, not implemented
- OpenAI API Integration: Partially implemented (for document extraction)

## Known Challenges
- Integration between Next.js frontend and FastAPI backend
- Implementation of social login (OAuth) workflows
- Cost optimization for OpenAI API usage
- Rule-based recommendation system design
- Ensuring data privacy and GDPR compliance

## Current Resources
- Starter app repository with Next.js setup
- Vista roadmap documentation
- OpenAI API documentation
- FastAPI documentation
- SQLAlchemy documentation
- OAuth provider documentation (Google, LinkedIn)

## Development Environment
- Windows development environment
- GitHub repository for version control
- Local development server
- PostgreSQL database (local for development)

## Current Sprint Goals
- Complete profile management feature set
- Implement document extraction and processing
- Develop preliminary recommendation engine proof-of-concept
- Plan LinkedIn OAuth integration
- Design chatbot interface

## Timeline
- Project setup: Completed (March 16-17, 2025)
- File upload implementation: Completed (March 18, 2025)
- Profile management: In progress (March 19-26, 2025)
- Document extraction: Completed (March 19, 2025)
- Recommendation engine: Planned (March 27-31, 2025)
- Chatbot integration: Planned (April 1-5, 2025)
- External integrations: Planned (April 6-12, 2025)
- Testing and refinement: Planned (April 13-19, 2025)
- Initial deployment: Planned (April 20, 2025)
