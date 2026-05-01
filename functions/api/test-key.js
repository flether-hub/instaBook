export async function onRequestGet({ request, env }) {
  try {
    const processUrl = new URL(request.url);
    const model = processUrl.searchParams.get("model");
    
    const apiKey = env.QWEN_API_KEY || env.API_KEY || env.VITE_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: `QWEN_API_KEY not configured` }), {
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
        messages: [{ role: "user", content: "Hi" }],
        model: modelId,
        stream: false,
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errStr = await response.text();
      return new Response(JSON.stringify({ error: `API request failed with status ${response.status}`, details: errStr }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal Server Error", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
