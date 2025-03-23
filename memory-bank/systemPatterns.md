# Vista Education Adviser - System Patterns

## Architectural Overview
Vista is organized as a full-stack application:

- **Frontend**: Next.js with TypeScript, deployed on Vercel
- **Backend**: Next.js API Routes (same monorepo), deployed on Vercel
- **Database**: OpenAI Vector Store infrastructure

## Starter App Integration Strategy
The openai-responses-starter-app serves as the foundation for our implementation:

- **Retained Elements**: 
  - Next.js framework structure
  - React component organization
  - Styling infrastructure (Tailwind CSS)
  - OpenAI API integration patterns
  - Next.js API routes for backend functionality
  - Vector store implementation for data storage

- **Modified/Enhanced Elements**:
  - Authentication system enhanced with social OAuth options
  - Data models expanded to support our specific requirements
  - Additional API routes for recommendation and profile management

## Technology Decisions
- **Backend Framework**: Next.js API Routes was selected for the PoC over FastAPI because:
  - Simplified deployment with unified Vercel hosting
  - Faster development with TypeScript across frontend and backend
  - Reduced infrastructure complexity for the PoC phase
  - Future migration path to FastAPI microservices for scaling

- **Database Solution**: OpenAI Vector Store was chosen over SQLAlchemy with PostgreSQL because:
  - Native integration with OpenAI models
  - Simplified vector search capabilities for recommendations
  - Reduced infrastructure requirements for the PoC
  - Future migration path to PostgreSQL for scaling beyond PoC

## Key Design Patterns

### 1. Modular Component Architecture (Frontend)
- Use reusable UI components organized by feature domains
- Maintain clear separation between presentation and business logic
- Follow atomic design principles (atoms, molecules, organisms, templates, pages)

### 2. API-First Design (Backend)
- Develop RESTful APIs with clear contracts defined by TypeScript interfaces
- Implement proper status codes and error handling
- Use versioning for future API evolution

### 3. Monorepo Structure
- Organize code by feature domains with frontend and API routes in the same repository
- UI components and their corresponding API routes are logically grouped
- Share TypeScript types between frontend and API routes
- Future transition plan to microservices architecture

### 4. Vector Store Pattern (Data Access)
- Utilize OpenAI Vector Store for document storage and retrieval
- Implement wrapper functions for vector store operations
- Structure data with appropriate metadata for effective retrieval
- Plan for future migration to traditional database when needed

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
  - API routes handle OAuth token exchange
  - Data mapping from LinkedIn format to internal schema
  - User approval step for data import

### 2. Google Custom Search Integration
- **Authentication**:
  - API key-based authentication
  - Server-side requests only (no client exposure)
- **Implementation**:
  - API routes wrapper for Custom Search API
  - Caching for common/recent searches
  - Rate-limiting to control costs

### 3. Document Storage Integration
- **Service Selection**: OpenAI Vector Store
- **Implementation Pattern**:
  - Integrate vector store operations in API routes
  - Store file content and metadata in vector store
  - Implement access control for document retrieval
- **Supported Formats**: PDF, DOCX, JPG, PNG (with size limits)

## System Relationships
- **User → Profile**: One-to-one relationship
- **Profile → Recommendations**: One-to-many relationship
- **User → Conversations**: One-to-many relationship
- **Conversation → Messages**: One-to-many relationship
- **User → Documents**: One-to-many relationship
- **Program → Recommendations**: One-to-many relationship
- **Recommendation → Feedback**: One-to-one relationship

## Data Model

### User Entity
- **id**: UUID (Primary Key)
- **email**: String, unique, required
- **password_hash**: String (for email/password authentication)
- **auth_provider**: String (email, google, linkedin)
- **auth_provider_id**: String (optional, for OAuth users)
- **created_at**: DateTime
- **updated_at**: DateTime
- **last_login**: DateTime
- **is_active**: Boolean
- **is_verified**: Boolean

### Profile Entity
- **id**: UUID (Primary Key)
- **user_id**: UUID (Foreign Key to User)
- **first_name**: String
- **last_name**: String
- **date_of_birth**: Date
- **nationality**: String
- **country_of_residence**: String
- **phone_number**: String
- **preferred_language**: String
- **profile_completion**: Int (percentage of profile completed)
- **profile_picture_url**: String (optional)
- **bio**: Text (optional)
- **created_at**: DateTime
- **updated_at**: DateTime

### Education Entity
- **id**: UUID (Primary Key)
- **profile_id**: UUID (Foreign Key to Profile)
- **institution_name**: String
- **degree**: String
- **field_of_study**: String
- **start_date**: Date
- **end_date**: Date (optional, for ongoing education)
- **grade**: String (optional)
- **activities**: Text (optional)
- **description**: Text (optional)
- **is_verified**: Boolean
- **verification_source**: String (self, linkedin, document)

### WorkExperience Entity
- **id**: UUID (Primary Key)
- **profile_id**: UUID (Foreign Key to Profile)
- **company_name**: String
- **position**: String
- **start_date**: Date
- **end_date**: Date (optional, for current positions)
- **location**: String
- **description**: Text (optional)
- **skills**: Array of Strings
- **is_verified**: Boolean
- **verification_source**: String (self, linkedin, document)

