import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
export default function AccountScreen(){
  return (
    <View style={{flex:1,backgroundColor:'#000',padding:20,justifyContent:'center'}}>
      <Text style={{color:'#fff',fontSize:24,fontWeight:'700',marginBottom:12}}>Account</Text>
      <Pressable onPress={() => router.push('/settings')}
        style={{backgroundColor:'#F4C542',padding:14,borderRadius:10}}>
        <Text style={{textAlign:'center',fontWeight:'700'}}>Settings</Text>
      </Pressable>
    </View>
  );
}
