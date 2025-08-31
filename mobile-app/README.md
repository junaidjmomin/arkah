# Crowd Reporting Mobile (Expo)

Scaffolded Expo app with:
- i18n (en/es/fr) using i18next + expo-localization
- Theming with 5-color palette (primary, background, foreground, muted, alert)
- Bottom tabs: Home, Report, Map

Next steps:
1) Add media capture + geolocation to Report (expo-image-picker, expo-camera, expo-location).
2) Implement offline queue (SQLite/AsyncStorage) + sync to your web APIs.
3) Add map (react-native-maps) and fetch layers from /api/dashboard/*.

Run locally:
- cd mobile-app
- npm install
- npm run start
- Use Expo Go or run on a simulator (npm run ios / npm run android)
