import type { ComponentType } from 'react';
import { withVerifiedWorker } from '@/components/RequireVerifiedWorker';
import SubmitBid from '@/screens/worker/SubmitBid';
import WorkerAvailability from '@/screens/worker/WorkerAvailability';
import WorkerNotifications from '@/screens/worker/WorkerNotifications';
import WorkerPersonalInfo from '@/screens/worker/WorkerPersonalInfo';
import WorkerPricing from '@/screens/worker/WorkerPricing';
import WorkerSkills from '@/screens/worker/WorkerSkills';
import type { RootStackParamList } from '@/navigation/types';

export const workerScreens: { name: keyof RootStackParamList; component: ComponentType<any> }[] = [
  { name: 'SubmitBid', component: withVerifiedWorker(SubmitBid) },
  { name: 'WorkerAvailability', component: withVerifiedWorker(WorkerAvailability) },
  { name: 'WorkerNotifications', component: withVerifiedWorker(WorkerNotifications) },
  { name: 'WorkerPersonalInfo', component: withVerifiedWorker(WorkerPersonalInfo) },
  { name: 'WorkerPricing', component: withVerifiedWorker(WorkerPricing) },
  { name: 'WorkerSkills', component: withVerifiedWorker(WorkerSkills) },
];
