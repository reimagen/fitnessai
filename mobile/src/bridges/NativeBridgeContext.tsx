/**
 * React Context for native bridge availability and utility functions
 * This allows web components to check if running in native app and access bridges
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CameraBridge } from './CameraBridge';
import { PhotoBridge } from './PhotoBridge';

interface NativeBridgeContextType {
  isNative: boolean;
  isReady: boolean;
  cameraBridge: typeof CameraBridge;
  photoBridge: typeof PhotoBridge;
}

const NativeBridgeContext = createContext<NativeBridgeContextType | null>(null);

interface NativeBridgeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that exposes native bridge functionality to React tree
 * Should be placed high in the component tree, ideally in the root layout
 */
export function NativeBridgeProvider({ children }: NativeBridgeProviderProps) {
  const [isNative, setIsNative] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if running in native app
    const checkNativeBridge = async () => {
      await CameraBridge.waitForReady();
      setIsNative(CameraBridge.isAvailable());
      setIsReady(true);
    };

    checkNativeBridge();
  }, []);

  return (
    <NativeBridgeContext.Provider
      value={{
        isNative,
        isReady,
        cameraBridge: CameraBridge,
        photoBridge: PhotoBridge,
      }}
    >
      {children}
    </NativeBridgeContext.Provider>
  );
}

/**
 * Hook to access native bridge functionality
 * Returns null if running in web mode (not in native app)
 */
export function useNativeBridge() {
  const context = useContext(NativeBridgeContext);
  if (!context) {
    throw new Error('useNativeBridge must be used within NativeBridgeProvider');
  }
  return context;
}

/**
 * Hook to check if running in native app
 */
export function useIsNative(): boolean {
  const { isNative, isReady } = useNativeBridge();
  // Return false while bridge is initializing
  return isReady && isNative;
}

/**
 * Hook to access camera functionality
 */
export function useCameraBridge() {
  const { cameraBridge } = useNativeBridge();
  return cameraBridge;
}

/**
 * Hook to access photo library functionality
 */
export function usePhotoBridge() {
  const { photoBridge } = useNativeBridge();
  return photoBridge;
}
