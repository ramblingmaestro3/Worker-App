/** {name, component} list for screens both client and worker use (JobDetail, AiAssistant, Settings, Support, Safety, Terms). Spread into RootNavigator. */
import type { ComponentType } from 'react';
import Splash from '@/screens/common/Splash';
import AiAssistant from '@/screens/common/AiAssistant';
import JobDetail from '@/screens/common/JobDetail';
import Safety from '@/screens/common/Safety';
import Settings from '@/screens/common/Settings';
import Support from '@/screens/common/Support';
import Terms from '@/screens/common/Terms';
import type { RootStackParamList } from './types';

export const commonScreens: { name: keyof RootStackParamList; component: ComponentType<any> }[] = [
  { name: 'Splash', component: Splash },
  { name: 'AiAssistant', component: AiAssistant },
  { name: 'JobDetail', component: JobDetail },
  { name: 'Safety', component: Safety },
  { name: 'Settings', component: Settings },
  { name: 'Support', component: Support },
  { name: 'Terms', component: Terms },
];
