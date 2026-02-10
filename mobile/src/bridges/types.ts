/**
 * Type definitions for native bridge communications
 */

export interface ImageData {
  base64: string;
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

export interface CameraRequest {
  type: 'CAMERA_REQUEST';
  requestId: number;
}

export interface PhotoLibraryRequest {
  type: 'PHOTO_LIBRARY_REQUEST';
  requestId: number;
}

export interface CameraResponse {
  type: 'CAMERA_RESPONSE';
  requestId: number;
  base64?: string;
  uri?: string;
  canceled?: boolean;
  error?: string;
}

export interface PhotoLibraryResponse {
  type: 'PHOTO_LIBRARY_RESPONSE';
  requestId: number;
  base64?: string;
  uri?: string;
  canceled?: boolean;
  error?: string;
}

export interface NativeShareRequest {
  type: 'NATIVE_SHARE';
  requestId: number;
  title?: string;
  message: string;
  url?: string;
}

export interface NativeShareResponse {
  type: 'SHARE_RESPONSE';
  requestId: number;
  success: boolean;
  error?: string;
}

export type NativeRequest =
  | CameraRequest
  | PhotoLibraryRequest
  | NativeShareRequest;

export type NativeResponse =
  | CameraResponse
  | PhotoLibraryResponse
  | NativeShareResponse;

/**
 * Configuration for native bridge initialization
 */
export interface NativeBridgeConfig {
  timeoutMs?: number;
  debug?: boolean;
}

/**
 * Event emitted when native bridge is ready
 */
export type NativeBridgeReadyEvent = CustomEvent<{
  isNative: boolean;
  timestamp: number;
}>;
