export async function onRequestPost({ request, env }: any) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    const adminPassword = env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return new Response(JSON.stringify({ ok: false, error: "系统未配置管理员密码" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (username === "ADMIN" && password === adminPassword) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ ok: false, error: "用户名或密码错误" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
