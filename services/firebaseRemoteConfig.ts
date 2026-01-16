import { getRemoteConfig, getValue, fetchAndActivate } from "firebase/remote-config";
import app from "./firebaseConfig";

const remoteConfig = getRemoteConfig(app);

// Default values
remoteConfig.defaultConfig = {
    "enable_phone_auth": true,
    "enable_translation": false, // Default to false to avoid 404s if not configured
    "enable_profile_translation": true
};

// Update some settings
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour

export const fetchConfig = async () => {
    try {
        await fetchAndActivate(remoteConfig);
        console.log("✅ Remote Config activated");
    } catch (err) {
        console.error("❌ Remote Config fetch failed:", err);
    }
};

export const getConfigValue = (key: string): boolean => {
    return getValue(remoteConfig, key).asBoolean();
};
