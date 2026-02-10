# Native Bridges Guide

This document explains how to use the native bridge system to access native device features (camera, photo library, etc.) from the web app.

## Overview

The native bridge system allows JavaScript code running in the WebView to access native iOS features. It uses a message-passing system:

1. **Web App (JavaScript)** → Requests native feature
2. **Expo App (React Native)** → Handles request, access native APIs
3. **iOS Device** → Performs action (camera, file selection, etc.)
4. **Expo App** → Sends result back
5. **Web App** → Processes result

## Available Bridges

### 1. Camera Bridge

Access the native camera to take photos.

#### Usage in Next.js Web App

```typescript
import { CameraBridge } from '../mobile/src/bridges/CameraBridge';

async function handleTakePhoto() {
  try {
    const base64Image = await CameraBridge.takePhoto();
    // Send to API for processing
    const result = await fetch('/api/parse-workout', {
      method: 'POST',
      body: JSON.stringify({ photoDataUri: base64Image }),
    });
    const parsed = await result.json();
    console.log('Parsed workout:', parsed);
  } catch (error) {
    console.error('Camera error:', error);
  }
}
```

#### In a React Component

```typescript
'use client';

import { useCameraBridge, useIsNative } from '../mobile/src/bridges';

export function CameraButton() {
  const cameraBridge = useCameraBridge();
  const isNative = useIsNative();

  const handleCapture = async () => {
    try {
      const base64 = await cameraBridge.takePhoto();
      // Use the image...
    } catch (error) {
      console.error('Capture failed:', error);
    }
  };

  // Hide button if not in native app
  if (!isNative) {
    return null;
  }

  return <button onClick={handleCapture}>Take Photo</button>;
}
```

### 2. Photo Library Bridge

Access the user's photo library to select images.

#### Usage

```typescript
import { PhotoBridge } from '../mobile/src/bridges/PhotoBridge';

async function handleSelectPhoto() {
  try {
    const imageData = await PhotoBridge.selectPhoto();
    console.log('Selected image:', imageData);
    // Use imageData.base64 for upload
  } catch (error) {
    if ((error as any).code === 'USER_CANCELLED') {
      console.log('User cancelled selection');
    } else {
      console.error('Photo library error:', error);
    }
  }
}
```

## Integration Patterns

### Pattern 1: Detect Native and Show Appropriate UI

```typescript
'use client';

import { useIsNative } from '../mobile/src/bridges';

export function WorkoutForm() {
  const isNative = useIsNative();

  return (
    <form>
      {isNative && (
        <button type="button" onClick={handleCameraCapture}>
          📷 Take Photo
        </button>
      )}

      {isNative && (
        <button type="button" onClick={handlePhotoLibrary}>
          🖼️ Choose from Library
        </button>
      )}

      {/* Manual entry form always available */}
      <input type="text" placeholder="Exercise name" />
      <input type="number" placeholder="Weight" />
    </form>
  );
}
```

### Pattern 2: Graceful Fallback

```typescript
async function parseWorkoutImage(source: 'camera' | 'library' | 'upload') {
  let imageData: string | null = null;

  try {
    if (source === 'camera') {
      imageData = await CameraBridge.takePhoto();
    } else if (source === 'library') {
      const data = await PhotoBridge.selectPhoto();
      imageData = data.base64;
    } else {
      // File upload in web
      imageData = await handleFileUpload();
    }

    // Process the image (same code regardless of source)
    const parsed = await parseWorkoutAI(imageData);
    return parsed;
  } catch (error) {
    // Handle errors
    console.error('Failed to get image:', error);
    throw error;
  }
}
```

### Pattern 3: Hook-Based Component

```typescript
'use client';

import { useState } from 'react';
import { useCameraBridge, useIsNative } from '../mobile/src/bridges';

export function CameraCapture() {
  const cameraBridge = useCameraBridge();
  const isNative = useIsNative();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async () => {
    setLoading(true);
    setError(null);

    try {
      const base64 = await cameraBridge.takePhoto();
      // Process image
      console.log('Captured image, length:', base64.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!isNative) {
    return <p>Camera not available in web mode</p>;
  }

  return (
    <div>
      <button onClick={handleCapture} disabled={loading}>
        {loading ? 'Capturing...' : 'Take Photo'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

## Implementation Example: Workout Logging

Here's a complete example of integrating the camera bridge into a workout logging form:

```typescript
'use client';

