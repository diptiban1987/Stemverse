const axios = require("axios");

// ================= CONFIG =================
const BASE_URLS = {
  auth: "http://localhost:4000",
  ai: "http://localhost:4002",
  compiler: "http://localhost:4001",
  lms: "http://localhost:4003",
  marketplace: "http://localhost:4004",
};

// Put a VALID token here if you have login working
const JWT_TOKEN = "YOUR_JWT_TOKEN_HERE";

// ================= HELPERS =================
const headers = (auth = false) => ({
  "Content-Type": "application/json",
  ...(auth && JWT_TOKEN !== "YOUR_JWT_TOKEN_HERE"
    ? { Authorization: `Bearer ${JWT_TOKEN}` }
    : {}),
});

async function testEndpoint(name, url, options = {}) {
  try {
    const res = await axios({
      method: options.method || "GET",
      url,
      data: options.data || {},
      headers: options.headers || headers(false),
      timeout: 5000,
    });

    console.log(`✅ ${name} → ${res.status}`);
    return { ok: true, status: res.status, data: res.data };
  } catch (err) {
    const status = err.response?.status || "NO_RESPONSE";
    console.log(`❌ ${name} → ${status}`);
    return { ok: false, status };
  }
}

// ================= TEST SUITE =================
async function runTests() {
  console.log("\n🔍 STARTING MICROSERVICE SECURITY TEST\n");

  // 1. AUTH TESTS
  await testEndpoint("Auth Health", `${BASE_URLS.auth}/health`);
  await testEndpoint("Login Endpoint (unauth)", `${BASE_URLS.auth}/auth/me`);

  // 2. AI SERVICE TEST (critical)
  await testEndpoint("AI Generate (NO AUTH)", `${BASE_URLS.ai}/generate`, {
    method: "POST",
    data: { prompt: "hello world" },
  });

  await testEndpoint("AI Generate (WITH AUTH)", `${BASE_URLS.ai}/generate`, {
    method: "POST",
    data: { prompt: "hello world" },
    headers: headers(true),
  });

  // 3. COMPILER TEST (critical)
  await testEndpoint("Compiler Run (NO AUTH)", `${BASE_URLS.compiler}/run`, {
    method: "POST",
    data: { code: "print('hello')" },
  });

  await testEndpoint("Compiler Run (WITH AUTH)", `${BASE_URLS.compiler}/run`, {
    method: "POST",
    data: { code: "print('hello')" },
    headers: headers(true),
  });

  // 4. LMS TEST
  await testEndpoint("LMS Courses", `${BASE_URLS.lms}/courses`);

  // 5. MARKETPLACE TEST
  await testEndpoint(
    "Marketplace Items",
    `${BASE_URLS.marketplace}/items`
  );

  console.log("\n🏁 TEST COMPLETE\n");
}

runTests();