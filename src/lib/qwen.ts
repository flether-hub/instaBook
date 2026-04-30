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
async function callQwen(prompt: string, isJson: boolean = false, onProgress?: (text: string) => void): Promise<string> {
  const payload: any = {
    model: "qwen-max", // Usually safer and provides best results, but you can change back to qwen3.6-plus if you have explicit access
    messages: [{ role: "user", content: prompt }],
    max_tokens: 8192,
    temperature: 1.0,
    stream: true,
  };
  
  if (isJson) {
    payload.response_format = { type: "json_object" };
  }

  let response: Response;

  // 所有的API调用都走后台的function
  response = await fetch('/api/qwen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `HTTP ${response.status}: ${errorText}`;
    try {
      const errJson = JSON.parse(errorText);
      errorMsg = errJson.error?.message || errJson.error || errorMsg;
    } catch (e) {
      // not json, use text
    }
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
请严格规划出 ${chapterCount} 个章节，并为每一章提供详细的剧情/内容摘要。注意：章节标题请提供简洁、有深意的纯标题，不要包含“第x章”或“Chapter x”等字样。
请返回 JSON 格式：
{
  "title": "主标题",
  "subtitle": "副标题",
  "author": "作者名",
  "isbn": "13位ISBN编号",
  "price": "定价（例如：68.00元）",
  "publisher": "出版社名称",
  "introduction": "引言全文内容",
  "recommendations": [{ "recommender": "姓名", "recommenderTitle": "头衔/职位", "content": "几段推荐序正文" }],
  "chapters": [{ "title": "章节标题", "summary": "本章摘要或说明" }]
}`;

  let jsonStr = await callQwen(prompt, true, onProgress);
  
  // 提取 JSON：尝试匹配 \`\`\`json ... \`\`\` 块，如果找不到再尝试找第一个 { 和最后一个 }
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    jsonStr = jsonMatch[1];
  } else {
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
  }

  let parsed: Partial<BookOutline> = {};
  try {
    parsed = JSON.parse(jsonStr.trim() || "{}");
  } catch (e) {
    console.error("Failed to parse AI JSON:", jsonStr);
    throw new Error("模型返回的数据格式无法解析为 JSON，请重试。\\n内容：" + jsonStr);
  }

  // Ensure arrays exist
  if (!parsed.chapters) parsed.chapters = [];
  if (!parsed.recommendations) parsed.recommendations = [];

  return parsed as BookOutline;
};

export const testQwenConnection = async (): Promise<{ ok: boolean, message?: string, error?: string }> => {
  // 生产环境和开发环境测试全都通过后端 Functions/Express 进行，保护 API Key 不在前台暴露
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
  const prompt = `撰写图书《${bookTitle}》的其中一个章节：
章节名称：${chapterTitle}
章节大纲摘要：${chapterSummary}
书籍整体风格：${writingStyle}

核心要求：
1. 请不要输出任何“以下是为您撰写的章节”等客套话，直接开始输出你的正文！
2. 正文必须详实丰富，至少在一两千字以上，要有深度有细节。
3. 请使用纯文本（不要用Markdown格式输出，直接输出段落）。段落之间用空行隔开。`;

  return await callQwen(prompt, false, onProgress);
};
