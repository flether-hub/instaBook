import { GoogleGenAI, Type } from "@google/genai";

const getProviderConfig = () => {
  if (typeof window === 'undefined') return { provider: 'gemini', key: process.env.GEMINI_API_KEY };
  const provider = localStorage.getItem('instabook-provider') || 'gemini';
  if (provider === 'deepseek') {
    return { provider, key: localStorage.getItem('instabook-deepseek-key') };
  } else if (provider === 'qwen') {
    return { provider, key: localStorage.getItem('instabook-qwen-key') };
  }
  return { provider, key: process.env.GEMINI_API_KEY || 'preview-key' };
};

const getAI = () => {
  const { provider, key } = getProviderConfig();
  if (provider === 'gemini') {
    return new GoogleGenAI({ apiKey: key as string });
  }
  return null;
};

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
  recommendations: Recommendation[]; // Added recommendations
  chapters: ChapterDetails[];
}

export const generateBookOutline = async (topicOrTitle: string, authorName: string, chapterCount: number, writingStyle: string, onProgress?: (text: string) => void): Promise<BookOutline> => {
  const { provider, key } = getProviderConfig();
  
  if (provider !== 'gemini' && !key) {
    throw new Error(`未配置正确的 ${provider} API Key。请在设置中配置。`);
  }

  const prompt = `你是一位专业的图书策划编辑和畅销书作家。请根据以下主题/书名：“${topicOrTitle}” 策划一本高质量的书籍大纲。
文笔风格要求：**${writingStyle}**。
语言：**必须完全使用中文**（除了个别专业术语）。
作者名：${authorName || "请为本书虚构一个合适的笔名"}。
章节安排：请严格规划出 **${chapterCount}** 个章节。并为每一章提供详细的剧情/内容摘要，以便后续代笔作者扩写。
**注意**：章节标题请提供简洁、有深意的纯标题，**不要**包含“第x章”或“Chapter x”等字样（这些系统会自动添加）。

同时请生成：
1. 至少 1 位虚拟行业专家或名家的“推荐序”（姓名、头衔、300字左右的推荐语）。
2. 逼真的图书出版信息（ISBN、人民币定价、虚构的出版社名称）。

请**务必**返回且仅返回一个合法的 JSON 对象，不要输出包含 markdown 的 \`\`\`json 格式，而是直接返回纯 JSON 字符串。JSON 的结构如下：
{
  "title": "主标题",
  "subtitle": "副标题",
  "author": "作者名",
  "isbn": "虚拟的13位ISBN号",
  "price": "零售定价",
  "publisher": "虚构出版社名称",
  "introduction": "引言或序言全文",
  "recommendations": [
    {
      "recommender": "推荐人姓名",
      "recommenderTitle": "推荐人身份头衔",
      "content": "推荐序正文内容"
    }
  ],
  "chapters": [
    {
      "title": "章节标题",
      "summary": "该章节的详细内容摘要"
    }
  ]
}`;

  let jsonStr = "";

  if (provider === 'gemini') {
    const ai = getAI()!;
    const response = await ai.models.generateContentStream({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    for await (const chunk of response) {
      if (chunk.text) {
        jsonStr += chunk.text;
        onProgress?.(jsonStr);
      }
    }
    jsonStr = jsonStr.trim() || "{}";
  } else {
    // Note: To keep it simpler, DeepSeek/Qwen are left non-streaming for now but still run
    const baseURL = provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    const model = provider === 'deepseek' ? 'deepseek-chat' : 'qwen-plus';
    
    const response = await fetch(baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: provider === 'deepseek' ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API 错误 (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    jsonStr = data.choices[0].message.content.trim();
    onProgress?.(jsonStr);
  }

  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\s*/, '').replace(/```$/, '').trim();
  }
  return JSON.parse(jsonStr) as BookOutline;
};

export const generateChapterContent = async (bookTitle: string, chapterTitle: string, chapterSummary: string, writingStyle: string, onProgress?: (text: string) => void): Promise<string> => {
  const { provider, key } = getProviderConfig();

  if (provider !== 'gemini' && !key) {
    throw new Error(`未配置正确的 ${provider} API Key。请在设置中配置。`);
  }

  const prompt = `你是一位专业作家，现在正在代笔撰写一本书籍，书名为《${bookTitle}》。
文笔风格要求：**${writingStyle}**。
请撰写章节：【${chapterTitle}】的全文。
该章节的内容大纲/要求如下：“${chapterSummary}”。
**要求**：
1. 必须**完全使用中文**写作成文。
2. 严格遵循“${writingStyle}”的风格进行创作。
3. 内容详实且深度引人入胜，扩充细节，单章目标字数在 1500 - 3000 字左右。
4. 输出纯文本结构，段落之间空一行排版。不需要在开头重复输出章节名，不需要Markdown代码块包裹。如果内部有小节，可以使用 Markdown 标题（例如 ### 小节名）。`;

  let fullText = "";

  if (provider === 'gemini') {
    const ai = getAI()!;
    const response = await ai.models.generateContentStream({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });

    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
        onProgress?.(fullText);
      }
    }
  } else {
    const baseURL = provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    const model = provider === 'deepseek' ? 'deepseek-chat' : 'qwen-plus';
    
    // We will not stream the other APIs for now to keep the code simpler and robust without pulling in sse.js
    // It may take a minute or two, but it avoids complex parsing logic.
    // However, the original code doesn't yield intermediate progress anyway because the caller does:
    // const content = await generateChapterContent(...);
    // setChaptersContent(prev => ({ ...prev, [idx]: content }));
    // Wait, the original code in App.tsx wasn't reading stream chunks incrementally! It just awaits the whole thing.
    
    const response = await fetch(baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API 错误 (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    fullText = data.choices[0].message.content;
  }

  return fullText;
};
