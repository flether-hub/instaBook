import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // === API Routes ===
  
  app.get("/api/test-key", async (req, res) => {
    try {
      const rawModel = (req.query.model as string);
      // Use DashScope for all models as DeepSeek is also implemented via Alibaba
      const apiKey = process.env.DEEPSEEK_API_KEY || process.env.QWEN_API_KEY || process.env.API_KEY || process.env.VITE_API_KEY || process.env.LLM_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          ok: false, 
          error: `API Key not configured in environment variables.`,
          tip: "Please set DEEPSEEK_API_KEY, QWEN_API_KEY, API_KEY or LLM_API_KEY in your .env file."
        });
      }

      let baseUrl = process.env.API_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
      let modelId = rawModel;
      
      const payload = {
        model: modelId,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10,
        temperature: 1.0
      };

      const response = await fetch(baseUrl, {
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
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.json({ ok: true, warning: 'Bypassed login because ADMIN_PASSWORD is not set' });
    }

    if (password === adminPassword) {
      return res.json({ ok: true });
    } else {
      return res.status(401).json({ ok: false, error: "密码错误" });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { stream, model, ...payload } = req.body;
      const apiKey = process.env.DEEPSEEK_API_KEY || process.env.QWEN_API_KEY || process.env.API_KEY || process.env.VITE_API_KEY || process.env.LLM_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "Server configuration error: LLM API key not found",
          tip: "Please set DEEPSEEK_API_KEY, QWEN_API_KEY, API_KEY or LLM_API_KEY in your .env file."
        });
      }
      
      let baseUrl = process.env.API_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
      let modelId = model;

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          ...payload,
          model: modelId,
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
        // @ts-ignore
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
