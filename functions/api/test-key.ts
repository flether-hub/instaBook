export async function onRequestGet({ env }: any) {
  try {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "API Key not configured in environment variables." }), { status: 500 });
    }

    const payload = {
      contents: [{ parts: [{ text: "Hello" }] }],
      generationConfig: { maxOutputTokens: 5 }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
