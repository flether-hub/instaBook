export async function onRequestPost({ request, env }: any) {
  const apiKey = env.QWEN_API_KEY || env.ALIYUN_API_KEY;
  let baseUrl = env.API_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API Key未配置。如果在 Cloudflare 后台刚添加变量，必须在“部署”历史中点击【重试部署】重新构建，新变量才会生效！" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body: any = await request.json();
    const { stream, model, ...payload } = body;
    let modelId = model;
    
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
