const http = require("http");

const payload = JSON.stringify({
  event_type: "motion_detection",
  device_ip: "192.168.1.100",
  channel: 1,
  timestamp: new Date().toISOString(),
  message: "Teste de webhook do Intelbras Defense IA Lite"
});

const options = {
  hostname: "localhost",
  port: 3001,
  path: "/api/webhook/intelbras",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Resposta:", data);
  });
});

req.on("error", (e) => console.error("Erro:", e.message));
req.write(payload);
req.end();
