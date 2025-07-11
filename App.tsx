/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View, Button, Image, Alert, ScrollView, Text } from 'react-native';
import { useLaunchAuthApp} from 'react-native-one-tap-auth';
import React from 'react';
import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = "http://59.36.210.102:8064";
const BACKDOOR_VERIFICATION_CODE = "000000";

function randomHex(length: number): string {
  let result = '';
  const chars = 'abcdef0123456789';
  for (let i = 0; i < length * 2; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function nowMillis(): number {
  return Date.now();
}

function parseResponseData(dataString: string | object): any {
  try {
    if (typeof dataString === "string") {
      return JSON.parse(dataString);
    }
    return dataString;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse response data: ${error.message}`);
    } else {
      throw new Error(`Failed to parse response data: Unknown error`);
    }
  }
}

async function openApiRegister(client: AxiosInstance, contact: string, verificationCode: string): Promise<{ token: string; userId: number }> {
  const params = {
    contact,
    password:
      "0000000000000000000000000000000000000000000000000000000000000000",
    verificationCode,
  };
  const requestBody = {
    api: "accountRegister",
    version: "1.0",
    params: JSON.stringify(params),
  };
  const response = await client.post("/openApi/service", requestBody);
  if (!response.data || response.data.code !== 0) {
    throw new Error(
      `Registration failed: ${response.data?.msg || "Unknown error"}`
    );
  }
  const parsedData = parseResponseData(response.data.data);
  if (!parsedData?.token || !parsedData?.id) {
    throw new Error("Invalid registration response: missing token or user ID");
  }
  return {
    token: `Bearer ${parsedData.token}`,
    userId: parsedData.id,
  };
}

async function oauth2CreateClient(client: AxiosInstance, token: string, clientName: string, redirectUri: string, scope: string, logoUri: string): Promise<any> {
  const response = await client.post(
    "/oauth2/create_client",
    {
      client_name: clientName,
      redirect_uri: redirectUri,
      logo_uri: logoUri,
      scope,
    },
    {
      headers: {
        Authorization: token,
      },
    }
  );
  console.log('response11111', response);
  if (!response.data?.data) {
    throw new Error("Invalid client creation response");
  }
  return response.data.data;
}




function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [result, setResult] = React.useState("");
  const [result2, setResult2] = React.useState("");
  const [clientId, setClientId] = React.useState("");

        const { launch, AuthModal } = useLaunchAuthApp({
        clientId: clientId+'1',
        onDeepLink: (url, params) => {
            // 这里拿到被拉起时的完整链接和参数
            console.log('被拉起的链接:', url, params);
            setResult2(`\nurl：${url} \n`+  `\n params：${JSON.stringify(params)}\n`);
        }
        });


  const handleOAuth2Test = async () => {
    const client = axios.create({
      baseURL: BACKEND_URL,
      validateStatus: () => true,
      headers: {
        "Content-Type": "application/json",
        "CL-Request-Id": `test_${nowMillis()}_${randomHex(8)}`,
      },
    });
    try {
      setResult("Step 1: Registering developer account...\n");
      const contact = `test_${nowMillis()}@example.com`;
      const { token, userId } = await openApiRegister(client, contact, BACKDOOR_VERIFICATION_CODE);
      setResult(prev => prev + `Developer registered successfully - User ID: ${userId}\n`);

      setResult(prev => prev + "\nStep 2: Creating OAuth2 client...\n");
      const clientName = `菜篮子`;
      const redirectUri = "com.rnapp.app://login-callback";
      const logoUri = "https://gd-hbimg.huaban.com/310a0b014a87977d01ab0556a16eff9084b67dfb16dd6-aTU5sO_fw658webp";
      const scope = "profile openid";
      console.log('222222',{client, token, clientName, redirectUri, scope, logoUri});
      const oauthClient = await oauth2CreateClient(client, token, clientName, redirectUri, scope, logoUri);
      setResult(prev => prev + `OAuth2 client created: ${JSON.stringify(oauthClient)}\n`);
        console.log('oauthClient',oauthClient.client_id)
        setClientId(oauthClient.client_id)
 
    } catch (error) {
      if (error instanceof Error) {
        setResult(prev => prev + `\nTest failed: ${error.message}\n`);
        Alert.alert("Error", error.message);
      } else {
        setResult(prev => prev + `\nTest failed: Unknown error\n`);
        Alert.alert("Error", "Unknown error");
      }
    }
  };

  const handleOpenOtherApp = async () => { 
 
    launch().then((res)=>{
        console.log('launch',res)
    })
  };

 

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
    
        <View style={{ marginBottom: 80, width: '90%',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
         }}>
            <View>
                <Image
                source={{ uri: "https://gd-hbimg.huaban.com/310a0b014a87977d01ab0556a16eff9084b67dfb16dd6-aTU5sO_fw658webp" }}
                style={styles.image}
                resizeMode="cover" // 可选：contain, cover, stretch, center
            />
             <Text selectable style={{ fontSize: 18 ,textAlign:'center',marginTop:12}}>菜篮子</Text>
            </View>
        </View>

      <Button title="测试 OAuth2 流程" onPress={handleOAuth2Test} />
      <View style={{ height: 20 }} />
      <View style={{ marginTop: 20, width: '90%' }}>
        <Text selectable style={{ fontSize: 12 }}>注册auth2：</Text>
        <Text selectable style={{ fontSize: 12 }}>{result}</Text>
      </View>
      <Button title="使用Chainless一键登录" onPress={handleOpenOtherApp} />
        <View style={{ marginTop: 20, width: '90%' }}>
        <Text selectable style={{ fontSize: 12 }}>监听得到code：</Text>
        <Text selectable style={{ fontSize: 12 }}>{result2}</Text>
      </View>
      {AuthModal}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10, // 可选样式
  },
});

export default App;
