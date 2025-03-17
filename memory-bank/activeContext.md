# Vista Education Adviser - Active Context

## Current Development Status
- **Phase**: Initial project setup
- **Status**: Starting from the openai-responses-starter-app repository
- **Current Architecture**: Transitioning from the starter app to the planned FastAPI backend
- **Implementation Approach**: Adapting the Next.js frontend from the starter app while building a new FastAPI-based backend

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
1. Explore the current codebase structure from the starter app
2. Determine which components can be reused or adapted
3. Set up the FastAPI backend project structure as outlined in the roadmap
4. Plan and implement the user authentication system
   - Email/password authentication with secure password hashing
   - Google OAuth integration
   - LinkedIn OAuth integration
5. Design the user profile data model
   - Personal information
   - Educational background
   - Career goals and preferences
6. Implement the recommendation engine with initial rule-based logic
   - Create dataset of educational programs for matching
   - Develop filtering and ranking algorithms
   - Build recommendation API endpoints
7. Integrate the OpenAI API for the chatbot functionality
   - Implement conversation history tracking
   - Create prompt templates for education advising
   - Develop chat interface components

## Implementation Priorities
1. Backend API setup and authentication (FastAPI)
2. Database schema implementation (SQLAlchemy with PostgreSQL)
3. Frontend adaptation and API integration
4. External service integrations

## Active Tasks
- Creating memory-bank documentation
- Reviewing starter app architecture
- Planning feature implementation sequence
- Setting up the FastAPI backend structure
- Designing database schemas for user profiles and authentication
- Designing comprehensive data model for user profiles, education programs, and recommendations

## Recent Decisions
- Decision to use the openai-responses-starter-app as the foundation for the frontend
- Implementation of a separate FastAPI backend rather than using the starter app's API routes
- Implementation of memory-bank system for project context
- Selected FastAPI with SQLAlchemy for the backend over other alternatives
- Decided to use JWT-based authentication with social OAuth integration
- Chosen to implement file storage in cloud storage (AWS S3 or Firebase)
- Designed comprehensive data model with entities for users, profiles, education history, work experience, career goals, education preferences, programs, institutions, recommendations, and feedback

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
- LinkedIn OAuth: Planned, not implemented
- Google Custom Search: Planned, not implemented
- Document Upload System: Planned, not implemented
- OpenAI API Integration: Planned, not implemented

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
- Complete project setup and memory-bank documentation
- Understand and adapt the starter app architecture
- Implement initial user authentication
- Create preliminary recommendation engine proof-of-concept
- Develop profile data models and API endpoints

## Timeline
- Project setup: March 16-17, 2025
- Authentication implementation: March 18-22, 2025
- Profile management: March 23-26, 2025
- Recommendation engine: March 27-31, 2025
- Chatbot integration: April 1-5, 2025
- External integrations: April 6-12, 2025
- Testing and refinement: April 13-19, 2025
- Initial deployment: April 20, 2025
