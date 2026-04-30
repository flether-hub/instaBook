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
async function callGLM(prompt: string, isJson: boolean = false, onProgress?: (text: string) => void): Promise<string> {
  const payload: any = {
    model: "glm-4.7-flash",
    messages: [{ role: "user", content: prompt }],
    thinking: { type: "enabled" },
    max_tokens: 65536,
    temperature: 1.0,
    stream: true,
  };
  
  if (isJson) {
    payload.response_format = { type: "json_object" };
  }

  let response: Response;

  // 所有的API调用都走后台的function
  response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown backend error" }));
    const errorMsg = typeof err.error === 'object' ? err.error.message : (err.error || `Server Error: ${response.status}`);
    throw new Error(errorMsg);
  }

  // 解析流式响应 (SSE 解析)
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";
  
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices?.[0]?.delta;
            const textPart = (delta?.reasoning_content || "") + (delta?.content || "");
            if (textPart) {
              fullText += textPart;
              onProgress?.(fullText);
            }
          } catch (e) {
            console.error("Error parsing chunk:", e);
          }
        }
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

  let jsonStr = await callGLM(prompt, true, onProgress);
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  
  let parsed: Partial<BookOutline> = {};
  try {
    parsed = JSON.parse(jsonStr.trim() || "{}");
  } catch (e) {
    console.error("Failed to parse AI JSON:", jsonStr);
    throw new Error("模型返回的数据格式无法解析为 JSON，请重试。");
  }

  // Ensure arrays exist
  if (!parsed.chapters) parsed.chapters = [];
  if (!parsed.recommendations) parsed.recommendations = [];

  return parsed as BookOutline;
};

export const testGeminiConnection = async (): Promise<{ ok: boolean, message?: string, error?: string }> => {
  // 生产环境和开发环境测试全都通过后端 Functions 进行，保护 API Key 不在前台暴露
  try {
    const res = await fetch('/api/test-key');
    const data = await res.json();
    if (!res.ok) {
      const errorMsg = typeof data.error === 'object' ? data.error.error?.message || JSON.stringify(data.error) : data.error;
      return { ok: false, error: errorMsg };
    }
    return data;
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
};

export const generateChapterContent = async (bookTitle: string, chapterTitle: string, chapterSummary: string, writingStyle: string, onProgress?: (text: string) => void): Promise<string> => {
  const prompt = `撰写《${bookTitle}》的章节：${chapterTitle}。
风格：${writingStyle}。
摘要：${chapterSummary}。
要求：内容详实，不少于 1500 字，纯文本返回。`;

  return await callGLM(prompt, false, onProgress);
};

