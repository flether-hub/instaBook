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
  let clientApiKey = "";
  let clientBaseUrl = "";
  let realModel = model;

  const m = model.toLowerCase();
  if (m.includes("gemini")) {
    clientApiKey = localStorage.getItem("instabook-apikey-gemini") || "";
    clientBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    realModel = localStorage.getItem("instabook-realmodel-gemini") || 
                localStorage.getItem(`instabook-realmodel-${model}`) || 
                model;
  } else if (m.includes("deepseek")) {
    clientApiKey = localStorage.getItem("instabook-apikey-deepseek") || "";
    clientBaseUrl = "https://api.deepseek.com/chat/completions";
    realModel = localStorage.getItem("instabook-realmodel-deepseek") || "deepseek-chat";
  } else {
    // Aliyun DashScope (qwen)
    clientApiKey = localStorage.getItem("instabook-apikey-qwen") || "";
    clientBaseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    realModel = localStorage.getItem("instabook-realmodel-qwen") || "qwen-max";
  }

  const payload: any = {
    messages: [{ role: "user", content: prompt }],
    max_tokens: 8192,
    temperature: 1.0,
    model: realModel
  };
  
  if (isJson) {
    // Both DeepSeek and Qwen support json_object in their chat completion.
    payload.response_format = { type: "json_object" };
  }

  const cleanKey = clientApiKey.replace(/^"|"$/g, '').trim();
  
  // Change here: Call local backend proxy instead of calling providers directly
  // This solves CORS and Authorization header issues on browsers
  const response = await fetch("/api/generate", {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...payload,
      clientApiKey: cleanKey,
      clientBaseUrl: clientBaseUrl,
      stream: true
    }),
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

export const generateBookOutline = async (topicOrTitle: string, genre: string, authorName: string, chapterCount: number, writingStyle: string, detailedRequirements: string, model: string, onProgress?: (text: string) => void, signal?: AbortSignal, wordCount?: number): Promise<BookOutline> => {
  let priceGuidance = "定价（根据书的文字字数长度而定。通常1万字以下建议15-20元，1-3万字建议21-29元，3-6万字建议30-45元，6-10万字建议46-68元，10万字以上建议69-128元。请给出符合本章总字数且真实合理的定价如 '39.00元'）";
  if (wordCount) {
    let minPrice = 15;
    let maxPrice = 25;
    if (wordCount <= 10000) {
      minPrice = 15; maxPrice = 20;
    } else if (wordCount <= 30000) {
      minPrice = 21; maxPrice = 29;
    } else if (wordCount <= 60000) {
      minPrice = 30; maxPrice = 45;
    } else if (wordCount <= 100000) {
      minPrice = 46; maxPrice = 68;
    } else {
      minPrice = 69; maxPrice = 128;
    }
    priceGuidance = `定价（提示：本书目标总字数设为约 ${wordCount.toLocaleString()} 字，请根据该篇幅长度，在人民币 ${minPrice}.00 元至 ${maxPrice}.00 元的区间内给出一个精确、合理的图书实体书估算定价，例如：“${minPrice + Math.floor(Math.random() * (maxPrice - minPrice - 1)) + 1}.00元”或类似具体数值）`;
  }

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
  "price": "${priceGuidance}",
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
    let clientApiKey = "";
    let clientBaseUrl = "";
    let realModel = model;

    const m = model.toLowerCase();
    if (m.includes("gemini")) {
      clientApiKey = localStorage.getItem("instabook-apikey-gemini") || "";
      clientBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      realModel = localStorage.getItem("instabook-realmodel-gemini") || 
                  localStorage.getItem(`instabook-realmodel-${model}`) || 
                  model;
    } else if (m.includes("deepseek")) {
      clientApiKey = localStorage.getItem("instabook-apikey-deepseek") || "";
      clientBaseUrl = "https://api.deepseek.com/chat/completions";
      realModel = localStorage.getItem("instabook-realmodel-deepseek") || "deepseek-chat";
    } else {
      // Aliyun DashScope (qwen)
      clientApiKey = localStorage.getItem("instabook-apikey-qwen") || "";
      clientBaseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
      realModel = localStorage.getItem("instabook-realmodel-qwen") || "qwen-max";
    }

    let headers: any = {
      "Content-Type": "application/json"
    };
    
    if (!clientApiKey) {
      return { ok: false, error: "API Key未配置。请在右上角配置 API Key。" };
    }

    const cleanKey = clientApiKey.replace(/^"|"$/g, '').trim();
    
    // Call backend proxy for testing as well
    const queryParams = new URLSearchParams({
      model: realModel,
      clientApiKey: cleanKey,
      clientBaseUrl: clientBaseUrl
    });

    const res = await fetch(`/api/test-key?${queryParams.toString()}`);
    
    if (!res.ok) {
      const err = await res.text();
      let errorMsg = err;
      try {
        const errJson = JSON.parse(err);
        errorMsg = errJson.error?.message || errJson.error || err;
      } catch (e) {}
      return { ok: false, error: errorMsg };
    }
    
    const data = await res.json();
    return { ok: data.ok, message: data.message, error: data.error };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
};

