import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Loader2,
  Download,
  Printer,
  Wand2,
  CheckCircle2,
  Square,
  Upload,
  Archive,
  RotateCcw,
  Activity,
  AlignLeft,
  Cpu,
  User,
  PenTool,
  Hash,
  CircleSlash2,
  Play,
  RefreshCw,
  FileText,
  Settings,
  Trash2,
  FolderOpen,
  Database,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Home,
  Lock,
  Unlock,
  Maximize2,
} from "lucide-react";
import { BookCover } from "./components/BookCover";
import { BookContent } from "./components/BookContent";
import { PaginatedSection } from "./components/PaginatedSection";
import {
  generateBookOutline,
  generateChapterContent,
  testConnection,
  BookOutline,
} from "./lib/api";
import { generateEPUB } from "./lib/epub";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import * as htmlToImage from "html-to-image";
import { getBooks, getBook, saveBook, deleteBook, BookRecord } from "./lib/db";

const literaryBg = new URL(
  "./assets/images/literary_bg_1779674811284.png",
  import.meta.url,
).href;
const banyanTreeBg = new URL(
  "./assets/images/light_banyan_tree_bg_1779690976791.png",
  import.meta.url,
).href;

const GrassTitleBarBg = () => (
  <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden rounded-xl z-0 pointer-events-none opacity-[0.10]">
    <svg width="100%" height="150%" className="absolute bottom-0 left-0 text-amber-600" preserveAspectRatio="none" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,100 Q5,40 15,10 Q20,60 25,100 M20,100 Q25,30 35,5 Q40,50 45,100 M40,100 Q45,20 60,0 Q55,40 65,100 M60,100 Q70,50 80,15 Q85,60 90,100 M80,100 Q90,30 105,10 Q100,60 110,100 M100,100 Q115,20 125,0 Q120,50 135,100 M130,100 Q140,40 155,5 Q150,60 160,100 M150,100 Q160,20 175,0 Q170,50 185,100 M180,100 Q190,40 205,10 Q200,60 210,100 M200,100 Q215,30 225,5 Q230,70 240,100 M230,100 Q240,20 255,0 Q250,50 265,100 M260,100 Q275,30 290,15 Q285,60 295,100 M290,100 Q305,20 315,0 Q310,50 325,100 M320,100 Q335,40 345,10 Q340,60 355,100 M350,100 Q365,20 380,0 Q375,50 385,100 M380,100 Q395,30 405,15 Q395,60 410,100 M400,100 Q410,20 420,5 Q415,60 430,100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10,100 Q15,50 25,20 Q30,70 35,100 M30,100 Q40,30 55,10 Q50,60 60,100 M50,100 Q65,40 75,5 Q80,50 90,100 M85,100 Q95,20 110,0 Q105,60 115,100 M110,100 Q125,30 140,15 Q135,70 145,100 M140,100 Q155,20 165,0 Q160,50 175,100 M170,100 Q180,40 195,5 Q190,60 200,100 M190,100 Q200,20 215,0 Q210,50 225,100 M220,100 Q230,40 245,10 Q240,60 250,100 M240,100 Q255,30 265,5 Q270,70 280,100 M270,100 Q280,20 295,0 Q290,50 305,100 M300,100 Q315,30 330,15 Q325,60 335,100 M330,100 Q345,20 355,0 Q350,50 365,100 M360,100 Q375,40 385,10 Q380,60 395,100 M390,100 Q405,20 420,0 Q415,50 425,100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M0,100 C15,70 20,40 30,80 C40,50 50,70 60,100 C75,50 80,30 90,70 C100,50 110,60 120,100 C135,60 140,40 150,80 C160,50 170,70 180,100 C195,40 200,20 210,60 C220,40 230,50 240,100 C255,50 260,30 270,70 C280,40 290,60 300,100 C315,60 320,40 330,80 C340,50 350,70 360,100 C375,40 380,20 390,60 C400,40 410,50 420,100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
    </svg>
  </div>
);

const BrandLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M 12 36 H 26 V 44 H 20 V 74 Q 35 74 50 84 Q 65 74 80 74 V 44 H 74 V 36 H 88 V 82 Q 65 82 50 92 Q 35 82 12 82 Z" fill="currentColor" />
    <g stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round">
      <line x1="50" y1="23" x2="50" y2="11" />
      <line x1="33" y1="30" x2="24" y2="21" />
      <line x1="67" y1="30" x2="76" y2="21" />
      <line x1="27" y1="45" x2="15" y2="45" />
      <line x1="73" y1="45" x2="85" y2="45" />
      <line x1="34" y1="62" x2="27" y2="68" />
      <line x1="66" y1="62" x2="73" y2="68" />
    </g>
    <path d="M 39 62 V 54 A 15 15 0 1 1 61 54 V 62 Z" stroke="#F59E0B" strokeWidth="4.5" strokeLinejoin="round" fill="none"/>
    <line x1="38" y1="66" x2="62" y2="66" stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round"/>
    <path d="M 41 46 A 10 10 0 0 1 48 36" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <path d="M 44 68 V 73 H 41 V 78 H 47 V 82 H 53 V 78 H 59 V 73 H 56 V 68 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

