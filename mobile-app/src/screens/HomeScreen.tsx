import { View, Text, StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"
import { Colors, Spacing, Typography } from "@src/theme"

export default function HomeScreen() {
  const { t } = useTranslation()
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("home.title")}</Text>
      <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, justifyContent: "center" },
  title: { ...Typography.title, color: Colors.foreground, marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.muted },
})
