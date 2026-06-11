import * as Device      from 'expo-device';
import * as Application from 'expo-application';
import { Platform }    from 'react-native';

let _cachedId = null;

const getDeviceId = async () => {
  if (_cachedId) return _cachedId;
  try {
    if (Platform.OS === 'ios') {
      _cachedId = Application.iosIdForVendorAsync
        ? await Application.getIosIdForVendorAsync()
        : `ios-${Date.now()}`;
    } else {
      _cachedId = Application.androidId || `android-${Date.now()}`;
    }
  } catch {
    _cachedId = `device-${Platform.OS}-${Date.now()}`;
  }
  return _cachedId;
};

export const getDeviceHeaders = async () => {
  const deviceId = await getDeviceId();
  return {
    'X-Device-Id':   deviceId,
    'X-Device-Name': Device.deviceName || Device.modelName || 'Unknown Device',
    'X-Platform':    Platform.OS,
    'X-Os-Version':  Device.osVersion  || Platform.Version?.toString() || 'unknown',
    'X-App-Version': Application.nativeApplicationVersion || '1.0.0',
  };
};

export const getDeviceInfo = async () => {
  const deviceId = await getDeviceId();
  return {
    deviceId,
    deviceName: Device.deviceName || Device.modelName || 'Unknown Device',
    platform:   Platform.OS,
    osVersion:  Device.osVersion  || Platform.Version?.toString() || 'unknown',
    appVersion: Application.nativeApplicationVersion || '1.0.0',
    brand:      Device.brand,
    modelName:  Device.modelName,
    osName:     Device.osName,
  };
};

// Basic root/jailbreak detection using expo-device
export const isDeviceRooted = () => {
  // expo-device doesn't expose root/jailbreak directly;
  // this is a best-effort check on isRooted (Android) or simulator
  if (Platform.OS === 'android') {
    return Device.isRootedExperimentalAsync?.() ?? Promise.resolve(false);
  }
  // On iOS, being on a simulator is the closest we can check without native code
  if (Platform.OS === 'ios') {
    return Promise.resolve(Device.isSimulator === true);
  }
  return Promise.resolve(false);
};