export const generateChapterContent = async (
  bookOutline: BookOutline,
  currentChapterIdx: number,
  genre: string,
  writingStyle: string,
  detailedRequirements: string,
  model: string,
  onProgress?: (text: string) => void,
  signal?: AbortSignal,
  previousChaptersContent?: { [key: number]: string }
): Promise<string> => {
  const chapters = bookOutline.chapters || [];
  const activeChapter = chapters[currentChapterIdx];
  const bookTitle = bookOutline.title;
  
  // 1. Build the global plan status
  let planStatus = "";
  chapters.forEach((ch, idx) => {
    let status = "待生成";
    if (idx < currentChapterIdx) {
      status = "已编撰完成";
    } else if (idx === currentChapterIdx) {
      status = "当前正在撰写/等待续写";
    }
    planStatus += `- 第 ${idx + 1} 章：“${ch.title}” ——— 【状态：${status}】\n   本章计划：${ch.summary}\n`;
  });

  // 2. Build the preceding chapter context for flawless narrative flow
  let contextTransition = "";
  if (currentChapterIdx === 0) {
    if (bookOutline.introduction) {
      contextTransition = `【前情衔接 - 书籍引言/前言】：
作为全书正式的开篇章节（第 1 章），请紧密结合、呼应以下书籍引言/前言的情绪、世界观设定、背景与基调，进行自然的、引人入胜的正文切入：
“${bookOutline.introduction}”\n`;
    }
  } else {
    // Attempt to extract the tail end of the previous chapter
    const prevContent = previousChaptersContent?.[currentChapterIdx - 1] || "";
    if (prevContent.trim()) {
      // Get the last 1200 characters to form a strong narrative bridge
      const tailLength = 1200;
      const prevTail = prevContent.length > tailLength 
        ? "..." + prevContent.slice(-tailLength) 
        : prevContent;
      
      contextTransition = `【前情衔接 - 上一章（第 ${currentChapterIdx} 章）结尾正文片段】：
为保障情节脉络、场景氛围和人物物理位置的完美无缝衔接，请特别参考上一章的以下结尾内容片段：
---
${prevTail}
---
请承接上述内容，不要产生任何时间线的断档、角色性格与逻辑常识的冲突。在开篇迅速让读者感受到连合度，即使中途更换了 AI 模型。\n`;
    } else {
      // Fallback if content was not provided but we have titles
      const prevCh = chapters[currentChapterIdx - 1];
      contextTransition = `【前情衔接】：
上一章（第 ${currentChapterIdx} 章）标题为“${prevCh.title}”（大纲：${prevCh.summary}）已完成。本章（第 ${currentChapterIdx + 1} 章）应当在此基础上流畅向下演绎剧情。\n`;
    }
  }

  const prompt = `你是一位享誉业内的卓越小说家/职业撰稿人。正在创作图书《${bookTitle}》（副标题: ${bookOutline.subtitle || "无"}）。
现在，请为本书撰写第 ${currentChapterIdx + 1} 章。

【全书宏观大纲计划与章节进展状态】：
${planStatus}

【本章撰写任务】：
- 章节名称：${activeChapter.title}
- 章节大纲主要规划：${activeChapter.summary}
- 书籍整体体裁与题材：${genre}
- 书籍创作风格定位：${writingStyle}
${detailedRequirements ? `- 额外书籍详细要求：\n${detailedRequirements}\n` : ""}

${contextTransition}

## 严限输出规则（违反以下规则将导致任务失败）：
1. **禁止输出任何前言、后记、提示语、思考过程或解释性文字**。
2. **禁止输出诸如“好的，以下是为您撰写的章节...”或“希望这段文字符合您的要求...”等任何客套话**。
3. **输出的内容必须直接且仅包含章节的正文内容**。
4. 正文必须极度详实丰富，字数控制在 2500 至 3500 字左右（以保证在 AI 生成长度限制内能够绰绰有余且完整写完），要求有深度、有细节、有张力。
5. **【结构绝对完整】必须写到一个自然的、逻辑分明的完结点或章节句点。必须在结束前开始自然收回，以完美的句号收尾，严禁在故事中途或段落中间突然被截断、无故漏空或戛然而止！**
6. **【重要排版要求】必须频繁分段，避免出现大段文字。每个段落建议控制在 100-300 字左右，对话和关键情境应独立成段。**
7. 请使用纯文本格式，且段落之间请务必使用**严格的一个空行（即按两次回车键）**隔开。
8. **禁止在正文开头重复输出章节标题或"第X章"等字样，请直接从正文的第一句话开始输出。**
9. **【绝对红线】绝对禁止在输出的结尾附带任何“审查与优化”、“规则检查”、“自我审查”、“字数统计”或“排版核对”等后置分析清单、工序、工作记录、小结或总结列表。本章内容的最后一句应当是小说正文故事的有机结束语，不得夹杂任何分析、检查小结或总结列表。**
10. 开始输出：`;

  return await callAPI(prompt, model, false, onProgress, signal);
};
