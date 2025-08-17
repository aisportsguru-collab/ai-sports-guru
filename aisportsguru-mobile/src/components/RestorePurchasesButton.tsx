// src/components/RestorePurchasesButton.tsx
import React from 'react';
import { Alert, Button } from 'react-native';
import { usePro } from '../providers/ProProvider';

export default function RestorePurchasesButton() {
  const { restore } = usePro();
  return (
    <Button
      title="Restore Purchases"
      onPress={async () => {
        try {
          await restore();
          Alert.alert('Success', 'Purchases restored.');
        } catch (e: any) {
          Alert.alert('Restore failed', String(e?.message || e));
        }
      }}
    />
  );
}
