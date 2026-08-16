import { COLORS } from '@/constants/theme';
import { useUnreadMessages } from '@/contexts/unread-messages';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { messagingSocket } from '../lib/messaging';

type Conversation = { id: number; partner: any; lastMessage?: string; lastMessageTime?: string; unreadCount: number };
const initials = (name = '') => name.split(' ').map((part: string) => part[0]).slice(0, 2).join('').toUpperCase();
const time = (value?: string) => value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

function ConversationRow({ conversation, unreadCount }: { conversation: Conversation; unreadCount: number }) {
  const partner = conversation.partner || {};
  const name = partner.full_name || 'Conversation';
  return <TouchableOpacity style={styles.row} onPress={() => router.push({ pathname: '/chat', params: { conversationId: conversation.id, name, userId: partner.id } } as any)}>
    <View style={styles.avatarWrap}>
      {partner.profile_picture ? <Image source={{ uri: partner.profile_picture }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.initials}>{initials(name)}</Text></View>}
      <View style={[styles.online, { backgroundColor: partner.isOnline ? '#22C55E' : 'transparent' }]} />
    </View>
    <View style={styles.content}>
      <View style={styles.top}><Text style={styles.name}>{name}</Text><Text style={styles.time}>{time(conversation.lastMessageTime)}</Text></View>
      <View style={styles.bottom}><Text numberOfLines={1} style={[styles.preview, unreadCount > 0 && styles.unreadText]}>{conversation.lastMessage || 'Start a conversation'}</Text>
      {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}</View>
    </View>
  </TouchableOpacity>;
}

export default function MessagesScreen() {
  const { unreadByConversation, refreshUnreadCount } = useUnreadMessages();
  const [items, setItems] = useState<Conversation[]>([]); const [loading, setLoading] = useState(true); const [query, setQuery] = useState('');
  const load = useCallback(async () => { try { const result = await api.getConversations(); setItems(result.items); refreshUnreadCount(); } finally { setLoading(false); } }, [refreshUnreadCount]);
  useEffect(() => { load(); const socket = messagingSocket(); socket?.on('conversation:updated', load); socket?.on('presence:online', load); socket?.on('presence:offline', load); return () => { socket?.off('conversation:updated', load); socket?.off('presence:online', load); socket?.off('presence:offline', load); }; }, [load]);
  const filtered = items.filter(item => (item.partner?.full_name || '').toLowerCase().includes(query.toLowerCase()));
  /** Opening a chat clears it from the shared context immediately (before this list re-fetches), so prefer that live value over the possibly-stale fetched one. */
  const unreadFor = (item: Conversation) => unreadByConversation[item.id] ?? item.unreadCount;
  const unread = items.reduce((count, item) => count + unreadFor(item), 0);
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><Text style={styles.title}>Messages</Text>{unread > 0 && <View style={styles.headerBadge}><Text style={styles.badgeText}>{unread}</Text></View>}</View>
    <View style={styles.search}><Ionicons name="search-outline" size={18} color={COLORS.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="Search conversations" style={styles.input}/></View>
    {loading ? <View style={styles.empty}><ActivityIndicator color={COLORS.primary}/></View> : <FlatList data={filtered} keyExtractor={item => String(item.id)} renderItem={({item}) => <ConversationRow conversation={item} unreadCount={unreadFor(item)}/>} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); load(); }}/>} ListEmptyComponent={<View style={styles.empty}><Ionicons name="chatbubbles-outline" size={52} color={COLORS.primary}/><Text style={styles.emptyTitle}>No conversations yet</Text><Text style={styles.emptySub}>Connect with a worker to start a private chat.</Text></View>}/>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#fff'},header:{padding:18,flexDirection:'row',alignItems:'center',gap:8},title:{fontSize:24,fontWeight:'800',color:'#1A1A1A'},headerBadge: {backgroundColor:COLORS.danger,borderRadius:10,minWidth:20,alignItems:'center'},search:{marginHorizontal:16,marginBottom:8,padding:11,backgroundColor:'#F2F2F2',borderRadius:12,flexDirection:'row',alignItems:'center',gap:8},input:{flex:1,fontSize:14},row:{flexDirection:'row',padding:16,gap:12,borderBottomWidth:1,borderColor:'#F1F1F1'},avatarWrap:{position:'relative'},avatar:{width:52,height:52,borderRadius:26,backgroundColor:COLORS.primary+'18',alignItems:'center',justifyContent:'center'},initials:{fontWeight:'800',color:COLORS.primary},online:{width:12,height:12,borderRadius:6,borderWidth:2,borderColor:'#fff',position:'absolute',right:0,bottom:0},content:{flex:1,justifyContent:'center'},top:{flexDirection:'row',justifyContent:'space-between'},name:{fontSize:16,fontWeight:'700'},time:{fontSize:11,color:COLORS.muted},bottom:{flexDirection:'row',alignItems:'center',gap:8,marginTop:5},preview:{flex:1,color:COLORS.muted,fontSize:13},unreadText:{fontWeight:'700',color:'#1A1A1A'},badge:{backgroundColor:COLORS.primary,minWidth:20,height:20,borderRadius:10,alignItems:'center',justifyContent:'center'},badgeText:{color:'#fff',fontSize:11,fontWeight:'800'},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:36,gap:10},emptyTitle:{fontWeight:'700',fontSize:18},emptySub:{color:COLORS.muted,textAlign:'center'}
});
