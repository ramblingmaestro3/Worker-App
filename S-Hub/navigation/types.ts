import type { NavigatorScreenParams } from '@react-navigation/native';

export type CustomerTabParamList = {
  home: undefined;
  bookings: undefined;
  messages: undefined;
  profile: undefined;
};

export type CustomerTabKey = keyof CustomerTabParamList;

export type WorkerTabParamList = {
  'worker-dashboard': undefined;
  'worker-jobs': undefined;
  'worker-messages': undefined;
  'worker-profile-settings': undefined;
};

export type WorkerTabKey = keyof WorkerTabParamList;

export type RootStackParamList = {
  Splash: undefined;

  // Auth
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  OtpVerification: { identifier?: string; mode?: 'phone' | 'email' };
  ResetPassword: undefined;
  BecomeWorker: undefined;
  WorkerGate: undefined;
  VerificationPending: undefined;
  Verified: undefined;

  // Customer
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList>;
  BidComparison: { requestId: string };
  Chat: { bookingId: string };
  FindingWorker: { service?: string; jobTitle?: string };
  LocationPicker: { lat?: string; lng?: string };
  Notifications: undefined;
  PostAJob: { category?: string };
  ProfileEdit: undefined;
  Promotions: undefined;
  SavedLocations: undefined;
  Search: { q?: string };
  WorkerProfile: { id: string };

  // Worker
  WorkerTabs: NavigatorScreenParams<WorkerTabParamList>;
  SubmitBid: { requestId?: string };
  WorkerAvailability: undefined;
  WorkerNotifications: undefined;
  WorkerPersonalInfo: undefined;
  WorkerPricing: undefined;
  WorkerSkills: undefined;

  // Common
  AiAssistant: undefined;
  Safety: undefined;
  Settings: undefined;
  Support: undefined;
  Terms: undefined;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}
