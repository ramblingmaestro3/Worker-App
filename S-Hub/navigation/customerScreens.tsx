/** {name, component} list for client-only pushed screens (PostAJob, BidComparison, Chat, WorkerProfile, Search, ...). Spread into RootNavigator. */
import BidComparison from '@/screens/customer/BidComparison';
import Chat from '@/screens/customer/Chat';
import FindingWorker from '@/screens/customer/FindingWorker';
import LocationPicker from '@/screens/customer/LocationPicker';
import Notifications from '@/screens/customer/Notifications';
import PostAJob from '@/screens/customer/PostAJob';
import ProfileEdit from '@/screens/customer/ProfileEdit';
import Promotions from '@/screens/customer/Promotions';
import SavedLocations from '@/screens/customer/SavedLocations';
import Search from '@/screens/customer/Search';
import WorkerProfile from '@/screens/customer/WorkerProfile';
import type { ComponentType } from 'react';
import type { RootStackParamList } from './types';

export const customerScreens: { name: keyof RootStackParamList; component: ComponentType<any> }[] = [
  { name: 'BidComparison', component: BidComparison },
  { name: 'Chat', component: Chat },
  { name: 'FindingWorker', component: FindingWorker },
  { name: 'LocationPicker', component: LocationPicker },
  { name: 'Notifications', component: Notifications },
  { name: 'PostAJob', component: PostAJob },
  { name: 'ProfileEdit', component: ProfileEdit },
  { name: 'Promotions', component: Promotions },
  { name: 'SavedLocations', component: SavedLocations },
  { name: 'Search', component: Search },
  { name: 'WorkerProfile', component: WorkerProfile },
];
