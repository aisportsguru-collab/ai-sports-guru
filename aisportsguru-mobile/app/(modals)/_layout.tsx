import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerShown: false,
        animation: 'slide_from_bottom',
        // Dim the backdrop behind the sheet
        contentStyle: { backgroundColor: 'rgba(0,0,0,0.35)' },
      }}
    />
  );
}
