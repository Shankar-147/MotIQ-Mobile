import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/lib/auth';
import { colors } from './src/lib/theme';
import { AuthStackParams, PaymentsStackParams } from './src/navigation';
import LoginScreen from './src/screens/LoginScreen';
import OtpScreen from './src/screens/OtpScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import NewPaymentScreen from './src/screens/NewPaymentScreen';
import PaymentDetailScreen from './src/screens/PaymentDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const PaymentsStack = createNativeStackNavigator<PaymentsStackParams>();
const Tabs = createBottomTabNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: colors.card },
  headerTitleStyle: { color: colors.ink, fontWeight: '700' as const },
  headerTintColor: colors.brand,
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={headerStyle}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Otp" component={OtpScreen} options={{ title: 'Verify number' }} />
    </AuthStack.Navigator>
  );
}

function PaymentsNavigator() {
  return (
    <PaymentsStack.Navigator screenOptions={headerStyle}>
      <PaymentsStack.Screen
        name="PaymentsList"
        component={PaymentsScreen}
        options={{ title: 'Payments' }}
      />
      <PaymentsStack.Screen
        name="NewPayment"
        component={NewPaymentScreen}
        options={{ title: 'New payment' }}
      />
      <PaymentsStack.Screen
        name="PaymentDetail"
        component={PaymentDetailScreen}
        options={{ title: 'Payment' }}
      />
    </PaymentsStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        ...headerStyle,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarIconStyle: { display: 'none' },
        tabBarItemStyle: { justifyContent: 'center' },
      }}
    >
      <Tabs.Screen
        name="Payments"
        component={PaymentsNavigator}
        options={{ headerShown: false }}
      />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <NavigationContainer>{user ? <MainTabs /> : <AuthNavigator />}</NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
