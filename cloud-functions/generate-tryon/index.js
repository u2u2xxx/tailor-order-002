const ARK_IMAGE_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

const corsHeaders = {
  "access-control-allow-origin": process.env.ALLOWED_ORIGIN || "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
  "content-type": "application/json; charset=utf-8",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

function methodOf(event) {
  return event?.httpMethod || event?.requestContext?.http?.method || event?.method || "POST";
}

function parseBody(event) {
  if (!event?.body) return {};
  const bodyText = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return typeof bodyText === "string" ? JSON.parse(bodyText || "{}") : bodyText;
}

function buildPrompt({ clientName, planTitle, material, fit, angleLabel, angleInstruction }) {
  return [
    "Create a realistic tailor-made clothing try-on image from the provided person photo.",
    "Preserve the person's identity, face, hairstyle, body shape, height proportions, pose, camera angle, and background atmosphere.",
    angleLabel ? `Current view angle: ${angleLabel}.` : "",
    angleInstruction ? `Angle requirement: ${angleInstruction}` : "",
    planTitle ? `Outfit plan: ${planTitle}.` : "",
    material ? `Fabric and texture: ${material}.` : "",
    fit ? `Fit requirement: ${fit}.` : "",
    "Change the outfit to a men's casual henley shirt and casual shorts. The result should look natural, wearable, and suitable for a tailor's client presentation.",
    "Avoid fashion runway effects, identity changes, extra people, text, watermarks, and brand logos.",
    clientName ? `Client name: ${clientName}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateTryOn(payload) {
  const apiKey = process.env.VOLCENGINE_API_KEY;
  const model = process.env.VOLCENGINE_IMAGE_MODEL || "doubao-seedream-4-5-251128";

  if (!apiKey) {
    return jsonResponse(500, { error: "Missing VOLCENGINE_API_KEY environment variable" });
  }

  if (!payload?.personImageUrl) {
    return jsonResponse(400, { error: "Missing personImageUrl" });
  }

  const prompt = buildPrompt(payload);
  const arkResponse = await fetch(ARK_IMAGE_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      image: payload.personImageUrl,
      response_format: "url",
      size: "2K",
      watermark: false,
    }),
  });

  const resultText = await arkResponse.text();
  let result;
  try {
    result = JSON.parse(resultText);
  } catch {
    result = { raw: resultText };
  }

  if (!arkResponse.ok) {
    return jsonResponse(arkResponse.status, {
      error: result?.error?.message || result?.message || "Seedream generation failed",
      detail: result,
    });
  }

  const imageUrl = result?.data?.[0]?.url;
  if (!imageUrl) {
    return jsonResponse(502, {
      error: "Seedream did not return an image URL",
      detail: result,
    });
  }

  return jsonResponse(200, {
    imageUrl,
    model,
    prompt,
  });
}

async function main(event = {}) {
  if (methodOf(event).toUpperCase() === "OPTIONS") {
    return jsonResponse(204, {});
  }

  if (methodOf(event).toUpperCase() !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let payload;
  try {
    payload = parseBody(event);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  try {
    return await generateTryOn(payload);
  } catch (error) {
    return jsonResponse(500, {
      error: error.message || "Unhandled cloud function error",
    });
  }
}

module.exports = {
  main,
  handler: main,
  generateTryOn,
};
