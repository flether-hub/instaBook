import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Loader2, Download, Wand2, CheckCircle2, Square, Upload, Archive, RotateCcw, Activity, AlignLeft, Cpu, User, PenTool, Hash, CircleSlash2, Play, RefreshCw } from 'lucide-react';
import { BookCover } from './components/BookCover';
import { BookContent } from './components/BookContent';
import { generateBookOutline, generateChapterContent, testConnection, BookOutline } from './lib/api';
import { generateEPUB } from './lib/epub';
import jsPDF from 'jspdf';
import { saveAs } from "file-saver";
import JSZip from "jszip";
import * as htmlToImage from 'html-to-image';

export default function App() {
  const [topic, setTopic] = useState(() => localStorage.getItem('instabook-topic') || '');
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('instabook-authorName') || '');
  const [wordCount, setWordCount] = useState<number>(() => Number(localStorage.getItem('instabook-wordCount')) || 2000);
  
  const genres = [
    { name: '小说传奇', value: '小说' },
    { name: '散文随笔', value: '散文随笔' },
    { name: '科普读物', value: '科普读物' },
    { name: '畅销读物', value: '畅销读物' },
    { name: '心灵鸡汤', value: '心灵鸡汤' }
  ];
  const [genre, setGenre] = useState(() => localStorage.getItem('instabook-genre') || genres[0].value);
  
  const [writingStyle, setWritingStyle] = useState(() => localStorage.getItem('instabook-writingStyle') || '严谨、专业、深具启发性');
  const [targetModel, setTargetModel] = useState(() => localStorage.getItem('instabook-targetModel') || 'deepseek-v4-pro');

  // Persistence for inputs
  useEffect(() => {
    localStorage.setItem('instabook-topic', topic);
    localStorage.setItem('instabook-authorName', authorName);
    localStorage.setItem('instabook-wordCount', wordCount.toString());
    localStorage.setItem('instabook-genre', genre);
    localStorage.setItem('instabook-writingStyle', writingStyle);
    localStorage.setItem('instabook-targetModel', targetModel);
  }, [topic, authorName, wordCount, genre, writingStyle, targetModel]);

  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [isResuming, setIsResuming] = useState(false);
    const [outlineProgressText, setOutlineProgressText] = useState("");
    const [outline, setOutline] = useState<BookOutline | null>(() => {
        const saved = localStorage.getItem('instabook-outline');
        return saved ? JSON.parse(saved) : null;
    });
    const [logs, setLogs] = useState<{ message: string, type: 'info' | 'error' | 'success', timestamp: string }[]>([]);

    const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev, { message, type, timestamp }]);
    };
  
  const [chaptersContent, setChaptersContent] = useState<Record<number, string>>({});
  const [generatingChapterIdx, setGeneratingChapterIdx] = useState<number | null>(null);
  const [completedChapters, setCompletedChapters] = useState<number[]>([]);
  const [stopRequested, setStopRequested] = useState(false);
  const stopRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const lastUpdateRef = useRef<number>(0);
  const contentBufferRef = useRef<string>("");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    const updateScale = () => {
      const availableWidth = window.innerWidth - 48; // px-6 is 24px each side
      if (availableWidth < 560) {
        setPreviewScale(availableWidth / 560);
      } else {
        setPreviewScale(1);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Load saved book from localStorage on mount
  useEffect(() => {
    try {
      const savedOutline = localStorage.getItem('instabook-outline');
      const savedChapters = localStorage.getItem('instabook-chaptersContent');
      const savedCompleted = localStorage.getItem('instabook-completedChapters');

      if (savedOutline) setOutline(JSON.parse(savedOutline));
      if (savedChapters) setChaptersContent(JSON.parse(savedChapters));
      if (savedCompleted) setCompletedChapters(JSON.parse(savedCompleted));
    } catch (e) {
      console.error("Failed to load book from local storage");
    }
  }, []);

  // Save book to localStorage on changes
  useEffect(() => {
    try {
      if (outline) localStorage.setItem('instabook-outline', JSON.stringify(outline));
      if (Object.keys(chaptersContent).length > 0) localStorage.setItem('instabook-chaptersContent', JSON.stringify(chaptersContent));
      if (completedChapters.length > 0) localStorage.setItem('instabook-completedChapters', JSON.stringify(completedChapters));
    } catch (e) {
      console.error("Failed to save book to local storage");
    }
  }, [outline, chaptersContent, completedChapters]);

  const styles = [
    { name: '幽默风趣', value: '幽默风趣、接地气、用生动的比喻深入浅出' },
    { name: '严谨专业', value: '严谨、专业、学术化、深具启发性' },
    { name: '文学唯美', value: '辞藻优美、富有诗意、充满文学美感' },
    { name: '辛辣讽刺', value: '犀利、睿智、略带讽刺感、直指核心' },
    { name: '热血励志', value: '充满激情、感召力强、催人奋进' },
    { name: '模仿鲁迅', value: '文笔犀利、字里行间带有批判性与深沉的爱国主义情怀、语言精炼且富有时代感' },
    { name: '模仿卡夫卡', value: '带有超现实主义色彩、充满对荒诞和异化的深刻思考、语言冷静却令人深省' }
  ];

  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [isLoggedIn, setIsLoggedIn] = useState(sessionStorage.getItem("isLoggedIn") === "true");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword })
      });
      const data = await res.json();
      if (data.ok) {
        setIsLoggedIn(true);
        sessionStorage.setItem("isLoggedIn", "true");
      } else {
        setLoginError(data.error || "登录失败");
      }
    } catch (err: any) {
      setLoginError("网络错误，请稍后重试");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [exportProgress, setExportProgress] = useState({ isExporting: false, text: "", percent: 0 });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-stone-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-stone-900 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold font-serif text-stone-900 tracking-tight">InstaBook</h1>
            <p className="text-stone-500 mt-2">请输入访问密码</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">访问密码</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
            </div>
            {loginError && <div className="text-red-500 text-sm">{loginError}</div>}
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "进入 InstaBook"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const testApiKey = async () => {
    setIsTestingApi(true);
    setApiTestStatus('idle');
    try {
      const result = await testConnection(targetModel);
      if (result.ok) {
        setApiTestStatus('success');
      } else {
        setApiTestStatus('error');
        alert(`❌ API Key 测试失败或遇到额度限制: \n\n${result.error || result.message}`);
      }
    } catch (e: any) {
      setApiTestStatus('error');
      alert(`❌ 测试请求失败，网络异常或服务未部署。\n${e.message}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  // Function to kick off the generation process
  const startGeneration = async () => {
    if (!topic.trim()) return;
    stopRef.current = false;
    setStopRequested(false);
    setIsGeneratingOutline(true);
    setIsResuming(false);
    setOutlineProgressText("");
    setOutline(null);
    setChaptersContent({});
    setCompletedChapters([]);
    setGeneratingChapterIdx(null);
    setLogs([]);

    addLog(`开始策划书籍: "${topic}"`, 'info');
    addLog(`选定体裁: ${genre}`, 'info');
    addLog(`目标字数: ${wordCount}`, 'info');
    addLog(`选定模型: ${targetModel}`, 'info');

    // Calculate roughly how many chapters are needed (assume about 2500 words per chapter)
    const chapterCount = Math.max(1, Math.min(40, Math.ceil(wordCount / 2500)));

    try {
      abortControllerRef.current = new AbortController();
      addLog('正在生成大纲与章节结构...', 'info');
      const generatedOutline = await generateBookOutline(topic, genre, authorName, chapterCount, writingStyle, targetModel, (text) => {
        setOutlineProgressText(text);
      }, abortControllerRef.current.signal);
      addLog('书籍大纲策划完成！', 'success');
      setOutline(generatedOutline);
      setIsGeneratingOutline(false);
      
      // Start generating chapters iteratively
      await generateAllChapters(generatedOutline);
    } catch (error: any) {
      if (error.name === 'AbortError') {
          addLog('生成流程已中止。', 'info');
          return;
      }
      console.error("Error generating outline:", error);
      let errorMessage = error?.message || String(error);
      addLog(`生成大纲失败: ${errorMessage}`, 'error');
      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("not found in environment variables")) {
        errorMessage = "API Key 无效或未配置。请检查部署环境中的环境变量（DEEPSEEK_API_KEY, QWEN_API_KEY 等）配置是否正确。";
      }
      alert(`生成大纲失败，请重试。\n错误信息: ${errorMessage}`);
      setIsGeneratingOutline(false);
    }
  };

  const stopGeneration = () => {
    stopRef.current = true;
    setStopRequested(true);
    setGeneratingChapterIdx(null);
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const generateAllChapters = async (bookOutline: BookOutline) => {
    for (let i = 0; i < bookOutline.chapters.length; i++) {
      if (completedChapters.includes(i)) continue; // Skip already completed chapters
      
      if (stopRef.current) break;
      setGeneratingChapterIdx(i);
      addLog(`正在编撰第 ${i + 1} 章: ${bookOutline.chapters[i].title}...`, 'info');
      contentBufferRef.current = "";
      lastUpdateRef.current = Date.now();
      
      let retries = 3;
      let success = false;
      let backoffMs = 15000;

      while (!success && retries > 0 && !stopRef.current) {
        try {
          abortControllerRef.current = new AbortController();
          const content = await generateChapterContent(
            bookOutline.title,
            genre,
            bookOutline.chapters[i].title,
            bookOutline.chapters[i].summary,
            writingStyle,
            targetModel,
            (text) => {
              contentBufferRef.current = text;
              const now = Date.now();
              // Throttle to ~2 updates per second for smoother UI
              if (now - lastUpdateRef.current > 500) {
                setChaptersContent((prev) => ({ ...prev, [i]: text }));
                lastUpdateRef.current = now;
              }
            },
            abortControllerRef.current.signal
          );
          
          if (stopRef.current) break;
          
          setChaptersContent((prev) => ({ ...prev, [i]: content }));
          setCompletedChapters((prev) => {
              const updated = [...prev, i];
              return Array.from(new Set(updated)).sort((a,b) => a-b);
          });
          addLog(`第 ${i + 1} 章编撰完成！`, 'success');
          success = true;
          
          if (i < bookOutline.chapters.length - 1 && !stopRef.current) {
            addLog('休息片刻，准备下一章...', 'info');
            await sleep(5000); 
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
              addLog(`第 ${i + 1} 章生成已手动中止。`, 'info');
              return;
          }
          if (stopRef.current) break;
          const retryMsg = retries > 1 ? `（剩余重试次数: ${retries - 1}）` : '（重试次数已耗尽）';
          addLog(`第 ${i + 1} 章生成出错: ${error?.message || '未知错误'} ${retryMsg}`, 'error');
          console.error(`Error generating chapter ${i + 1} (Retries left: ${retries - 1}):`, error);
          
          const errorMsg = error?.message?.toLowerCase() || '';
          // Retry on almost all backend errors (500, 502, 504, 429, timeouts)
          const isRetryable = !errorMsg.includes('api key') && !errorMsg.includes('unauthorized');

          if (isRetryable) {
            retries--;
            if (retries > 0) {
              console.log(`Error encountered. Waiting ${backoffMs / 1000} seconds before retrying...`);
              await sleep(backoffMs);
              backoffMs *= 2; 
            }
          } else {
            retries = 0;
          }

          if (retries === 0 && !success && !stopRef.current) {
            setChaptersContent((prev) => ({ ...prev, [i]: `本章生成失败，请点击【续写完成】重试该章节。\n错误详情：${error?.message || '未知错误'}` }));
            // Stop generating further chapters to prevent cascading failures
            setStopRequested(true);
            stopRef.current = true;
            break;
          }
        }
      }
    }
    if (!stopRef.current) {
      setGeneratingChapterIdx(null);
    }
  };

  const exportProject = async () => {
    if (!outline) return;
    
    try {
      const zip = new JSZip();
      
      const projectData = {
        topic,
        authorName,
        wordCount,
        writingStyle,
        outline,
        chaptersContent,
        completedChapters
      };
      
      zip.file('project.json', JSON.stringify(projectData, null, 2));

      // Generate a markdown representation
      let contentMd = `# ${outline.title}\n\n`;
      if (outline.subtitle) contentMd += `**副标题**: ${outline.subtitle}\n\n`;
      contentMd += `**作者**: ${outline.author}\n\n`;
      contentMd += `**出版社**: ${outline.publisher}\n\n`;
      
      if (outline.recommendations && outline.recommendations.length > 0) {
        contentMd += `## 推荐序\n\n`;
        outline.recommendations.forEach(rec => {
          contentMd += `### ${rec.recommender} (${rec.recommenderTitle})\n\n`;
          contentMd += `${rec.content}\n\n`;
        });
      }

      contentMd += `## 引言\n\n${outline.introduction}\n\n`;

      outline.chapters.forEach((chap, idx) => {
        contentMd += `## 第 ${idx + 1} 章: ${chap.title}\n\n`;
        if (chaptersContent[idx]) {
          contentMd += `${chaptersContent[idx]}\n\n`;
        }
      });
      
      zip.file('book-content.md', contentMd);

      // fetch cover image
      let buffer: ArrayBuffer | null = null;
      try {
        let hash = 0;
        const str = outline.title || "default";
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const seedNum = Math.abs(hash);
        const response = await fetch(`https://picsum.photos/seed/${seedNum}/548/793`);
        const blob = await response.blob();
        buffer = await blob.arrayBuffer();
        if (buffer) {
          zip.file('cover.jpg', buffer);
        }
      } catch (err) {
        console.warn("Failed to fetch cover image for export", err);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${outline.title}-project.zip`);
    } catch (err) {
      console.error("Export project failed:", err);
      alert("导出项目失败！");
    }
  };

  const importProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const unzipped = await zip.loadAsync(file);
      
      const projectFile = unzipped.file('project.json');
      if (!projectFile) {
        alert("无效的压缩包，未找到项目数据 (project.json)");
        return;
      }

      const projectContent = await projectFile.async('string');
      const data = JSON.parse(projectContent);

      if (data.topic) setTopic(data.topic);
      if (data.authorName) setAuthorName(data.authorName);
      if (data.wordCount) setWordCount(data.wordCount);
      if (data.writingStyle) setWritingStyle(data.writingStyle);
      if (data.outline) setOutline(data.outline);
      if (data.chaptersContent) setChaptersContent(data.chaptersContent);
      if (data.completedChapters) setCompletedChapters(data.completedChapters);

      // Check if book is incomplete
      if (data.outline && data.completedChapters && data.completedChapters.length < data.outline.chapters.length) {
        setShowContinueModal(true);
      } else {
        alert("图书项目导入成功！");
      }
    } catch (error) {
      console.error('Import failed', error);
      alert("导入图书项目失败！请确保你上传的是该工具导出的 zip 文件。");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const captureCover = async (): Promise<Blob | null> => {
    const coverElement = document.getElementById('book-cover-to-capture');
    if (!coverElement) {
      console.error("Cover element not found");
      return null;
    }
    
    try {
      // Scroll to cover and wait for rendering
      coverElement.scrollIntoView({ behavior: 'instant', block: 'start' });
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const dataUrl = await htmlToImage.toPng(coverElement, {
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: "#1c1917", // Force background color to match cover
        width: 560,
        height: 795,
        style: {
          borderRadius: '0',
          boxShadow: 'none',
          transform: 'none',
          margin: '0',
          padding: '0',
          border: 'none',
          width: '560px',
          height: '795px'
        },
        fontEmbedCSS: '',
        filter: (node) => {
          if ((node as HTMLElement).classList?.contains('binder-effect')) return false;
          return true;
        }
      });
      
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      console.error("Cover capture error:", err);
      return null;
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const processExport = async (format: 'pdf' | 'epub') => {
    if (!outline) return;
    setExportProgress({ isExporting: true, text: "正在渲染封面...", percent: 10 });
    
    try {
      const coverBlob = await captureCover();
      
      if (format === 'epub') {
        setExportProgress({ isExporting: true, text: "正在生成 EPUB 文件...", percent: 60 });
        await generateEPUB(outline, chaptersContent, wordCount, coverBlob);
        setExportProgress({ isExporting: false, text: "", percent: 100 });
        setShowExportModal(false);
        return;
      }

      // Generate PDF
      const pages = Array.from(document.querySelectorAll('.printable-book .page-break'));
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' // 148 x 210 mm
      });

      let isFirstPage = true;

      if (coverBlob) {
        const coverDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(coverBlob);
        });
        pdf.addImage(coverDataUrl, 'PNG', 0, 0, 148, 210, undefined, 'FAST');
        isFirstPage = false;
      }

      const totalPages = pages.length;
      
      for (let i = 0; i < totalPages; i++) {
        setExportProgress({ 
          isExporting: true, 
          text: `正在渲染 PDF (${i + 1}/${totalPages})，这可能需要几分钟...`, 
          percent: 10 + Math.floor((i / totalPages) * 85) 
        });
        
        const pageElement = pages[i] as HTMLElement;
        
        // Scroll into view to prevent rendering glitches from out-of-viewport elements
        pageElement.scrollIntoView({ behavior: 'instant', block: 'start' });
        await new Promise(resolve => setTimeout(resolve, 100));

        // Use fixed dimensions regardless of screen size to prevent deformation on mobile
        const targetWidth = 560;
        const targetHeight = 795;
        
        const imgData = await htmlToImage.toJpeg(pageElement, {
          pixelRatio: 2.5,
          quality: 1,
          backgroundColor: "#fcfbf8",
          width: 560,
          height: 795,
          skipFonts: true,
          // Prevent crash on CORS restricted stylesheets
          preferredFontFormat: 'woff2',
          filter: (node) => {
             if (node instanceof HTMLLinkElement && node.href.includes('fonts.googleapis.com')) return false;
             return true;
          },
          style: {
            width: '560px',
            height: '795px',
            boxShadow: 'none',
            transform: 'none',
            zoom: '1',
            margin: '0',
            maxWidth: 'none',
            border: 'none',
            borderRadius: '0'
          }
        });

        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;
        pdf.addImage(imgData, 'JPEG', 0, 0, 148, 210, undefined, 'FAST');
        
        // Wait a small tick to avoid browser freezing
        await new Promise(r => setTimeout(r, 50));
      }

      setExportProgress({ isExporting: true, text: "正在合成并下载 PDF，请稍候...", percent: 98 });
      pdf.save(`${outline.title}.pdf`);
      
      setExportProgress({ isExporting: false, text: "", percent: 100 });
      setShowExportModal(false);
      
    } catch (err) {
      console.error(err);
      alert(`下载 ${format.toUpperCase()} 失败！`);
      setExportProgress({ isExporting: false, text: "", percent: 0 });
    }
  };

  const isFullyCompleted = outline && completedChapters.length === outline.chapters.length;
  const isInterrupted = outline && completedChapters.length < outline.chapters.length && !isGeneratingOutline && !generatingChapterIdx;

  const splitIntoPages = (content: string, isIntroduction = false, isChapterStart = false) => {
    const pages: string[][] = [];
    const paragraphs = content.split('\n\n').filter((p) => p.trim() !== '');
    
    // A5 页面宽度 560px, padding 65px*2 = 430px 可用空间
    // 强制紧凑排版：根据测量设置 charsPerLine 为 27/28
    const charsPerLine = 27; 
    const linesPerPageNormal = 23; 
    const linesPerPageWithTitle = 16; 
    
    let currentPage: string[] = [];
    let linesInCurrentPage = 0;
    
    const getAvailableLines = (pageNum: number) => {
      return (pageNum === 0 && (isIntroduction || isChapterStart)) 
        ? linesPerPageWithTitle 
        : linesPerPageNormal;
    };

    paragraphs.forEach((p) => {
      let pLines = Math.ceil(p.length / charsPerLine) + 1; 
      if (p.startsWith('#')) pLines += 2;

      const totalLinesForThisPage = getAvailableLines(pages.length);
      let remainingLinesInPage = totalLinesForThisPage - linesInCurrentPage;

      // Tight fit logic: Fill page as much as possible
      if (pLines <= remainingLinesInPage) {
        currentPage.push(p);
        linesInCurrentPage += pLines;
      } 
      else {
        // Core fix: Greedy splitting to minimize bottom whitespace
        // If we can fit at least 2 lines of text, split the paragraph
        if (remainingLinesInPage >= 2) {
          const charsToFit = Math.floor((remainingLinesInPage - 1) * charsPerLine);
          const firstPart = p.substring(0, charsToFit);
          const restPart = p.substring(charsToFit);
          
          if (firstPart.length > 0) {
            currentPage.push(firstPart);
          }
          pages.push(currentPage);
          
          let remainingText = restPart;
          while (remainingText.length > 0) {
            const nextPagesLines = getAvailableLines(pages.length);
            const charsForNextPage = (nextPagesLines - 1) * charsPerLine;
            
            if (remainingText.length <= charsForNextPage) {
              currentPage = ["[NO_INDENT]" + remainingText];
              linesInCurrentPage = Math.ceil(remainingText.length / charsPerLine) + 1;
              remainingText = "";
            } else {
              const chunk = remainingText.substring(0, charsForNextPage);
              pages.push(["[NO_INDENT]" + chunk]);
              remainingText = remainingText.substring(charsForNextPage);
            }
          }
        } else {
          // If 1 or 0 lines left, move entire paragraph to next page
          if (currentPage.length > 0) pages.push(currentPage);
          currentPage = [p];
          linesInCurrentPage = pLines;
        }
      }
    });

    if (currentPage.length > 0) pages.push(currentPage);
    return pages.length > 0 ? pages : [[""]];
  };

  const requestResetProject = () => {
    setShowResetConfirm(true);
  };

  const confirmResetProject = () => {
    stopGeneration();
    setOutline(null);
    setChaptersContent({});
    setCompletedChapters([]);
    setGeneratingChapterIdx(null);
    setStopRequested(false);
    stopRef.current = false;
    // Remove wiping of inputs
    localStorage.removeItem('instabook-outline');
    localStorage.removeItem('instabook-chaptersContent');
    localStorage.removeItem('instabook-completedChapters');
    setShowResetConfirm(false);
  };

  const handleContinueWriting = () => {
    setShowContinueModal(false);
    resumeGeneration();
  };

  const resumeGeneration = async () => {
    if (!outline) return;
    setIsResuming(true);
    stopRef.current = false;
    setStopRequested(false);
    await generateAllChapters(outline);
  };

  const downloadEpub = async () => {
    if (!outline) return;
    try {
      const coverBlob = await captureCover();
      await generateEPUB(outline, chaptersContent, wordCount, coverBlob);
    } catch (err) {
      console.error(err);
      alert("下载 EPUB 电子书失败！");
    }
  };

  const estimatePageNumbers = () => {
    if (!outline) return { intro: 1, chapters: [] };
    
    let currentPage = 1; // Cover Page
    currentPage++; // Title Page
    currentPage++; // Copyright Page
    
    // Recommendations
    if (outline.recommendations) {
      outline.recommendations.forEach(rec => {
        const pages = splitIntoPages(rec.content);
        currentPage += pages.length;
      });
    }

    // Table of Contents
    const chaptersPerTocPage = 15;
    const tocPagesNeeded = Math.max(1, Math.ceil((outline.chapters.length || 0) / chaptersPerTocPage));
    currentPage += tocPagesNeeded;

    // Intro
    const introStartPage = currentPage;
    const introPages = splitIntoPages(outline.introduction || "", true).length;
    currentPage += introPages;

    // Chapters
    const chaptersToC = outline.chapters.map((chap, idx) => {
      const startPage = currentPage;
      
      // STABILITY FIX: While a chapter is generating, we use a fixed estimate
      // (the summary length) to keep the TOC page numbers from "shaking" or
      // jumping token by token. We only use the real content once it's fully completed.
      const content = completedChapters.includes(idx) ? chaptersContent[idx] : (chap.summary || "");
      const chapPages = Math.max(1, splitIntoPages(content, false, true).length);
      
      currentPage += chapPages;
      return { title: chap.title, page: startPage };
    });

    return { intro: introStartPage, chapters: chaptersToC };
  };

  const estimatedPages = React.useMemo(() => {
    return outline ? estimatePageNumbers() : { intro: 1, chapters: [] };
  }, [outline, completedChapters]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans selection:bg-stone-300 selection:text-stone-900 pb-24">
      
      <header className="no-print bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center text-white"><BookOpen className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold tracking-tight">InstaBook</h1>
          </div>
            <div className="flex items-center gap-2 md:gap-3">
              <input type="file" accept=".zip" className="hidden" ref={fileInputRef} onChange={importProject} />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                title="导入项目"
                className="w-10 h-10 md:w-auto md:px-4 text-stone-600 hover:bg-stone-200 bg-stone-100 rounded-full transition-colors flex items-center justify-center gap-2 shrink-0">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline-block font-medium text-sm whitespace-nowrap">导入</span>
              </button>
              {outline && (
                <>
                  <button 
                    onClick={requestResetProject} 
                    title="重新开始"
                    className="w-10 h-10 md:w-auto md:px-4 text-red-600 hover:bg-red-50 bg-red-50/50 rounded-full transition-colors flex items-center justify-center gap-2 shrink-0">
                      <RotateCcw className="w-4 h-4 shrink-0" />
                      <span className="hidden md:inline-block font-medium text-sm whitespace-nowrap">重写</span>
                  </button>
                  {isInterrupted && (
                    <button 
                      onClick={resumeGeneration} 
                      title="续写"
                      className="w-10 h-10 md:w-auto md:px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors shadow-sm animate-pulse flex items-center justify-center gap-2 shrink-0">
                        <Wand2 className="w-4 h-4 shrink-0" />
                        <span className="hidden md:inline-block font-medium text-sm whitespace-nowrap">续写</span>
                    </button>
                  )}
                  <button 
                    onClick={exportProject} 
                    title="导出项目"
                    className="w-10 h-10 md:w-auto md:px-4 text-stone-600 hover:bg-stone-200 bg-stone-100 rounded-full transition-colors flex items-center justify-center gap-2 shrink-0">
                      <Archive className="w-4 h-4 shrink-0" />
                      <span className="hidden md:inline-block font-medium text-sm whitespace-nowrap">导出</span>
                  </button>
                  <button 
                    onClick={handleExport} 
                    title="下载成书"
                    className="w-10 h-10 md:w-auto md:px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-full transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0">
                      <Download className="w-4 h-4 shrink-0" />
                      <span className="hidden md:inline-block font-medium text-sm whitespace-nowrap">下载</span>
                  </button>
                </>
              )}
            </div>
        </div>
      </header>

      {!outline && !isGeneratingOutline && (
        <div className="max-w-3xl mx-auto px-6 pt-32 pb-24 text-center no-print">
          <h2 className="text-4xl md:text-6xl font-serif font-bold mb-6 tracking-tight text-stone-900">瞬间创作一部完整书籍</h2>
          <p className="text-xl text-stone-500 mb-12 max-w-xl mx-auto">只需输入书名或主题，AI 将为您生成包含完整目录、正文章节、封面及出版信息的标准 A5 (148x210mm) 图书。</p>
          <div className="bg-white p-6 rounded-2xl shadow-xl shadow-stone-200/50 flex flex-col gap-5 border border-stone-100 text-left">
            <div className="flex flex-col md:flex-row gap-5 mb-5 md:mb-0">
              <div className="flex-[2]"><label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2"><BookOpen className="w-4 h-4 text-stone-400" />书名或主题</label><input type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow disabled:opacity-50" placeholder="例如：量子计算发展史..." value={topic} onChange={(e) => setTopic(e.target.value)} disabled={isGeneratingOutline} /></div>
              <div className="flex-1"><label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2"><AlignLeft className="w-4 h-4 text-stone-400" />创作题材</label><select className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow disabled:opacity-50" value={genre} onChange={(e) => setGenre(e.target.value)} disabled={isGeneratingOutline}>{genres.map((g) => (<option key={g.name} value={g.value}>{g.name}</option>))}</select></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                  <Cpu className="w-4 h-4 text-stone-400" />AI 模型
                </label>
                <select 
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow disabled:opacity-50"
                  value={targetModel}
                  onChange={(e) => setTargetModel(e.target.value)}
                  disabled={isGeneratingOutline}
                >
                  <option value="deepseek-v4-pro">deepseek-v4-pro</option>
                  <option value="qwen3.6-plus">qwen3.6-plus</option>
                </select>
              </div>
              <div><label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2"><User className="w-4 h-4 text-stone-400" />作者署名</label><input type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow disabled:opacity-50" placeholder="署名/笔名..." value={authorName} onChange={(e) => setAuthorName(e.target.value)} disabled={isGeneratingOutline} /></div>
              <div><label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2"><PenTool className="w-4 h-4 text-stone-400" />文笔风格</label><select className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow disabled:opacity-50" value={writingStyle} onChange={(e) => setWritingStyle(e.target.value)} disabled={isGeneratingOutline}>{styles.map((s) => (<option key={s.name} value={s.value}>{s.name}</option>))}</select></div>
              <div><label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2"><Hash className="w-4 h-4 text-stone-400" />总字数</label><select className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow disabled:opacity-50" value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))} disabled={isGeneratingOutline}><option value={2000}>极短篇 (~2千字)</option><option value={5000}>短篇 (~5千字)</option><option value={10000}>短篇 (~1万字)</option><option value={30000}>中篇 (~3万字)</option><option value={50000}>长篇 (~5万字)</option><option value={100000}>巨著 (~10万字)</option></select></div>
            </div>
            
            <div className="flex flex-row gap-3 mt-4">
              <button onClick={startGeneration} disabled={!topic.trim() || isGeneratingOutline} className="flex-1 py-4 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"><Wand2 className="w-5 h-5 shrink-0" /><span>开始撰写</span></button>
              <button 
                onClick={testApiKey} 
                disabled={isTestingApi} 
                className={`py-4 px-4 sm:px-6 rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap shrink-0 ${
                  apiTestStatus === 'success' ? 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300' :
                  apiTestStatus === 'error' ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300' :
                  'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
                }`}
                title={isTestingApi ? '测试中...' : apiTestStatus === 'success' ? '连接成功' : apiTestStatus === 'error' ? '连接失败' : '测试连接'}
              >
                {isTestingApi ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : 
                 apiTestStatus === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> :
                 apiTestStatus === 'error' ? <Activity className="w-5 h-5 shrink-0" /> : 
                 <Activity className="w-5 h-5 shrink-0" />
                }
                <span className="hidden sm:inline">
                {isTestingApi ? '测试中' : 
                 apiTestStatus === 'success' ? '已连接' : 
                 apiTestStatus === 'error' ? '连接失败' : 
                 '测试连接'}
                </span>
              </button>
            </div>
            {isInterrupted && (<button onClick={resumeGeneration} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-3 mt-3"><Wand2 className="w-5 h-5" />检测到未完成书籍：继续续写</button>)}
          </div>
        </div>
      )}

      {(isGeneratingOutline || (outline && !isFullyCompleted)) && (
        <div className="max-w-2xl mx-auto px-6 py-16 no-print">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-3">
                {stopRequested ? (
                  <CircleSlash2 className="w-5 h-5 text-stone-400" />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
                )}
                {stopRequested ? "生成已中止" : (isResuming ? "正在续写您的著作..." : "正在编撰您的著作...")}
              </h3>
              
              <div className="flex gap-2">
                {stopRequested ? (
                  <>
                    <button 
                      onClick={() => {
                        setStopRequested(false);
                        stopRef.current = false;
                        if (outline) generateAllChapters(outline);
                      }}
                      className="text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                      <Play className="w-4 h-4 fill-current" />继续
                    </button>
                    <button 
                      onClick={requestResetProject}
                      className="text-stone-600 bg-stone-100 hover:bg-stone-200 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />重新策划
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={stopGeneration} 
                    className="text-stone-500 hover:text-red-500 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                    <Square className="w-4 h-4 fill-current" />停止生成
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-2"><div className="flex items-center gap-4">{isGeneratingOutline ? (<Loader2 className="w-5 h-5 animate-spin text-stone-400" />) : (<CheckCircle2 className="w-5 h-5 text-emerald-500" />)}<span className={isGeneratingOutline ? "text-stone-600" : "text-stone-900 font-medium"}>正在策划出版大纲与章节结构</span></div>{isGeneratingOutline && outlineProgressText && ( <div className="ml-9 p-3 bg-stone-50 rounded-lg border border-stone-200 max-h-40 overflow-y-auto w-full max-w-[calc(100%-2.25rem)]"><pre className="text-xs text-stone-500 whitespace-pre-wrap font-mono overflow-x-hidden w-full">{outlineProgressText}</pre></div> )}</div>
              {outline && outline.chapters.map((chap, idx) => (<div key={idx} className="flex items-center gap-4 text-sm md:text-base">{completedChapters.includes(idx) ? ( <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> ) : generatingChapterIdx === idx ? ( <Loader2 className="w-5 h-5 animate-spin text-emerald-500 shrink-0" /> ) : ( <div className="w-5 h-5 border-2 border-stone-200 rounded-full shrink-0" /> )}<span className={ completedChapters.includes(idx) ? "text-stone-900 font-medium" : generatingChapterIdx === idx ? "text-emerald-700 font-medium" : "text-stone-400" }>第 {idx + 1} 章：{chap.title}</span></div>))}
              
              {/* Detailed AI Process Logs */}
              <div className="mt-8 pt-6 border-t border-stone-100">
                <div className="flex items-center gap-2 mb-3 text-stone-400">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">AI 工作日志</span>
                </div>
                <div className="bg-black rounded-xl p-4 h-48 overflow-y-auto font-mono text-[11px] leading-relaxed relative border border-green-900/30 shadow-[inset_0_0_20px_rgba(0,255,65,0.05)] overflow-x-hidden">
                  <div className="space-y-1.5 relative z-10">
                    {logs.length === 0 ? (
                      <div className="text-green-900 italic">等待工作指令...</div>
                    ) : (
                      logs.map((log, i) => (
                        <div key={i} className={`flex gap-3 ${
                          log.type === 'error' ? 'text-red-500' : 
                          log.type === 'success' ? 'text-green-300 font-bold' : 
                          'text-[#00FF41]'
                        }`}>
                          <span className="text-green-900 shrink-0">[{log.timestamp}]</span>
                          <span className="break-all opacity-90">{log.message}</span>
                        </div>
                      ))
                    )}
                    <div ref={logEndRef} />
                  </div>
                  {/* Matrix scanline effect */}
                  <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {outline && (
        <div className="max-w-4xl mx-auto px-6 py-12 printable-book" style={{ zoom: previewScale }}>
          <div className="hidden print:flex print-header"><span>《{outline.title}》</span><span>{outline.author} 著</span></div>
          <div className="hidden print:block print-footer"><span className="page-number"></span></div>
          <div style={{ counterReset: 'page' }}></div>
          <div className="mb-8 page-break-after-always book-cover-page"><BookCover title={outline.title} subtitle={outline.subtitle} author={outline.author} publisher={outline.publisher} /></div>
          <div className="book-page-preview page-break flex flex-col items-center justify-center text-center mb-8"><h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 text-black" style={{ fontFamily: "SimHei" }}>{outline.title}</h1><h2 className="text-xl md:text-2xl font-serif text-stone-600 mb-16" style={{ fontFamily: "SimHei" }}>{outline.subtitle}</h2><div className="mt-auto mb-16"><p className="text-lg font-serif">作者：{outline.author}</p></div><div className="mt-12 text-sm text-stone-500 font-serif flex flex-col gap-2"><span>{outline.publisher} 出版</span></div></div>
          <div className="book-page-preview page-break flex flex-col justify-end pb-12 mb-8 text-stone-600 text-sm font-serif"><p className="mb-4">出版发行：{outline.publisher}</p><p className="mb-4">版权所有 © {new Date().getFullYear()} {outline.author}。保留所有权利。</p><p className="mb-4">未经出版者事先书面许可，不得以任何方式复制、存储或传播本书的任何部分。</p><p className="mb-4">本书字数：约 {wordCount.toLocaleString()} 字</p><p className="mb-4">开本：A5 (148mm × 210mm)</p><div className="mt-8 border-t border-stone-300 pt-4"><p>书号 (ISBN): {outline.isbn}</p><p>定价: {outline.price}</p></div></div>
          {(() => {
            let pageCounter = estimatedPages.intro - (outline.recommendations?.length || 0);
            return outline.recommendations?.map((rec, idx) => {
              const pages = splitIntoPages(rec.content);
              return pages.map((pageParas, pageIdx) => {
                pageCounter++;
                return (
                  <div key={`rec-${idx}-${pageIdx}`} className="book-page-preview page-break">
                    {/* Header removed as requested */}
                    {pageIdx === 0 && (
                      <h2 className="text-[1.35rem] font-serif font-bold mb-8 text-center text-black mt-[1.5rem]" style={{ fontFamily: "SimHei" }}>推荐序</h2>
                    )}
                    <BookContent content={pageParas.join('\n\n')} />
                    {pageIdx === pages.length - 1 && (
                      <div className="mt-8 text-right font-serif">
                        <p className="text-[1rem] font-bold">{rec.recommender}</p>
                        <p className="text-stone-500 text-[0.875rem]">{rec.recommenderTitle}</p>
                      </div>
                    )}
                    <div className="preview-footer">— {pageCounter} —</div>
                  </div>
                );
              });
            });
          })()}
          {(() => {
            const chaptersPerTocPage = 15;
            const tocPagesNeeded = Math.max(1, Math.ceil((outline.chapters.length || 0) / chaptersPerTocPage));
            const tocPages = [];
            
            for (let p = 0; p < tocPagesNeeded; p++) {
              const startIdx = p * chaptersPerTocPage;
              const endIdx = startIdx + chaptersPerTocPage;
              const pageChapters = outline.chapters.slice(startIdx, endIdx);
              
              tocPages.push(
                <div key={`toc-page-${p}`} className="book-page-preview page-break mb-8 mx-auto">
                  <h2 className="text-[1.35rem] font-serif font-bold mb-8 text-center text-black mt-[1.5rem]" style={{ fontFamily: "SimHei" }}>目 录</h2>
                  <div className="space-y-[0.6rem] font-serif text-[0.85rem] leading-tight">
                    {p === 0 && (
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="font-bold text-[0.95rem]">引言</span>
                        <div className="flex-grow border-b border-dotted border-stone-400 relative top-[-4px] mx-4"></div>
                        <span className="font-bold text-[0.95rem]">{estimatedPages.intro}</span>
                      </div>
                    )}
                    {pageChapters.map((chap, idx) => {
                      const globalIdx = startIdx + idx;
                      return (
                        <div key={globalIdx} className="flex items-baseline justify-between group">
                          <span className="pr-4 bg-[#fcfbf8] transition-colors z-10 print:bg-[#fcfbf8] inline-block max-w-[85%]">
                            第 {globalIdx + 1} 章 {chap.title}
                          </span>
                          <div className="flex-grow border-b border-dotted border-stone-400 relative top-[-4px]"></div>
                          <span className="pl-4 bg-[#fcfbf8] transition-colors z-10 print:bg-[#fcfbf8]">
                            {estimatedPages.chapters[globalIdx]?.page || "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="preview-footer">—</div>
                </div>
              );
            }
            return tocPages;
          })()}
          {(() => { let pageCounter = estimatedPages.intro - 1; return splitIntoPages(outline.introduction, true).map((pageParas, pageIdx) => { pageCounter++; return ( <div key={`intro-${pageIdx}`} className="book-page-preview page-break mb-8 mx-auto"><div className="preview-header">{outline.title}</div>{pageIdx === 0 && ( <h2 className="text-[1.35rem] font-serif font-bold mb-8 text-center text-black mt-[1.5rem]" style={{ fontFamily: "SimHei" }}>引言</h2> )}<BookContent content={pageParas.join('\n\n')} /><div className="preview-footer">— {pageCounter} —</div></div> ); }); })()}
          {(() => { 
            return outline.chapters.map((chap, idx) => { 
              const contentReady = completedChapters.includes(idx) || (generatingChapterIdx === idx && chaptersContent[idx]); 
              const content = contentReady ? chaptersContent[idx] : ""; 
              const pages = contentReady ? splitIntoPages(content, false, true) : [[""]]; 
              
              // Use the stable estimated start page for this chapter
              let chapterStartPage = estimatedPages.chapters[idx]?.page || (idx === 0 ? estimatedPages.intro + splitIntoPages(outline.introduction || "", true).length : 1);
              
              return pages.map((pageParas, pageIdx) => { 
                const currentPageNum = chapterStartPage + pageIdx;
                return ( 
                  <div key={`chap-${idx}-${pageIdx}`} className="book-page-preview page-break flex flex-col relative content-page">
                    <div className="preview-header">{outline.title}</div>
                    {pageIdx === 0 && ( 
                      <div className="mt-[2rem] mb-[2rem] text-center w-full">
                        <span className="text-[1rem] font-serif text-black block mb-2" style={{ fontFamily: "SimHei" }}>第 {idx + 1} 章</span>
                        <h2 className="text-[1.8rem] font-serif font-bold text-black leading-tight" style={{ fontFamily: "SimHei" }}>{chap.title}</h2>
                      </div> 
                    )}
                    <div className="w-full text-left flex-grow">
                      {contentReady ? ( 
                        <>
                          <BookContent content={pageParas.join('\n\n')} />
                          {generatingChapterIdx === idx && pageIdx === pages.length - 1 && ( 
                            <div className="flex items-center gap-2 text-stone-400 mt-8 mb-4 justify-center no-print">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm font-serif">AI 正在奋笔疾书...</span>
                            </div> 
                          )}
                        </> 
                      ) : ( 
                        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-stone-400 no-print">
                          <Loader2 className="w-8 h-8 animate-spin mb-4" />
                          <p className="font-serif">等待生成...</p>
                        </div> 
                      )}
                    </div>
                    <div className="preview-footer">— {currentPageNum} —</div>
                  </div> 
                ); 
              }); 
            }); 
          })()}
          <div className="book-page-preview page-break flex flex-col items-center justify-center min-h-[50vh] text-center border-t border-stone-200 pt-16"><div className="w-12 h-12 mb-8 mx-auto bg-stone-900 rounded-[12px] flex items-center justify-center text-white"><BookOpen className="w-6 h-6" /></div><p className="font-serif text-lg text-stone-500 max-w-md">全书完</p><p className="mt-8 text-sm text-stone-400 font-sans tracking-wide">本著作由 InstaBook Builder 强力驱动生成</p></div>
        </div>
      )}
      
      {showResetConfirm && (
        <div className="fixed inset-0 bg-stone-900/50 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-stone-200">
            <div className="p-6">
              <h3 className="text-xl font-bold font-serif mb-2 text-stone-900">重新开始？</h3>
              <p className="text-stone-500 mb-8 leading-relaxed">确定要清除当前的所有进度和内容吗？建议在重新书写前先导出当前项目。</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={confirmResetProject}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors shadow-sm"
                >
                  确定清除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-stone-900/50 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200 p-6">
            <h3 className="text-2xl font-bold font-serif mb-2 text-stone-900 text-center">下载成书</h3>
            <p className="text-stone-500 mb-8 text-center" style={{fontFamily: "SimHei"}}>您可以将生成的全部内容以电子书格式下载保存</p>
            
            {!exportProgress.isExporting ? (
              <div className="flex flex-col gap-4">
                <button onClick={() => processExport('epub')} className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left group">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform"><BookOpen className="w-6 h-6"/></div>
                  <div><div className="font-bold text-stone-900 text-lg">EPUB 电子书</div><div className="text-stone-500 text-sm">流式排版格式，适合 Kindle、Apple Books 等各种阅读器阅读</div></div>
                </button>
                <button onClick={() => processExport('pdf')} className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 hover:border-red-400 hover:bg-red-50 transition-colors text-left group">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform"><Download className="w-6 h-6"/></div>
                  <div><div className="font-bold text-stone-900 text-lg">PDF 版式文件</div><div className="text-stone-500 text-sm">固定排版格式，完美保留当前预览里的精美 A5 书页排版</div></div>
                </button>
                <button onClick={() => setShowExportModal(false)} className="mt-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl font-medium text-stone-700 transition-colors">
                  取消
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-6" />
                <div className="w-full bg-stone-100 rounded-full h-2 mb-4 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{width: `${exportProgress.percent}%`}}></div>
                </div>
                <p className="text-stone-600 font-medium">{exportProgress.text}</p>
                <p className="text-stone-400 text-sm mt-2 text-center">生成过程由浏览器合成，可能需要一些时间，<br/>请保持页面处于前台不要切换。</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showContinueModal && (
        <div className="fixed inset-0 bg-stone-900/50 z-[110] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-stone-200 p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold font-serif mb-3 text-stone-900">未完成的书籍</h3>
            <p className="text-stone-500 mb-8 leading-relaxed">检测到导入的书籍项目尚未全部完成，是否立即开始续写剩余章节？</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleContinueWriting}
                className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Wand2 className="w-5 h-5" />
                开始续写
              </button>
              <button 
                onClick={() => setShowContinueModal(false)}
                className="w-full py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium rounded-2xl transition-all"
              >
                仅查看已完成部分
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-stone-900/50 z-[110] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-stone-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold font-serif mb-3 text-stone-900">重新开始？</h3>
            <p className="text-stone-500 mb-8 leading-relaxed">当前已生成的目录和章节将被永久删除。如果您需要保留这些内容，请先点击“导出”保存项目文件。</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmResetProject}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg"
              >
                确认删除并重新策划
              </button>
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium rounded-2xl transition-all"
              >
                返回继续编辑
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
