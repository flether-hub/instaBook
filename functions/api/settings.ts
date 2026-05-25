export async function onRequestGet({ env }: any) {
  try {
    if (env.DB) {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `).run();

      const { results } = await env.DB.prepare("SELECT * FROM settings").all();
      const settingsMap: Record<string, string> = {};
      (results || []).forEach((row: any) => {
        settingsMap[row.key] = row.value;
      });
      return new Response(JSON.stringify(settingsMap), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost({ request, env }: any) {
  try {
    const body = await request.json();
    if (env.DB) {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `).run();

      // Batch insert/update settings
      for (const [key, value] of Object.entries(body)) {
        await env.DB.prepare(`
          INSERT INTO settings (key, value) 
          VALUES (?, ?) 
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).bind(key, String(value)).run();
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ error: "DB not bound on Cloudflare Pages" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
