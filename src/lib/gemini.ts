import { GoogleGenAI } from "@google/genai";

export interface ChapterDetails {
  title: string;
  summary: string;
}

export interface Recommendation {
  recommender: string;
  recommenderTitle: string;
  content: string;
}

export interface BookOutline {
  title: string;
  subtitle: string;
  author: string;
  isbn: string;
  price: string;
  publisher: string;
  introduction: string;
  recommendations: Recommendation[];
  chapters: ChapterDetails[];
}

/**
 * 执行生成内容的通用函数
 * 支持直接调用 (Dev/Preview) 和 通过 Cloudflare Proxy 调用 (Production)
 */
async function callGemini(prompt: string, isJson: boolean = false, onProgress?: (text: string) => void): Promise<string> {
  const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isPreview = typeof window !== 'undefined' && (window.location.hostname.includes('ais-dev-') || window.location.hostname.includes('ais-pre-') || window.location.hostname.includes('localhost'));
  
  // 1. 在 AI Studio 预览环境或手动提供了公开 Key 时，直接从前端调用
  if (isPreview || envGeminiKey) {
    const key = envGeminiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null) || 'preview-key';
    const genAI = new GoogleGenAI(key);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: isJson ? { responseMimeType: "application/json" } : undefined
    });

    const result = await model.generateContentStream(prompt);
    let fullText = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      onProgress?.(fullText);
    }
    return fullText;
  }

  // 2. 在 Cloudflare Pages 生产环境，通过后端 Functions 代理
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: isJson ? { responseMimeType: "application/json" } : undefined
  };

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown backend error" }));
    throw new Error(err.error || `Server Error: ${response.status}`);
  }

  // 解析流式响应 (Google API 原始流解析)
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      // 简单流解析逻辑：寻找 "text": "..." 块
      const matches = chunk.match(/"text":\s*"([^"]+)"/g);
      if (matches) {
        matches.forEach(m => {
          const t = m.match(/"text":\s*"([^"]+)"/)?.[1];
          if (t) {
            const cleanT = t.replace(/\\n/g, '\n').replace(/\\"/g, '"');
            fullText += cleanT;
          }
        });
        onProgress?.(fullText);
      }
    }
  }

  return fullText;
}

export const generateBookOutline = async (topicOrTitle: string, authorName: string, chapterCount: number, writingStyle: string, onProgress?: (text: string) => void): Promise<BookOutline> => {
  const prompt = `你是一位专业的图书策划编辑和畅销书作家。请根据以下主题/书名：“${topicOrTitle}” 策划一本高质量的书籍大纲。
风格要求：${writingStyle}。
作者：${authorName || "虚构笔名"}。
请规划出 ${chapterCount} 个章节，并返回 JSON：
{
  "title": "主标题",
  "subtitle": "副标题",
  "author": "作者名",
  "isbn": "13位ISBN",
  "price": "定价",
  "publisher": "出版社",
  "introduction": "引言全文",
  "recommendations": [{ "recommender": "姓名", "recommenderTitle": "头衔", "content": "正文" }],
  "chapters": [{ "title": "标题", "summary": "摘要" }]
}`;

  let jsonStr = await callGemini(prompt, true, onProgress);
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  return JSON.parse(jsonStr.trim() || "{}") as BookOutline;
};

export const generateChapterContent = async (bookTitle: string, chapterTitle: string, chapterSummary: string, writingStyle: string, onProgress?: (text: string) => void): Promise<string> => {
  const prompt = `撰写《${bookTitle}》的章节：${chapterTitle}。
风格：${writingStyle}。
摘要：${chapterSummary}。
要求：内容详实，不少于 1500 字，纯文本返回。`;

  return await callGemini(prompt, false, onProgress);
};
