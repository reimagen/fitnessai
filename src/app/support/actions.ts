'use server';

import { z } from 'zod';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
const apps = getApps();
const app = apps.length ? apps[0] : initializeApp();
const db = getFirestore(app);

const feedbackSchema = z.object({
  name: z.string().optional().default(''),
  email: z.string().email('Invalid email address'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(500, 'Message must be 500 characters or less'),
});

type FeedbackData = z.infer<typeof feedbackSchema>;

export async function submitFeedback(data: FeedbackData): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    const validatedData = feedbackSchema.parse(data);

    // Store feedback in Firestore
    const feedbackRef = db.collection('feedback').doc();
    await feedbackRef.set({
      ...validatedData,
      createdAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Validation failed',
      };
    }

    if (error instanceof Error) {
      console.error('Feedback submission error:', error);
      return {
        success: false,
        error: 'Failed to submit feedback. Please try again.',
      };
    }

    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