import { useState } from 'react';
import { useCameraBridge, usePhotoBridge, useIsNative } from '../mobile/src/bridges';
import { parseWorkoutScreenshot } from '@/app/history/actions';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export function WorkoutLogger() {
  const cameraBridge = useCameraBridge();
  const photoBridge = usePhotoBridge();
  const isNative = useIsNative();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'manual' | 'photo'>('manual');

  const handleCaptureFromCamera = async () => {
    setLoading(true);
    setError(null);

    try {
      const base64 = await cameraBridge.takePhoto();
      const result = await parseWorkoutScreenshot(base64);
      setExercises(result.exercises);
      setMode('photo');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromLibrary = async () => {
    setLoading(true);
    setError(null);

    try {
      const imageData = await photoBridge.selectPhoto();
      const result = await parseWorkoutScreenshot(imageData.base64);
      setExercises(result.exercises);
      setMode('photo');
    } catch (err) {
      if ((err as any).code === 'USER_CANCELLED') {
        return; // User cancelled, don't show error
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Log Workout</h2>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      {isNative && (
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={handleCaptureFromCamera} disabled={loading}>
            {loading ? 'Capturing...' : '📷 Take Screenshot'}
          </button>
          <button onClick={handleSelectFromLibrary} disabled={loading} style={{ marginLeft: '0.5rem' }}>
            {loading ? 'Selecting...' : '🖼️ Choose from Library'}
          </button>
        </div>
      )}

      {/* Manual entry form */}
      {mode === 'manual' && <ManualEntryForm onSubmit={setExercises} />}

      {/* Display parsed exercises */}
      {exercises.length > 0 && <ExerciseList exercises={exercises} />}
    </div>
  );
}
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Native bridge not available" | Running in web mode, not native app | Check `useIsNative()` before calling |
| "Camera permission denied" | User hasn't granted permission | Prompt user in iOS Settings |
| "Camera canceled" | User cancelled camera | Show retry option |
| "No image data returned" | Unexpected response | Check bridge implementation |

### Error Detection

```typescript
async function handleImageCapture() {
  try {
    const base64 = await CameraBridge.takePhoto();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        // Handle permission error
      } else if (error.message.includes('canceled')) {
        // Handle user cancellation
      } else if (error.message.includes('not available')) {
        // Fallback to manual entry
      }
    }
  }
}
```

## Testing

### Unit Testing with Mock Bridge

```typescript
// __mocks__/NativeBridge.ts
export const CameraBridge = {
  takePhoto: jest.fn().mockResolvedValue('base64mockdata'),
  isAvailable: jest.fn().mockReturnValue(false),
};

export const PhotoBridge = {
  selectPhoto: jest.fn().mockResolvedValue({
    base64: 'base64mockdata',
    uri: 'mock-uri',
  }),
  isAvailable: jest.fn().mockReturnValue(false),
};
```

### Integration Testing

Test with actual iOS device or simulator:

1. Run `npm start` in mobile directory
2. Run web app on `localhost:3000`
3. Update `.env` to point to web app
4. Test each feature manually

## Browser Support

### In iOS App (WebView)
✅ All bridge features available

### In Web Browser
❌ Bridge returns errors - use `useIsNative()` to hide features

### Graceful Degradation

```typescript
async function getImage() {
  if (!CameraBridge.isAvailable()) {
    // Fall back to file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve((e.target?.result as string).split(',')[1]);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });
  }

  return await CameraBridge.takePhoto();
}
```

## Performance Considerations

### Image Encoding

By default, images are returned as base64-encoded data. For large images:

1. **Compression:** Images are already compressed to 80% quality
2. **Size Limit:** Max ~2-3MB per image (adjust in App.tsx if needed)
3. **Sending:** Base64 adds ~33% size overhead - consider gzip compression

### Optimization Tips

```typescript
// Compress before sending
async function compressAndSend(base64: string) {
  // Option 1: Use ImageMagick or similar on server
  const response = await fetch('/api/compress', {
    method: 'POST',
    body: JSON.stringify({ image: base64 }),
  });

  // Option 2: Send with gzip compression
  const response = await fetch('/api/process', {
    method: 'POST',
    headers: { 'Content-Encoding': 'gzip' },
    body: await gzipCompress(base64),
  });
}
```

## Security Considerations

### Permissions

The app requests these permissions:
- **Camera:** Taking photos from camera app
- **Photos:** Accessing photo library
- **Media Library:** Saving processed images

All permissions are requested when needed with user-friendly dialogs.

### Data Privacy

- Images are never stored locally in the app
- Base64 data is sent only to the server
- No image caching or history retention

## Future Enhancements

Potential bridges for Phase 3+ (React Native):

- 📍 **Location Services** - GPS coordinates for workouts
- 🏃 **Motion Data** - Step counter, accelerometer
- 🏥 **HealthKit** - Apple Health app integration
- ⌚ **Watch App** - Apple Watch notifications
- 🔔 **Push Notifications** - Workout reminders
- 🔄 **Background Sync** - Sync data in background
- 💾 **Offline Storage** - SQLite database

## Troubleshooting

### Bridge Not Initializing

```typescript
// In App.tsx, ensure bridge ready event fires
// Add debugging:
console.log('Bridge ready:', CameraBridge.isAvailable());
```

### Images Not Processing

1. Check base64 encoding is valid
2. Verify image size < 5MB
3. Check MIME type detection
4. Review server logs for parsing errors

### Permission Dialogs Not Showing

1. Ensure app has permission in iOS Settings
2. Check `app.json` has proper descriptions
3. Test on physical device (simulator may cache)

## See Also

- [AUTHENTICATION.md](./AUTHENTICATION.md) - Session management
- [README.md](./README.md) - Mobile app overview
- [App.tsx](./App.tsx) - WebView bridge implementation
