/**
 * Camera Bridge for communicating with native camera functionality
 * This module provides access to the native camera and photo library
 * from the web app running in the WebView.
 */

interface CameraResult {
  base64?: string;
  uri?: string;
  canceled?: boolean;
  error?: string;
}

declare global {
  interface Window {
    NativeBridge?: {
      camera: () => Promise<CameraResult>;
      photoLibrary: () => Promise<CameraResult>;
    };
  }
}

export const CameraBridge = {
  /**
   * Access native camera to take a photo
   * Returns base64 encoded image data
   */
  async takePhoto(): Promise<string> {
    if (!window.NativeBridge?.camera) {
      throw new Error('Native bridge not available');
    }

    const result = await window.NativeBridge.camera();

    if (result.error) {
      throw new Error(result.error);
    }

    if (result.canceled) {
      throw new Error('Camera access canceled');
    }

    if (!result.base64) {
      throw new Error('No image data returned');
    }

    return result.base64;
  },

  /**
   * Access photo library to select an existing photo
   * Returns base64 encoded image data
   */
  async selectPhoto(): Promise<string> {
    if (!window.NativeBridge?.photoLibrary) {
      throw new Error('Native bridge not available');
    }

    const result = await window.NativeBridge.photoLibrary();

    if (result.error) {
      throw new Error(result.error);
    }

    if (result.canceled) {
      throw new Error('Photo selection canceled');
    }

    if (!result.base64) {
      throw new Error('No image data returned');
    }

    return result.base64;
  },

  /**
   * Check if native bridge is available (indicates running in native app)
   */
  isAvailable(): boolean {
    return typeof window.NativeBridge !== 'undefined';
  },

  /**
   * Wait for native bridge to be ready
   * Returns a promise that resolves when the bridge is initialized
   */
  waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isAvailable()) {
        resolve();
        return;
      }

      const handler = () => {
        document.removeEventListener('NativeBridgeReady', handler);
        resolve();
      };

      document.addEventListener('NativeBridgeReady', handler);

      // Timeout after 5 seconds
      setTimeout(() => {
        document.removeEventListener('NativeBridgeReady', handler);
        resolve();
      }, 5000);
    });
  },
};
