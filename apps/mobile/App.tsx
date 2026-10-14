import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/lib/auth';
import { colors } from './src/lib/theme';
import { Button } from './src/components/ui';
import { AuthStackParams, CustomerStackParams } from './src/navigation';
import LoginScreen from './src/screens/LoginScreen';
import OtpScreen from './src/screens/OtpScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HomeScreen from './src/screens/customer/HomeScreen';
import NewRequestScreen from './src/screens/customer/NewRequestScreen';
import RequestDetailScreen from './src/screens/customer/RequestDetailScreen';
import RequestsScreen from './src/screens/customer/RequestsScreen';
import PaymentsScreen from './src/screens/customer/PaymentsScreen';
import PaymentDetailScreen from './src/screens/customer/PaymentDetailScreen';
import JobsScreen from './src/screens/provider/JobsScreen';
import EarningsScreen from './src/screens/provider/EarningsScreen';
import ProviderProfileScreen from './src/screens/provider/ProviderProfileScreen';

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const CustomerStack = createNativeStackNavigator<CustomerStackParams>();
const CustomerTabs = createBottomTabNavigator();
const ProviderTabs = createBottomTabNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: colors.card },
  headerTitleStyle: { color: colors.ink, fontWeight: '700' as const },
  headerTintColor: colors.brand,
};

const tabStyle = {
  ...headerStyle,
  tabBarActiveTintColor: colors.brand,
  tabBarInactiveTintColor: colors.muted,
  tabBarLabelStyle: { fontSize: 13, fontWeight: '600' as const },
  tabBarIconStyle: { display: 'none' as const },
  tabBarItemStyle: { justifyContent: 'center' as const },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={headerStyle}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Otp" component={OtpScreen} options={{ title: 'Verify number' }} />
    </AuthStack.Navigator>
  );
}

// ------------------------------------------------------------ customer

function CustomerTabsScreen() {
  return (
    <CustomerTabs.Navigator screenOptions={tabStyle}>
      <CustomerTabs.Screen
        name="Help"
        component={HomeScreen}
        options={{ title: 'MotIQ', tabBarLabel: 'Help' }}
      />
      <CustomerTabs.Screen name="Requests" component={RequestsScreen} />
      <CustomerTabs.Screen name="Payments" component={PaymentsScreen} />
      <CustomerTabs.Screen name="Profile" component={ProfileScreen} />
    </CustomerTabs.Navigator>
  );
}

function CustomerNavigator() {
  return (
    <CustomerStack.Navigator screenOptions={headerStyle}>
      <CustomerStack.Screen
        name="CustomerTabs"
        component={CustomerTabsScreen}
        options={{ headerShown: false }}
      />
      <CustomerStack.Screen name="NewRequest" component={NewRequestScreen} options={{ title: 'Request help' }} />
      <CustomerStack.Screen name="RequestDetail" component={RequestDetailScreen} options={{ title: 'Your request' }} />
      <CustomerStack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ title: 'Payment' }} />
    </CustomerStack.Navigator>
  );
}

// ------------------------------------------------------------ provider

function ProviderNavigator() {
  return (
    <ProviderTabs.Navigator screenOptions={tabStyle}>
      <ProviderTabs.Screen
        name="Jobs"
        component={JobsScreen}
        options={{ title: 'MotIQ Provider', tabBarLabel: 'Jobs' }}
      />
      <ProviderTabs.Screen name="Earnings" component={EarningsScreen} />
      <ProviderTabs.Screen name="Profile" component={ProviderProfileScreen} />
    </ProviderTabs.Navigator>
  );
}

// ---------------------------------------------------------------- admin

// Administration happens in the web console, not in the phone app.
function AdminNotice() {
  const { signOut } = useAuth();
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>
        Admin account
      </Text>
      <Text style={{ fontSize: 15, color: colors.muted, marginBottom: 24 }}>
        Admin tools are in the web console. Open it in a browser and sign in with this number.
      </Text>
      <Button title="Sign out" variant="plain" onPress={signOut} />
    </View>
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

  let screen = <AuthNavigator />;
  if (user?.role === 'user') screen = <CustomerNavigator />;
  if (user?.role === 'provider') screen = <ProviderNavigator />;
  if (user?.role === 'admin') screen = <AdminNotice />;

  return <NavigationContainer>{screen}</NavigationContainer>;
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
