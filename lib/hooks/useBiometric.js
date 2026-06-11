import { useState, useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import { Platform, Alert } from "react-native";

export const useBiometric = () => {
  const [checking, setChecking] = useState(false);

  const checkSupport = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes =
      await LocalAuthentication.supportedAuthenticationTypesAsync();

    const hasFaceId = supportedTypes.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    );
    const hasFingerprint = supportedTypes.includes(
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    );
    const hasIris = supportedTypes.includes(
      LocalAuthentication.AuthenticationType.IRIS,
    );

    let biometricType = "unknown";
    if (Platform.OS === "ios" && hasFaceId) biometricType = "faceId";
    else if (hasFingerprint) biometricType = "fingerprint";
    else if (hasIris) biometricType = "iris";

    return {
      hasHardware,
      isEnrolled,
      available: hasHardware && isEnrolled,
      biometricType,
      hasFaceId,
      hasFingerprint,
      hasIris,
    };
  }, []);

  const authenticate = useCallback(
    async (promptMessage = "Authenticate to continue") => {
      setChecking(true);
      try {
        const support = await checkSupport();
        if (!support.available) {
          return {
            success: false,
            error: "Biometric not available or not enrolled.",
          };
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage,
          fallbackLabel: "Use PIN",
          disableDeviceFallback: false,
          cancelLabel: "Cancel",
        });

        return { success: result.success, error: result.error };
      } catch (e) {
        return { success: false, error: e.message };
      } finally {
        setChecking(false);
      }
    },
    [checkSupport],
  );

  const authenticateWithAlert = useCallback(
    async (promptMessage) => {
      const result = await authenticate(promptMessage);
      if (
        !result.success &&
        result.error !== "user_cancel" &&
        result.error !== "system_cancel"
      ) {
        Alert.alert(
          "Authentication Failed",
          "Biometric authentication failed. Please try again or use your PIN.",
        );
      }
      return result;
    },
    [authenticate],
  );

  return { checkSupport, authenticate, authenticateWithAlert, checking };
};
