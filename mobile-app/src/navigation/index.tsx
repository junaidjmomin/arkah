import { Colors } from "@src/theme"
import HomeScreen from "@src/screens/HomeScreen"
import ReportScreen from "@src/screens/ReportScreen"
import MapScreen from "@src/screens/MapScreen"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { NavigationContainer, DefaultTheme, type Theme } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

const Tab = createBottomTabNavigator()

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: Colors.background, primary: Colors.primary, text: Colors.foreground },
}

export default function RootNavigation() {
  const { t } = useTranslation()
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerTitleAlign: "center",
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.muted,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("nav.home"), tabBarLabel: t("nav.home") }} />
        <Tab.Screen
          name="Report"
          component={ReportScreen}
          options={{ title: t("nav.report"), tabBarLabel: t("nav.report") }}
        />
        <Tab.Screen name="Map" component={MapScreen} options={{ title: t("nav.map"), tabBarLabel: t("nav.map") }} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
