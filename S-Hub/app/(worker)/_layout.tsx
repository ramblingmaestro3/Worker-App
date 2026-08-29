import { Stack } from 'expo-router';
import RequireVerifiedWorker from '@/components/RequireVerifiedWorker';

export default function WorkerLayout() {
  return (
    <RequireVerifiedWorker>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireVerifiedWorker>
  );
}
