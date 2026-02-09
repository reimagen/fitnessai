# FitnessAI Blueprint (Current)

## App Overview

FitnessAI is a Next.js (App Router) fitness companion focused on workout logging, AI-assisted parsing/analysis, and personalized planning. It uses Firebase Auth + Firestore and Genkit with Google Gemini for AI features.

## Core Features (Current)

- User authentication and profile management
- Workout logging with exercises, sets, reps, and weight
- History view for past workouts
- Screenshot parsing for workout logs and PRs (AI-assisted)
- Personal record (PR) tracking and milestones
- Strength balance, lift progression, and cardio analysis
- Weekly AI-generated workout plans
- Goal setting and AI goal analysis

## Pages (Current)

- Home: Dashboard with quick actions and weekly progress
- Analysis: Strength balance, lift progression, cardio trends, and variety
- Plan: AI-generated weekly training plans
- History: Manual logging and screenshot parsing for workouts
- Profile: User details, goals, and AI goal analysis
- PRs: Personal records and PR parsing
- Sign in / Pending / Auth-gated routes

## Data & AI Architecture

- Firestore collections under `users/{userId}` for user-specific data
- Firebase Auth session cookies for server-side auth
- Genkit flows for plan generation, strength analysis, goal analysis, and screenshot parsing
- Rate limiting for AI features
- Exercise library currently uses hardcoded data and will migrate to Firebase (see `docs/firebase-exercise-lib.md`)

## UI Patterns & Style (Current)

- App shell uses `container mx-auto px-4 py-8`
- Cards use `shadow-lg` and `rounded-2xl`
- Card headers use `CardTitle` with `font-headline` and icons
- Page titles use `text-3xl font-bold text-primary`
- Subtitles use `text-muted-foreground`
- Buttons and inputs use `rounded-xl`
- Status states: loader card with centered spinner, `ErrorState` for errors

## Tech Stack

- Next.js (App Router), TypeScript, Tailwind, Shadcn UI
- Firebase Auth + Firestore
- Genkit + Google Gemini API
