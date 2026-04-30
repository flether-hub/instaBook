export async function onRequestGet({ env }: any) {
  try {
    const apiKey = env.ZHIPU_API_KEY || env.VITE_ZHIPU_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "API Key not configured in environment variables." }), { status: 500 });
    }

    const payload = {
      model: "glm-4.7-flash",
      messages: [{ role: "user", content: "Hello" }],
      thinking: { type: "enabled" },
      max_tokens: 10,
      temperature: 1.0
    };

    const response = await fetch(`https://open.bigmodel.cn/api/paas/v4/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, message: "API Key is valid and working." }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }
}
