/**
 * Environment variable validation and initialization
 *
 * Validates critical API keys at startup:
 * - Production: Fails fast if keys missing
 * - Development: Warns but continues (allows testing without keys)
 */

let hasValidAPIKeys = false;
let validationChecked = false;

/**
 * Check if API keys are configured
 * Should be called once at app startup
 */
export function validateEnvironment(): void {
  if (validationChecked) return;

  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
  const isProduction = process.env.NODE_ENV === "production";
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  // Cloud Run sets K_SERVICE env var, so use that to detect true production
  const isCloudRunProduction = isProduction && !!projectId;

  hasValidAPIKeys = hasGeminiKey || hasGoogleKey;

  if (!hasValidAPIKeys) {
    const message = "⚠️  API keys missing: GEMINI_API_KEY or GOOGLE_API_KEY not configured";

    if (isCloudRunProduction) {
      // In true production (Cloud Run), this is a critical configuration error
      console.error(`❌ FATAL: ${message}`);
      console.error("AI features will not work. Exiting.");
      process.exit(1);
    } else if (isProduction) {
      // During build with NODE_ENV=production, just warn
      console.warn(`${message} - Build continuing, but AI features will fail at runtime`);
    } else {
      // In development, warn but allow app to continue
      console.warn(`${message} - AI features will be unavailable in development`);
    }
  } else {
    console.log("✓ API keys validated successfully");
  }

  validationChecked = true;
}

/**
 * Check if API keys are available
 * Can be called from server actions to determine behavior
 */
export function areAPIKeysAvailable(): boolean {
  // Ensure validation has run
  if (!validationChecked) {
    validateEnvironment();
  }
  return hasValidAPIKeys;
}

/**
 * Generic error message for users when API features are unavailable
 */
export const API_UNAVAILABLE_ERROR = "AI features are temporarily unavailable. Please try again later.";
