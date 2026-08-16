import { COLORS } from '@/constants/theme';
import { useUnreadMessages } from '@/contexts/unread-messages';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { messagingSocket } from '../lib/messaging';

/** Extra lift above the keyboard/header measurement so the input bar and send button clear both comfortably. */
const EXTRA_LIFT = 16;

type ChatMessage = { id:number; conversationId:number; senderId:number; message:string; createdAt?:string; status:string };

export default function ChatScreen() {
  const { conversationId, name, userId } = useLocalSearchParams<{conversationId?:string;name?:string;userId?:string}>();
  const partnerId = userId ? Number(userId) : undefined;
  const [convId,setConvId] = useState<number | undefined>(conversationId ? Number(conversationId) : undefined);
  const [myId,setMyId] = useState<number | undefined>(undefined);
  const [messages,setMessages]=useState<ChatMessage[]>([]); const [text,setText]=useState(''); const [typing,setTyping]=useState(false); const [sending,setSending]=useState(false); const list=useRef<FlatList>(null);
  const [headerHeight,setHeaderHeight]=useState(0);
  const { markConversationRead }=useUnreadMessages();

  /** Own id is needed to tell sent bubbles from received ones — the route only carries the other party's id. */
  useEffect(()=>{ api.getMe().then(r=>setMyId(r.user?.id)).catch(()=>{}); },[]);

  useEffect(()=>{
    if(!convId)return;
    api.getConversationMessages(convId).then(r=>{setMessages(r.items.slice().reverse()); api.markConversationRead(convId); markConversationRead(convId);});
    const socket=messagingSocket();
    const incoming=(m:ChatMessage)=>{if(m.conversationId===convId){setMessages(p=>p.some(x=>x.id===m.id)?p:[...p,m]); api.markMessageRead(m.id); markConversationRead(convId);}};
    const started=(e:any)=>e.conversationId===convId&&setTyping(true);
    const stopped=(e:any)=>e.conversationId===convId&&setTyping(false);
    const receipt=(e:any)=>setMessages(p=>p.map(m=>m.id===e.messageId?{...m,status:'read'}:m));
    socket?.on('message:new',incoming);socket?.on('typing:start',started);socket?.on('typing:stop',stopped);socket?.on('message:read',receipt);
    return()=>{socket?.off('message:new',incoming);socket?.off('typing:start',started);socket?.off('typing:stop',stopped);socket?.off('message:read',receipt);};
  },[convId]);

  /** No conversation exists yet (fresh "Message" from a profile) — pick it up if the other party writes first. */
  useEffect(()=>{
    if(convId||!partnerId)return;
    const socket=messagingSocket();
    const incoming=(m:ChatMessage)=>{if(m.senderId===partnerId)setConvId(m.conversationId);};
    socket?.on('message:new',incoming);
    return()=>{socket?.off('message:new',incoming);};
  },[convId,partnerId]);

  const send=async()=>{
    const message=text.trim();
    if(!message||sending)return;
    setText(''); setSending(true);
    try{
      const result=await api.sendMessage(convId?{conversationId:convId,message}:{receiverId:partnerId,message});
      setMessages(p=>[...p,result.message]);
      const activeConvId=convId ?? result.message.conversationId;
      if(!convId&&result.message.conversationId)setConvId(result.message.conversationId);
      messagingSocket()?.emit('typing:stop',{conversationId:activeConvId});
    }catch{setText(message);}finally{setSending(false);}
  };

  return <SafeAreaView style={s.safe}><View style={s.header} onLayout={e=>setHeaderHeight(e.nativeEvent.layout.height)}><TouchableOpacity onPress={()=>router.back()}><Ionicons name="arrow-back" size={24}/></TouchableOpacity><View style={s.avatar}><Text style={s.avatarText}>{(name||'?').slice(0,2).toUpperCase()}</Text></View><View><Text style={s.name}>{name||'Conversation'}</Text><Text style={s.status}>{typing?'typing…':'Private conversation'}</Text></View></View><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={headerHeight+EXTRA_LIFT}><FlatList ref={list} data={messages} keyExtractor={m=>String(m.id)} onContentSizeChange={()=>list.current?.scrollToEnd({animated:true})} contentContainerStyle={s.list} ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>Say hello to start the conversation.</Text></View>} renderItem={({item})=>{const mine=myId!=null&&item.senderId===myId;return <View style={[s.wrap,mine&&s.mine]}><View style={[s.bubble,mine?s.bubbleMine:s.bubbleTheirs]}><Text style={mine?s.mineText:s.theirsText}>{item.message}</Text></View><Text style={s.time}>{item.createdAt?new Date(item.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''} {mine?item.status:''}</Text></View>;}}/><View style={s.inputBar}><TextInput value={text} onChangeText={v=>{setText(v); if(convId)messagingSocket()?.emit(v?'typing:start':'typing:stop',{conversationId:convId});}} placeholder="Type message" multiline style={s.input}/><TouchableOpacity onPress={send} style={s.send}><Ionicons name="send" color="#fff" size={19}/></TouchableOpacity></View></KeyboardAvoidingView></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#F5F5F0'},header:{backgroundColor:'#fff',padding:12,flexDirection:'row',alignItems:'center',gap:10},avatar:{height:40,width:40,borderRadius:20,backgroundColor:COLORS.primary+'20',alignItems:'center',justifyContent:'center'},avatarText:{color:COLORS.primary,fontWeight:'800'},name:{fontWeight:'700',fontSize:16},status:{fontSize:12,color:COLORS.muted},list:{padding:14,flexGrow:1},empty:{flex:1,alignItems:'center',justifyContent:'center',paddingTop:60},emptyText:{color:COLORS.muted,fontSize:13},wrap:{maxWidth:'80%',marginBottom:10},mine:{alignSelf:'flex-end',alignItems:'flex-end'},bubble:{padding:11,borderRadius:16},bubbleMine:{backgroundColor:COLORS.primary},bubbleTheirs:{backgroundColor:'#fff'},mineText:{color:'#fff'},theirsText:{color:'#1A1A1A'},time:{fontSize:10,color:COLORS.muted,marginTop:3},inputBar:{flexDirection:'row',backgroundColor:'#fff',padding:10,paddingBottom:10+EXTRA_LIFT,gap:8,alignItems:'flex-end'},input:{flex:1,fontSize:14,color:COLORS.muted},send:{width:42,height:42,borderRadius:21,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center'}});
