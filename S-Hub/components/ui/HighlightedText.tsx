import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { COLORS } from '@/constants/theme';

type Props = {
  text: string;
  query: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/** Renders `text` with every case-insensitive occurrence of `query` visually highlighted — used for as-you-type search results. Renders plain text when the query is empty. */
export default function HighlightedText({ text, query, style, numberOfLines }: Props) {
  const q = query.trim();
  if (!q) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const segments: { text: string; match: boolean }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const idx = lowerText.indexOf(lowerQuery, cursor);
    if (idx === -1) {
      segments.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (idx > cursor) segments.push({ text: text.slice(cursor, idx), match: false });
    segments.push({ text: text.slice(idx, idx + q.length), match: true });
    cursor = idx + q.length;
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) => (seg.match ? <Text key={i} style={styles.match}>{seg.text}</Text> : <Text key={i}>{seg.text}</Text>))}
    </Text>
  );
}

const styles = StyleSheet.create({
  match: { backgroundColor: COLORS.primaryLight, color: COLORS.primary, fontWeight: '800' },
});
