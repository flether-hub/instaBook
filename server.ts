import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // === Database SQLite-like file-backed Storage System ===
  const DB_FILE = path.join(process.cwd(), "data", "books_sqlite.db");
  const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

  // Simple database helpers
  async function readDatabase(): Promise<any[]> {
    try {
      await fs.promises.mkdir(path.dirname(DB_FILE), { recursive: true });
      const content = await fs.promises.readFile(DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }

  async function writeDatabase(data: any[]): Promise<void> {
    await fs.promises.mkdir(path.dirname(DB_FILE), { recursive: true });
    await fs.promises.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  async function readSettings(): Promise<Record<string, string>> {
    try {
      await fs.promises.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
      const content = await fs.promises.readFile(SETTINGS_FILE, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      return {};
    }
  }

  async function writeSettings(data: Record<string, string>): Promise<void> {
    await fs.promises.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
    await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  // Get all book records
  app.get("/api/books", async (req, res) => {
    try {
      const books = await readDatabase();
      const summary = books.map((b: any) => ({
        id: b.id,
        title: b.title || b.topic || "未命名书目",
        subtitle: b.subtitle || "",
        author: b.author || "佚名",
        topic: b.topic || "",
        genre: b.genre || "",
        wordCount: b.wordCount || 2000,
        chapterCount: b.outline?.chapters?.length || 0,
        completedCount: b.completedChapters?.length || 0,
        modelUsed: b.modelUsed || "未知模型",
        updatedAt: b.updatedAt || new Date().toISOString()
      }));
      // Sort by updatedAt DESC
      summary.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get specific book details
  app.get("/api/books/:id", async (req, res) => {
    try {
      const books = await readDatabase();
      const book = books.find((b: any) => b.id === req.params.id);
      if (!book) {
        return res.status(404).json({ error: "未找到该书目" });
      }
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Upsert (insert or update) a book record
  app.post("/api/books", async (req, res) => {
    try {
      const { 
        id, title, subtitle, author, topic, genre, 
        wordCount, writingStyle, detailedRequirements, 
        outline, chaptersContent, completedChapters, modelUsed 
      } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: "缺少书籍ID" });
      }
      
      const books = await readDatabase();
      const existingIdx = books.findIndex((b: any) => b.id === id);
      
      const bookData = {
        id,
        title: title || outline?.title || topic || "未名书目",
        subtitle: subtitle || outline?.subtitle || "",
        author: author || outline?.author || "佚名",
        topic: topic || "",
        genre: genre || "",
        wordCount: Number(wordCount) || 2000,
        writingStyle: writingStyle || "",
        detailedRequirements: detailedRequirements || "",
        outline: outline || null,
        chaptersContent: chaptersContent || {},
        completedChapters: completedChapters || [],
        modelUsed: modelUsed || "deepseek-v4-pro",
        updatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        books[existingIdx] = bookData;
      } else {
        books.push(bookData);
      }

      await writeDatabase(books);
      res.json({ ok: true, book: bookData });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a book record
  app.delete("/api/books/:id", async (req, res) => {
    try {
      const books = await readDatabase();
      const filtered = books.filter((b: any) => b.id !== req.params.id);
      await writeDatabase(filtered);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === API Routes ===
  
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await readSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const settings = await readSettings();
      const updated = { ...settings, ...req.body };
      await writeSettings(updated);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/test-key", async (req, res) => {
    try {
      const rawModel = (req.query.model as string) || "qwen-max";
      const clientApiKey = (req.query.clientApiKey as string) || "";
      const clientBaseUrl = (req.query.clientBaseUrl as string) || "";

      let modelId = rawModel;
      
      // 1. Resolve baseUrl
      let baseUrl = clientBaseUrl || "";
      if (!baseUrl) {
        if (modelId.toLowerCase().includes("gemini")) {
          baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        } else if (modelId.toLowerCase().includes("deepseek")) {
          baseUrl = "https://api.deepseek.com/v1/chat/completions";
        } else if (modelId.toLowerCase().includes("glm")) {
          baseUrl = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
        } else {
          baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
        }
      }

      // 2. Resolve apiKey
      let apiKey = clientApiKey || "";

      if (!apiKey) {
        return res.status(500).json({ 
          ok: false, 
          error: "API Key未配置。请在右上角进入“管理员配置”以添加您的 API Key。"
        });
      }
      
      const payload = {
        model: modelId,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10,
        temperature: 1.0
      };

      let headers: any = {
        "Content-Type": "application/json"
      };
      
      const cleanKey = apiKey.replace(/^"|"$/g, '').trim();
      if (baseUrl.includes("generativelanguage/v1beta/openai")) {
        headers["Authorization"] = `Bearer ${cleanKey}`;
      } else if (baseUrl.includes("generativelanguage")) {
        headers["x-goog-api-key"] = cleanKey;
        if (!baseUrl.includes("?key=")) {
          baseUrl = `${baseUrl.split('?')[0]}?key=${cleanKey}`;
        }
      } else {
        headers["Authorization"] = `Bearer ${cleanKey}`;
      }

      const response = await fetch(baseUrl, {
        method: "POST",
        headers,
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
      const { stream, model, clientApiKey, clientBaseUrl, ...payload } = req.body;
      let modelId = model || "deepseek-chat";
      
      // 1. Resolve baseUrl
      let baseUrl = clientBaseUrl || "";
      if (!baseUrl) {
        if (modelId.toLowerCase().includes("gemini")) {
          baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        } else if (modelId.toLowerCase().includes("deepseek")) {
          baseUrl = "https://api.deepseek.com/v1/chat/completions";
        } else if (modelId.toLowerCase().includes("glm")) {
          baseUrl = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
        } else {
          baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
        }
      }

      // 2. Resolve apiKey
      let apiKey = clientApiKey || "";

      if (!apiKey) {
        return res.status(500).json({ 
          error: "API Key未配置。由于我们目前处于开发模式，请登录管理员后台添加或确认可用 API Key。"
        });
      }

      let headers: any = {
        "Content-Type": "application/json"
      };

      const cleanKey = apiKey.replace(/^"|"$/g, '').trim();
      if (baseUrl.includes("generativelanguage/v1beta/openai")) {
        headers["Authorization"] = `Bearer ${cleanKey}`;
      } else if (baseUrl.includes("generativelanguage")) {
        headers["x-goog-api-key"] = cleanKey;
        if (!baseUrl.includes("?key=")) {
          baseUrl = `${baseUrl.split('?')[0]}?key=${cleanKey}`;
        }
      } else {
        headers["Authorization"] = `Bearer ${cleanKey}`;
      }

      const response = await fetch(baseUrl, {
        method: "POST",
        headers,
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
