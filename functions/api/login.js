export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();
    const adminPassword = env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return new Response(JSON.stringify({ ok: true, warning: 'Bypassed login because ADMIN_PASSWORD is not set' }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (password === adminPassword) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ ok: false, error: "密码错误" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
