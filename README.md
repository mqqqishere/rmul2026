<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a7cb1d44-cf33-4ab1-84ef-e7fbb3a3cb1a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

1. Push the project to a GitHub repository.
2. Import the repository in [Vercel](https://vercel.com/new).
3. In the Vercel project dashboard, go to **Storage** and create a new **Postgres** database (free tier available). Vercel will automatically inject the `POSTGRES_URL` and related environment variables.
4. Optionally set `GEMINI_API_KEY` as an environment variable for AI features.
5. Deploy — Vercel will run `vite build` and serve the frontend, while `server.ts` handles the API as a Serverless Function.
