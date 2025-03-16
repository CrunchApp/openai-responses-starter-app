# Vista Education Adviser - System Patterns

## Architectural Overview
Vista is organized as a full-stack application with distinct frontend and backend components:

- **Frontend**: Next.js with TypeScript, deployed on Vercel
- **Backend**: FastAPI (Python), deployed on Heroku with PostgreSQL

## Starter App Integration Strategy
The openai-responses-starter-app serves as the foundation for our frontend implementation with specific adaptations:

- **Retained Elements**: 
  - Next.js framework structure
  - React component organization
  - Styling infrastructure (Tailwind CSS)
  - OpenAI API integration patterns

- **Modified/Replaced Elements**:
  - Backend API routes will be replaced with calls to our FastAPI service
  - Authentication system will be enhanced with social OAuth options
  - Data models will be expanded to support our specific requirements

## Technology Decisions
- **Backend Framework**: FastAPI (Python) was selected over alternatives for:
  - Strong typing support via Pydantic
  - Superior performance with async capabilities
  - Built-in OpenAPI documentation
  - Integration with SQLAlchemy for ORM

- **Database ORM**: SQLAlchemy with Alembic was chosen over Drizzle because:
  - Better integration with Python FastAPI backend
  - Mature migration management via Alembic
  - Strong ecosystem and community support
  - Proven performance at scale

## Key Design Patterns

### 1. Modular Component Architecture (Frontend)
- Use reusable UI components organized by feature domains
- Maintain clear separation between presentation and business logic
- Follow atomic design principles (atoms, molecules, organisms, templates, pages)

### 2. API-First Design (Backend)
- Develop RESTful APIs with clear contracts defined by Pydantic schemas
- Implement proper status codes and error handling
- Use versioning for future API evolution

### 3. Service-Oriented Architecture
- Organize backend services by domain functionality:
  - Authentication Service
  - Profile Management Service
  - Recommendation Engine Service
  - Chatbot Service
  - File Upload Service
- Each service maintains its own data models and business logic

### 4. Repository Pattern (Data Access)
- Encapsulate data access logic in dedicated repository functions
- Provide a consistent API for data operations
- Allow for swapping out data sources with minimal impact

### 5. Rule-Based Recommendation Engine
- Implement a multi-stage filtering process:
  - Stage 1: Basic filtering (e.g., country, field of study, program type)
  - Stage 2: Advanced matching (e.g., budget range, duration, prerequisites)
  - Stage 3: Ranking (e.g., match quality score based on weighted factors)
- Structure data models to support:
  - Program details (name, institution, location, duration, cost, etc.)
  - Matching rules with configurable weights
  - User preferences from profile data
- Log recommendation results with user feedback for future AI enhancement
- Implement simple caching to improve performance for similar queries

### 6. AI Integration Pattern
- Utilize API-based integration with OpenAI
- Maintain conversation context for improved responses
- Implement appropriate content filtering and safety measures
- Structure prompts with:
  - System instructions for counselor-like behavior
  - User profile context for personalized responses
  - Conversation history for continuity
  - Current user query

### 7. Authentication & Authorization
- Use JWT for authentication between client and server
- Implement proper OAuth flows for Google and LinkedIn logins
- Store hashed passwords for email/password authentication
- Maintain clear role-based permissions

## External Service Integration Patterns

### 1. LinkedIn Integration
- **Authentication Flow**: 
  - OAuth 2.0 authorization code flow
  - Store refresh tokens securely for long-term access
- **Data Import**:
  - Profile data (education, work experience)
  - Skills and endorsements (optional)
- **Implementation Approach**:
  - Backend API handles OAuth token exchange
  - Data mapping from LinkedIn format to internal schema
  - User approval step for data import

### 2. Google Custom Search Integration
- **Authentication**:
  - API key-based authentication
  - Server-side requests only (no client exposure)
- **Implementation**:
  - Backend service wrapper for Custom Search API
  - Caching for common/recent searches
  - Rate-limiting to control costs

### 3. Document Storage Integration
- **Service Selection**: AWS S3 (primary) or Firebase Storage (alternative)
- **Implementation Pattern**:
  - Generate pre-signed URLs for direct browser upload
  - Store metadata in database, file content in cloud storage
  - Implement access control via signed URLs with expiration
- **Supported Formats**: PDF, DOCX, JPG, PNG (with size limits)

## System Relationships
- **User → Profile**: One-to-one relationship
- **Profile → Recommendations**: One-to-many relationship
- **User → Conversations**: One-to-many relationship
- **Conversation → Messages**: One-to-many relationship
- **User → Documents**: One-to-many relationship

## Application State Management
- Use appropriate state management based on complexity:
  - For simple state: React Context or hooks
  - For complex state: Zustand for lightweight state management

## SSR Components and API Interactions
- Server-side rendered components will:
  - Make direct database queries when running on the server
  - Call API endpoints when running on the client
- Implementation approach:
  - Use Next.js getServerSideProps for consistent data fetching
  - Conditional logic based on execution context

## Cross-Cutting Concerns
- **Logging**: Consistent approach across all modules
- **Error Handling**: Centralized error processing and user-friendly responses
- **Security**: Input validation, CSRF protection, secure headers
- **Performance**: Optimization through caching strategies and lazy loading

## Document Storage Strategy
- Store document metadata in PostgreSQL (filename, type, upload date)
- Store actual files in cloud storage (AWS S3 or Firebase Storage)
- Implement secure access controls for document retrieval
- Support common document formats (PDF, DOCX, JPG, PNG)

## Testing Strategy
- **Frontend**: 
  - Unit tests with Jest
  - Component tests with React Testing Library
  - E2E tests with Cypress (for critical flows)
- **Backend**:
  - Unit tests with pytest
  - Integration tests for API endpoints
  - Mock external services (OpenAI, OAuth) for testing

## Rule Hierarchy and Conflict Resolution
When conflicts arise between rule files or documentation:
1. Implementation-specific details in memory-bank files take precedence over general guidelines
2. Technology-specific rules in API/frontend/DB files override general roadmap statements
3. Newer decisions documented in activeContext.md supersede older decisions
4. When in doubt, optimize for user experience and maintainability
