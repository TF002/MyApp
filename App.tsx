/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View, Button, Linking, Alert, ScrollView, Text } from 'react-native';
import { launchAuthApp ,useAuthListener} from 'react-native-one-tap-auth';
import React from 'react';
import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = "http://59.36.210.102:8064";
const BACKDOOR_VERIFICATION_CODE = "000000";
const USER_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxMDAyMTU3NTU0LCJ2ZXJzaW9uIjoxLCJkZXZpY2VfaWQiOiIxYmVkODRhNDdlNDgwNzQ3MGYyNDFhMzg3NmQ3MjIzMSIsImRldmljZV9icmFuZCI6InNhbXN1bmcgR2FsYXh5IE5vdGUxMCsgNUciLCJpYXQiOjE3NTA5OTEzODA1MjcsImV4cCI6MTc1MTU5NjE4MDUyN30.khoaf-nAFRhIJVzkAqfpeUk8gQdglrVDO451hob9TGY";

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

async function oauth2Token(client: AxiosInstance, clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<any> {
  const response = await client.post("/oauth2/token", {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  if (!response.data?.data) {
    throw new Error("Invalid token response");
  }
  return response.data.data;
}

async function getUserInfo(client: AxiosInstance, accessToken: string): Promise<any> {
  const response = await client.get("/oauth2/user_info", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.data) {
    throw new Error("Failed to get user info");
  }
  return response.data;
}

async function getClientInfo(client: AxiosInstance, clientId: string): Promise<any> {
  const response = await client.get("/oauth2/client_info", {
    params: {
      client_id: clientId,
    },
  });
  if (!response.data) {
    throw new Error("Failed to get client info");
  }
  return response.data;
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [result, setResult] = React.useState("");
  const [clientId, setClientId] = React.useState("");


  const handleOAuth2Test = async () => {
    const client = axios.create({
      baseURL: BACKEND_URL,
      validateStatus: () => true,
      headers: {
        "Content-Type": "application/json",
        "CL-Request-Id": `test_${nowMillis()}_${randomHex(8)}`,
      },
    });
    const authClient = axios.create({
      maxRedirects: 0,
      validateStatus: () => true,
    });
    try {
      setResult("Step 1: Registering developer account...\n");
      const contact = `test_${nowMillis()}@example.com`;
      const { token, userId } = await openApiRegister(client, contact, BACKDOOR_VERIFICATION_CODE);
      setResult(prev => prev + `Developer registered successfully - User ID: ${userId}\n`);

      setResult(prev => prev + "\nStep 2: Creating OAuth2 client...\n");
      const clientName = `Test_${nowMillis()}`;
      const redirectUri = "com.chainlessandroid.app://login";
      const logoUri = "https://bafybeifl3liunlo4c5dyexwa2m442c2dflzvyoxxqwtvefc456nr2errki.ipfs.nftstorage.link/15.png";
      const scope = "profile openid";
      console.log('222222',{client, token, clientName, redirectUri, scope, logoUri});
      const oauthClient = await oauth2CreateClient(client, token, clientName, redirectUri, scope, logoUri);
      setResult(prev => prev + `OAuth2 client created: ${JSON.stringify(oauthClient)}\n`);
        console.log('oauthClient',oauthClient.client_id)
    setClientId(oauthClient.client_id)

    //   setResult(prev => prev + "\nStep 2.1: Getting OAuth2 client info...\n");
    //   const clientInfo = await getClientInfo(client, oauthClient.client_id);
    //   setResult(prev => prev + `clientInfo->client_name: ${clientInfo.data.client_name}\n`);
    //   setResult(prev => prev + `clientInfo->redirect_uri: ${clientInfo.data.redirect_uri}\n`);
    //   setResult(prev => prev + `clientInfo->logo_uri: ${clientInfo.data.logo_uri}\n`);

    //   setResult(prev => prev + "\nStep 3: Initiating authorization...\n");
    //   const authParams = new URLSearchParams({
    //     client_id: oauthClient.client_id,
    //     nonce: randomHex(16),
    //     redirect_uri: redirectUri,
    //     response_type: "code",
    //     scope,
    //     state: randomHex(16),
    //   });
    //   const authResponse = await authClient.get(
    //     `${BACKEND_URL}/oauth2/auth?${authParams.toString()}`,
    //     {
    //       headers: {
    //         Authorization: `Bearer ${USER_TOKEN}`,
    //       },
    //     }
    //   );
    //   if (!authResponse.headers.location) {
    //     throw new Error("No redirect location in authorization response");
    //   }
    //   const redirectUrl = new URL(authResponse.headers.location);
    //   const code = redirectUrl.searchParams.get("code");
    //   if (!code) {
    //     throw new Error("No authorization code in redirect URL");
    //   }
    //   setResult(prev => prev + `Authorization code obtained: ${code}\n`);

    //   setResult(prev => prev + "\nStep 4: Exchanging code for access token...\n");
    //   const tokenResponse = await oauth2Token(client, oauthClient.client_id, oauthClient.client_secret, code, redirectUri);
    //   setResult(prev => prev + `Access token obtained: ${tokenResponse.access_token}\n`);

    //   setResult(prev => prev + "\nStep 5: Getting user information...\n");
    //   const userInfo = await getUserInfo(client, tokenResponse.access_token);
    //   setResult(prev => prev + `User info: ${JSON.stringify(userInfo)}\n`);
    //   setResult(prev => prev + "\nOAuth2 authentication test completed successfully!\n");
    //   Alert.alert("Success", "OAuth2 authentication test completed successfully!");
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
    const url = 'com.chainlessandroid.app://login?clientId='+clientId;
    launchAuthApp({
        authAppUrl:url
    })
  };

   // 监听 token 回调
  useAuthListener(({ token }) => {
    console.log('✅ 收到 token:', token);
    // 你可以在这里自动登录、发请求等
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Button title="测试 OAuth2 流程" onPress={handleOAuth2Test} />
      <View style={{ height: 20 }} />
      <View style={{ marginTop: 20, width: '90%' }}>
        <Text selectable style={{ fontSize: 12 }}>{result}</Text>
      </View>
      <Button title="唤起另一个App" onPress={handleOpenOtherApp} />
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
