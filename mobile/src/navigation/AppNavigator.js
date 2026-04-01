import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import WatchScreen from "../screens/WatchScreen";

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0a0a0f" },
        headerTintColor: "#fff",
        tabBarStyle: { backgroundColor: "#0a0a0f", borderTopColor: "#1f2937" },
        tabBarActiveTintColor: "#dc2626",
        tabBarInactiveTintColor: "#9ca3af",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color }}>Home</Text>,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color }}>Find</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: "#0a0a0f",
            card: "#0a0a0f",
            text: "#fff",
            border: "#1f2937",
            primary: "#dc2626",
          },
        }}
      >
        <RootStack.Navigator>
          <RootStack.Screen
            name="Browse"
            component={HomeTabs}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="Watch"
            component={WatchScreen}
            options={{
              headerStyle: { backgroundColor: "#0a0a0f" },
              headerTintColor: "#fff",
              title: "Watch",
            }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default AppNavigator;
