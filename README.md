# Vista Education Adviser PoC

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![NextJS](https://img.shields.io/badge/Built_with-NextJS-blue)
![OpenAI API](https://img.shields.io/badge/Powered_by-OpenAI_API-orange)

This repository contains a Proof of Concept (PoC) for the Vista Education Adviser, built on top of the [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses). Vista Education Adviser helps users find personalized education and career paths through AI-powered recommendations and guidance.

## Features

### Core Features
- **Personalized Recommendation Engine**: Tailored education/career paths based on user profiles
- **AI Chatbot Guidance**: OpenAI-powered conversational assistant for answering queries about programs and applications
- **User Authentication**: Secure login via email/password and social login (Google, LinkedIn)
- **External Integrations**: 
  - LinkedIn profile import
  - Google Custom Search for program details
  - Document uploads (transcripts, SOPs)

### Technical Features
- Multi-turn conversation handling
- Web search tool configuration
- Vector store creation & file upload for use with the file search tool
- Function calling
- Streaming responses & tool calls
- Display annotations

## Deployment

The PoC is designed for cost-efficient deployment using:
- **Vercel** for hosting the Next.js frontend
- **Heroku** for the FastAPI backend

## How to use

1. **Set Up the OpenAI API:**

   - If you're new to the OpenAI API, [sign up for an account](https://platform.openai.com/signup).
   - Follow the [Quickstart](https://platform.openai.com/docs/quickstart) to retrieve your API key.

2. **Clone the Repository:**

   ```bash
   git clone https://github.com/[your-organization]/vista-education-adviser.git
   ```

3. **Install dependencies:**

   Run in the project root:

   ```bash
   npm install
   ```

4. **Run the app:**

   ```bash
   npm run dev
   ```

   The app will be available at [`http://localhost:3000`](http://localhost:3000).

## Project Structure

The project follows a microservices architecture with:

- **Backend (FastAPI):**
  - Authentication service
  - Profile management
  - Recommendation engine
  - AI chatbot service
  - Document upload service

- **Frontend (Next.js with TypeScript):**
  - User authentication pages
  - Profile setup
  - Recommendations display
  - Chatbot interface

For detailed information about the architecture and data flow, see the [/docs](./docs) directory.

## Contributing

You are welcome to open issues or submit PRs to improve this app, however, please note that we may not review all suggestions.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
