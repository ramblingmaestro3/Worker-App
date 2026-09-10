/** Circular avatar + Change/Add Photo control. Picks from the library, uploads
 * to storage, and persists the URL via `onSave` (defaults to profiles.avatar_url). */
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Alert } from '@/lib/Alert';
import { COLORS } from '@/constants/theme';
import { updateProfile } from '@/lib/api/profiles';
import { uploadAvatar } from '@/lib/api/storage';
import { ensureMediaLibraryPermission } from '@/lib/mediaPermissions';

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

/**
 * Circular profile photo + "Change Photo" control. Picks from the library,
 * uploads to storage, and writes `profiles.avatar_url` immediately (so the
 * photo persists whether or not the screen has its own Save button), then
 * reports the new URL back via `onChange`. Falls back to the name's initials
 * when there's no photo.
 */
export default function ProfilePhotoPicker({
  name,
  avatarUrl,
  onChange,
  onSave = (url: string) => updateProfile({ avatar_url: url }),
  size = 88,
}: {
  name: string;
  avatarUrl: string | null;
  onChange: (url: string) => void;
  /** Persists the uploaded URL. Defaults to writing `profiles.avatar_url`. */
  onSave?: (url: string) => Promise<{ success: boolean; error?: string }>;
  size?: number;
}) {
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    if (busy) return;
    if (!(await ensureMediaLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.length) return;

    setBusy(true);
    const uploaded = await uploadAvatar(result.assets[0].uri);
    if (!uploaded.success || !uploaded.publicUrl) {
      setBusy(false);
      Alert.alert('Upload Failed', uploaded.error ?? 'Could not upload your photo. Please try again.');
      return;
    }
    const saved = await onSave(uploaded.publicUrl);
    setBusy(false);
    if (!saved.success) {
      Alert.alert('Could Not Save', saved.error ?? 'Your photo uploaded but could not be saved. Please try again.');
      return;
    }
    onChange(uploaded.publicUrl);
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
        )}
        {busy && (
          <View style={[styles.busyOverlay, { borderRadius: size / 2 }]}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.btn} activeOpacity={0.8} onPress={pick} disabled={busy}>
        <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
        <Text style={styles.btnText}>{avatarUrl ? 'Change Photo' : 'Add Photo'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  avatar: {
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.primary + '50',
    overflow: 'hidden',
  },
  initials: { fontWeight: '800', color: COLORS.primary },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  btnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
});
