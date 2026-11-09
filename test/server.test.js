const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { app } = require("../server");

function request(method, url, host = "127.0.0.1:8307") {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = host === null ? {} : { host };
    req.socket = { remoteAddress: "127.0.0.1" };
    req.connection = req.socket;
    const res = new EventEmitter();
    res.statusCode = 200;
    res.setHeader = () => {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (value) => res.end(JSON.stringify(value));
    res.getHeader = () => undefined;
    res.removeHeader = () => {};
    res.end = (body = "") => resolve({ status: res.statusCode, body: String(body) });
    app.handle(req, res, reject);
  });
}

test("Bar 307 heeft geen foto-uploadroute meer", async () => {
  for (const method of ["GET", "POST"]) {
    const response = await request(method, "/admin/upload");
    assert.equal(response.status, 404, `${method} /admin/upload`);
  }
});

test("een vreemde Host krijgt 421, ook op de statische site", async () => {
  for (const url of ["/", "/index.html", "/bestaat-niet"]) {
    const response = await request("GET", url, "aanvaller.example");
    assert.equal(response.status, 421, url);
    assert.deepEqual(JSON.parse(response.body), { error: "Onbekende host." });
  }
  assert.equal((await request("GET", "/", "jafizz-server.aanvaller.example")).status, 421);
  assert.equal((await request("GET", "/", null)).status, 421);
});

test("de toegestane namen komen door de host-guard", async () => {
  for (const host of ["127.0.0.1:8307", "localhost:8307", "100.74.13.40:8307", "jafizz-server:8307", "jafizz-server.tailee3c2b.ts.net.", "JAFIZZ-SERVER.TAILEE3C2B.TS.NET:8307", "[::1]:8307"]) {
    const response = await request("GET", "/bestaat-niet-pad", host);
    assert.equal(response.status, 404, host);
  }
});