### CareerGoal Entity
- **id**: UUID (Primary Key)
- **profile_id**: UUID (Foreign Key to Profile)
- **desired_industry**: String
- **desired_role**: String
- **desired_location**: String
- **timeline**: String (immediate, short-term, long-term)
- **salary_expectation**: Range (min-max)
- **priority_factors**: JSON (e.g., {"work_life_balance": 5, "salary": 4, ...})
- **description**: Text
- **created_at**: DateTime
- **updated_at**: DateTime

### EducationPreference Entity
- **id**: UUID (Primary Key)
- **profile_id**: UUID (Foreign Key to Profile)
- **program_types**: Array of Strings (degree, certificate, etc.)
- **preferred_countries**: Array of Strings
- **preferred_institutions**: Array of Strings (optional)
- **preferred_study_mode**: String (full-time, part-time, online, hybrid)
- **budget_range**: Range (min-max)
- **start_date_range**: Range (earliest-latest)
- **duration_preference**: String
- **funding_needs**: Boolean
- **special_requirements**: Text (optional)
- **created_at**: DateTime
- **updated_at**: DateTime

### Program Entity
- **id**: UUID (Primary Key)
- **name**: String
- **institution_id**: UUID (Foreign Key to Institution)
- **type**: String (degree, certificate, diploma, etc.)
- **level**: String (bachelor, master, phd, etc.)
- **field**: String
- **specialization**: String (optional)
- **description**: Text
- **duration**: Int (in months)
- **cost**: Decimal
- **currency**: String
- **location**: String
- **delivery_mode**: String (on-campus, online, hybrid)
- **language**: String
- **entry_requirements**: JSON
- **application_deadline**: Date
- **start_dates**: Array of Dates
- **link**: String (URL to program page)
- **created_at**: DateTime
- **updated_at**: DateTime

### Institution Entity
- **id**: UUID (Primary Key)
- **name**: String
- **type**: String (university, college, institute, etc.)
- **country**: String
- **city**: String
- **website**: String
- **accreditation**: Array of Strings
- **ranking**: JSON (e.g., {"world": 150, "national": 15, ...})
- **description**: Text
- **founded_year**: Int
- **student_count**: Int
- **created_at**: DateTime
- **updated_at**: DateTime

### Recommendation Entity
- **id**: UUID (Primary Key)
- **user_id**: UUID (Foreign Key to User)
- **program_id**: UUID (Foreign Key to Program)
- **match_score**: Decimal (0-100)
- **match_factors**: JSON (detailed scoring by factor)
- **priority**: Int (1-5, with 1 being highest)
- **is_favorite**: Boolean (user marked as favorite)
- **status**: String (recommended, viewed, saved, applied, rejected)
- **recommended_at**: DateTime
- **created_at**: DateTime
- **updated_at**: DateTime

### RecommendationFeedback Entity
- **id**: UUID (Primary Key)
- **recommendation_id**: UUID (Foreign Key to Recommendation)
- **user_rating**: Int (1-5)
- **feedback_text**: Text (optional)
- **relevance_score**: Int (1-5)
- **helpful_attributes**: Array of Strings
- **unhelpful_attributes**: Array of Strings
- **created_at**: DateTime
- **updated_at**: DateTime

### Document Entity
- **id**: UUID (Primary Key)
- **user_id**: UUID (Foreign Key to User)
- **name**: String
- **description**: String (optional)
- **file_type**: String (pdf, docx, jpg, etc.)
- **file_size**: Int (in bytes)
- **document_type**: String (transcript, certificate, resume, etc.)
- **storage_path**: String
- **uploaded_at**: DateTime
- **is_verified**: Boolean
- **verification_date**: DateTime (optional)

### Conversation Entity
- **id**: UUID (Primary Key)
- **user_id**: UUID (Foreign Key to User)
- **title**: String
- **created_at**: DateTime
- **updated_at**: DateTime
- **last_message_at**: DateTime

### Message Entity
- **id**: UUID (Primary Key)
- **conversation_id**: UUID (Foreign Key to Conversation)
- **role**: String (user, assistant)
- **content**: Text
- **created_at**: DateTime
- **related_programs**: Array of UUIDs (optional, for program references)
- **related_institutions**: Array of UUIDs (optional, for institution references)

## Application State Management
- Use appropriate state management based on complexity:
  - For simple state: React Context or hooks
  - For complex state: Zustand for lightweight state management

## SSR Components and API Interactions
- Server-side rendered components will:
  - Make direct API route calls when running on the server
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
- Store document metadata in OpenAI Vector Store
- Store actual files in OpenAI Vector Store with appropriate embedding
- Implement secure access controls for document retrieval
- Support common document formats (PDF, DOCX, JPG, PNG)

## Testing Strategy
- **Frontend and API Routes**: 
  - Unit tests with Jest
  - Component tests with React Testing Library
  - E2E tests with Cypress (for critical flows)

## Rule Hierarchy and Conflict Resolution
When conflicts arise between rule files or documentation:
1. Implementation-specific details in memory-bank files take precedence over general guidelines
2. Technology-specific rules in API/frontend/DB files override general roadmap statements
3. Newer decisions documented in activeContext.md supersede older decisions
4. When in doubt, optimize for user experience and maintainability
