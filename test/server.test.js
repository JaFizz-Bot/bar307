const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { app } = require("../server");

function request(method, url) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = {};
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
