export async function onRequestGet({ request, env }: any) {
  try {
    const url = new URL(request.url);
    const rawModel = url.searchParams.get("model") || "qwen-max";
    const apiKey = env.DEEPSEEK_API_KEY || env.QWEN_API_KEY;
    let baseUrl = env.API_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    let modelId = rawModel;

    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "API Key未配置。如果在 Cloudflare 后台刚添加变量，必须在“部署”历史中点击【重试部署】重新构建，新变量才会生效！" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const payload = {
      model: modelId,
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 10,
      temperature: 1.0
    };

    let headers: any = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    };

    const cleanKey = apiKey.replace(/^"|"$/g, '').trim();
    if (baseUrl.includes("generativelanguage")) {
      headers["x-goog-api-key"] = cleanKey;
      baseUrl = `${baseUrl.split('?')[0]}?key=${cleanKey}`;
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
