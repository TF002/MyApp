const axios = require("axios");
const crypto = require("crypto");
const { URL } = require("url");

// Constants
const BACKEND_URL = "http://59.36.210.102:8064";
//const BACKEND_URL = "http://127.0.0.1:8064";
const BACKDOOR_VERIFICATION_CODE = "000000";
// 如果报错过期，在此更新用户的无链钱包的jwt-token
const USER_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxMDAyMTU3NTU0LCJ2ZXJzaW9uIjoxLCJkZXZpY2VfaWQiOiIxYmVkODRhNDdlNDgwNzQ3MGYyNDFhMzg3NmQ3MjIzMSIsImRldmljZV9icmFuZCI6InNhbXN1bmcgR2FsYXh5IE5vdGUxMCsgNUciLCJpYXQiOjE3NTE0Mjc1NDUyNzQsImV4cCI6MTc1MjAzMjM0NTI3NH0.6Ok9pSdAyw3mA15im1r8korYIdfe3dHHNxL8M_M-Gsk";
// Helper functions
function randomHex(length) {
  return crypto.randomBytes(length).toString("hex");
}

function nowMillis() {
  return Date.now();
}

function parseResponseData(dataString) {
  try {
    if (typeof dataString === "string") {
      return JSON.parse(dataString);
    }
    return dataString;
  } catch (error) {
    throw new Error(`Failed to parse response data: ${error.message}`);
  }
}

class Developer {
  constructor() {
    this.user = {
      contact: `test_${nowMillis()}@example.com`,
    };
    this.token = null;
    this.userId = null;
    this.client = axios.create({
      baseURL: BACKEND_URL,
      validateStatus: () => true,
      headers: {
        "Content-Type": "application/json",
        "CL-Request-Id": `test_${nowMillis()}_${randomHex(8)}`,
      },
    });
  }

  /**
   * Register a new developer account
   * @param {string} verificationCode - The verification code for registration
   * @returns {Promise<{token: string, userId: number}>} The registration result
   * @throws {Error} If registration fails or response parsing fails
   */
  async openApiRegister(verificationCode) {
    const params = {
      contact: this.user.contact,
      password:
        "0000000000000000000000000000000000000000000000000000000000000000",
      verificationCode,
    };

    const requestBody = {
      api: "accountRegister",
      version: "1.0",
      params: JSON.stringify(params),
    };

    const response = await this.client.post("/openApi/service", requestBody);

    if (!response.data || response.data.code !== 0) {
      throw new Error(
        `Registration failed: ${response.data?.msg || "Unknown error"}`
      );
    }

    const parsedData = parseResponseData(response.data.data);
    if (!parsedData?.token || !parsedData?.id) {
      throw new Error(
        "Invalid registration response: missing token or user ID"
      );
    }

    this.token = `Bearer ${parsedData.token}`;
    this.userId = parsedData.id;

    return {
      token: this.token,
      userId: this.userId,
    };
  }

  /**
   * Create a new OAuth2 client
   * @param {string} clientName - Name of the client
   * @param {string} redirectUri - Redirect URI for OAuth2 flow
   * @param {string} scope - OAuth2 scope
   * @returns {Promise<Object>} The created client information
   * @throws {Error} If client creation fails or token is missing
   */
  async oauth2CreateClient(clientName, redirectUri, scope, logoUri) {
    if (!this.token) {
      throw new Error("No token available. Please register first.");
    }

    const response = await this.client.post(
      "/oauth2/create_client",
      {
        client_name: clientName,
        redirect_uri: redirectUri,
        logo_uri: logoUri,
        scope,
      },
      {
        headers: {
          Authorization: this.token,
        },
      }
    );

    if (!response.data?.data) {
      throw new Error("Invalid client creation response");
    }

    return response.data.data;
  }

