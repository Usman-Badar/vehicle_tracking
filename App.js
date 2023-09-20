import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import Auth from './screens/Auth';
import Map from './screens/Map';
import History from './screens/History';
import ErrorPage from './screens/ErrorPage';
import HistoryDetails from './screens/HistoryDetails';

const Stack = createNativeStackNavigator();

export default function App() {
  useKeepAwake();
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={Auth} />
        <Stack.Screen name="Map" component={Map} />
        <Stack.Screen name="History" component={History} />
        <Stack.Screen name="HistoryDetails" component={HistoryDetails} />
        <Stack.Screen name="Error" component={ErrorPage} />
      </Stack.Navigator>
      <StatusBar style="light" backgroundColor='#000' />
    </NavigationContainer>
  );
}
