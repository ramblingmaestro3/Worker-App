/** {name, component} list for the auth flow (Splash, Onboarding, SignIn/Up, OTP, reset, become-worker, verification). Spread into RootNavigator. */
import type { ComponentType } from 'react';
import Onboarding from '@/screens/auth/Onboarding';
import SignIn from '@/screens/auth/SignIn';
import SignUp from '@/screens/auth/SignUp';
import OtpVerification from '@/screens/auth/OtpVerification';
import ResetPassword from '@/screens/auth/ResetPassword';
import BecomeWorker from '@/screens/auth/BecomeWorker';
import WorkerGate from '@/screens/auth/WorkerGate';
import VerificationPending from '@/screens/auth/VerificationPending';
import Verified from '@/screens/auth/Verified';
import type { RootStackParamList } from './types';

export const authScreens: { name: keyof RootStackParamList; component: ComponentType<any> }[] = [
  { name: 'Onboarding', component: Onboarding },
  { name: 'SignIn', component: SignIn },
  { name: 'SignUp', component: SignUp },
  { name: 'OtpVerification', component: OtpVerification },
  { name: 'ResetPassword', component: ResetPassword },
  { name: 'BecomeWorker', component: BecomeWorker },
  { name: 'WorkerGate', component: WorkerGate },
  { name: 'VerificationPending', component: VerificationPending },
  { name: 'Verified', component: Verified },
];