  /**
   * Exchange authorization code for access token
   * @param {string} clientId - OAuth2 client ID
   * @param {string} clientSecret - OAuth2 client secret
   * @param {string} code - Authorization code
   * @param {string} redirectUri - Redirect URI used in authorization
   * @returns {Promise<Object>} The token response
   * @throws {Error} If token exchange fails
   */
  async oauth2Token(clientId, clientSecret, code, redirectUri) {
    const response = await this.client.post("/oauth2/token", {
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

  /**
   * Get user information using access token
   * @param {string} accessToken - OAuth2 access token
   * @returns {Promise<Object>} User information
   * @throws {Error} If user info request fails
   */
  async getUserInfo(accessToken) {
    const response = await this.client.get("/oauth2/user_info", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.data) {
      throw new Error("Failed to get user info");
    }

    return response.data;
  }

  /**
   * Get client information
   * @param {string} clientId - OAuth2 client ID
   * @returns {Promise<Object>} Client information
   * @throws {Error} If client info request fails
   */
  async getClientInfo(clientId) {
    const response = await this.client.get("/oauth2/client_info", {
      params: {
        client_id: clientId,
      },
    });

    if (!response.data) {
      throw new Error("Failed to get client info");
    }

    return response.data;
  }
}

/**
 * Test the complete OAuth2 authentication flow
 */
async function testOAuth2Auth() {
  const developer = new Developer();
  const authClient = axios.create({
    maxRedirects: 0,
    validateStatus: () => true,
  });

  try {
    console.log("Step 1: Registering developer account...");
    const { token, userId } = await developer.openApiRegister(
      BACKDOOR_VERIFICATION_CODE
    );
    console.log(`Developer registered successfully - User ID: ${userId}`);

    console.log("\nStep 2: Creating OAuth2 client...");
    const clientName = `Test_${nowMillis()}`;
    const redirectUri = "http://127.0.0.1:15555/front_callback";
    const logoUri =
      "https://bafybeifl3liunlo4c5dyexwa2m442c2dflzvyoxxqwtvefc456nr2errki.ipfs.nftstorage.link/15.png";
    const scope = "profile openid";

    const client = await developer.oauth2CreateClient(
      clientName,
      redirectUri,
      scope,
      logoUri
    );
    console.log("OAuth2 client created:", {
      clientId: client.client_id,
      clientName: client.client_name,
      redirectUri: client.redirect_uri,
    });

    console.log("\nStep 3: Initiating authorization...");
    let clientInfo = await developer.getClientInfo(client.client_id);
    console.log("clientInfo->client_name:", clientInfo.data.client_name);
    console.log("clientInfo->redirect_uri:", clientInfo.data.redirect_uri);
    console.log("clientInfo->logo_uri:", clientInfo.data.logo_uri);

    const authParams = new URLSearchParams({
      client_id: client.client_id,
      nonce: randomHex(16),
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      state: randomHex(16),
    });

    const authResponse = await authClient.get(
      `${BACKEND_URL}/oauth2/auth?${authParams.toString()}`,
      {
        // 模拟用户已登录，使用无链用户token访问
        headers: {
          Authorization: `Bearer ${USER_TOKEN}`,
        },
      }
    );

    console.log("authResponse:", authResponse);
    if (!authResponse.headers.location) {
      throw new Error("No redirect location in authorization response");
    }

    const redirectUrl = new URL(authResponse.headers.location);
    const code = redirectUrl.searchParams.get("code");
    if (!code) {
      throw new Error("No authorization code in redirect URL");
    }
    console.log("Authorization code obtained successfully");

    console.log("\nStep 4: Exchanging code for access token...");
    const tokenResponse = await developer.oauth2Token(
      client.client_id,
      client.client_secret,
      code,
      redirectUri
    );
    console.log("Access token obtained successfully");

    console.log("\nStep 5: Getting user information...");
    console.log("tokenResponse:", tokenResponse);
    const userInfo = await developer.getUserInfo(tokenResponse.access_token);
    console.log("User info retrieved successfully:", userInfo);
    /***
     * response_result:
     * data: {
        id: 1002157554,
        phone_number: '+86 xxxxxxxx',
        email: 'xxxx@qq.com',
        answer_indexes: '154',
        predecessor: 1,
        invite_code: 'share_1871712525',
        kyc_is_passed: true,
        main_account: '1002157554',
        role: 'Master',
        invite_url: 'https://download-testnet.chainlessdw20.com?code=share_1871712525',
        fans_num: 0,
        follower_num: 0,
        points: 0
      }
    */

    console.log("\nOAuth2 authentication test completed successfully!");
  } catch (error) {
    console.error("\nTest failed:", error.message);
    if (error.response?.data) {
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

// Run the test
testOAuth2Auth().catch((error) => {
  console.error("Test execution failed:", error);
  process.exit(1);
});