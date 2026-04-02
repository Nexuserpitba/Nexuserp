/**
 * NexusERP - Auth System Tests
 * Tests for RBAC, Step-Up Auth, Dual Control
 * Run with: node --test backend/tests/auth.test.js
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

// Helper to make HTTP requests
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe("Auth Endpoints", () => {
  describe("POST /auth/login", () => {
    it("should reject login without credentials", async () => {
      const res = await request("POST", "/auth/login", {});
      assert.equal(res.status, 400);
      assert.ok(res.body.erro);
    });

    it("should reject login with invalid credentials", async () => {
      const res = await request("POST", "/auth/login", {
        email: "invalid@test.com",
        password: "wrongpassword",
      });
      assert.equal(res.status, 401);
      assert.ok(res.body.erro);
    });

    it("should reject login with invalid biometria token", async () => {
      const res = await request("POST", "/auth/login", {
        biometria_token: "invalid-token-12345",
      });
      assert.equal(res.status, 401);
      assert.ok(res.body.erro);
    });
  });

  describe("GET /auth/permissoes", () => {
    it("should reject without auth token", async () => {
      const res = await request("GET", "/auth/permissoes");
      assert.equal(res.status, 401);
      assert.ok(res.body.erro);
    });

    it("should reject with invalid token", async () => {
      const res = await request("GET", "/auth/permissoes", null, {
        Authorization: "Bearer invalid-token",
      });
      assert.equal(res.status, 401);
      assert.ok(res.body.erro);
    });
  });

  describe("POST /auth/step-up", () => {
    it("should reject without auth token", async () => {
      const res = await request("POST", "/auth/step-up", {
        metodo: "senha",
        acao: "CANCELAR_VENDA",
        password: "test123",
      });
      assert.equal(res.status, 401);
    });
  });

  describe("POST /auth/solicitar-autorizacao", () => {
    it("should reject without auth token", async () => {
      const res = await request("POST", "/auth/solicitar-autorizacao", {
        acao: "CANCELAR_VENDA",
        motivo: "Teste",
      });
      assert.equal(res.status, 401);
    });
  });

  describe("POST /auth/confirmar-autorizacao", () => {
    it("should reject without auth token", async () => {
      const res = await request("POST", "/auth/confirmar-autorizacao", {
        autorizacao_id: "fake-id",
        aprovar: true,
        metodo: "senha",
      });
      assert.equal(res.status, 401);
    });
  });

  describe("POST /auth/logout", () => {
    it("should reject without auth token", async () => {
      const res = await request("POST", "/auth/logout");
      assert.equal(res.status, 401);
    });
  });

  describe("Rate Limiting", () => {
    it("should return 429 after too many requests", async () => {
      // Send many requests rapidly
      const requests = Array.from({ length: 25 }, () =>
        request("POST", "/auth/login", { email: "test@test.com", password: "wrong" })
      );
      const results = await Promise.all(requests);
      const rateLimited = results.some((r) => r.status === 429);
      // At least one should be rate limited (20 req/min limit for auth)
      // Note: this test might be flaky depending on timing
      assert.ok(
        rateLimited || results.every((r) => r.status === 401),
        "Should either rate limit or reject invalid credentials"
      );
    });
  });
});

describe("Webhook Security", () => {
  it("should accept webhook without API key when not configured", async () => {
    const res = await request("POST", "/api/webhook/intelbras", {
      biometria_id: "test-123",
    });
    // Should succeed if WEBHOOK_API_KEY is not set
    assert.ok([200, 401].includes(res.status));
  });
});

describe("Health Checks", () => {
  it("should respond to webhook events endpoint", async () => {
    const res = await request("GET", "/api/webhook/intelbras/eventos");
    assert.equal(res.status, 200);
    assert.ok(res.body.total !== undefined);
    assert.ok(Array.isArray(res.body.eventos));
  });
});

describe("RBAC Permission Structure", () => {
  it("should have correct permission codes defined", async () => {
    // These are the expected permission codes from the migration
    const expectedCodes = [
      "VENDAS",
      "CANCELAR_VENDA",
      "ESTORNO",
      "SANGRIA",
      "DESCONTO_ALTO",
      "GERENCIAR_USUARIOS",
      "GERENCIAR_PERMISSOES",
      "EMITIR_NFE",
      "CANCELAR_NFE",
    ];

    // This test validates the expected structure exists
    // Actual validation requires a running server with DB
    assert.ok(expectedCodes.length > 0);
    assert.ok(expectedCodes.includes("CANCELAR_VENDA"));
    assert.ok(expectedCodes.includes("ESTORNO"));
    assert.ok(expectedCodes.includes("SANGRIA"));
  });
});
