/**
 * Photo Library Bridge for communicating with native photo selection
 * This module provides access to the native photo library
 * from the web app running in the WebView.
 */

import { ImageData } from './types';

interface PhotoLibraryResult {
  base64?: string;
  uri?: string;
  canceled?: boolean;
  error?: string;
}

declare global {
  interface Window {
    NativeBridge?: {
      photoLibrary: () => Promise<PhotoLibraryResult>;
    };
  }
}

export const PhotoBridge = {
  /**
   * Access native photo library to select an image
   * Returns base64 encoded image data
   */
  async selectPhoto(): Promise<ImageData> {
    if (!window.NativeBridge?.photoLibrary) {
      throw new Error('Native bridge not available - running in web only mode');
    }

    try {
      const result = await window.NativeBridge.photoLibrary();

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.canceled) {
        const error = new Error('Photo selection canceled by user');
        (error as any).code = 'USER_CANCELLED';
        throw error;
      }

      if (!result.base64) {
        throw new Error('No image data returned from photo library');
      }

      return {
        base64: result.base64,
        uri: result.uri || '',
        mimeType: 'image/jpeg',
      };
    } catch (error) {
      if ((error as any).code === 'USER_CANCELLED') {
        throw error;
      }
      throw new Error(`Failed to select photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Check if photo library access is available
   */
  isAvailable(): boolean {
    return typeof window.NativeBridge?.photoLibrary !== 'undefined';
  },

  /**
   * Get human-readable error message for error codes
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if ((error as any).code === 'USER_CANCELLED') {
        return 'You cancelled the selection';
      }
      if (error.message.includes('permission')) {
        return 'Photo library permission denied. Please enable in Settings.';
      }
      return error.message;
    }
    return 'An unknown error occurred';
  },
};
