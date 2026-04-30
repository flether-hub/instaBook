export async function onRequestGet({ env }: any) {
  try {
    const apiKey = env.QWEN_API_KEY || env.VITE_QWEN_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "API Key未配置。如果在 Cloudflare 后台刚添加变量，必须在“部署”历史中点击【重试部署】重新构建，新变量才会生效！" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const payload = {
      model: "qwen-max",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 10,
      temperature: 1.0
    };

    const response = await fetch(`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
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