export default function App() {
  const [topic, setTopic] = useState(
    () => localStorage.getItem("instabook-topic") || "",
  );
  const [authorName, setAuthorName] = useState(
    () => localStorage.getItem("instabook-authorName") || "",
  );
  const [wordCount, setWordCount] = useState<number>(
    () => Number(localStorage.getItem("instabook-wordCount")) || 2000,
  );

  const genres = [
    { name: "小说传奇", value: "小说" },
    { name: "散文随笔", value: "散文随笔" },
    { name: "科普读物", value: "科普读物" },
    { name: "畅销读物", value: "畅销读物" },
    { name: "心灵鸡汤", value: "心灵鸡汤" },
  ];
  const [genre, setGenre] = useState(
    () => localStorage.getItem("instabook-genre") || genres[0].value,
  );

  const [writingStyle, setWritingStyle] = useState(
    () =>
      localStorage.getItem("instabook-writingStyle") ||
      "严谨、专业、深具启发性",
  );
  const [targetModel, setTargetModel] = useState(
    () => localStorage.getItem("instabook-targetModel") || "deepseek-v4-pro",
  );
  const [configActiveModel, setConfigActiveModel] = useState(
    () => localStorage.getItem("instabook-targetModel") || "deepseek-v4-pro",
  );
  const [detailedRequirements, setDetailedRequirements] = useState(
    () => localStorage.getItem("instabook-detailedRequirements") || "",
  );

  // Book persistence ID & database syncing state hooks
  const [currentBookId, setCurrentBookId] = useState(
    () => localStorage.getItem("instabook-currentBookId") || "",
  );
  const [adminTab, setAdminTab] = useState<"config" | "database">("config");
  const [dbBooks, setDbBooks] = useState<any[]>([]);
  const [dbPage, setDbPage] = useState(1);
  const [localBooks, setLocalBooks] = useState<any[]>(() => {
    try {
      const data = localStorage.getItem("instabook-history");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });
  const [mobileWorkTab, setMobileWorkTab] = useState<"reader" | "control">("control");
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

  const loadDatabaseBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const data = await getBooks();
      setDbBooks(data);
    } catch (err) {
      console.error("加载后台数据库书籍名录失败:", err);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const deleteDatabaseBook = async (id: string, name: string) => {
    if (
      !confirm(
        `确定要彻底删除该作品在后台数据库及本地的历史记录吗？《${name}》`,
      )
    ) {
      return;
    }
    try {
      await deleteBook(id);
      // Remove from backend
      setDbBooks((prev) => {
        const updated = prev.filter((b) => b.id !== id);
        const maxPage = Math.ceil(updated.length / 5) || 1;
        setDbPage((p) => Math.max(1, Math.min(p, maxPage)));
        return updated;
      });
      loadDatabaseBooks();

      // Also remove from local history
      try {
        const historyData = localStorage.getItem("instabook-history");
        if (historyData) {
          let history: any[] = JSON.parse(historyData);
          history = history.filter((b) => b.id !== id);
          localStorage.setItem("instabook-history", JSON.stringify(history));
          setLocalBooks(history);
        }
      } catch (err) {}

      if (id === currentBookId) {
        setCurrentBookId("");
        localStorage.removeItem("instabook-currentBookId");
      }
    } catch (err: any) {
      alert("删除时遇到错误: " + err.message);
    }
  };

  const deleteLocalBook = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        `确定要从本地浏览器缓存中删除未完成的书籍《${title}》吗？该草稿未保存在系统数据库。`
      )
    ) {
      return;
    }
    try {
      const historyData = localStorage.getItem("instabook-history");
      if (historyData) {
        let history: any[] = JSON.parse(historyData);
        history = history.filter((b) => b.id !== id);
        localStorage.setItem("instabook-history", JSON.stringify(history));
        setLocalBooks(history);
      }

      if (id === currentBookId) {
        setCurrentBookId("");
        localStorage.removeItem("instabook-currentBookId");
        setOutline(null);
        setChaptersContent({});
        setCompletedChapters([]);
      }
      addLog(`已从本地浏览器存储中删除未完成作品：《${title}》`, "info");
    } catch (err: any) {
      alert("删除本地书籍时遇到错误: " + err.message);
    }
  };

  const handleLoadBook = async (bookId: string) => {
    try {
      let book: any = null;

      // First try to find it in the local history array
      const localBook = localBooks.find((b) => b.id === bookId);
      if (localBook && localBook.outline) {
        book = localBook;
        isLoadedFromDatabaseRef.current = false;
      } else {
        // Fallback to fetch from database
        book = await getBook(bookId);
        if (!book) {
          alert("加载书籍失败，可能该书已从系统库中移除且未保存在本地缓存");
          return;
        }
        isLoadedFromDatabaseRef.current = true;
      }

      // Load all attributes to active React states
      setTopic(book.topic || "");
      setAuthorName(book.author || "");
      setGenre(book.genre || "");
      setWordCount(book.wordCount || 2000);
      setWritingStyle(book.writingStyle || "");
      setDetailedRequirements(book.detailedRequirements || "");
      setOutline(book.outline);
      setChaptersContent(book.chaptersContent || {});
      setCompletedChapters(book.completedChapters || []);
      setTargetModel(book.modelUsed || "deepseek-v4-pro");
      setConfigActiveModel(book.modelUsed || "deepseek-v4-pro");
      setCurrentBookId(book.id);

      // Store to localStorage to maintain state persistence across refresh
      localStorage.setItem("instabook-topic", book.topic || "");
      localStorage.setItem("instabook-authorName", book.author || "");
      localStorage.setItem("instabook-genre", book.genre || "");
      localStorage.setItem(
        "instabook-wordCount",
        (book.wordCount || 2000).toString(),
      );
      localStorage.setItem("instabook-writingStyle", book.writingStyle || "");
      localStorage.setItem(
        "instabook-detailedRequirements",
        book.detailedRequirements || "",
      );
      localStorage.setItem(
        "instabook-targetModel",
        book.modelUsed || "deepseek-v4-pro",
      );
      localStorage.setItem("instabook-currentBookId", book.id);

      if (book.outline) {
        localStorage.setItem("instabook-outline", JSON.stringify(book.outline));
      } else {
        localStorage.removeItem("instabook-outline");
      }

      if (book.chaptersContent) {
        localStorage.setItem(
          "instabook-chaptersContent",
          JSON.stringify(book.chaptersContent),
        );
      } else {
        localStorage.removeItem("instabook-chaptersContent");
      }

      if (book.completedChapters) {
        localStorage.setItem(
          "instabook-completedChapters",
          JSON.stringify(book.completedChapters),
        );
      } else {
        localStorage.removeItem("instabook-completedChapters");
      }

      setShowConfigModal(false);
      setMobileWorkTab("reader");
      addLog(
        `📂 成功自后台数据库还原书籍工作区：《${book.title || book.topic}》`,
        "success",
      );
      alert(`📂 书籍《${book.title || book.topic}》已还原载入！`);
    } catch (err: any) {
      console.error("还原书籍工作区失败:", err);
      alert("还原书籍时发生内部错误: " + err.message);
    }
  };

  const saveBookToDatabase = async (
    idOverride?: string,
    outlineOverride?: BookOutline,
    chaptersOverride?: Record<number, string>,
    completedChaptersOverride?: number[],
  ) => {
    const targetId = idOverride || currentBookId;
    if (!targetId) return;

    const currentOutline =
      outlineOverride !== undefined ? outlineOverride : outline;
    const currentCompleted =
      completedChaptersOverride !== undefined
        ? completedChaptersOverride
        : completedChapters;

    // Only save to backend Database if fully completed (all chapters written successfully)
    if (!currentOutline || !currentOutline.chapters) return;
    const isCompleted =
      currentCompleted.length === currentOutline.chapters.length &&
      currentOutline.chapters.length > 0;
    if (!isCompleted) return;

    try {
      await saveBook({
        id: targetId,
        topic,
        author: authorName,
        genre,
        wordCount,
        writingStyle,
        detailedRequirements,
        outline: outlineOverride !== undefined ? outlineOverride : outline,
        chaptersContent:
          chaptersOverride !== undefined ? chaptersOverride : chaptersContent,
        completedChapters:
          completedChaptersOverride !== undefined
            ? completedChaptersOverride
            : completedChapters,
        modelUsed: targetModel,
      });
      // Quietly reload book count and list if active
      loadDatabaseBooks();
    } catch (err) {
      console.error("Auto-sync to DB failed:", err);
    }
  };

  const saveProgressToBrowser = (
    currentChaptersContent: Record<number, string>,
    currentCompletedChapters: number[],
  ) => {
    if (!outline || !currentBookId) return;
    if (isLoadedFromDatabaseRef.current) return; // Prevent saving database-loaded books to browser history
    try {
      // 1. Save individual parts to localStorage for resilience
      localStorage.setItem("instabook-chaptersContent", JSON.stringify(currentChaptersContent));
      localStorage.setItem("instabook-completedChapters", JSON.stringify(currentCompletedChapters));
      if (outline) {
        localStorage.setItem("instabook-outline", JSON.stringify(outline));
      }
      
      // 2. Save snapshot into the history list
      const historyData = localStorage.getItem("instabook-history");
      let history: any[] = historyData ? JSON.parse(historyData) : [];
      history = history.filter((b) => b.id !== currentBookId);

      const bookSnapshot = {
        id: currentBookId,
        topic,
        authorName,
        genre,
        wordCount,
        writingStyle,
        detailedRequirements,
        outline,
        chaptersContent: currentChaptersContent,
        completedChapters: currentCompletedChapters,
        modelUsed: targetModel,
        timestamp: Date.now(),
        title: outline.title,
        subtitle: outline.subtitle,
        chapterCount: outline.chapters?.length || 0,
        completedCount: currentCompletedChapters.length,
      };

      history.unshift(bookSnapshot);
      if (history.length > 50) {
        history = history.slice(0, 50);
      }

      localStorage.setItem("instabook-history", JSON.stringify(history));
      setLocalBooks(history);
    } catch (err) {
      console.error("Failed to save progress to browser storage:", err);
    }
  };

  // Persistence for inputs
  useEffect(() => {
    localStorage.setItem("instabook-topic", topic);
    localStorage.setItem("instabook-authorName", authorName);
    localStorage.setItem("instabook-wordCount", wordCount.toString());
    localStorage.setItem("instabook-genre", genre);
    localStorage.setItem("instabook-writingStyle", writingStyle);
    localStorage.setItem("instabook-targetModel", targetModel);
    localStorage.setItem(
      "instabook-detailedRequirements",
      detailedRequirements,
    );
  }, [
    topic,
    authorName,
    wordCount,
    genre,
    writingStyle,
    targetModel,
    detailedRequirements,
  ]);

  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [outlineProgressText, setOutlineProgressText] = useState("");
  const [outline, setOutline] = useState<BookOutline | null>(() => {
    const saved = localStorage.getItem("instabook-outline");
    return saved ? JSON.parse(saved) : null;
  });
  const [logs, setLogs] = useState<
    { message: string; type: "info" | "error" | "success"; timestamp: string }[]
  >([]);

  const addLog = (
    message: string,
    type: "info" | "error" | "success" = "info",
  ) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [...prev, { message, type, timestamp }]);
  };

  const [chaptersContent, setChaptersContent] = useState<
    Record<number, string>
  >({});
  const [generatingChapterIdx, setGeneratingChapterIdx] = useState<
    number | null
  >(null);
  const [completedChapters, setCompletedChapters] = useState<number[]>([]);
  const [stopRequested, setStopRequested] = useState(false);
  const stopRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<"auto" | "manual">("auto");
  const lastUpdateRef = useRef<number>(0);
  const lastSavedChapterPagesRef = useRef<number>(1);
  const isLoadedFromDatabaseRef = useRef<boolean>(false);
  const contentBufferRef = useRef<string>("");
  const logEndRef = useRef<HTMLDivElement>(null);

  // Page index focus retention
  const currentActivePageIdRef = useRef<string>("");
  const scrollRelativeOffsetRef = useRef<number>(0);

  // Load saved page focus on book change
  useEffect(() => {
    if (currentBookId) {
      const savedPage = localStorage.getItem(`instabook-focus-page-${currentBookId}`);
      const savedOffset = localStorage.getItem(`instabook-focus-offset-${currentBookId}`);
      if (savedPage) {
        currentActivePageIdRef.current = savedPage;
        scrollRelativeOffsetRef.current = savedOffset ? parseFloat(savedOffset) : 0;
      } else {
        currentActivePageIdRef.current = "";
        scrollRelativeOffsetRef.current = 0;
      }
    } else {
      currentActivePageIdRef.current = "";
      scrollRelativeOffsetRef.current = 0;
    }
  }, [currentBookId]);

  // Track page scroll offset to keep reader focus aligned
  const handleReaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const containerRect = container.getBoundingClientRect();

    const pages = Array.from(
      container.querySelectorAll(".book-page-preview"),
    ) as HTMLElement[];
    let activePageId = "";
    let closestOffset = Infinity;
    let actualTopDiff = 0;

    for (const page of pages) {
      if (page.id) {
        const pageRect = page.getBoundingClientRect();
        const diff = pageRect.top - containerRect.top;
        const absDiff = Math.abs(diff);
        if (absDiff < closestOffset) {
          closestOffset = absDiff;
          activePageId = page.id;
          actualTopDiff = diff;
        }
      }
    }

    if (activePageId) {
      currentActivePageIdRef.current = activePageId;
      scrollRelativeOffsetRef.current = actualTopDiff;
      if (currentBookId) {
        localStorage.setItem(`instabook-focus-page-${currentBookId}`, activePageId);
        localStorage.setItem(`instabook-focus-offset-${currentBookId}`, String(actualTopDiff));
      }
    }
  };

  // Restore scrolling focus after state changes, chapter text streams or tab switching to prevent viewport jumps
  useEffect(() => {
    if (!currentActivePageIdRef.current) return;

    const performRestoration = () => {
      const container = document.getElementById("book-reader-container");
      if (!container) return;

      const targetElement = document.getElementById(
        currentActivePageIdRef.current,
      );
      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const currentDiff = targetRect.top - containerRect.top;

        const adjustment = currentDiff - scrollRelativeOffsetRef.current;
        if (Math.abs(adjustment) > 0.5) {
          container.scrollTop += adjustment;
        }
      }
    };

    // Perform once immediately
    performRestoration();

    // And also delay slightly to ensure any CSS transitions or layout changes (e.g. display: none -> flex) are finished
    const timer = setTimeout(performRestoration, 60);
    return () => clearTimeout(timer);
  }, [chaptersContent, completedChapters, outline, generatingChapterIdx, mobileWorkTab, currentBookId]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    const updateScale = () => {
      if (zoomMode !== "auto") return;
      const container = document.getElementById("book-reader-container");
      if (container) {
        const padding = window.innerWidth < 768 ? 8 : 48;
        const availableWidth = container.clientWidth - padding;
        if (availableWidth > 0) {
          setPreviewScale(availableWidth / 560);
        }
      } else {
        const padding = window.innerWidth < 768 ? 8 : 48;
        const availableWidth = window.innerWidth - padding;
        if (availableWidth < 560) {
          setPreviewScale(availableWidth / 560);
        } else {
          setPreviewScale(1);
        }
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    const timer = setTimeout(updateScale, 150);
    return () => {
      window.removeEventListener("resize", updateScale);
      clearTimeout(timer);
    };
  }, [zoomMode, outline, mobileWorkTab]);

  // Load saved book from localStorage on mount
  useEffect(() => {
    try {
      const savedOutline = localStorage.getItem("instabook-outline");
      const savedChapters = localStorage.getItem("instabook-chaptersContent");
      const savedCompleted = localStorage.getItem(
        "instabook-completedChapters",
      );

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
      if (outline)
        localStorage.setItem("instabook-outline", JSON.stringify(outline));
      if (Object.keys(chaptersContent).length > 0)
        localStorage.setItem(
          "instabook-chaptersContent",
          JSON.stringify(chaptersContent),
        );
      if (completedChapters.length > 0)
        localStorage.setItem(
          "instabook-completedChapters",
          JSON.stringify(completedChapters),
        );
    } catch (e) {
      console.error("Failed to save book to local storage");
    }
  }, [outline, chaptersContent, completedChapters]);

  // Backwards compatibility safety: auto-assign ID if outline exists but currentBookId does not
  useEffect(() => {
    if (outline && !currentBookId) {
      const newId =
        "book_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      setCurrentBookId(newId);
      localStorage.setItem("instabook-currentBookId", newId);
    }
  }, [outline, currentBookId]);

  // Automatically save book configurations to local history and conditionally to backend
  useEffect(() => {
    if (!outline || !currentBookId) return;
    if (isLoadedFromDatabaseRef.current) return;

    const timer = setTimeout(() => {
      try {
        const historyData = localStorage.getItem("instabook-history");
        let history: any[] = historyData ? JSON.parse(historyData) : [];

        history = history.filter((b) => b.id !== currentBookId);

        const bookSnapshot = {
          id: currentBookId,
          topic,
          authorName,
          genre,
          wordCount,
          writingStyle,
          detailedRequirements,
          outline,
          chaptersContent,
          completedChapters,
          modelUsed: targetModel,
          timestamp: Date.now(),
          title: outline.title,
          subtitle: outline.subtitle,
          chapterCount: outline.chapters?.length || 0,
          completedCount: completedChapters.length,
        };

        history.unshift(bookSnapshot);
        if (history.length > 50) {
          history = history.slice(0, 50);
        }

        localStorage.setItem("instabook-history", JSON.stringify(history));
        setLocalBooks(history);
      } catch (err) {
        console.error("Failed to save local history", err);
      }

      // saveBookToDatabase handles the 'only save if fully completed' check internally
      saveBookToDatabase();
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    outline,
    chaptersContent,
    completedChapters,
    currentBookId,
    topic,
    authorName,
    genre,
    wordCount,
    targetModel,
  ]);

  const styles = [
    { name: "幽默风趣", value: "幽默风趣、接地气、用生动的比喻深入浅出" },
    { name: "严谨专业", value: "严谨、专业、学术化、深具启发性" },
    { name: "文学唯美", value: "辞藻优美、富有诗意、充满文学美感" },
    { name: "辛辣讽刺", value: "犀利、睿智、略带讽刺感、直指核心" },
    { name: "热血励志", value: "充满激情、感召力强、催人奋进" },
    {
      name: "模仿鲁迅",
      value:
        "文笔犀利、字里行间带有批判性与深沉的爱国主义情怀、语言精炼且富有时代感",
    },
    {
      name: "模仿卡夫卡",
      value:
        "带有超现实主义色彩、充满对荒诞和异化的深刻思考、语言冷静却令人深省",
    },
  ];

  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const [isLoggedIn, setIsLoggedIn] = useState(
    sessionStorage.getItem("isLoggedIn") === "true",
  );
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Load database books on website mount
  useEffect(() => {
    loadDatabaseBooks();
  }, []);

  // Re-fetch historical books when settings modal is opened
  useEffect(() => {
    if (showConfigModal) {
      loadDatabaseBooks();
    }
  }, [showConfigModal]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("isLoggedIn");
    addLog("🔒 成功退出管理员登录模式", "info");
    alert("已退出管理员后台模式！");
  };

  // Custom API keys and model override states
  const [dsKey, setDsKey] = useState(
    () =>
      localStorage.getItem("instabook-apikey-deepseek") ||
      localStorage.getItem("instabook-apikey-deepseek-v4-pro") ||
      "",
  );
  const [dsReal, setDsReal] = useState(
    () =>
      localStorage.getItem("instabook-realmodel-deepseek") ||
      localStorage.getItem("instabook-realmodel-deepseek-v4-pro") ||
      "deepseek-chat",
  );

  const [geminiKey, setGeminiKey] = useState(() => {
    return (
      localStorage.getItem("instabook-apikey-gemini") ||
      localStorage.getItem("instabook-apikey-gemini-2.5-pro") ||
      localStorage.getItem("instabook-apikey-gemini-1.5-pro") ||
      ""
    );
  });
  const [geminiReal, setGeminiReal] = useState(() => {
    const val = localStorage.getItem("instabook-realmodel-gemini-2.5-pro");
    if (!val || val.trim() === "" || val === "gemini-2.5-pro" || val === "gemini-1.5-pro") {
      return "gemini-3.5-flash";
    }
    return val;
  });

  const [qwenKey, setQwenKey] = useState(
    () =>
      localStorage.getItem("instabook-apikey-qwen") ||
      localStorage.getItem("instabook-apikey-qwen3.6-plus") ||
      "",
  );
  const [qwenReal, setQwenReal] = useState(
    () =>
      localStorage.getItem("instabook-realmodel-qwen") ||
      localStorage.getItem("instabook-realmodel-qwen3.6-plus") ||
      "qwen-max",
  );

  const loadSystemSettings = () => {
    // Fetch stored settings from server database
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          if (data["instabook-targetModel"]) {
            setTargetModel(data["instabook-targetModel"]);
            setConfigActiveModel(data["instabook-targetModel"]);
            localStorage.setItem("instabook-targetModel", data["instabook-targetModel"]);
          }
          if (data["instabook-apikey-deepseek"]) {
            setDsKey(data["instabook-apikey-deepseek"]);
            localStorage.setItem("instabook-apikey-deepseek", data["instabook-apikey-deepseek"]);
            localStorage.setItem("instabook-apikey-deepseek-v4-pro", data["instabook-apikey-deepseek"]);
          }
          if (data["instabook-realmodel-deepseek"]) {
            setDsReal(data["instabook-realmodel-deepseek"]);
            localStorage.setItem("instabook-realmodel-deepseek", data["instabook-realmodel-deepseek"]);
            localStorage.setItem("instabook-realmodel-deepseek-v4-pro", data["instabook-realmodel-deepseek"]);
          }
          if (data["instabook-apikey-gemini"]) {
            setGeminiKey(data["instabook-apikey-gemini"]);
            localStorage.setItem("instabook-apikey-gemini", data["instabook-apikey-gemini"]);
            localStorage.setItem("instabook-apikey-gemini-2.5-pro", data["instabook-apikey-gemini"]);
            localStorage.setItem("instabook-apikey-gemini-1.5-pro", data["instabook-apikey-gemini"]);
          }
          if (data["instabook-realmodel-gemini-2.5-pro"]) {
            const val = data["instabook-realmodel-gemini-2.5-pro"].trim();
            const finalVal = (!val || val === "gemini-2.5-pro" || val === "gemini-1.5-pro") ? "gemini-3.5-flash" : val;
            setGeminiReal(finalVal);
            localStorage.setItem("instabook-realmodel-gemini-2.5-pro", finalVal);
            localStorage.setItem("instabook-realmodel-gemini-1.5-pro", finalVal);
          } else {
            setGeminiReal("gemini-3.5-flash");
            localStorage.setItem("instabook-realmodel-gemini-2.5-pro", "gemini-3.5-flash");
            localStorage.setItem("instabook-realmodel-gemini-1.5-pro", "gemini-3.5-flash");
          }
          if (data["instabook-apikey-qwen"]) {
            setQwenKey(data["instabook-apikey-qwen"]);
            localStorage.setItem("instabook-apikey-qwen", data["instabook-apikey-qwen"]);
            localStorage.setItem("instabook-apikey-qwen3.6-plus", data["instabook-apikey-qwen"]);
          }
          if (data["instabook-realmodel-qwen"]) {
            setQwenReal(data["instabook-realmodel-qwen"]);
            localStorage.setItem("instabook-realmodel-qwen", data["instabook-realmodel-qwen"]);
            localStorage.setItem("instabook-realmodel-qwen3.6-plus", data["instabook-realmodel-qwen"]);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load settings from database", err);
      });
  };

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const isModelActive = (modelName: string) => {
    if (!modelName) return false;
    const m = modelName.toLowerCase();
    if (m.includes("gemini")) {
      return !!geminiKey;
    }
    if (m.includes("deepseek")) {
      return !!dsKey;
    }
    if (m.includes("glm")) {
      const customKey =
        localStorage.getItem(`instabook-apikey-${modelName}`) ||
        localStorage.getItem("instabook-apikey-glm");
      return !!customKey;
    }
    if (m.includes("qwen")) {
      return !!qwenKey;
    }
    return (
      !!dsKey ||
      !!geminiKey ||
      !!qwenKey ||
      !!localStorage.getItem("instabook-apikey-glm")
    );
  };

  // Sync configActiveModel with targetModel when modal is opened
  useEffect(() => {
    if (showConfigModal) {
      setConfigActiveModel(targetModel);
    }
  }, [showConfigModal, targetModel]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await response.json();
      
      if (response.ok && data.ok) {
        setIsLoggedIn(true);
        sessionStorage.setItem("isLoggedIn", "true");
        setShowLoginModal(false);
        setLoginPassword("");
        loadSystemSettings(); // Sync and load settings immediately from DB upon login
      } else {
        setLoginError(data.error || "密码错误，请重新输入");
      }
    } catch (err: any) {
      setLoginError("密码验证出错: " + (err.message || "网络错误"));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSaveSettings = () => {
    // Save current active model configuration
    setTargetModel(configActiveModel);
    localStorage.setItem("instabook-targetModel", configActiveModel);

    // Save to both simplified and detailed keys for backward compatibility
    localStorage.setItem("instabook-apikey-deepseek", dsKey);
    localStorage.setItem("instabook-realmodel-deepseek", dsReal);
    localStorage.setItem("instabook-apikey-deepseek-v4-pro", dsKey);
    localStorage.setItem("instabook-realmodel-deepseek-v4-pro", dsReal);

    localStorage.setItem("instabook-apikey-gemini", geminiKey);
    localStorage.setItem("instabook-realmodel-gemini-2.5-pro", geminiReal);
    localStorage.setItem("instabook-realmodel-gemini-1.5-pro", geminiReal);
    localStorage.setItem("instabook-apikey-gemini-2.5-pro", geminiKey);
    localStorage.setItem("instabook-apikey-gemini-1.5-pro", geminiKey);

    localStorage.setItem("instabook-apikey-qwen", qwenKey);
    localStorage.setItem("instabook-realmodel-qwen", qwenReal);
    localStorage.setItem("instabook-apikey-qwen3.6-plus", qwenKey);
    localStorage.setItem("instabook-realmodel-qwen3.6-plus", qwenReal);

    // Persist to D1 / Backend SQLite database
    const payload = {
      "instabook-targetModel": configActiveModel,
      "instabook-apikey-deepseek": dsKey,
      "instabook-realmodel-deepseek": dsReal,
      "instabook-apikey-gemini": geminiKey,
      "instabook-realmodel-gemini-2.5-pro": geminiReal,
      "instabook-apikey-qwen": qwenKey,
      "instabook-realmodel-qwen": qwenReal
    };

    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to sync settings with Cloudflare/Server");
        }
      })
      .catch((err) => {
        console.error("Network error syncing settings with Cloudflare/Server:", err);
      });

    setShowConfigModal(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Touch Pinch to Zoom Support for Mobile
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = previewScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      if (e.cancelable) {
        e.preventDefault();
      }
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / touchStartDistRef.current;
      let newScale = touchStartScaleRef.current * ratio;
      // Clamp scale between 0.3 and 2.0
      newScale = Math.min(2.0, Math.max(0.3, Number(newScale.toFixed(2))));
      setZoomMode("manual");
      setPreviewScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showReturnHomeConfirm, setShowReturnHomeConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [actualPageCounts, setActualPageCounts] = useState<
    Record<string, number>
  >({});

  const handlePageCountCalculated = React.useCallback(
    (id: string, count: number) => {
      setActualPageCounts((prev) => {
        if (prev[id] === count) return prev;
        return { ...prev, [id]: count };
      });
    },
    [],
  );
  const [exportProgress, setExportProgress] = useState({
    isExporting: false,
    text: "",
    percent: 0,
  });

  const testApiKey = async () => {
    setIsTestingApi(true);
    setApiTestStatus("idle");
    try {
      const result = await testConnection(targetModel);
      if (result.ok) {
        setApiTestStatus("success");
      } else {
        setApiTestStatus("error");
        alert(
          `❌ API Key 测试失败或遇到额度限制: \n\n${result.error || result.message}`,
        );
      }
    } catch (e: any) {
      setApiTestStatus("error");
      alert(`❌ 测试请求失败，网络异常或服务未部署。\n${e.message}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  // Function to kick off the generation process
  const startGeneration = async () => {
    if (!topic.trim()) return;

    // Assign a brand new unique database key for this fresh generation run
    const newId =
      "book_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    setCurrentBookId(newId);
    isLoadedFromDatabaseRef.current = false;
    localStorage.setItem("instabook-currentBookId", newId);

    stopRef.current = false;
    setStopRequested(false);
    setIsGeneratingOutline(true);
    setMobileWorkTab("control");
    setIsResuming(false);
    setOutlineProgressText("");
    setOutline(null);
    setChaptersContent({});
    setCompletedChapters([]);
    setGeneratingChapterIdx(null);
    setLogs([]);

    addLog(`开始策划书籍: "${topic}"`, "info");
    addLog(`选定体裁: ${genre}`, "info");
    addLog(`目标字数: ${wordCount}`, "info");
    let modelNameLabel = targetModel;
    if (targetModel === "deepseek-v4-pro") {
      modelNameLabel = `DeepSeek 官方模型 (${dsReal})`;
    } else if (targetModel === "qwen3.6-plus") {
      modelNameLabel = `阿里百炼大模型 (${qwenReal})`;
    } else if (targetModel === "gemini-2.5-pro" || targetModel === "gemini-1.5-pro") {
      modelNameLabel = `Gemini 官方模型 (${geminiReal})`;
    }

    addLog(`选定模型: ${modelNameLabel}`, "info");

    // Calculate roughly how many chapters are needed (assume about 2500 words per chapter)
    const chapterCount = Math.max(1, Math.min(40, Math.ceil(wordCount / 2500)));

    try {
      abortControllerRef.current = new AbortController();
      addLog("正在生成大纲与章节结构...", "info");
      const generatedOutline = await generateBookOutline(
        topic,
        genre,
        authorName,
        chapterCount,
        writingStyle,
        detailedRequirements,
        targetModel,
        (text) => {
          setOutlineProgressText(text);
        },
        abortControllerRef.current.signal,
      );
      addLog("书籍大纲策划完成！", "success");
      setOutline(generatedOutline);
      setIsGeneratingOutline(false);

      // Start generating chapters iteratively
      await generateAllChapters(generatedOutline);
    } catch (error: any) {
      if (error.name === "AbortError") {
        addLog("生成流程已中止。", "info");
        return;
      }
      console.error("Error generating outline:", error);
      let errorMessage = error?.message || String(error);
      addLog(`生成大纲失败: ${errorMessage}`, "error");
      if (
        errorMessage.includes("API key not valid") ||
        errorMessage.includes("API_KEY_INVALID") ||
        errorMessage.includes("not found in environment variables")
      ) {
        errorMessage =
          "API Key 无效或未配置。请点击右上角进入「管理员配置」重新设置可用的 API Key、自定义模型名或检测接通状态。";
      }
      alert(`生成大纲失败，请重试。\n错误信息: ${errorMessage}`);
      setIsGeneratingOutline(false);
    }
  };

  const stopGeneration = () => {
    stopRef.current = true;
    setStopRequested(true);
    setGeneratingChapterIdx(null);
    setIsGeneratingOutline(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const generateAllChapters = async (bookOutline: BookOutline) => {
    const chapters = bookOutline.chapters || [];
    let currentChaptersContent = { ...chaptersContent };
    let currentCompletedChapters = [...completedChapters];

    for (let i = 0; i < chapters.length; i++) {
      if (currentCompletedChapters.includes(i)) continue; // Skip already completed chapters

      if (stopRef.current) break;
      setGeneratingChapterIdx(i);
      addLog(`正在编撰第 ${i + 1} 章: ${chapters[i].title}...`, "info");
      contentBufferRef.current = "";
      lastUpdateRef.current = Date.now();
      lastSavedChapterPagesRef.current = 1;

      let retries = 3;
      let success = false;
      let backoffMs = 15000;

      while (!success && retries > 0 && !stopRef.current) {
        try {
          abortControllerRef.current = new AbortController();
          const content = await generateChapterContent(
            bookOutline.title,
            genre,
            chapters[i].title,
            chapters[i].summary,
            writingStyle,
            detailedRequirements,
            targetModel,
            (text) => {
              contentBufferRef.current = text;
              const now = Date.now();
              const currentChapterPages = splitIntoPages(text, false, true).length;
              if (currentChapterPages > lastSavedChapterPagesRef.current) {
                lastSavedChapterPagesRef.current = currentChapterPages;
                currentChaptersContent = { ...currentChaptersContent, [i]: text };
                setChaptersContent(currentChaptersContent);
                saveProgressToBrowser(currentChaptersContent, currentCompletedChapters);
                addLog(`⚡ 第 ${i + 1} 章已生成新一页 (第 ${currentChapterPages} 页)，实时暂存至浏览器`, "success");
                lastUpdateRef.current = now;
              } else if (now - lastUpdateRef.current > 500) {
                setChaptersContent((prev) => ({ ...prev, [i]: text }));
                lastUpdateRef.current = now;
              }
            },
            abortControllerRef.current.signal,
          );

          if (stopRef.current) break;

          currentChaptersContent = { ...currentChaptersContent, [i]: content };
          currentCompletedChapters = Array.from(new Set([...currentCompletedChapters, i])).sort((a, b) => a - b);

          setChaptersContent(currentChaptersContent);
          setCompletedChapters(currentCompletedChapters);

          // Save completed chapter progress to browser immediately
          saveProgressToBrowser(currentChaptersContent, currentCompletedChapters);
          addLog(`第 ${i + 1} 章编撰完成！`, "success");

          const isBookFinished = currentCompletedChapters.length === chapters.length;
          if (isBookFinished) {
            addLog("🎉 书籍全部章节已编撰完成！正在同步写入后台持久化数据库...", "success");
            await saveBookToDatabase(currentBookId, bookOutline, currentChaptersContent, currentCompletedChapters);
          }

          success = true;

          if (i < chapters.length - 1 && !stopRef.current) {
            addLog("休息片刻，准备下一章...", "info");
            await sleep(5000);
          }
        } catch (error: any) {
          if (error.name === "AbortError") {
            addLog(`第 ${i + 1} 章生成已手动中止。`, "info");
            return;
          }
          if (stopRef.current) break;
          const retryMsg =
            retries > 1
              ? `（剩余重试次数: ${retries - 1}）`
              : "（重试次数已耗尽）";
          addLog(
            `第 ${i + 1} 章生成出错: ${error?.message || "未知错误"} ${retryMsg}`,
            "error",
          );
          console.error(
            `Error generating chapter ${i + 1} (Retries left: ${retries - 1}):`,
            error,
          );

          const errorMsg = error?.message?.toLowerCase() || "";
          // Retry on almost all backend errors (500, 502, 504, 429, timeouts)
          const isRetryable =
            !errorMsg.includes("api key") && !errorMsg.includes("unauthorized");

          if (isRetryable) {
            retries--;
            if (retries > 0) {
              console.log(
                `Error encountered. Waiting ${backoffMs / 1000} seconds before retrying...`,
              );
              await sleep(backoffMs);
              backoffMs *= 2;
            }
          } else {
            retries = 0;
          }

          if (retries === 0 && !success && !stopRef.current) {
            setChaptersContent((prev) => ({
              ...prev,
              [i]: `本章生成失败，请点击【续写完成】重试该章节。\n错误详情：${error?.message || "未知错误"}`,
            }));
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
        completedChapters,
      };

      zip.file("project.json", JSON.stringify(projectData, null, 2));

      // Generate a markdown representation
      let contentMd = `# ${outline.title}\n\n`;
      if (outline.subtitle) contentMd += `**副标题**: ${outline.subtitle}\n\n`;
      contentMd += `**作者**: ${outline.author}\n\n`;
      contentMd += `**出版社**: ${outline.publisher}\n\n`;

      if (outline.recommendations && outline.recommendations.length > 0) {
        contentMd += `## 推荐序\n\n`;
        outline.recommendations.forEach((rec) => {
          contentMd += `### ${rec.recommender} (${rec.recommenderTitle})\n\n`;
          contentMd += `${rec.content}\n\n`;
        });
      }

      contentMd += `## 引言\n\n${outline.introduction}\n\n`;

      (outline.chapters || []).forEach((chap, idx) => {
        contentMd += `## 第 ${idx + 1} 章: ${chap.title}\n\n`;
        if (chaptersContent[idx]) {
          contentMd += `${chaptersContent[idx]}\n\n`;
        }
      });

      zip.file("book-content.md", contentMd);

      // fetch cover image
      let buffer: ArrayBuffer | null = null;
      try {
        let hash = 0;
        const str = outline.title || "default";
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const seedNum = Math.abs(hash);
        const response = await fetch(
          `https://picsum.photos/seed/${seedNum}/548/793`,
        );
        const blob = await response.blob();
        buffer = await blob.arrayBuffer();
        if (buffer) {
          zip.file("cover.jpg", buffer);
        }
      } catch (err) {
        console.warn("Failed to fetch cover image for export", err);
      }

      const content = await zip.generateAsync({ type: "blob" });
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

      const projectFile = unzipped.file("project.json");
      if (!projectFile) {
        alert("无效的压缩包，未找到项目数据 (project.json)");
        return;
      }

      const projectContent = await projectFile.async("string");
      const data = JSON.parse(projectContent);

      if (data.topic) setTopic(data.topic);
      if (data.authorName) setAuthorName(data.authorName);
      if (data.wordCount) setWordCount(data.wordCount);
      if (data.writingStyle) setWritingStyle(data.writingStyle);
      if (data.outline) setOutline(data.outline);
      if (data.chaptersContent) setChaptersContent(data.chaptersContent);
      if (data.completedChapters) setCompletedChapters(data.completedChapters);

      // Check if book is incomplete
      if (
        data.outline &&
        data.completedChapters &&
        data.completedChapters.length < (data.outline.chapters || []).length
      ) {
        setShowContinueModal(true);
      } else {
        alert("图书项目导入成功！");
      }
    } catch (error) {
      console.error("Import failed", error);
      alert("导入图书项目失败！请确保你上传的是该工具导出的 zip 文件。");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const captureCover = async (): Promise<Blob | null> => {
    const coverElement = document.getElementById("book-cover-to-capture");
    if (!coverElement) {
      console.error("Cover element not found");
      return null;
    }

    try {
      // Scroll to cover and wait for rendering
      coverElement.scrollIntoView({ behavior: "instant", block: "start" });
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const dataUrl = await htmlToImage.toPng(coverElement, {
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: "#1c1917", // Force background color to match cover
        width: 560,
        height: 795,
        style: {
          borderRadius: "0",
          boxShadow: "none",
          transform: "none",
          margin: "0",
          padding: "0",
          border: "none",
          width: "560px",
          height: "795px",
        },
        fontEmbedCSS: "",
        filter: (node) => {
          if ((node as HTMLElement).classList?.contains("binder-effect"))
            return false;
          return true;
        },
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

  const processExport = async (format: "pdf" | "epub") => {
    if (!outline) return;
    setExportProgress({
      isExporting: true,
      text: "正在渲染封面...",
      percent: 10,
    });

    try {
      const coverBlob = await captureCover();

      if (format === "epub") {
        setExportProgress({
          isExporting: true,
          text: "正在生成 EPUB 文件...",
          percent: 60,
        });
        await generateEPUB(outline, chaptersContent, wordCount, coverBlob);
        setExportProgress({ isExporting: false, text: "", percent: 100 });
        setShowExportModal(false);
        return;
      }

      // Generate PDF
      const pages = Array.from(
        document.querySelectorAll(".printable-book .page-break"),
      );
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5", // 148 x 210 mm
      });

      let isFirstPage = true;

      if (coverBlob) {
        const coverDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(coverBlob);
        });
        pdf.addImage(coverDataUrl, "PNG", 0, 0, 148, 210, undefined, "FAST");
        isFirstPage = false;
      }

      const totalPages = pages.length;

      for (let i = 0; i < totalPages; i++) {
        setExportProgress({
          isExporting: true,
          text: `正在渲染 PDF (${i + 1}/${totalPages})，这可能需要几分钟...`,
          percent: 10 + Math.floor((i / totalPages) * 85),
        });

        const pageElement = pages[i] as HTMLElement;

        // Scroll into view to prevent rendering glitches from out-of-viewport elements
        pageElement.scrollIntoView({ behavior: "instant", block: "start" });
        await new Promise((resolve) => setTimeout(resolve, 100));

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
          preferredFontFormat: "woff2",
          filter: (node) => {
            if (
              node instanceof HTMLLinkElement &&
              node.href.includes("fonts.googleapis.com")
            )
              return false;
            return true;
          },
          style: {
            width: "560px",
            height: "795px",
            boxShadow: "none",
            transform: "none",
            zoom: "1",
            margin: "0",
            maxWidth: "none",
            border: "none",
            borderRadius: "0",
          },
        });

        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;
        pdf.addImage(imgData, "JPEG", 0, 0, 148, 210, undefined, "FAST");

        // Wait a small tick to avoid browser freezing
        await new Promise((r) => setTimeout(r, 50));
      }

      setExportProgress({
        isExporting: true,
        text: "正在合成并下载 PDF，请稍候...",
        percent: 98,
      });
      pdf.save(`${outline.title}.pdf`);

      setExportProgress({ isExporting: false, text: "", percent: 100 });
      setShowExportModal(false);
    } catch (err) {
      console.error(err);
      alert(`下载 ${format.toUpperCase()} 失败！`);
      setExportProgress({ isExporting: false, text: "", percent: 0 });
    }
  };

  const isFullyCompleted =
    outline && completedChapters.length === (outline.chapters || []).length;
  const isInterrupted =
    outline &&
    completedChapters.length < (outline.chapters || []).length &&
    !isGeneratingOutline &&
    generatingChapterIdx === null;

  const splitIntoPages = (
    content: any,
    isIntroduction = false,
    isChapterStart = false,
  ) => {
    if (!content || typeof content !== "string") return [[""]];
    const pages: string[][] = [];
    const paragraphs = content
      .split("\n\n")
      .filter((p: string) => p.trim() !== "");

    // A5 页面宽度 560px, padding 65px*2 = 430px 可用空间
    // 强制紧凑排版：根据测量设置 charsPerLine 为 27/28
    const charsPerLine = 27;
    const linesPerPageNormal = 23;
    const linesPerPageWithTitle = 16;

    let currentPage: string[] = [];
    let linesInCurrentPage = 0;

    const getAvailableLines = (pageNum: number) => {
      return pageNum === 0 && (isIntroduction || isChapterStart)
        ? linesPerPageWithTitle
        : linesPerPageNormal;
    };

    paragraphs.forEach((p) => {
      let pLines = Math.ceil(p.length / charsPerLine) + 1;
      if (p.startsWith("#")) pLines += 2;

      const totalLinesForThisPage = getAvailableLines(pages.length);
      let remainingLinesInPage = totalLinesForThisPage - linesInCurrentPage;

      // Tight fit logic: Fill page as much as possible
      if (pLines <= remainingLinesInPage) {
        currentPage.push(p);
        linesInCurrentPage += pLines;
      } else {
        // Core fix: Greedy splitting to minimize bottom whitespace
        // If we can fit at least 2 lines of text, split the paragraph
        if (remainingLinesInPage >= 2) {
          const charsToFit = Math.floor(
            (remainingLinesInPage - 1) * charsPerLine,
          );
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
              linesInCurrentPage =
                Math.ceil(remainingText.length / charsPerLine) + 1;
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
    localStorage.removeItem("instabook-outline");
    localStorage.removeItem("instabook-chaptersContent");
    localStorage.removeItem("instabook-completedChapters");
    setShowResetConfirm(false);
  };

  const saveCurrentBookToHistory = () => {
    if (!outline || !currentBookId) return;
    if (isLoadedFromDatabaseRef.current) return; // Prevent saving database-loaded books to browser history
    try {
      const historyData = localStorage.getItem("instabook-history");
      let history: any[] = historyData ? JSON.parse(historyData) : [];

      history = history.filter((b) => b.id !== currentBookId);

      const bookSnapshot = {
        id: currentBookId,
        topic,
        authorName,
        author: authorName,
        genre,
        wordCount,
        writingStyle,
        detailedRequirements,
        outline,
        chaptersContent,
        completedChapters,
        modelUsed: targetModel,
        timestamp: Date.now(),
        title: outline.title,
        subtitle: outline.subtitle,
        chapterCount: outline.chapters?.length || 0,
        completedCount: completedChapters.length,
      };

      history.unshift(bookSnapshot);
      if (history.length > 50) {
        history = history.slice(0, 50);
      }

      localStorage.setItem("instabook-history", JSON.stringify(history));
      setLocalBooks(history);
    } catch (err) {
      console.error("Failed to save local history manually", err);
    }
  };

  const executeReturnHome = () => {
    saveCurrentBookToHistory();
    stopGeneration();

    setOutline(null);
    setChaptersContent({});
    setCompletedChapters([]);
    setGeneratingChapterIdx(null);
    setStopRequested(false);
    stopRef.current = false;

    localStorage.removeItem("instabook-outline");
    localStorage.removeItem("instabook-chaptersContent");
    localStorage.removeItem("instabook-completedChapters");
    localStorage.removeItem("instabook-currentBookId");

    setShowReturnHomeConfirm(false);
  };

  const handleReturnHome = () => {
    const totalChapters = outline?.chapters?.length || 0;
    const isCompleted =
      outline &&
      completedChapters.length === totalChapters &&
      totalChapters > 0;

    if (isCompleted) {
      executeReturnHome();
    } else {
      setShowReturnHomeConfirm(true);
    }
  };

  const handleContinueWriting = () => {
    setShowContinueModal(false);
    resumeGeneration();
  };

  const resumeGeneration = async () => {
    if (!outline) return;
    setIsResuming(true);
    setMobileWorkTab("control");
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
    if (outline.recommendations && Array.isArray(outline.recommendations)) {
      outline.recommendations.forEach((rec, idx) => {
        const pages =
          actualPageCounts[`rec-${idx}`] || splitIntoPages(rec.content).length;
        currentPage += pages;
      });
    }

    // Table of Contents
    const tocStartPage = currentPage;
    const chaptersPerTocPage = 15;
    const tocPagesNeeded = Math.max(
      1,
      Math.ceil((outline.chapters || []).length / chaptersPerTocPage),
    );
    currentPage += tocPagesNeeded;

    // Intro
    const introStartPage = currentPage;
    const introPages =
      actualPageCounts["intro"] ||
      splitIntoPages(outline.introduction || "", true).length;
    currentPage += introPages;

    // Chapters
    const chaptersToC = (outline.chapters || []).map((chap, idx) => {
      const startPage = currentPage;

      // STABILITY FIX: While a chapter is generating, we use a fixed estimate
      // (the summary length) to keep the TOC page numbers from "shaking" or
      // jumping token by token. We only use the real content once it's fully completed.
      const content = completedChapters.includes(idx)
        ? chaptersContent[idx]
        : chap.summary || "";
      const chapPages =
        actualPageCounts[`chap-${idx}`] ||
        Math.max(1, splitIntoPages(content, false, true).length);

      currentPage += chapPages;
      return { title: chap.title, page: startPage };
    });

    return {
      tocStart: tocStartPage,
      intro: introStartPage,
      chapters: chaptersToC,
    };
  };

  const estimatedPages = React.useMemo(() => {
    return outline
      ? estimatePageNumbers()
      : { tocStart: 1, intro: 1, chapters: [] };
  }, [outline, completedChapters, actualPageCounts]);

  if (!isLoggedIn) {
    return (
      <div 
        className="fixed inset-0 text-stone-900 font-sans flex flex-col justify-between p-6 select-none selection:bg-stone-300 selection:text-stone-900 z-[200]"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0.4), rgba(250, 250, 249, 0.95)), url(${banyanTreeBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <header className="max-w-7xl mx-auto w-full py-4 flex justify-between items-center shrink-0">
          <div></div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, type: "spring", damping: 25 }}
            className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/60 p-10 md:p-12 mb-8"
          >
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-stone-700 drop-shadow-sm">
                    {/* Book Outline */}
                    <path d="M 12 36 H 26 V 44 H 20 V 74 Q 35 74 50 84 Q 65 74 80 74 V 44 H 74 V 36 H 88 V 82 Q 65 82 50 92 Q 35 82 12 82 Z" fill="currentColor" />
                    
                    {/* Lightbulb rays */}
                    <g stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round">
                      <line x1="50" y1="23" x2="50" y2="11" />
                      <line x1="33" y1="30" x2="24" y2="21" />
                      <line x1="67" y1="30" x2="76" y2="21" />
                      <line x1="27" y1="45" x2="15" y2="45" />
                      <line x1="73" y1="45" x2="85" y2="45" />
                      <line x1="34" y1="62" x2="27" y2="68" />
                      <line x1="66" y1="62" x2="73" y2="68" />
                    </g>
                  
                    {/* Lightbulb yellow glass */}
                    <path d="M 39 62 V 54 A 15 15 0 1 1 61 54 V 62 Z" stroke="#F59E0B" strokeWidth="4.5" strokeLinejoin="round" fill="none"/>
                    <line x1="38" y1="66" x2="62" y2="66" stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round"/>
                    
                    {/* Lightbulb highlight */}
                    <path d="M 41 46 A 10 10 0 0 1 48 36" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  
                    {/* Lightbulb Base */}
                    <path d="M 44 68 V 73 H 41 V 78 H 47 V 82 H 53 V 78 H 59 V 73 H 56 V 68 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h1 className="text-3xl font-mono font-black tracking-widest text-stone-700 select-none flex items-center leading-none mt-1">
                  InstaBook
                </h1>
              </div>

              <h3 className="text-2xl font-extrabold font-sans text-stone-900 select-none">
                网站访问授权
              </h3>
              <p className="text-stone-500 text-sm mt-2 select-none">
                请输入访问密码开启 InstaBook 书籍编撰系统
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <div className="relative">
                  <input
                    type="password"
                    className="w-full pl-5 pr-12 py-4 bg-stone-50 hover:bg-stone-50/50 border border-stone-200 focus:border-amber-500 hover:border-stone-300 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-mono text-stone-800"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginError) setLoginError("");
                    }}
                    placeholder="请输入系统密码"
                    required
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
                    </svg>
                  </div>
                </div>
              </div>

              {loginError && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold border border-red-100 flex items-center gap-2 shadow-3xs"
                >
                  <svg
                    className="w-4 h-4 shrink-0 text-red-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{loginError}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>进入系统</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </main>

        <footer className="w-full py-4 text-center shrink-0 text-stone-500 font-sans animate-fade-in">
          <div className="max-w-4xl mx-auto flex flex-col gap-1.5 justify-center items-center">
            <div className="flex items-center justify-center gap-2 text-xs text-stone-700 font-sans font-medium">
              <span>“书籍是屹立在时间的汪洋大海中的灯塔。”</span>
              <span className="text-stone-400 font-sans not-italic text-[10px]">
                — 惠普尔
              </span>
            </div>
            <p className="text-[10px] text-stone-400/90 max-w-3xl text-center leading-relaxed font-sans">
              Copyright @ InstaBook &nbsp;&nbsp; 本平台内容由 InstaBook
              智能算法推理生成，仅供个人学术探讨及交流品鉴
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div
      className={`bg-stone-50/50 text-stone-900 font-sans selection:bg-stone-300 selection:text-stone-900 bg-fixed ${
        outline
          ? "lg:h-screen lg:overflow-hidden lg:flex lg:flex-col pb-0"
          : "min-h-screen flex flex-col pb-0"
      }`}
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0.35), rgba(250, 250, 249, 0.85)), url(${banyanTreeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >

      <header className="no-print bg-gradient-to-r from-stone-50/70 via-white/80 to-stone-50/70 backdrop-blur-xl border-b border-stone-200/50 sticky top-0 z-50 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between">
          {/* Left Side: Logo (Book Icon and InstaBook Text) */}
          <motion.div
            className="flex items-center gap-2.5 select-none cursor-pointer"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onClick={executeReturnHome}
          >
            <motion.div
              className="relative flex items-center justify-center w-11 h-11 shrink-0"
              whileHover={{ rotate: [-2, 2, -1, 0], scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-stone-700 drop-shadow-sm">
                {/* Book Outline */}
                <path d="M 12 36 H 26 V 44 H 20 V 74 Q 35 74 50 84 Q 65 74 80 74 V 44 H 74 V 36 H 88 V 82 Q 65 82 50 92 Q 35 82 12 82 Z" fill="currentColor" />
                
                {/* Lightbulb rays */}
                <g stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round">
                  <line x1="50" y1="23" x2="50" y2="11" />
                  <line x1="33" y1="30" x2="24" y2="21" />
                  <line x1="67" y1="30" x2="76" y2="21" />
                  <line x1="27" y1="45" x2="15" y2="45" />
                  <line x1="73" y1="45" x2="85" y2="45" />
                  <line x1="34" y1="62" x2="27" y2="68" />
                  <line x1="66" y1="62" x2="73" y2="68" />
                </g>
              
                {/* Lightbulb yellow glass */}
                <path d="M 39 62 V 54 A 15 15 0 1 1 61 54 V 62 Z" stroke="#F59E0B" strokeWidth="4.5" strokeLinejoin="round" fill="none"/>
                <line x1="38" y1="66" x2="62" y2="66" stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round"/>
                
                {/* Lightbulb highlight */}
                <path d="M 41 46 A 10 10 0 0 1 48 36" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none"/>
              
                {/* Lightbulb Base */}
                <path d="M 44 68 V 73 H 41 V 78 H 47 V 82 H 53 V 78 H 59 V 73 H 56 V 68 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-mono font-black tracking-widest text-stone-700 select-none flex items-center leading-none mt-1">
              InstaBook
            </h1>
          </motion.div>

          {/* Right Side: Lock / Admin configurations button */}
          <div className="flex items-center gap-2 md:gap-3">
            <input
              type="file"
              accept=".zip"
              className="hidden"
              ref={fileInputRef}
              onChange={importProject}
            />

            {/* Settings button with animated micro-interact lock */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 350, damping: 14 }}
              onClick={() => {
                if (isLoggedIn) {
                  setShowConfigModal(true);
                } else {
                  setShowLoginModal(true);
                }
              }}
              className={`w-9 h-9 rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                isLoggedIn
                  ? "text-emerald-700 hover:bg-emerald-100 bg-emerald-50 border border-emerald-250 shadow-2xs"
                  : "text-stone-600 hover:bg-stone-200 bg-stone-100 border border-stone-200"
              }`}
              title={isLoggedIn ? "后台管理及数据配置" : "管理员密码登录"}
            >
              <Settings className="w-4.5 h-4.5 shrink-0" />
            </motion.button>

            {/* Logout button */}
            {isLoggedIn && (
              <motion.button
                whileHover={{ scale: 1.08, x: 2 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleLogout}
                className="w-9 h-9 rounded-full text-red-650 hover:text-red-700 hover:bg-red-50 bg-red-50/40 border border-red-150 flex items-center justify-center shrink-0 transition-all shadow-2xs cursor-pointer"
                title="退出管理员后台"
              >
                <svg
                  className="w-4.5 h-4.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {!outline && (
        <div className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-1 md:pt-2 pb-6 md:pb-8 no-print font-sans flex-grow flex flex-col h-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch w-full flex-grow">
            {/* Left side: Book Creator Form Column */}
            <div
              className="lg:col-span-8 flex flex-col text-left p-5 md:p-6 lg:p-8 rounded-[2rem] border border-white/30 shadow-xl relative overflow-hidden flex-grow bg-white/30 backdrop-blur-lg"
            >
              <div className="relative z-10 w-full flex flex-col h-full">
                <h2 className="text-3xl md:text-3.5xl lg:text-4xl font-serif font-bold mb-2 md:mb-3 tracking-tight text-stone-900 leading-tight">
                  瞬间创作完整书籍
                </h2>
                <p className="text-sm md:text-base text-stone-500 mb-4 max-w-xl leading-relaxed">
                  只需输入书名或主题，AI
                  将为您生成包含完整目录、正文章节、封面及出版信息的标准 A5
                  (148x210mm) 图书。
                </p>

                {!isGeneratingOutline ? (
                  <div className="flex flex-col gap-4 animate-fade-in animate-duration-200 flex-grow">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-[2]">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                          <BookOpen className="w-4 h-4 text-stone-400" />
                          书名或主题
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 shadow-3xs transition-all disabled:opacity-50"
                          placeholder="例如：量子计算发展史..."
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          disabled={isGeneratingOutline}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                          <AlignLeft className="w-4 h-4 text-stone-400" />
                          创作题材
                        </label>
                        <select
                          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 shadow-3xs transition-all disabled:opacity-50"
                          value={genre}
                          onChange={(e) => setGenre(e.target.value)}
                          disabled={isGeneratingOutline}
                        >
                          {genres.map((g) => (
                            <option key={g.name} value={g.value}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                          <PenTool className="w-4 h-4 text-stone-400" />
                          文笔风格
                        </label>
                        <select
                          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 shadow-3xs transition-all disabled:opacity-50"
                          value={writingStyle}
                          onChange={(e) => setWritingStyle(e.target.value)}
                          disabled={isGeneratingOutline}
                        >
                          {styles.map((s) => (
                            <option key={s.name} value={s.value}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                          <User className="w-4 h-4 text-stone-400" />
                          作者署名
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 shadow-3xs transition-all disabled:opacity-50"
                          placeholder="署名/笔名..."
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          disabled={isGeneratingOutline}
                        />
                      </div>
                    </div>

                    <div className="w-full flex-grow flex flex-col mb-1">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                        <FileText className="w-4 h-4 text-stone-400" />
                        详细要求 (选填，最多1000字)
                      </label>
                      <textarea
                        className="w-full flex-grow px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 shadow-3xs transition-all disabled:opacity-50 resize-y min-h-[120px]"
                        placeholder="例如：请在故事中加入科幻元素，或者要求第一人称视角..."
                        value={detailedRequirements}
                        onChange={(e) =>
                          setDetailedRequirements(e.target.value)
                        }
                        maxLength={1000}
                        disabled={isGeneratingOutline}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                          <Hash className="w-4 h-4 text-stone-400" />
                          总字数
                        </label>
                        <select
                          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 shadow-3xs transition-all disabled:opacity-50"
                          value={wordCount}
                          onChange={(e) => setWordCount(Number(e.target.value))}
                          disabled={isGeneratingOutline}
                        >
                          <option value={2000}>极短篇 (~2千字)</option>
                          <option value={5000}>短篇 (~5千字)</option>
                          <option value={10000}>短篇 (~1万字)</option>
                          <option value={30000}>中篇 (~3万字)</option>
                          <option value={50000}>长篇 (~5万字)</option>
                          <option value={100000}>巨著 (~10万字)</option>
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                          <Cpu className="w-4 h-4 text-stone-400" />
                          AI 模型
                        </label>
                        <select
                          className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-xl outline-none text-stone-500 font-medium cursor-not-allowed"
                          value={isModelActive(targetModel) ? targetModel : ""}
                          disabled={true}
                        >
                          {isModelActive(targetModel) ? (
                            <option value={targetModel}>
                              {targetModel === "deepseek-v4-pro" &&
                                `DeepSeek 官方模型 (${dsReal}) (已激活)`}
                              {targetModel === "qwen3.6-plus" &&
                                `阿里百炼大模型 (${qwenReal}) (已激活)`}
                              {(targetModel === "gemini-2.5-pro" ||
                                targetModel === "gemini-1.5-pro") &&
                                `Gemini 官方模型 (${geminiReal}) (已激活)`}
                              {![
                                "deepseek-v4-pro",
                                "qwen3.6-plus",
                                "gemini-2.5-pro",
                                "gemini-1.5-pro",
                              ].includes(targetModel) &&
                                `${targetModel} (已激活)`}
                            </option>
                          ) : (
                            <option value=""></option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-row gap-3 mt-4">
                      <button
                        onClick={startGeneration}
                        disabled={!topic.trim() || isGeneratingOutline}
                        className="flex-1 py-4 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                      >
                        <Wand2 className="w-5 h-5 shrink-0" />
                        <span>开始撰写</span>
                      </button>
                      <button
                        onClick={testApiKey}
                        disabled={isTestingApi}
                        className={`py-4 px-4 sm:px-6 rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap shrink-0 ${
                          apiTestStatus === "success"
                            ? "bg-green-100 hover:bg-green-200 text-green-700 border border-green-300"
                            : apiTestStatus === "error"
                              ? "bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
                              : "bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300"
                        }`}
                        title={
                          isTestingApi
                            ? "测试中..."
                            : apiTestStatus === "success"
                              ? "连接成功"
                              : apiTestStatus === "error"
                                ? "连接失败"
                                : "测试连接"
                        }
                      >
                        {isTestingApi ? (
                          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        ) : apiTestStatus === "success" ? (
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                        ) : apiTestStatus === "error" ? (
                          <Activity className="w-5 h-5 shrink-0" />
                        ) : (
                          <Activity className="w-5 h-5 shrink-0" />
                        )}
                        <span className="hidden sm:inline">
                          {isTestingApi
                            ? "测试中"
                            : apiTestStatus === "success"
                              ? "已连接"
                              : apiTestStatus === "error"
                                ? "连接失败"
                                : "测试连接"}
                        </span>
                      </button>
                    </div>
                    {isInterrupted && (
                      <button
                        onClick={resumeGeneration}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-3 mt-3"
                      >
                        <Wand2 className="w-5 h-5" />
                        检测到未完成书籍：继续续写
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 pt-8 border-t border-stone-100 animate-fade-in animate-duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold flex items-center gap-3 text-stone-800">
                        {stopRequested ? (
                          <CircleSlash2 className="w-5 h-5 text-stone-400" />
                        ) : (
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                        )}
                        {stopRequested
                          ? "生成已中止"
                          : "正在策划您的书籍大纲与篇章结构..."}
                      </h3>

                      <div className="flex gap-2">
                        {!stopRequested && (
                          <button
                            onClick={stopGeneration}
                            className="text-stone-500 hover:text-red-500 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium cursor-pointer"
                          >
                            <Square className="w-4 h-4 fill-current text-stone-400 hover:text-red-400" />
                            停止生成
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-stone-400 shrink-0" />
                          <span className="text-stone-600 font-medium text-sm">
                            正在撰写出版大纲与章节结构
                          </span>
                        </div>
                        {outlineProgressText && (
                          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 max-h-48 overflow-y-auto w-full">
                            <pre className="text-xs text-stone-500 whitespace-pre-wrap font-mono overflow-x-hidden w-full">
                              {outlineProgressText}
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* Detailed AI Process Logs */}
                      <div className="pt-6 border-t border-stone-100 font-sans">
                        <div className="flex items-center gap-2 mb-3 text-stone-400">
                          <Activity className="w-4 h-4" />
                          <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
                            AI 工作日志
                          </span>
                        </div>
                        <div className="bg-black rounded-xl p-4 h-48 overflow-y-auto font-mono text-[11px] leading-relaxed relative border border-green-900/30 overflow-x-hidden">
                          <div className="space-y-1.5 relative z-10">
                            {logs.length === 0 ? (
                              <div className="text-green-900 italic">
                                等待工作指令...
                              </div>
                            ) : (
                              logs.map((log, i) => (
                                <div
                                  key={i}
                                  className={`flex gap-3 ${
                                    log.type === "error"
                                      ? "text-red-500"
                                      : log.type === "success"
                                        ? "text-green-300 font-bold"
                                        : "text-[#00FF41]"
                                  }`}
                                >
                                  <span className="text-green-900 shrink-0">
                                    [{log.timestamp}]
                                  </span>
                                  <span className="break-all opacity-90">
                                    {log.message}
                                  </span>
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
                )}
              </div>{" "}
              {/* Close relative z-10 w-full flex flex-col */}
            </div>

            {/* Right side: Recently Created Books Sidebar Section */}
            <div className="lg:col-span-4 lg:h-full lg:gap-4 lg:space-y-4 space-y-4 no-print">
              {/* Premium Top Action Row - Highly Polished & Sticky */}
              <div className="relative z-20 bg-amber-50/90 backdrop-blur-xl rounded-xl p-3 px-4 border border-amber-200/60 shadow-md flex items-center justify-between gap-3 select-none overflow-hidden">
                <GrassTitleBarBg />
                <span className="relative z-10 text-xs font-bold text-amber-950 font-sans tracking-wide pl-1 flex items-center gap-2">
                  <BrandLogo className="w-4 h-4 text-amber-600" />
                  最近制作的书籍
                </span>
                <div className="relative z-10 flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.06, y: -0.5 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => fileInputRef.current?.click()}
                    title="导入项目"
                    className="w-8 h-8 hover:bg-amber-200/50 text-amber-700 bg-amber-100/50 border border-amber-200 hover:border-amber-300 rounded-xl flex items-center justify-center transition-all shadow-sm cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600 group-hover:text-amber-800" />
                  </motion.button>
                </div>
              </div>

              <div className="bg-white/30 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/30">
                {localBooks.length === 0 ? (
                  <div className="py-12 px-4 text-center text-stone-400 text-xs space-y-3 bg-white border border-stone-150 rounded-xl">
                    <BookOpen className="w-8 h-8 text-stone-300 mx-auto animate-pulse" />
                    <p className="max-w-[180px] mx-auto text-stone-400">
                      目前暂无制作记录，开始生成后将为您自动归档保存！
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {(() => {
                      const sortedLatest = [...localBooks]
                        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                        .slice(0, 5);
                      return sortedLatest.map((book) => {
                        const isCompleted =
                          book.completedCount === book.chapterCount &&
                          book.chapterCount > 0;
                        return (
                          <div
                            key={book.id}
                            onClick={() => handleLoadBook(book.id)}
                            className="p-3.5 bg-white/40 hover:bg-white/60 border border-white/40 hover:border-emerald-200/60 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md group text-left relative"
                            title="点击一键加载并观看全书"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-1">
                                <h5 className="font-bold text-stone-800 text-sm font-sans line-clamp-1 group-hover:text-emerald-700 transition-colors flex-1">
                                  《{book.title}》
                                </h5>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded leading-none shrink-0">
                                    {book.genre}
                                  </span>
                                  {!isCompleted && (
                                    <button
                                      onClick={(e) => deleteLocalBook(book.id, book.title, e)}
                                      className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-md transition-all cursor-pointer select-none"
                                      title="从本地清退此未完成草稿"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {book.subtitle && (
                                <p className="text-stone-400 text-xs line-clamp-1 -mt-1 leading-relaxed">
                                  {book.subtitle}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-[11px] text-stone-550 pt-0.5">
                                <span>
                                  作者:{" "}
                                  <strong className="text-stone-700 font-medium">
                                    {book.author || book.authorName || "匿名"}
                                  </strong>
                                </span>
                                <span>{book.wordCount}字</span>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                                <span className="text-[10px] text-stone-450">
                                  {isCompleted
                                    ? "已研制完成"
                                    : `进度: ${book.completedCount}/${book.chapterCount}章`}
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                  点击观看 <ArrowRight className="w-3" />
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {outline && (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-4 transition-all font-sans lg:overflow-hidden flex flex-col min-h-0">
          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden bg-stone-150/60 p-1 rounded-xl mb-4 border border-stone-250/30 relative z-10 select-none">
            <button
              onClick={() => setMobileWorkTab("control")}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileWorkTab === "control"
                  ? "bg-white text-stone-900 shadow-sm border border-stone-200/40 font-semibold"
                  : "text-stone-550 hover:text-stone-750"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              制作控制台
            </button>
            <button
              onClick={() => setMobileWorkTab("reader")}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileWorkTab === "reader"
                  ? "bg-white text-stone-900 shadow-sm border border-stone-200/40 font-semibold"
                  : "text-stone-550 hover:text-stone-750"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-755" />
              阅读预览
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start lg:items-stretch lg:h-full lg:overflow-hidden">
            {/* Left side: Book Reader (scrollable, tracks scroll-focus) */}
            <div className={`lg:col-span-8 relative group lg:h-full lg:flex lg:flex-col lg:overflow-hidden ${mobileWorkTab === "reader" ? "flex" : "hidden lg:flex"}`}>
              {/* Floating Zoom Control Panel */}
              <div className="no-print fixed bottom-4 left-1/2 -translate-x-1/2 lg:absolute lg:bottom-5 lg:right-6 lg:left-auto lg:translate-x-0 z-50 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-stone-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)] px-1.5 py-1 rounded-full select-none transition-all duration-350">
                <button
                  onClick={() => {
                    setZoomMode("manual");
                    setPreviewScale((prev) =>
                      Math.max(0.3, Number((prev - 0.1).toFixed(2))),
                    );
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer"
                  title="缩小"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                <span className="text-[11px] font-mono font-bold text-stone-700 w-11 text-center">
                  {Math.round(previewScale * 100)}%
                </span>

                <button
                  onClick={() => {
                    setZoomMode("manual");
                    setPreviewScale((prev) =>
                      Math.min(2.0, Number((prev + 0.1).toFixed(2))),
                    );
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer"
                  title="放大"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                <div className="w-px h-3.5 bg-stone-200 mx-0.5" />

                <button
                  onClick={() => setZoomMode("auto")}
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer active:scale-95 ${
                    zoomMode === "auto"
                      ? "bg-stone-900 text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                  title="自适应宽度"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                id="book-reader-container"
                onScroll={handleReaderScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="w-full lg:flex-1 overflow-y-auto max-h-[82vh] lg:max-h-none space-y-4 scroll-smooth bg-transparent pr-0 lg:pr-6 pb-20 lg:pb-12 print:max-h-none print:overflow-visible print:p-0 print:border-none print:bg-transparent print:shadow-none animate-fade-in animate-duration-300 custom-scrollbar"
              >
                <div
                  className="printable-book pt-0 pb-8"
                  style={{ zoom: previewScale }}
                >
                  <div className="hidden print:flex print-header">
                    <span>《{outline.title}》</span>
                    <span>{outline.author} 著</span>
                  </div>
                  <div className="hidden print:block print-footer">
                    <span className="page-number"></span>
                  </div>
                  <div style={{ counterReset: "page" }}></div>
                  <div className="mb-8 page-break-after-always book-cover-page">
                    <BookCover
                      title={outline.title}
                      subtitle={outline.subtitle}
                      author={outline.author}
                      publisher={outline.publisher}
                    />
                  </div>
                  <div className="book-page-preview page-break flex flex-col items-center justify-center text-center mb-8">
                    <h1
                      className="text-4xl md:text-6xl font-serif font-bold mb-6 text-black"
                      style={{ fontFamily: "SimHei" }}
                    >
                      {outline.title}
                    </h1>
                    <h2
                      className="text-xl md:text-2xl font-serif text-stone-600 mb-16"
                      style={{ fontFamily: "SimHei" }}
                    >
                      {outline.subtitle}
                    </h2>
                    <div className="mt-auto mb-16">
                      <p className="text-lg font-serif">
                        作者：{outline.author}
                      </p>
                    </div>
                    <div className="mt-12 text-sm text-stone-500 font-serif flex flex-col gap-2">
                      <span>{outline.publisher} 出版</span>
                    </div>
                  </div>
                  <div className="book-page-preview page-break flex flex-col justify-end pb-12 mb-8 text-stone-600 text-sm font-serif">
                    <p className="mb-4">出版发行：{outline.publisher}</p>
                    <p className="mb-4">
                      版权所有 © {new Date().getFullYear()} {outline.author}
                      。保留所有权利。
                    </p>
                    <p className="mb-4">
                      未经出版者事先书面许可，不得以任何方式复制、存储或传播本书的任何部分。
                    </p>
                    <p className="mb-4">
                      本书字数：约 {wordCount.toLocaleString()} 字
                    </p>
                    <p className="mb-4">开本：A5 (148mm × 210mm)</p>
                    <div className="mt-8 border-t border-stone-300 pt-4">
                      <p>书号 (ISBN): {outline.isbn}</p>
                      <p>定价: {outline.price}</p>
                    </div>
                  </div>
                  {(() => {
                    let pageCounter =
                      estimatedPages.intro -
                      (Array.isArray(outline.recommendations)
                        ? outline.recommendations.length
                        : 0);
                    if (!Array.isArray(outline.recommendations)) return null;
                    return outline.recommendations.map((rec, idx) => {
                      const startCount = pageCounter;
                      pageCounter += splitIntoPages(rec.content).length; // advance counter estimate

                      const header = (
                        <h2
                          className="text-[1.35rem] font-serif font-bold mb-0 text-center text-black mt-2"
                          style={{ fontFamily: "SimHei" }}
                        >
                          推荐序
                        </h2>
                      );
                      const footer = (
                        <div className="mt-8 text-right font-serif">
                          <p className="text-[1rem] font-bold">
                            {rec.recommender}
                          </p>
                          <p className="text-stone-500 text-[0.875rem]">
                            {rec.recommenderTitle}
                          </p>
                        </div>
                      );

                      return (
                        <PaginatedSection
                          key={`rec-${idx}`}
                          content={rec.content || ""}
                          outlineTitle={outline.title}
                          startPageCounter={startCount}
                          sectionHeader={header}
                          sectionFooter={footer}
                          onPagesCalculated={(count) =>
                            handlePageCountCalculated(`rec-${idx}`, count)
                          }
                          pageIdPrefix={`rec-${idx}`}
                        />
                      );
                    });
                  })()}
                  {(() => {
                    const chaptersPerTocPage = 15;
                    const tocPagesNeeded = Math.max(
                      1,
                      Math.ceil(
                        (outline.chapters || []).length / chaptersPerTocPage,
                      ),
                    );
                    const tocPages = [];

                    for (let p = 0; p < tocPagesNeeded; p++) {
                      const startIdx = p * chaptersPerTocPage;
                      const endIdx = startIdx + chaptersPerTocPage;
                      const pageChapters = (outline.chapters || []).slice(
                        startIdx,
                        endIdx,
                      );

                      tocPages.push(
                        <div
                          key={`toc-page-${p}`}
                          className="book-page-preview page-break mb-8 mx-auto"
                        >
                          <h2
                            className="text-[1.35rem] font-serif font-bold mb-8 text-center text-black mt-[1.5rem]"
                            style={{ fontFamily: "SimHei" }}
                          >
                            目 录
                          </h2>
                          <div className="space-y-[0.6rem] font-serif text-[0.85rem] leading-tight">
                            {p === 0 && (
                              <div className="flex items-baseline justify-between group mb-2">
                                <span className="pr-4 bg-[#fcfbf8] transition-colors z-10 print:bg-[#fcfbf8] inline-block max-w-[85%]">
                                  引言
                                </span>
                                <div className="flex-grow border-b border-dotted border-stone-400 relative top-[-4px]"></div>
                                <span className="pl-4 bg-[#fcfbf8] transition-colors z-10 print:bg-[#fcfbf8]">
                                  {estimatedPages.intro}
                                </span>
                              </div>
                            )}
                            {pageChapters.map((chap, idx) => {
                              const globalIdx = startIdx + idx;
                              return (
                                <div
                                  key={globalIdx}
                                  className="flex items-baseline justify-between group"
                                >
                                  <span className="pr-4 bg-[#fcfbf8] transition-colors z-10 print:bg-[#fcfbf8] inline-block max-w-[85%]">
                                    第 {globalIdx + 1} 章 {chap.title}
                                  </span>
                                  <div className="flex-grow border-b border-dotted border-stone-400 relative top-[-4px]"></div>
                                  <span className="pl-4 bg-[#fcfbf8] transition-colors z-10 print:bg-[#fcfbf8]">
                                    {estimatedPages.chapters[globalIdx]?.page ||
                                      "-"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="preview-footer">
                            — {estimatedPages.tocStart + p} —
                          </div>
                        </div>,
                      );
                    }
                    return tocPages;
                  })()}
                  {(() => {
                    const header = (
                      <h2
                        className="text-[1.35rem] font-serif font-bold mb-0 text-center text-black mt-2"
                        style={{ fontFamily: "SimHei" }}
                      >
                        引言
                      </h2>
                    );
                    return (
                      <PaginatedSection
                        key="intro"
                        content={outline.introduction || ""}
                        outlineTitle={outline.title}
                        startPageCounter={estimatedPages.intro}
                        sectionHeader={header}
                        onPagesCalculated={(count) =>
                          handlePageCountCalculated("intro", count)
                        }
                        pageIdPrefix="intro"
                      />
                    );
                  })()}
                  {(outline.chapters || []).map((chap, idx) => {
                    const contentReady =
                      completedChapters.includes(idx) ||
                      (generatingChapterIdx === idx && chaptersContent[idx]);
                    let content = contentReady ? chaptersContent[idx] : "";

                    // Remove redundant chapter title from the beginning of the generated content
                    if (content) {
                      const firstDoubleNewline = content.indexOf("\n\n");
                      const firstParagraph =
                        firstDoubleNewline !== -1
                          ? content.substring(0, firstDoubleNewline)
                          : content;
                      const cleanFirstParagraph = firstParagraph
                        .replace(/^#+\s*/, "")
                        .replace(/第\s*\d+\s*章\s*/g, "")
                        .trim();
                      if (
                        cleanFirstParagraph === chap.title ||
                        cleanFirstParagraph === chap.title.trim()
                      ) {
                        content =
                          firstDoubleNewline !== -1
                            ? content
                                .substring(firstDoubleNewline + 2)
                                .trimStart()
                            : "";
                      }
                    }

                    // Use the stable estimated start page for this chapter
                    let chapterStartPage =
                      estimatedPages.chapters[idx]?.page ||
                      (idx === 0
                        ? estimatedPages.intro +
                          splitIntoPages(outline.introduction || "", true)
                            .length
                        : 1);

                    const header = (
                      <div className="mt-[1rem] mb-[1rem] text-center w-full">
                        <span
                          className="text-[1rem] font-serif text-black block mb-2"
                          style={{ fontFamily: "SimHei" }}
                        >
                          第 {idx + 1} 章
                        </span>
                        <h2
                          className="text-[1.8rem] font-serif font-bold text-black leading-tight"
                          style={{ fontFamily: "SimHei" }}
                        >
                          {chap.title}
                        </h2>
                      </div>
                    );

                    if (!contentReady) {
                      return (
                        <div
                          key={`chap-${idx}-empty`}
                          className="book-page-preview page-break flex flex-col relative content-page mb-8 mx-auto"
                        >
                          <div className="preview-header">{outline.title}</div>
                          {header}
                          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-stone-400 no-print flex-grow">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p className="font-serif">等待生成...</p>
                          </div>
                          <div className="preview-footer">
                            — {chapterStartPage} —
                          </div>
                        </div>
                      );
                    }

                    return (
                      <PaginatedSection
                        key={`chap-${idx}`}
                        content={content}
                        outlineTitle={outline.title}
                        startPageCounter={chapterStartPage}
                        sectionHeader={header}
                        isLoading={generatingChapterIdx === idx}
                        onPagesCalculated={(count) =>
                          handlePageCountCalculated(`chap-${idx}`, count)
                        }
                        pageIdPrefix={`chap-${idx}`}
                      />
                    );
                  })}
                  <div
                    id="page-anchor-end"
                    className="book-page-preview page-break flex flex-col items-center justify-center min-h-[50vh] text-center border-t border-stone-200 pt-16"
                  >
                    <div className="w-12 h-12 mb-8 mx-auto bg-stone-900 rounded-[12px] flex items-center justify-center text-white">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <p className="font-serif text-lg text-stone-500 max-w-md">
                      全书完
                    </p>
                    <p className="mt-8 text-sm text-stone-400 font-sans tracking-wide">
                      本著作由 InstaBook Builder 强力驱动生成
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Sidebar (visible only on screen, hidden on prints) */}
            <div className={`lg:col-span-4 lg:h-full lg:gap-4 lg:space-y-4 space-y-4 no-print animate-fade-in animate-duration-350 lg:overflow-y-auto lg:pb-8 custom-scrollbar lg:pr-2 ${mobileWorkTab === "control" ? "block" : "hidden lg:block"}`}>
              {/* Premium Top Action Row - Highly Polished & Sticky */}
              <div className="sticky top-0 z-20 bg-amber-50/90 backdrop-blur-xl rounded-xl p-3 px-4 border border-amber-200/60 shadow-md flex items-center justify-between gap-3 select-none overflow-hidden">
                <GrassTitleBarBg />
                <span className="relative z-10 text-xs font-bold text-amber-950 font-sans tracking-wide pl-1 flex items-center gap-2 shrink-0 whitespace-nowrap">
                  <BrandLogo className="w-4 h-4 text-amber-600 shrink-0" />
                  书籍操作
                </span>

                <div className="relative z-10 flex items-center gap-2">
                  {/* Return to Home Button */}
                  <motion.button
                    whileHover={{ scale: 1.06, y: -0.5 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={handleReturnHome}
                    title="退回首页"
                    className="w-9.5 h-9.5 text-amber-700 hover:text-amber-950 bg-amber-100/50 hover:bg-amber-200/50 border border-amber-200 hover:border-amber-300 rounded-xl flex items-center justify-center transition-all shadow-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-4.5 h-4.5" />
                  </motion.button>

                  {/* Resume Button */}
                  {isInterrupted && (
                    <motion.button
                      whileHover={{ scale: 1.08, y: -0.5 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={resumeGeneration}
                      title="续写未完章节"
                      className="w-9.5 h-9.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-xl flex items-center justify-center transition-all shadow-sm cursor-pointer"
                    >
                      <Play className="w-4.5 h-4.5 fill-emerald-500/20" />
                    </motion.button>
                  )}

                  {/* Import Button */}
                  <motion.button
                    whileHover={{ scale: 1.06, y: -0.5 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => fileInputRef.current?.click()}
                    title="导入项目进度 (.zip)"
                    className="w-9.5 h-9.5 text-amber-700 hover:text-amber-950 bg-amber-100/50 hover:bg-amber-200/50 border border-amber-200 hover:border-amber-300 rounded-xl flex items-center justify-center transition-all shadow-sm cursor-pointer"
                  >
                    <Upload className="w-4.5 h-4.5" />
                  </motion.button>

                  {/* Export Button */}
                  <motion.button
                    whileHover={{ scale: 1.06, y: -0.5 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={exportProject}
                    title="导出项目备份 (.zip)"
                    className="w-9.5 h-9.5 text-amber-700 hover:text-amber-950 bg-amber-100/50 hover:bg-amber-200/50 border border-amber-200 hover:border-amber-300 rounded-xl flex items-center justify-center transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="w-4.5 h-4.5" />
                  </motion.button>

                  {/* Download & Print Button */}
                  <motion.button
                    whileHover={{ scale: 1.06, y: -0.5 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={handleExport}
                    title="打印与下载成书 (PDF/EPUB)"
                    className="w-9.5 h-9.5 text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 rounded-xl flex items-center justify-center transition-all shadow-md cursor-pointer"
                  >
                    <Printer className="w-4.5 h-4.5" />
                  </motion.button>
                </div>
              </div>

              <div className="bg-white/30 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2.5 text-stone-900">
                    {isFullyCompleted ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>编撰完成</span>
                      </>
                    ) : isGeneratingOutline || generatingChapterIdx !== null ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-stone-500 shrink-0" />
                        <span>编撰进行中...</span>
                      </>
                    ) : (
                      <>
                        <CircleSlash2 className="w-5 h-5 text-stone-400 shrink-0" />
                        <span>生成已中止</span>
                      </>
                    )}
                  </h3>

                  {(isGeneratingOutline || generatingChapterIdx !== null) && (
                    <button
                      onClick={stopGeneration}
                      className="text-stone-500 hover:text-red-500 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium border border-stone-200 hover:border-red-200 cursor-pointer"
                    >
                      <Square className="w-3" /> 停止
                    </button>
                  )}
                </div>

                <div className="space-y-3.5 max-h-[42vh] lg:max-h-none overflow-y-auto lg:overflow-visible pr-2 lg:pr-0 custom-scrollbar lg:scrollbar-none">
                  {(outline.chapters || []).map((chap, idx) => {
                    const isCompleted = completedChapters.includes(idx);
                    const isGenerating = generatingChapterIdx === idx;
                    const content = chaptersContent[idx] || "";
                    let pageText = "";
                    if (isCompleted || isGenerating) {
                      const startPage = estimatedPages.chapters[idx]?.page || 1;
                      const currentPagesCount = Math.max(
                        1,
                        splitIntoPages(content, false, true).length,
                      );
                      const endPage = startPage + currentPagesCount - 1;
                      if (isCompleted) {
                        pageText =
                          startPage === endPage
                            ? `${startPage}页`
                            : `${startPage}-${endPage}页`;
                      } else {
                        pageText = `撰写中...`;
                      }
                    }
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 border-b border-stone-50/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 max-w-[75%]">
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-500 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 border border-stone-300 rounded-full shrink-0" />
                          )}
                          <span
                            className={`truncate ${isCompleted ? "text-stone-800" : isGenerating ? "text-emerald-700 font-medium animate-pulse" : "text-stone-400"}`}
                          >
                            第 {idx + 1} 章：{chap.title}
                          </span>
                        </div>
                        {pageText && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${isCompleted ? "bg-stone-50 text-stone-500 border border-stone-200/50" : "bg-emerald-50 text-emerald-600 border border-emerald-100 font-medium"}`}
                          >
                            {pageText}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* AI Logs */}
                <div className="mt-6 pt-5 border-t border-stone-100">
                  <div className="flex items-center gap-2 mb-2 text-stone-400">
                    <Activity className="w-3.5 h-3.5 text-stone-400 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      AI 工作日志
                    </span>
                  </div>
                  <div className="bg-stone-50 rounded-lg p-3 h-32 lg:h-[130px] overflow-y-auto font-mono text-[10px] leading-normal relative border border-stone-200 shadow-inner overflow-x-hidden custom-scrollbar">
                    <div className="space-y-1 relative z-10 w-full">
                      {logs.length === 0 ? (
                        <div className="text-stone-400 italic">
                          等待工作指令...
                        </div>
                      ) : (
                        logs.map((log, i) => (
                          <div
                            key={i}
                            className={`flex gap-2 ${
                              log.type === "error"
                                ? "text-red-500"
                                : log.type === "success"
                                  ? "text-emerald-600 font-bold"
                                  : "text-stone-600"
                            }`}
                          >
                            <span className="text-stone-400 shrink-0">
                              [{log.timestamp}]
                            </span>
                            <span className="break-all opacity-90 text-left">
                              {log.message}
                            </span>
                          </div>
                        ))
                      )}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-stone-900/50 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-stone-200">
            <div className="p-6">
              <h3 className="text-xl font-bold font-serif mb-2 text-stone-900">
                重新开始？
              </h3>
              <p className="text-stone-500 mb-8 leading-relaxed">
                确定要清除当前的所有进度和内容吗？建议在重新书写前先导出当前项目。
              </p>
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
            <h3 className="text-2xl font-bold font-serif mb-2 text-stone-900 text-center">
              下载成书
            </h3>
            <p
              className="text-stone-500 mb-8 text-center"
              style={{ fontFamily: "SimHei" }}
            >
              您可以将生成的全部内容以电子书格式下载保存
            </p>

            {!exportProgress.isExporting ? (
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => processExport("epub")}
                  className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left group"
                >
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-stone-900 text-lg">
                      EPUB 电子书
                    </div>
                    <div className="text-stone-500 text-sm">
                      流式排版格式，适合 Kindle、Apple Books 等各种阅读器阅读
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => processExport("pdf")}
                  className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 hover:border-red-400 hover:bg-red-50 transition-colors text-left group"
                >
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-stone-900 text-lg">
                      PDF 版式文件
                    </div>
                    <div className="text-stone-500 text-sm">
                      固定排版格式，完美保留当前预览里的精美 A5 书页排版
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="mt-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl font-medium text-stone-700 transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-6" />
                <div className="w-full bg-stone-100 rounded-full h-2 mb-4 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress.percent}%` }}
                  ></div>
                </div>
                <p className="text-stone-600 font-medium">
                  {exportProgress.text}
                </p>
                <p className="text-stone-400 text-sm mt-2 text-center">
                  生成过程由浏览器合成，可能需要一些时间，
                  <br />
                  请保持页面处于前台不要切换。
                </p>
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
            <h3 className="text-2xl font-bold font-serif mb-3 text-stone-900">
              未完成的书籍
            </h3>
            <p className="text-stone-500 mb-8 leading-relaxed">
              检测到导入的书籍项目尚未全部完成，是否立即开始续写剩余章节？
            </p>
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
            <h3 className="text-2xl font-bold font-serif mb-3 text-stone-900">
              重新开始？
            </h3>
            <p className="text-stone-500 mb-8 leading-relaxed">
              当前已生成的目录和章节将被永久删除。如果您需要保留 these
              内容，请先点击“导出”保存项目文件。
            </p>
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

      {showReturnHomeConfirm && (
        <div className="fixed inset-0 bg-stone-900/50 z-[110] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-stone-200 p-8 text-center">
            <div className="w-16 h-16 bg-stone-100 text-stone-700 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-stone-100">
              <ArrowLeft className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold font-serif mb-3 text-stone-900 text-xl">
              返回首页？
            </h3>
            <p className="text-stone-500 mb-8 leading-relaxed text-xs">
              当前图书尚未全部制作完成。返回首页后，制作将被中断，但内容会
              <strong>暂存在当前浏览器</strong>
              （“最近制作的书籍”）中。您可以随时在首页点击一键加载并续写。
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={executeReturnHome}
                className="w-full py-3.5 bg-stone-900 hover:bg-stone-850 active:scale-98 text-white font-bold text-sm rounded-xl transition-all shadow-md"
              >
                确认退出并暂存
              </button>
              <button
                onClick={() => setShowReturnHomeConfirm(false)}
                className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium text-sm rounded-xl transition-all"
              >
                继续撰写图书
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-stone-900/50 z-[110] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-stone-200 p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-3 animate-pulse">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold font-serif text-stone-900">
                管理员登录
              </h3>
              <p className="text-stone-500 text-sm mt-1">
                请输入设置的管理员密码以开启 API 配置
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  管理员密码
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="请输入后台密码"
                  required
                />
              </div>
              {loginError && (
                <div className="text-red-500 text-xs font-medium">
                  {loginError}
                </div>
              )}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setLoginError("");
                    setLoginPassword("");
                  }}
                  className="flex-grow flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex-grow flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 text-sm"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "验证并开启"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Settings Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-stone-900/50 z-[110] flex items-center justify-center p-2 md:p-6 backdrop-blur-md overflow-y-auto font-sans">
          <div className="bg-white rounded-[1.25rem] md:rounded-[2rem] shadow-2xl w-full max-w-3xl flex flex-col border border-stone-200 max-h-[94vh] md:max-h-[90vh] my-auto">
            <div className="px-4 md:px-8 py-3 md:py-6 border-b border-stone-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base md:text-xl font-bold font-serif text-stone-900">
                  系统配置
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-medium cursor-pointer"
              >
                关闭
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-4 md:px-8 flex border-b border-stone-100 bg-stone-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setAdminTab("config")}
                className={`flex-1 py-2.5 md:py-3 text-center text-xs md:text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  adminTab === "config"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-100/30"
                }`}
              >
                <Cpu className="w-4 h-4 hidden md:block" />
                API配置
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminTab("database");
                  setDbPage(1);
                  loadDatabaseBooks();
                }}
                className={`flex-1 py-2.5 md:py-3 text-center text-xs md:text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  adminTab === "database"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-100/30"
                }`}
              >
                <Database className="w-4 h-4 hidden md:block" />
                数据管理 ({dbBooks.length})
              </button>
            </div>

            <div className="px-3.5 md:px-8 py-3.5 md:py-6 overflow-y-auto space-y-3.5 md:space-y-6 flex-grow">
              {adminTab === "config" ? (
                <>
                  <p className="text-stone-500 text-xs md:text-sm leading-relaxed">
                    配置专属 API Key 与模型 ID。点击右侧「设为激活」切换系统默认模型。
                  </p>

                  {/* DeepSeek */}
                  <div className="p-3 shadow-xs bg-stone-50/80 rounded-xl md:rounded-2xl border border-stone-200/50 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-bold text-stone-900 flex items-center gap-2 text-xs md:text-base">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        DeepSeek
                      </h4>
                      {configActiveModel === "deepseek-v4-pro" ? (
                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] md:text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> 已激活
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setConfigActiveModel("deepseek-v4-pro")
                          }
                          className="px-2 py-0.5 bg-white hover:bg-stone-100 text-stone-600 text-[11px] font-semibold rounded-lg border border-stone-200 transition-colors cursor-pointer shrink-0"
                        >
                          设为激活
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] md:text-xs font-semibold text-stone-400 mb-1">
                          自定义 API Key
                        </label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 bg-white border border-stone-250/75 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-xs"
                          value={dsKey}
                          onChange={(e) => setDsKey(e.target.value)}
                          placeholder="sk-..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] md:text-xs font-semibold text-stone-400 mb-1">
                          模型 ID
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-stone-250/75 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-xs"
                          value={dsReal}
                          onChange={(e) => setDsReal(e.target.value)}
                          placeholder="deepseek-chat"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gemini */}
                  <div className="p-3 shadow-xs bg-stone-50/80 rounded-xl md:rounded-2xl border border-stone-200/50 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-bold text-stone-900 flex items-center gap-2 text-xs md:text-base">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        Gemini
                      </h4>
                      {configActiveModel === "gemini-2.5-pro" ||
                      configActiveModel === "gemini-1.5-pro" ? (
                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] md:text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> 已激活
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfigActiveModel("gemini-2.5-pro")}
                          className="px-2 py-0.5 bg-white hover:bg-stone-100 text-stone-600 text-[11px] font-semibold rounded-lg border border-stone-200 transition-colors cursor-pointer shrink-0"
                        >
                          设为激活
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] md:text-xs font-semibold text-stone-400 mb-1">
                          自定义 API Key
                        </label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 bg-white border border-stone-250/75 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-xs"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder="AIzaSy..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] md:text-xs font-semibold text-stone-400 mb-1">
                          模型 ID
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-stone-250/75 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-xs"
                          value={geminiReal}
                          onChange={(e) => setGeminiReal(e.target.value)}
                          placeholder="gemini-3.5-flash"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Qwen */}
                  <div className="p-3 shadow-xs bg-stone-50/80 rounded-xl md:rounded-2xl border border-stone-200/50 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-bold text-stone-900 flex items-center gap-2 text-xs md:text-base">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Qwen
                      </h4>
                      {configActiveModel === "qwen3.6-plus" ? (
                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] md:text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> 已激活
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfigActiveModel("qwen3.6-plus")}
                          className="px-2 py-0.5 bg-white hover:bg-stone-100 text-stone-600 text-[11px] font-semibold rounded-lg border border-stone-200 transition-colors cursor-pointer shrink-0"
                        >
                          设为激活
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] md:text-xs font-semibold text-stone-400 mb-1">
                          自定义 API Key (阿里百炼)
                        </label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 bg-white border border-stone-250/75 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-xs"
                          value={qwenKey}
                          onChange={(e) => setQwenKey(e.target.value)}
                          placeholder="sk-..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] md:text-xs font-semibold text-stone-400 mb-1">
                          模型 ID
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-stone-250/75 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-xs"
                          value={qwenReal}
                          onChange={(e) => setQwenReal(e.target.value)}
                          placeholder="qwen-max"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4 py-2 animate-fade-in">
                  <p className="text-stone-500 text-xs md:text-sm leading-relaxed mb-4">
                    系统在后台为您自动归档运行记录。您可随意浏览历史数据，并恢复编辑。
                  </p>

                  {isLoadingBooks ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                      <span className="text-stone-400 text-xs font-medium">
                        正在读取内置 SQLite 数据库...
                      </span>
                    </div>
                  ) : dbBooks.length === 0 ? (
                    <div className="py-12 text-center text-stone-400 space-y-4 bg-stone-50 rounded-2xl border border-stone-150 border-dashed">
                      <Database className="w-12 h-12 text-stone-300 mx-auto animate-pulse" />
                      <div className="space-y-1">
                        <p className="font-semibold text-stone-700 text-sm">
                          暂无存盘的书籍大纲数据
                        </p>
                        <p className="text-xs text-stone-400 max-w-sm mx-auto px-4">
                          新开书策划（点击“开始生成”）以及在编撰、续写时的任何更新都将即时、原子级保存至后台
                          SQLite 数据库中！
                        </p>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const itemsPerPage = 5;
                      const totalPages =
                        Math.ceil(dbBooks.length / itemsPerPage) || 1;
                      const activeDbPage = Math.max(
                        1,
                        Math.min(dbPage, totalPages),
                      );
                      const startIndex = (activeDbPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedDbBooks = dbBooks.slice(
                        startIndex,
                        endIndex,
                      );

                      return (
                        <div className="space-y-5">
                          <div className="space-y-4">
                            {paginatedDbBooks.map((item) => {
                              const isCurrentActive = item.id === currentBookId;
                              return (
                                <div
                                  key={item.id}
                                  className={`p-5 rounded-xl border transition-all ${
                                    isCurrentActive
                                      ? "bg-amber-50/40 border-amber-200 shadow-sm"
                                      : "bg-stone-50/50 border-stone-200/60 hover:bg-stone-50"
                                  } flex flex-col md:flex-row md:items-center justify-between gap-4`}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-bold text-stone-900 text-sm md:text-base leading-tight">
                                        《{item.title}》
                                      </h5>
                                      <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-semibold rounded-md">
                                        {item.genre}
                                      </span>
                                      {isCurrentActive && (
                                        <span className="px-2 py-0.5 bg-amber-600 text-white text-[10px] font-bold rounded-md shadow-sm">
                                          当前工作区
                                        </span>
                                      )}
                                    </div>
                                    {item.subtitle && (
                                      <p className="text-stone-500 text-xs -mt-1 leading-relaxed">
                                        {item.subtitle}
                                      </p>
                                    )}

                                    <div className="flex items-center gap-x-4 gap-y-1 text-xs text-stone-500 flex-wrap">
                                      <span>
                                        作者:{" "}
                                        <strong className="text-stone-700 font-medium">
                                          {item.author ||
                                            item.authorName ||
                                            "匿名"}
                                        </strong>
                                      </span>
                                      <span>
                                        字数:{" "}
                                        <strong className="text-stone-700 font-medium">
                                          {item.wordCount}字
                                        </strong>
                                      </span>
                                      <span>
                                        进度:{" "}
                                        <strong className="text-stone-700 font-medium">
                                          {item.completedCount}/
                                          {item.chapterCount} 章节
                                        </strong>
                                      </span>
                                      <span>
                                        模型:{" "}
                                        <strong className="text-stone-700 font-bold font-mono text-[11px]">
                                          {item.modelUsed}
                                        </strong>
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono">
                                      <Clock className="w-3.5 h-3.5 text-stone-300" />
                                      <span>
                                        保存时间:{" "}
                                        {new Date(
                                          item.updatedAt,
                                        ).toLocaleString("zh-CN")}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 md:self-center">
                                    <button
                                      onClick={() => handleLoadBook(item.id)}
                                      className="py-2 px-3 bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 border border-amber-200 hover:border-amber-300 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                                      title="还原至工作区继续二次编撰与导出成书"
                                    >
                                      <FolderOpen className="w-3.5 h-3.5" />
                                      调入前台
                                    </button>
                                    <button
                                      onClick={() =>
                                        deleteDatabaseBook(item.id, item.title)
                                      }
                                      className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-red-100 shrink-0 cursor-pointer"
                                      title="从后台数据库永久删除"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Pagination controls */}
                          {totalPages > 1 && (
                            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-150/60 mt-2 text-stone-500 text-xs select-none">
                              <span className="font-medium text-stone-500">
                                共{" "}
                                <strong className="text-stone-800 font-semibold">
                                  {dbBooks.length}
                                </strong>{" "}
                                本书，当前显示第 {activeDbPage} / {totalPages}{" "}
                                页
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={activeDbPage === 1}
                                  onClick={() =>
                                    setDbPage((p) => Math.max(1, p - 1))
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                                    activeDbPage === 1
                                      ? "bg-stone-50 border-stone-200 text-stone-300 cursor-not-allowed opacity-50"
                                      : "bg-white border-stone-200 text-stone-750 hover:bg-stone-50 active:scale-95"
                                  }`}
                                >
                                  上一页
                                </button>

                                {Array.from(
                                  { length: totalPages },
                                  (_, idx) => idx + 1,
                                ).map((pageNum) => {
                                  // Only show close pages if totalPages is very large
                                  if (
                                    totalPages > 6 &&
                                    Math.abs(pageNum - activeDbPage) > 2 &&
                                    pageNum !== 1 &&
                                    pageNum !== totalPages
                                  ) {
                                    if (
                                      pageNum === 2 ||
                                      pageNum === totalPages - 1
                                    ) {
                                      return (
                                        <span
                                          key={pageNum}
                                          className="px-1 text-stone-400"
                                        >
                                          ...
                                        </span>
                                      );
                                    }
                                    return null;
                                  }
                                  return (
                                    <button
                                      key={pageNum}
                                      type="button"
                                      onClick={() => setDbPage(pageNum)}
                                      className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                        activeDbPage === pageNum
                                          ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                                      }`}
                                    >
                                      {pageNum}
                                    </button>
                                  );
                                })}

                                <button
                                  type="button"
                                  disabled={activeDbPage === totalPages}
                                  onClick={() =>
                                    setDbPage((p) =>
                                      Math.min(totalPages, p + 1),
                                    )
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                                    activeDbPage === totalPages
                                      ? "bg-stone-50 border-stone-200 text-stone-300 cursor-not-allowed opacity-50"
                                      : "bg-white border-stone-200 text-stone-750 hover:bg-stone-50 active:scale-95"
                                  }`}
                                >
                                  下一页
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>

            <div className="px-4 md:px-8 py-4 md:py-5 border-t border-stone-100 flex items-center justify-end gap-3 bg-stone-50/50 shrink-0">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="py-2.5 px-6 bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Page Footer with Quote and Website Declaration - Simple & Fixed to Bottom */}
      <footer className="no-print mt-auto shrink-0 relative w-full bg-gradient-to-r from-stone-50/70 via-white/80 to-stone-50/70 backdrop-blur-xl border-t border-stone-200/50 py-3 px-4 text-center z-40 text-stone-500 font-sans shadow-sm animate-fade-in">
        <div className="max-w-4xl mx-auto flex flex-col gap-1.5 justify-center items-center">
          {/* Row 1: Quote - Source */}
          <div className="flex items-center justify-center gap-2 text-xs text-stone-700 font-sans font-medium">
            <span>“书籍是屹立在时间的汪洋大海中的灯塔。”</span>
            <span className="text-stone-400 font-sans not-italic text-[10px]">
              — 惠普尔
            </span>
          </div>

          {/* Row 2: Website Declaration */}
          <p className="text-[10px] text-stone-400/90 max-w-3xl text-center leading-relaxed font-sans">
            Copyright @ InstaBook &nbsp;&nbsp; 本平台内容由 InstaBook
            智能算法推理生成，仅供个人学术探讨及交流品鉴
          </p>
        </div>
      </footer>
    </div>
  );
}
