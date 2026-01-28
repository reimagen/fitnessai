export const formatParsePrError = (error: unknown) => {
  let userFriendlyError =
    "An unknown error occurred while parsing the records. This attempt did not count against your daily limit.";

  if (error instanceof Error) {
    if (error.message.includes("not a new personal record")) {
      userFriendlyError = "The records found in the screenshot were not better than your existing PRs.";
    } else if (error.message.includes("429") || error.message.toLowerCase().includes("quota")) {
      userFriendlyError =
        "Parsing failed: The request quota for the AI has been exceeded. Please try again later. This attempt did not count against your daily limit.";
    } else if (
      error.message.includes("503") ||
      error.message.toLowerCase().includes("overloaded") ||
      error.message.toLowerCase().includes("unavailable")
    ) {
      userFriendlyError =
        "Parsing failed: The AI model is temporarily unavailable. Please try again in a few moments. This attempt did not count against your daily limit.";
    } else {
      userFriendlyError = `Failed to parse screenshot: ${error.message}. This attempt did not count against your daily limit.`;
    }
  }

  return userFriendlyError;
};
