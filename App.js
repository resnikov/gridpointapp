import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

import ConvertScreen from './src/screens/ConvertScreen';
import ARScreen from './src/screens/ARScreen';
import MapScreen from './src/screens/MapScreen';
import HomeScreen from './src/screens/HomeScreen';
import P2PScreen from './src/screens/P2PScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from './src/utils/theme';
import { SettingsProvider } from './src/utils/SettingsContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  'LOCATE': '⊛',
  'FIND':   '⊕',
  'P2P':    '⇌',
  'AR':     '◎',
  'MAP':    '▦',
  'CONFIG': '≡',
};

function TabIcon({ label, focused }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 16, color: focused ? colors.accent : colors.textDim }}>
        {TAB_ICONS[label]}
      </Text>
      <Text style={{
        fontSize: 8,
        fontFamily: 'Courier',
        letterSpacing: 1.5,
        color: focused ? colors.accent : colors.textDim,
      }}>
        {label}
      </Text>
    </View>
  );
}

function ConvertStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConvertMain" component={ConvertScreen} />
      <Stack.Screen
        name="AR"
        component={ARScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <StatusBar style="light" backgroundColor={colors.bg} />
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: colors.accent,
              background: colors.bg,
              card: colors.bgCard,
              text: colors.text,
              border: colors.border,
              notification: colors.accent,
            },
          }}
        >
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarShowLabel: false,
              tabBarStyle: {
                backgroundColor: colors.bgCard,
                borderTopColor: colors.border,
                borderTopWidth: 1,
                height: 60,
                paddingBottom: 4,
              },
              tabBarIcon: ({ focused }) => (
                <TabIcon label={route.name} focused={focused} />
              ),
            })}
          >
            <Tab.Screen name="LOCATE" component={HomeScreen} />
            <Tab.Screen name="FIND" component={ConvertStack} />
            <Tab.Screen name="P2P" component={P2PScreen} />
            <Tab.Screen name="AR" component={ARScreen} />
            <Tab.Screen name="MAP" component={MapScreen} />
            <Tab.Screen name="CONFIG" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
