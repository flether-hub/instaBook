export async function onRequestGet({ env, params }: any) {
  try {
    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });
    }

    if (env.DB) {
      const book: any = await env.DB.prepare("SELECT * FROM books WHERE id = ?").bind(id).first();
      if (!book) {
        return new Response(JSON.stringify({ error: "Book not found" }), { status: 404 });
      }
      
      // Parse fields stored as JSON strings
      try {
        if (typeof book.outline === "string") book.outline = JSON.parse(book.outline);
      } catch(e) {}
      try {
        if (typeof book.chaptersContent === "string") book.chaptersContent = JSON.parse(book.chaptersContent);
      } catch(e) {}
      try {
        if (typeof book.completedChapters === "string") book.completedChapters = JSON.parse(book.completedChapters);
      } catch(e) {}

      return new Response(JSON.stringify(book), { headers: { "Content-Type": "application/json" } });
    } else {
      return new Response(JSON.stringify({ error: "D1 Database not bound on Cloudflare Pages" }), { status: 500 });
    }
  } catch(err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestDelete({ env, params }: any) {
  try {
    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });
    }

    if (env.DB) {
      await env.DB.prepare("DELETE FROM books WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    } else {
      return new Response(JSON.stringify({ error: "D1 Database not bound on Cloudflare Pages" }), { status: 500 });
    }
  } catch(err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
