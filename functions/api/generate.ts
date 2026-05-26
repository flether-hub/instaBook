export async function onRequestPost({ request, env }: any) {
  try {
    const body: any = await request.json();
    const { stream, model, clientApiKey, clientBaseUrl, ...payload } = body;

    let modelId = model || "deepseek-chat";
    
    // 1. Resolve baseUrl
    let baseUrl = clientBaseUrl || "";
    if (!baseUrl) {
      if (modelId.toLowerCase().includes("gemini")) {
        baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      } else if (modelId.toLowerCase().includes("deepseek")) {
        baseUrl = "https://api.deepseek.com/v1/chat/completions";
      } else if (modelId.toLowerCase().includes("glm")) {
        baseUrl = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
      } else {
        baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
      }
    }

    // 2. Resolve apiKey
    let apiKey = clientApiKey || "";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key未配置。您可在右上角进入“管理员配置”以添加自定义 API Key（支持 Gemini/DeepSeek）。" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    let headers: any = {
      "Content-Type": "application/json"
    };

    const cleanKey = apiKey.replace(/^"|"$/g, '').trim();
    if (baseUrl.includes("generativelanguage/v1beta/openai")) {
      headers["Authorization"] = `Bearer ${cleanKey}`;
      // Add x-goog-api-key as well for broader compatibility
      headers["x-goog-api-key"] = cleanKey;
      
      // Fix: If model is the non-existent 3.5, fallback to 1.5 internally for Google
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
      body: JSON.stringify({
        ...payload,
        model: modelId,
        stream: true
      })
    });

    if (!response.ok) {
        let errStr = await response.text();
        return new Response(errStr, { status: response.status });
    }

    return new Response(response.body, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
}
