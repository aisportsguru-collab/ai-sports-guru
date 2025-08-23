import { Slot } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function HomeGroupLayout(){
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#000' }} edges={['top','bottom']}>
      <Slot />
    </SafeAreaView>
  );
}
