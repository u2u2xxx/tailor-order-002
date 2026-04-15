const ARK_IMAGE_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function buildPrompt({ clientName, planTitle, material, fit, angleLabel, angleInstruction }) {
  return [
    "基于输入的人物照片生成写实服装试穿展示图。",
    "保持人物的脸部身份、发型、体型、身高比例、站姿和背景氛围，不改变人物年龄和五官。",
    angleLabel ? `当前生成角度：${angleLabel}。` : "",
    angleInstruction ? `角度要求：${angleInstruction}` : "",
    `将人物服装改为男式休闲风方案：${planTitle}。`,
    material ? `面料与质感：${material}。` : "",
    fit ? `版型要求：${fit}。` : "",
    "上衣为休闲亨利衫，短裤为休闲短裤，整体自然合身，像真实裁缝定制展示照。",
    "避免夸张时装秀效果，避免改变脸，避免多余人物，避免文字、水印和品牌 Logo。",
    clientName ? `客户称呼：${clientName}。` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.VOLCENGINE_API_KEY;
  const model = process.env.VOLCENGINE_IMAGE_MODEL || "doubao-seedream-4-5-251128";

  if (!apiKey) {
    return sendJson(response, 500, { error: "Missing VOLCENGINE_API_KEY environment variable" });
  }

  let payload;
  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body;
  } catch {
    return sendJson(response, 400, { error: "Invalid JSON body" });
  }

  if (!payload?.personImageUrl) {
    return sendJson(response, 400, { error: "Missing personImageUrl" });
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
    return sendJson(response, arkResponse.status, {
      error: result?.error?.message || result?.message || "Seedream generation failed",
      detail: result,
    });
  }

  const imageUrl = result?.data?.[0]?.url;
  if (!imageUrl) {
    return sendJson(response, 502, {
      error: "Seedream did not return an image URL",
      detail: result,
    });
  }

  return sendJson(response, 200, {
    imageUrl,
    model,
    prompt,
  });
}
