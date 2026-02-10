import React, { useRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000';

interface CameraRequestData {
  type: string;
  requestId: number;
}

interface PhotoLibraryRequestData {
  type: string;
  requestId: number;
}

interface NativeShareRequestData {
  type: string;
  requestId: number;
}

export default function App() {
  const webViewRef = useRef<WebView>(null);

  const handleMessage = async (event: WebViewMessageEvent) => {
    const data = JSON.parse(event.nativeEvent.data);

    switch (data.type) {
      case 'CAMERA_REQUEST':
        handleCameraRequest(data);
        break;
      case 'PHOTO_LIBRARY_REQUEST':
        handlePhotoLibraryRequest(data);
        break;
      case 'NATIVE_SHARE':
        handleNativeShare(data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const handleCameraRequest = async (data: CameraRequestData) => {
    try {
      let granted = false;
      try {
        // @ts-ignore - API compatibility across versions
        const permission = await Camera.requestCameraPermissionsAsync();
        granted = permission.granted;
      } catch {
        // Fallback for different API versions
        granted = true;
      }

      if (!granted) {
        sendMessageToWeb('CAMERA_RESPONSE', {
          requestId: data.requestId,
          error: 'Camera permission denied',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled) {
        sendMessageToWeb('CAMERA_RESPONSE', {
          requestId: data.requestId,
          canceled: true,
        });
        return;
      }

      const asset = result.assets[0];
      sendMessageToWeb('CAMERA_RESPONSE', {
        requestId: data.requestId,
        base64: asset.base64,
        uri: asset.uri,
      });
    } catch (error) {
      sendMessageToWeb('CAMERA_RESPONSE', {
        requestId: data.requestId,
        error: (error as Error).message,
      });
    }
  };

  const handlePhotoLibraryRequest = async (data: PhotoLibraryRequestData) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        sendMessageToWeb('PHOTO_LIBRARY_RESPONSE', {
          requestId: data.requestId,
          error: 'Photo library permission denied',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.8,
      });

      if (result.canceled) {
        sendMessageToWeb('PHOTO_LIBRARY_RESPONSE', {
          requestId: data.requestId,
          canceled: true,
        });
        return;
      }

      const asset = result.assets[0];
      sendMessageToWeb('PHOTO_LIBRARY_RESPONSE', {
        requestId: data.requestId,
        base64: asset.base64,
        uri: asset.uri,
      });
    } catch (error) {
      sendMessageToWeb('PHOTO_LIBRARY_RESPONSE', {
        requestId: data.requestId,
        error: (error as Error).message,
      });
    }
  };

  const handleNativeShare = async (data: NativeShareRequestData) => {
    try {
      // Share functionality - can be expanded with react-native-share
      console.log('Share request:', data);
      sendMessageToWeb('SHARE_RESPONSE', {
        requestId: data.requestId,
        success: true,
      });
    } catch (error) {
      sendMessageToWeb('SHARE_RESPONSE', {
        requestId: data.requestId,
        error: (error as Error).message,
      });
    }
  };

  const sendMessageToWeb = (type: string, data: Record<string, unknown>) => {
    const script = `
      window.postMessage(JSON.stringify({
        type: '${type}',
        ...${JSON.stringify(data)}
      }), '*');
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  const injectedJavaScript = `
    (function() {
      let requestId = 0;
      const pendingRequests = {};

      window.NativeBridge = {
        camera: () => {
          return new Promise((resolve, reject) => {
            const id = ++requestId;
            pendingRequests[id] = { resolve, reject };
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'CAMERA_REQUEST',
              requestId: id
            }));
          });
        },
        photoLibrary: () => {
          return new Promise((resolve, reject) => {
            const id = ++requestId;
            pendingRequests[id] = { resolve, reject };
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PHOTO_LIBRARY_REQUEST',
              requestId: id
            }));
          });
        }
      };

      window.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, requestId, ...rest } = data;

          if (type.includes('RESPONSE') && requestId && pendingRequests[requestId]) {
            const { resolve, reject } = pendingRequests[requestId];
            delete pendingRequests[requestId];

            if (rest.error) {
              reject(new Error(rest.error));
            } else {
              resolve(rest);
            }
          }
        } catch (e) {
          console.error('Error processing native bridge message:', e);
        }
      });

      // Signal to web app that native bridge is ready
      document.dispatchEvent(new CustomEvent('NativeBridgeReady', { detail: { isNative: true } }));
    })();
  `;

  return (
    <View style={styles.container}>
      <StatusBar />
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
        onMessage={handleMessage}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        incognito={false}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        scalesPageToFit={true}
        allowFileAccess={true}
        mixedContentMode="always"
        userAgent="FitnessAI/1.0 (iOS; Mobile)"
        contentMode="recommended"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
