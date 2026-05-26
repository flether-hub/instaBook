export async function onRequestGet({ request, env }: any) {
  try {
    const url = new URL(request.url);
    const rawModel = url.searchParams.get("model") || "qwen-max";
    const clientApiKey = url.searchParams.get("clientApiKey") || "";
    const clientBaseUrl = url.searchParams.get("clientBaseUrl") || "";

    let modelId = rawModel;
    
    // 1. Resolve baseUrl
    let baseUrl = clientBaseUrl || "";
    if (!baseUrl) {
      if (modelId.toLowerCase().includes("gemini")) {
        baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      } else if (modelId.toLowerCase().includes("deepseek")) {
        baseUrl = "https://api.deepseek.com/chat/completions";
      } else if (modelId.toLowerCase().includes("glm")) {
        baseUrl = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
      } else {
        baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
      }
    }

    // 2. Resolve apiKey
    let apiKey = clientApiKey || "";

    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "API Key未配置。由于您使用的是自定义测试，请填写您的 API Key 后重试。" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const payload = {
      model: modelId,
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 10,
      temperature: 1.0
    };

    let headers: any = {
      "Content-Type": "application/json"
    };

    const cleanKey = apiKey.replace(/^"|"$/g, '').trim();
    if (baseUrl.includes("generativelanguage.googleapis.com/v1beta/openai") || (baseUrl.includes("generativelanguage") && baseUrl.includes("/openai"))) {
      headers["Authorization"] = `Bearer ${cleanKey}`;
      headers["x-goog-api-key"] = cleanKey;
      if (modelId === "gemini-3.5-flash") {
        modelId = "gemini-1.5-flash";
      }
    } else if (baseUrl.includes("generativelanguage")) {
      headers["x-goog-api-key"] = cleanKey;
      if (!baseUrl.includes("?key=")) {
        baseUrl = `${baseUrl.split('?')[0]}?key=${cleanKey}`;
      }
    } else {
      headers["Authorization"] = `Bearer ${cleanKey}`;
    }

    const response = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ ok: false, error: err }), { status: response.status, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, message: "API Key is valid and working." }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
