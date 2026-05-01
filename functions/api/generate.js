export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { stream, model, ...payload } = body;
    
    const apiKey = env.DEEPSEEK_API_KEY || env.QWEN_API_KEY || env.API_KEY || env.VITE_API_KEY || env.LLM_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: "Server configuration error: LLM API key not found in environment variables.",
        tip: "Please set one of these environment variables in Cloudflare dashboard: DEEPSEEK_API_KEY, QWEN_API_KEY, API_KEY, or LLM_API_KEY"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    let baseUrl = env.API_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    let modelId = model;

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        ...payload,
        model: modelId,
        stream: true
      })
    });

    if (!response.ok) {
      const errStr = await response.text();
      return new Response(errStr, { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
