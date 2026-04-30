
export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  
  // 从 Cloudflare 环境变量中获取私密的 API Key
  const apiKey = env.ZHIPU_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server configuration error: ZHIPU_API_KEY not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { stream, ...payload } = body;

    // 转发请求到 Zhipu API
    const response = await fetch(`https://open.bigmodel.cn/api/paas/v4/chat/completions`, {
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

    // 如果 API 返回错误，转发状态码和原样内容
    if (!response.ok) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
        },
      });
    }

    // 保持流式响应输出
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
