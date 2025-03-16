# Vista Education Adviser - Rule Hierarchy

This document outlines how conflicts between different documentation sources should be resolved and establishes a clear hierarchy for decision-making.

## Rule Precedence (Highest to Lowest)

1. **Active Context (`activeContext.md`)**
   - Contains the most up-to-date decisions and current implementation state
   - Takes precedence when conflicts arise with other documentation
   - Represents the latest evolution of the project

2. **System Patterns (`systemPatterns.md`)**
   - Defines the architectural decisions and design patterns
   - Guides implementation details across both frontend and backend
   - Takes precedence over the roadmap for architectural decisions

3. **Technical Context (`techContext.md`)**
   - Specifies the concrete technologies being used
   - Overrides more general technology mentions in the roadmap
   - Provides rationale for technology choices and adaptations

4. **Technology-Specific Rules**
   - **API Rules (`api.mdc`)**: Defines backend API implementation details
   - **Frontend Rules (`frontend.mdc`)**: Defines frontend implementation details
   - **Database Rules (`db.mdc`)**: Defines database implementation details
   - These take precedence over general descriptions in the project brief and roadmap

5. **Project Roadmap (`vista-roadmap.mdc`)**
   - Provides the overall vision and direction
   - Serves as a reference for high-level project goals
   - Should be consulted for understanding broader context

6. **Project Brief (`projectBrief.md`)**
   - Contains the high-level requirements and goals
   - Used for understanding project scope and purpose

## Conflict Resolution Process

When conflicts between documentation sources are identified:

1. **Check Active Context First**
   - `activeContext.md` should contain explanations for any deviations from the original plan
   - If a conflict exists without explanation, update `activeContext.md` to document the decision

2. **Document Technology Transitions**
   - If changing from one technology to another (e.g., Drizzle to SQLAlchemy), document:
     - The rationale for the change
     - Migration approach
     - Timeline (if applicable)

3. **Update Related Documentation**
   - When making a significant change, ensure all affected documentation is updated
   - Create explicit cross-references between related decisions

4. **Apply Specific Over General**
   - More specific, implementation-focused documentation takes precedence over general guidelines
   - Technical requirements override conceptual descriptions

## Terminology Standardization

To ensure consistent understanding across all documentation:

### Component Names
- **Frontend Components**: React components in the Next.js frontend
- **Backend Services**: Distinct modules within the FastAPI application
- **API Endpoints**: RESTful endpoints exposed by the backend
- **Data Models**: SQLAlchemy models defining database structure

### Service Boundaries
- **Frontend Service**: Next.js application deployed on Vercel
- **Backend Service**: FastAPI application deployed on Heroku
- **Database Service**: PostgreSQL database (Heroku add-on)
- **External Services**: Third-party services (OpenAI, LinkedIn, Google, etc.)

### Authentication Mechanisms
- **JWT Authentication**: Token-based authentication for API access
- **Social OAuth**: Authentication via Google and LinkedIn
- **Email Authentication**: Traditional email/password authentication

### Data Models
- **User Model**: Core authentication entity
- **Profile Model**: Extended user information
- **Recommendation Model**: Education/career suggestions
- **Conversation Model**: Chatbot conversation history
- **Message Model**: Individual messages within conversations
- **Document Model**: Uploaded user documents 