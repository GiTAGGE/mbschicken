const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-MBS-Admin-Key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function options() {
  return { statusCode: 204, headers: HEADERS, body: "" };
}

module.exports = { json, options, HEADERS };
