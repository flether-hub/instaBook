export async function onRequestPost({ request, env }: any) {
  const apiKey = env.QWEN_API_KEY || env.VITE_QWEN_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API Key未配置。如果在 Cloudflare 后台刚添加变量，必须在“部署”历史中点击【重试部署】重新构建，新变量才会生效！" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body: any = await request.json();
    const { stream, ...payload } = body;

    const response = await fetch(`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        ...payload,
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
