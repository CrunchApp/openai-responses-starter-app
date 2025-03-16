# Vista Education Adviser - Recommendation Engine Specification

## Overview
The recommendation engine is a core component of Vista Education Adviser that matches users with educational programs based on their profile data and preferences. This document outlines the design and implementation details for the initial rule-based version of the recommendation engine.

## Architecture

### Components
1. **Program Database**: Collection of educational programs with relevant attributes
2. **Rule Engine**: System for filtering and ranking programs based on user profiles
3. **Recommendation API**: Endpoints for requesting and receiving recommendations
4. **Feedback System**: Mechanism for collecting user feedback on recommendations

### Data Models

#### Program Model
```python
class Program(Base):
    __tablename__ = "programs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    institution = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    city = Column(String(100), nullable=True)
    field_of_study = Column(String(100), nullable=False)
    program_type = Column(String(50), nullable=False)  # e.g., "bachelor", "master", "phd", "certificate"
    duration_months = Column(Integer, nullable=False)
    tuition_fee_usd = Column(Integer, nullable=False)
    living_cost_usd = Column(Integer, nullable=True)
    language = Column(String(50), nullable=False, default="English")
    prerequisites = Column(Text, nullable=True)
    admission_requirements = Column(Text, nullable=True)
    scholarship_available = Column(Boolean, default=False)
    application_deadline = Column(Date, nullable=True)
    program_start_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

#### Recommendation Model
```python
class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    match_score = Column(Float, nullable=False)  # 0-100 score
    match_factors = Column(JSON, nullable=True)  # Factors contributing to match
    user_feedback = Column(String(20), nullable=True)  # "liked", "disliked", "neutral"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="recommendations")
    program = relationship("Program")
```

## Rule-Based Matching Algorithm

### Filtering Stage
1. **Basic Filtering** - Eliminate programs that don't meet fundamental criteria:
   - Field of study matching user's interests
   - Country/region preferences
   - Program type (degree level)
   - Language requirements
   
2. **Constraint Filtering** - Filter based on hard constraints:
   - Budget limitations (tuition + living costs)
   - Program duration preferences
   - Program start date compatibility
   - Prerequisite requirements

### Scoring Stage
Programs that pass filtering are scored based on multiple factors:

1. **Field Match** (30% weight):
   - Exact field match: 100%
   - Related field match: 50-90% depending on similarity
   
2. **Location Preference** (20% weight):
   - Exact country match: 100%
   - Preferred region match: 80%
   - Non-preferred but not excluded: 40%
   
3. **Budget Fit** (20% weight):
   - Below budget: 100%
   - At budget: 90%
   - Slightly above budget (within 10%): 60%
   - Within budget with scholarship consideration: 85%
   
4. **Program Details** (30% weight):
   - Duration preference match: 0-100%
   - Institution reputation (to be added later): 0-100%
   - Program-specific features matching user preferences: 0-100%

### Calculation Logic
1. Each factor is evaluated and normalized to a 0-100 score
2. Weighted average is calculated based on factor weights
3. Programs are ranked by final score
4. Top N programs are returned as recommendations

## API Endpoints

### Generate Recommendations
```
POST /api/recommendations/generate
```
Request Body:
```json
{
  "user_id": "uuid-string",
  "preferences": {
    "max_budget_usd": 30000,
    "preferred_countries": ["USA", "Canada", "UK"],
    "preferred_program_types": ["master"],
    "preferred_fields": ["Computer Science", "Data Science"],
    "preferred_duration_months": 24,
    "language_proficiency": {
      "English": "fluent"
    },
    "start_date_range": {
      "earliest": "2023-08-01",
      "latest": "2024-01-31"
    }
  },
  "limit": 10,
  "include_details": true
}
```

Response:
```json
{
  "recommendations": [
    {
      "program_id": "uuid-string",
      "program_name": "Master of Computer Science",
      "institution": "University Name",
      "match_score": 92.5,
      "match_factors": {
        "field_match": 100,
        "location_match": 100,
        "budget_fit": 85,
        "program_details": 90
      },
      "program_details": {
        "tuition_fee_usd": 25000,
        "living_cost_usd": 15000,
        "duration_months": 24,
        "country": "USA",
        "city": "Boston",
        "url": "https://university.edu/program"
      }
    },
    // Additional recommendations...
  ],
  "total_matches": 42,
  "recommendation_id": "uuid-string"
}
```

### Provide Feedback
```
POST /api/recommendations/{recommendation_id}/feedback
```
Request Body:
```json
{
  "program_id": "uuid-string",
  "feedback": "liked",  // "liked", "disliked", "neutral"
  "feedback_details": "Optional user comments"
}
```

## Implementation Approach

### Phase 1: Basic Rule Engine
- Implement simple filtering based on explicit user preferences
- Return programs sorted by basic match criteria
- Store recommendation results and display to users

### Phase 2: Enhanced Scoring
- Implement weighted scoring algorithm
- Add detailed feedback collection
- Provide explanation for why programs were recommended

### Phase 3: Learning Component (Future)
- Analyze feedback data to adjust scoring weights
- Implement collaborative filtering based on similar user profiles
- Add machine learning component to improve recommendations over time

## Performance Considerations
- Implement caching for frequent queries
- Use database indexing for efficient filtering
- Consider pre-computing some matches for active users
- Optimize database queries for large program datasets

## Testing Strategy
- Unit tests for scoring algorithms
- Integration tests for API endpoints
- Manual testing with diverse user profiles
- A/B testing different recommendation algorithms 