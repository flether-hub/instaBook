export async function onRequestGet({ env }: any) {
  try {
    if (env.DB) {
      // Automatically make sure table exists
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS books (
          id TEXT PRIMARY KEY,
          title TEXT,
          subtitle TEXT,
          author TEXT,
          topic TEXT,
          genre TEXT,
          wordCount INTEGER,
          writingStyle TEXT,
          detailedRequirements TEXT,
          outline TEXT,
          chaptersContent TEXT,
          completedChapters TEXT,
          modelUsed TEXT,
          updatedAt TEXT
        )
      `).run();

      const { results } = await env.DB.prepare("SELECT * FROM books ORDER BY updatedAt DESC").all();
      const summary = results.map((b: any) => {
        let chapters = [];
        try {
          const outlineObj = typeof b.outline === "string" ? JSON.parse(b.outline) : b.outline;
          chapters = outlineObj?.chapters || [];
        } catch(e) {}

        let completed = [];
        try {
          completed = typeof b.completedChapters === "string" ? JSON.parse(b.completedChapters) : b.completedChapters || [];
        } catch(e) {}

        return {
          id: b.id,
          title: b.title || b.topic || "未命名书目",
          subtitle: b.subtitle || "",
          author: b.author || "佚名",
          topic: b.topic || "",
          genre: b.genre || "",
          wordCount: b.wordCount || 2000,
          chapterCount: chapters.length,
          completedCount: completed ? completed.length : 0,
          modelUsed: b.modelUsed || "未知模型",
          updatedAt: b.updatedAt || new Date().toISOString()
        };
      });
      return new Response(JSON.stringify(summary), { headers: { "Content-Type": "application/json" } });
    } else {
      // Return empty array if not configured to prevent crashes
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function onRequestPost({ request, env }: any) {
  try {
    const book = await request.json();
    const { id, title, subtitle, author, topic, genre, wordCount, writingStyle, detailedRequirements, outline, chaptersContent, completedChapters, modelUsed } = book;
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing book ID" }), { status: 400 });
    }
    
    if (env.DB) {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS books (
          id TEXT PRIMARY KEY,
          title TEXT,
          subtitle TEXT,
          author TEXT,
          topic TEXT,
          genre TEXT,
          wordCount INTEGER,
          writingStyle TEXT,
          detailedRequirements TEXT,
          outline TEXT,
          chaptersContent TEXT,
          completedChapters TEXT,
          modelUsed TEXT,
          updatedAt TEXT
        )
      `).run();

      const existing = await env.DB.prepare("SELECT id FROM books WHERE id = ?").bind(id).first();
      const updatedAt = new Date().toISOString();
      if (existing) {
        await env.DB.prepare(`
          UPDATE books SET 
            title = ?, subtitle = ?, author = ?, topic = ?, genre = ?, 
            wordCount = ?, writingStyle = ?, detailedRequirements = ?, 
            outline = ?, chaptersContent = ?, completedChapters = ?, 
            modelUsed = ?, updatedAt = ? 
          WHERE id = ?
        `).bind(
          title, subtitle, author, topic, genre, 
          wordCount, writingStyle, detailedRequirements, 
          JSON.stringify(outline), JSON.stringify(chaptersContent), JSON.stringify(completedChapters), 
          modelUsed, updatedAt, id
        ).run();
      } else {
        await env.DB.prepare(`
          INSERT INTO books (
            id, title, subtitle, author, topic, genre, 
            wordCount, writingStyle, detailedRequirements, 
            outline, chaptersContent, completedChapters, modelUsed, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, title, subtitle, author, topic, genre, 
          wordCount, writingStyle, detailedRequirements, 
          JSON.stringify(outline), JSON.stringify(chaptersContent), JSON.stringify(completedChapters), 
          modelUsed, updatedAt
        ).run();
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    } else {
      return new Response(JSON.stringify({ error: "Cloudflare D1 is not configured in wrangler.toml or database is not bound!" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
