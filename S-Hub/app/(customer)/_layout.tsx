import { Stack } from 'expo-router';
import RequireSignedIn from '@/components/RequireSignedIn';

export default function CustomerLayout() {
  return (
    <RequireSignedIn>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireSignedIn>
  );
}
