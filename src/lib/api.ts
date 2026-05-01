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

async function callAPI(prompt: string, model: string, isJson: boolean = false, onProgress?: (text: string) => void, signal?: AbortSignal): Promise<string> {
  const payload: any = {
    messages: [{ role: "user", content: prompt }],
    max_tokens: 8192,
    temperature: 1.0,
    model: model
  };
  
  if (isJson) {
    // Both DeepSeek and Qwen support json_object in their chat completion.
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `HTTP ${response.status}: ${errorText}`;
    try {
      const errJson = JSON.parse(errorText);
      errorMsg = errJson.error?.message || errJson.error || errorMsg;
    } catch (e) {
      // not json
    }
    throw new Error(errorMsg);
  }

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
      buffer = lines.pop() || ""; 

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices?.[0]?.delta;
            const textPart = (delta?.content || ""); // Do not include reasoning_content in the final output
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

export const generateBookOutline = async (topicOrTitle: string, genre: string, authorName: string, chapterCount: number, writingStyle: string, detailedRequirements: string, model: string, onProgress?: (text: string) => void, signal?: AbortSignal): Promise<BookOutline> => {
  const prompt = `你是一位专业的图书策划编辑和畅销书作家。请根据以下主题/书名：“${topicOrTitle}” 策划一本高质量的书籍大纲。
创作题材：${genre}。
风格要求：${writingStyle}。
作者：${authorName || "虚构笔名"}。
${detailedRequirements ? `额外详细要求：\n${detailedRequirements}\n` : ""}
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

  let jsonStr = await callAPI(prompt, model, true, onProgress, signal);
  
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

  if (!parsed.chapters) parsed.chapters = [];
  if (!parsed.recommendations) parsed.recommendations = [];

  return parsed as BookOutline;
};

export const testConnection = async (model: string): Promise<{ ok: boolean, message?: string, error?: string }> => {
  try {
    const res = await fetch('/api/test-key?model=' + encodeURIComponent(model));
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

export const generateChapterContent = async (bookTitle: string, genre: string, chapterTitle: string, chapterSummary: string, writingStyle: string, detailedRequirements: string, model: string, onProgress?: (text: string) => void, signal?: AbortSignal): Promise<string> => {
  const prompt = `你是一位职业作家。现在请直接撰写图书《${bookTitle}》的其中一个章节。

背景信息：
创作题材：${genre}
章节名称：${chapterTitle}
章节大纲摘要：${chapterSummary}
书籍整体风格：${writingStyle}
${detailedRequirements ? `书籍详细要求：\n${detailedRequirements}\n` : ""}

## 严限输出规则（违反以下规则将导致任务失败）：
1. **禁止输出任何前言、后记、提示语、思考过程或解释性文字**。
2. **禁止输出诸如“好的，以下是为您撰写的章节...”或“希望这段文字符合您的要求...”等任何客套话**。
3. **输出的内容必须直接且仅包含章节的正文内容**。
4. 正文必须极度详实丰富，字数要尽可能多（建议 3000-5000 字左右），要有深度、有细节、有张力。
5. **务必确保章节内容完整，必须写到一个自然的收尾或阶段性结论，严禁在故事中途或段落中途突然截断**。
6. **【重要排版要求】必须频繁分段，避免出现大段文字。每个段落建议控制在 100-300 字左右，对话和关键情境应独立成段。**
7. 请使用纯文本格式，且段落之间请务必使用**严格的一个空行（即按两次回车键）**隔开。
8. **禁止在正文开头重复输出章节标题或"第X章"等字样，请直接从正文的第一句话开始输出。**
9. 开始输出：`;

  return await callAPI(prompt, model, false, onProgress, signal);
};
