import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // === API Routes ===
  
  app.get("/api/test-key", async (req, res) => {
    try {
      const apiKey = process.env.QWEN_API_KEY || process.env.VITE_QWEN_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ ok: false, error: "API Key not configured in environment variables." });
      }

      const payload = {
        model: "qwen-plus", // Qwen 3.6 Plus is typically qwen-plus or qwen-max, or specifically user requested qwen3.6-plus. We'll use user's string here.
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10,
        temperature: 1.0
      };
      
      // We will match user requested model
      payload.model = "qwen3.6-plus";

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
        return res.status(response.status).json({ ok: false, error: err });
      }

      return res.status(200).json({ ok: true, message: "API Key is valid and working." });
    } catch (error: any) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(500).json({ ok: false, error: "系统未配置管理员密码" });
    }

    if (username === "ADMIN" && password === adminPassword) {
      return res.json({ ok: true });
    } else {
      return res.status(401).json({ ok: false, error: "用户名或密码错误" });
    }
  });

  app.post("/api/qwen", async (req, res) => {
    try {
      const apiKey = process.env.QWEN_API_KEY || process.env.VITE_QWEN_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Server configuration error: QWEN_API_KEY not found" });
      }

      const { stream, ...payload } = req.body;

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
        return res.status(response.status).send(errStr);
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (response.body) {
        // Read response body as stream and pipe to res
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
        res.end();
      } else {
        res.end();
      }

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // === Vite Middleware for Development ===
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Provide SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
