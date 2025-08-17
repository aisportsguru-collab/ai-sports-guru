import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  style?: any;
}) {
  const handle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onPress();
  };

  return (
    <TouchableOpacity
      onPress={handle}
      disabled={disabled}
      style={[styles.btn, disabled && styles.btnDisabled, style]}
    >
      <Text style={styles.txt}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#3fc060',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  txt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
