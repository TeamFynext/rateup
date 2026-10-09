/**
 * CallKeep and the VoIP push library are iOS-only here (CallKit and PushKit). On Android
 * calls ring through modules/rateup-calls instead, and CallKeep's Android library would
 * otherwise bring CALL_PHONE and READ_PHONE_NUMBERS into the app — sensitive permissions
 * a self-managed calling app does not need.
 */
module.exports = {
  dependencies: {
    "react-native-callkeep": { platforms: { android: null } },
    "react-native-voip-push-notification": { platforms: { android: null } },
  },
};
