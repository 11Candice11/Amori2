import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ChatStackParamList } from '../../../navigation/ChatStackParamList';

import { ChatHomeScreen } from '../screens/ChatHomeScreen';
import { ChatComposeScreen } from '../screens/ChatComposeScreen';
import { ChatPreviewScreen } from '../screens/ChatPreviewScreen';
import { ChatSentScreen } from '../screens/ChatSentScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';
import { ChatResolveScreen } from '../screens/ChatResolveScreen';
import { ChatDraftsScreen } from '../screens/ChatDraftsScreen';
import { ChatListScreen } from '../screens/ChatListScreen';
import { ChatResolvedScreen } from '../screens/ChatResolvedScreen';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="ChatHome" component={ChatHomeScreen} />
      <Stack.Screen name="ChatCompose" component={ChatComposeScreen} />
      <Stack.Screen name="ChatPreview" component={ChatPreviewScreen} />
      <Stack.Screen name="ChatSent" component={ChatSentScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="ChatResolve" component={ChatResolveScreen} />
      <Stack.Screen name="ChatDrafts" component={ChatDraftsScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatResolved" component={ChatResolvedScreen} />
    </Stack.Navigator>
  );
}
