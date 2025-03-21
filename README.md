# Vista Education Adviser PoC

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![NextJS](https://img.shields.io/badge/Built_with-NextJS-blue)
![OpenAI API](https://img.shields.io/badge/Powered_by-OpenAI_API-orange)

This repository contains a Proof of Concept (PoC) for the Vista Education Adviser, built on top of the [OpenAI API](https://platform.openai.com/docs/api-reference). Vista Education Adviser helps users find personalized education and career paths through AI-powered recommendations and guidance.

## Project Overview

Vista Education Adviser addresses challenges in the traditional education guidance sector by democratizing access to quality education advice through technology. The application provides personalized recommendations and AI-powered guidance to help students and professionals navigate their educational and career journeys.

## Features

### Core Features
- **Personalized Recommendation Engine**: Tailored education/career paths based on user profiles using a rule-based system initially
- **AI Chatbot Guidance**: OpenAI-powered conversational assistant for answering queries about programs and applications
- **User Authentication**: Secure login via email/password and social login (Google, LinkedIn)
- **External Integrations**: 
  - LinkedIn profile import
  - Google Custom Search for program details
  - Document uploads (transcripts, SOPs)

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Tailwind CSS
- **State Management**: React Context and/or Zustand
- **Deployment**: Vercel

### Backend (Planned)
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT + social OAuth
- **Deployment**: Heroku

## Getting Started

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/[your-organization]/vista-education-adviser.git
   cd vista-education-adviser
   ```

2. **Environment Setup:**

   Create a `.env` file in the root directory with necessary API keys (see `.env.sample` for reference).

3. **Install Dependencies:**

   ```bash
   npm install
   ```

4. **Run the Development Server:**

   ```bash
   npm run dev
   ```

   The application will be available at [`http://localhost:3000`](http://localhost:3000).

## Project Structure

The project follows a service-oriented architecture with modular components:

- **Frontend Components**:
  - Authentication (login/signup)
  - User profile management
  - Recommendation display
  - Chatbot interface
  - Document uploads

- **Backend Services**:
  - Authentication Service
  - Profile Management Service
  - Recommendation Engine Service
  - Chatbot Service
  - File Upload Service

For detailed information about the project, refer to the `memory-bank` directory which contains:

- `projectBrief.md`: High-level overview of goals and requirements
- `productContext.md`: Business context and user needs
- `systemPatterns.md`: Architectural decisions and design patterns
- `techContext.md`: Technical stack details and dependencies
- `activeContext.md`: Current development status
- `progress.md`: Project timeline and milestones

## Development Roadmap

The project is divided into several phases:

1. **Foundation Setup**: Understanding the starter app and implementing core components
2. **Core Features**: Authentication, profile management, recommendation engine, and chatbot
3. **External Integrations**: LinkedIn, Google Search, document uploads
4. **Refinement & Testing**: Performance optimization and user testing

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Environment Variables

### Setup Instructions

The application requires the following environment variables to be set:

- `OPENAI_API_KEY`: Your OpenAI API key
- `PERPLEXITY_API_KEY`: Your Perplexity API key for program research
- `NEXT_PUBLIC_API_URL`: Base URL for API calls (use http://localhost:3000 for local development)

Follow these steps to configure environment variables:

1. Create a `.env.local` file in the project root (this file is ignored by git)
2. Add your environment variables to this file:
   ```
   OPENAI_API_KEY=your-openai-api-key-here
   PERPLEXITY_API_KEY=your-perplexity-api-key-here
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```
3. For production deployment, set these variables in your hosting platform's environment configuration

### Security Best Practices

- **Never commit API keys to version control**
- Always use `.env.local` for local development (included in `.gitignore`)
- For production, use your hosting platform's environment variable management system
- Rotate API keys periodically for enhanced security
- Implement proper access controls for your API keys in OpenAI and Perplexity dashboards

### Production Deployment

When deploying to production:

1. Set environment variables through your hosting platform (Vercel, Netlify, etc.)
2. Ensure `NEXT_PUBLIC_API_URL` points to your production domain
3. Consider using environment-specific settings like `NODE_ENV` to handle different configurations

### Perplexity API Integration

The recommendation engine uses the Perplexity API to research educational programs. To obtain a Perplexity API key:

1. Visit [Perplexity AI's API Settings page](https://www.perplexity.ai/pplx-api)
2. Register and generate an API key
3. Add the API key to your `.env.local` file as `PERPLEXITY_API_KEY`

If the Perplexity API is unavailable, the system will fall back to using OpenAI for research.
