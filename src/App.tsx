import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Loader2, Download, Wand2, CheckCircle2, Square, Upload, Archive, RotateCcw, Activity } from 'lucide-react';
import { BookCover } from './components/BookCover';
import { BookContent } from './components/BookContent';
import { generateBookOutline, generateChapterContent, testQwenConnection, BookOutline } from './lib/qwen';
import { generateEPUB } from './lib/epub';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, TableOfContents, Footer, Header, PageNumber, convertMillimetersToTwip, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import html2canvas from 'html2canvas';

export default function App() {
  const [topic, setTopic] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [wordCount, setWordCount] = useState<number>(50000);
  const [writingStyle, setWritingStyle] = useState('严谨、专业、深具启发性');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [outlineProgressText, setOutlineProgressText] = useState("");
  const [outline, setOutline] = useState<BookOutline | null>(null);
  
  const [chaptersContent, setChaptersContent] = useState<Record<number, string>>({});
  const [generatingChapterIdx, setGeneratingChapterIdx] = useState<number | null>(null);
  const [completedChapters, setCompletedChapters] = useState<number[]>([]);
  const [stopRequested, setStopRequested] = useState(false);
  const stopRef = useRef(false);

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
    { name: '热血励志', value: '充满激情、感召力强、催人奋进' }
  ];

  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const testApiKey = async () => {
    setIsTestingApi(true);
    setApiTestStatus('idle');
    try {
      const result = await testQwenConnection();
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
    setOutlineProgressText("");
    setOutline(null);
    setChaptersContent({});
    setCompletedChapters([]);
    setGeneratingChapterIdx(null);

    // Calculate roughly how many chapters are needed (assume about 2500 words per chapter)
    const chapterCount = Math.max(1, Math.min(40, Math.ceil(wordCount / 2500)));

    try {
      const generatedOutline = await generateBookOutline(topic, authorName, chapterCount, writingStyle, (text) => {
        setOutlineProgressText(text);
      });
      setOutline(generatedOutline);
      setIsGeneratingOutline(false);
      
      // Start generating chapters iteratively
      await generateAllChapters(generatedOutline);
    } catch (error: any) {
      console.error("Error generating outline:", error);
      let errorMessage = error?.message || String(error);
      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        errorMessage = "API Key 无效。请检查部署环境中的环境变量（QWEN_API_KEY）配置是否正确。";
      }
      alert(`生成大纲失败，请重试。\n错误信息: ${errorMessage}`);
      setIsGeneratingOutline(false);
    }
  };

  const stopGeneration = () => {
    stopRef.current = true;
    setStopRequested(true);
    setGeneratingChapterIdx(null);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const generateAllChapters = async (bookOutline: BookOutline) => {
    for (let i = 0; i < bookOutline.chapters.length; i++) {
      if (completedChapters.includes(i)) continue; // Skip already completed chapters
      
      if (stopRef.current) break;
      setGeneratingChapterIdx(i);
      
      let retries = 3;
      let success = false;
      let backoffMs = 15000;

      while (!success && retries > 0 && !stopRef.current) {
        try {
          const content = await generateChapterContent(
            bookOutline.title,
            bookOutline.chapters[i].title,
            bookOutline.chapters[i].summary,
            writingStyle,
            (text) => {
              setChaptersContent((prev) => ({ ...prev, [i]: text }));
            }
          );
          
          if (stopRef.current) break;
          
          setChaptersContent((prev) => ({ ...prev, [i]: content }));
          setCompletedChapters((prev) => {
              const updated = [...prev, i];
              return Array.from(new Set(updated)).sort((a,b) => a-b);
          });
          success = true;
          
          if (i < bookOutline.chapters.length - 1 && !stopRef.current) {
            await sleep(5000); 
          }
        } catch (error: any) {
          if (stopRef.current) break;
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

      alert("图书项目导入成功！");
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
      // Significantly increased delay to ensure everything is settled
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const canvas = await html2canvas(coverElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 30000,
        onclone: (clonedDoc) => {
          // 1. Comprehensive oklch replacement in all style tags
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const tag = styleTags[i];
            if (tag.innerHTML.includes('oklch')) {
              tag.innerHTML = tag.innerHTML.replace(/oklch\([^)]+\)/g, '#1c1917');
            }
          }

          // 2. Prepare cover element for full-bleed capture
          const cover = clonedDoc.getElementById('book-cover-to-capture');
          if (cover) {
            // Remove UI decorations for clean print capture
            cover.style.borderRadius = '0';
            cover.style.boxShadow = 'none';
            cover.style.border = 'none';
            cover.style.width = '148mm';
            cover.style.height = '210mm';
            cover.style.maxWidth = 'none';
            cover.style.margin = '0';
            cover.style.padding = '0';
            cover.style.transform = 'none';
            
            // Fix text-clip issues (common in html2canvas)
            const titleElement = cover.querySelector('h1');
            if (titleElement) {
              titleElement.style.background = 'none';
              titleElement.style.webkitTextFillColor = '#BF953F';
              titleElement.style.color = '#BF953F';
              titleElement.style.filter = 'none';
            }
            
            // Background image scale reset
            const bgImage = cover.querySelector('div[style*="background-image"]');
            if (bgImage instanceof HTMLElement) {
              bgImage.style.transform = 'none';
            }
          }

          // 3. Shim getComputedStyle to catch any remaining oklch in runtime
          const originalGetComputedStyle = window.getComputedStyle;
          // @ts-ignore
          clonedDoc.defaultView.getComputedStyle = (el, pseudo) => {
            const style = originalGetComputedStyle(el, pseudo);
            const proxy = new Proxy(style, {
              get(target, prop) {
                const val = target[prop as keyof CSSStyleDeclaration];
                if (typeof val === 'string' && val.includes('oklch')) {
                  if (val.includes('0.1')) return 'rgba(28, 25, 23, 0.1)';
                  if (val.includes('0.2')) return 'rgba(28, 25, 23, 0.2)';
                  if (val.includes('0.3')) return 'rgba(28, 25, 23, 0.3)';
                  if (val.includes('0.4')) return 'rgba(28, 25, 23, 0.4)';
                  if (val.includes('0.5')) return 'rgba(28, 25, 23, 0.5)';
                  return '#1c1917';
                }
                return val;
              }
            });
            return proxy as CSSStyleDeclaration;
          };

          // 4. Force colors on specific known elements and disable transitions
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            if (el.style) {
              el.style.transition = 'none';
              el.style.animation = 'none';
              if (el.style.cssText.includes('oklch')) {
                 el.style.cssText = el.style.cssText.replace(/oklch\([^)]+\)/g, '#1c1917');
              }
            }
          }
        }
      });
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
      });
    } catch (err) {
      console.error("Full capture error detail:", err);
      return null;
    }
  };

  const downloadWord = async () => {
    if (!outline) return;
    try {
      const coverBlob = await captureCover();
      const buffer = coverBlob ? await coverBlob.arrayBuffer() : null;

      const coverNodes: any[] = [];
      
      // Cover Page
      if (buffer) {
        coverNodes.push(
            new Paragraph({
                children: [
                    new ImageRun({
                        data: buffer,
                        transformation: { width: 419.5, height: 595.2 }, // Exact A5 portrait points (148x210mm)
                        type: "jpg"
                    })
                ],
                indent: { firstLine: 0, left: 0 },
                spacing: { before: 0, after: 0 }
            }),
            new Paragraph({ text: "", pageBreakBefore: true })
        );
      } else {
        // Simple text fallback if capture fails
        coverNodes.push(new Paragraph({
            children: [new TextRun({ text: outline.title, bold: true, size: 60, font: "SimHei", color: "BF953F" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 400 }
          }));
          
          if (outline.subtitle) {
            coverNodes.push(new Paragraph({
              children: [new TextRun({ text: outline.subtitle, size: 32, color: "666666", font: "SimHei" })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 1200 }
            }));
          }

          coverNodes.push(
            new Paragraph({
              children: [new TextRun({ text: `作者：${outline.author}`, size: 28, color: "333333", font: "SimHei" })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 2000 }
            }),
            new Paragraph({
              children: [new TextRun({ text: `出版社：${outline.publisher}`, size: 24, color: "666666", font: "SimHei" })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 400 }
            }),
            new Paragraph({ text: "", pageBreakBefore: true })
          );
      }

      const frontMatterChildren: any[] = [];

      // Inner Title Page
      frontMatterChildren.push(
        new Paragraph({
          children: [new TextRun({ text: outline.title, bold: true, size: 60, font: "SimHei", color: "000000" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 3600, after: 1200 }
        })
      );
      if (outline.subtitle) {
        frontMatterChildren.push(
          new Paragraph({
            children: [new TextRun({ text: outline.subtitle, size: 36, font: "SimHei", color: "666666" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 2400 }
          })
        );
      }
      frontMatterChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `作者：${outline.author}`, size: 28, font: "SimHei", color: "000000" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 4000 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `${outline.publisher} 出版`, size: 24, font: "SimHei", color: "666666" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 1200 }
        }),
        new Paragraph({ text: "", pageBreakBefore: true })
      );

      // Copyright Page
      frontMatterChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `出版发行：${outline.publisher}`, size: 22, font: "SimSun", color: "666666" })],
          spacing: { before: 7000, after: 120 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `版权所有 © ${new Date().getFullYear()} ${outline.author}。保留所有权利。`, size: 22, font: "SimSun", color: "666666" })],
          spacing: { after: 120 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "未经出版者事先书面许可，不得以任何方式复制、存储或传播本书的任何部分。", size: 22, font: "SimSun", color: "666666" })],
          spacing: { after: 120 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `本书字数：约 ${wordCount.toLocaleString()} 字`, size: 22, font: "SimSun", color: "666666" })],
          spacing: { after: 120 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "开本：A5 (148mm × 210mm)", size: 22, font: "SimSun", color: "666666" })],
          spacing: { after: 600 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `书号 (ISBN): ${outline.isbn}`, size: 22, font: "SimSun", color: "666666" })],
          spacing: { after: 120 },
          border: { top: { color: "666666", style: BorderStyle.SINGLE, size: 4, space: 10 } }
        }),
        new Paragraph({
          children: [new TextRun({ text: `定价: ${outline.price}`, size: 22, font: "SimSun", color: "666666" })],
        }),
        new Paragraph({ text: "", pageBreakBefore: true })
      );

      const contentChildren: any[] = [];
      contentChildren.push(new Paragraph({
        children: [new TextRun({ text: "目录", bold: true, size: 48, font: "SimHei" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 }
      }));
      contentChildren.push(new TableOfContents("目录", { hyperlink: true, headingStyleRange: "1-3" }));
      contentChildren.push(new Paragraph({ text: "", pageBreakBefore: true }));

      if (outline.recommendations) {
        contentChildren.push(new Paragraph({
          children: [new TextRun({ text: "推荐序", bold: true, size: 36, font: "SimHei" })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 800, after: 800 }
        }));
        outline.recommendations.forEach(rec => {
          rec.content.split('\n\n').forEach(p => {
             if (p.trim()) contentChildren.push(new Paragraph({ text: p.trim(), style: "Content" }));
          });
          contentChildren.push(new Paragraph({
            children: [new TextRun({ text: `${rec.recommender} - ${rec.recommenderTitle}`, bold: true })],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 400, after: 1200 }
          }));
        });
        contentChildren.push(new Paragraph({ text: "", pageBreakBefore: true }));
      }

      contentChildren.push(new Paragraph({
        children: [new TextRun({ text: "引言", bold: true, size: 36, font: "SimHei" })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 800 }
      }));
      outline.introduction.split('\n\n').forEach(p => {
        if (p.trim()) contentChildren.push(new Paragraph({ text: p.trim(), style: "Content" }));
      });
      contentChildren.push(new Paragraph({ text: "", pageBreakBefore: true }));

      outline.chapters.forEach((chap, idx) => {
        contentChildren.push(new Paragraph({
          children: [new TextRun({ text: `第 ${idx + 1} 章  ${chap.title}`, bold: true, size: 32, font: "SimHei" })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 1000, after: 600 }
        }));
        const content = chaptersContent[idx] || "本章内容尚未生成。";
        content.split('\n\n').forEach(p => {
          if (p.trim()) {
            if (p.startsWith('#')) {
              const level = p.match(/^#+/)?.[0].length || 1;
              const cleanText = p.replace(/^#+\s*/, '');
              const hl = level === 1 ? HeadingLevel.HEADING_2 : (level === 2 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4);
              contentChildren.push(new Paragraph({ children: [new TextRun({ text: cleanText, bold: true, font: "SimHei" })], heading: hl }));
            } else {
              contentChildren.push(new Paragraph({ text: p.trim(), style: "Content" }));
            }
          }
        });
        contentChildren.push(new Paragraph({ text: "", pageBreakBefore: true }));
      });

      contentChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "全书完", size: 36, font: "SimHei", color: "666666" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 8000, after: 1200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "本著作由 InstaBook Builder (AI 图书生成器) 强力驱动生成", size: 24, font: "SimHei", color: "888888" })],
          alignment: AlignmentType.CENTER,
        }),
      );

      const doc = new Document({
        creator: outline.author,
        title: outline.title,
        description: outline.subtitle,
        features: { updateFields: true },
        styles: {
          paragraphStyles: [
            { 
              id: "Content", 
              name: "Content", 
              basedOn: "Normal", 
              run: { size: 24, font: "SimSun" }, 
              paragraph: { 
                indent: { firstLine: 480 }, 
                spacing: { line: 400, before: 120, after: 120 }, 
                alignment: AlignmentType.JUSTIFIED 
              } 
            },
            { 
              id: "Heading1", 
              name: "Heading 1", 
              basedOn: "Normal", 
              run: { size: 36, bold: true, font: "SimHei" }, 
              paragraph: { 
                alignment: AlignmentType.CENTER,
                spacing: { before: 800, after: 400 }
              } 
            }
          ]
        },
        sections: [
          // Cover Section: Zero margins for full bleed
          { 
            properties: { 
              page: { 
                size: { width: convertMillimetersToTwip(148), height: convertMillimetersToTwip(210) }, 
                margin: { top: 0, right: 0, bottom: 0, left: 0 } 
              } 
            }, 
            children: coverNodes 
          },
          // Front Matter/Main Content: Unified margins
          { 
            properties: { 
              page: { 
                size: { width: convertMillimetersToTwip(148), height: convertMillimetersToTwip(210) }, 
                pageNumbers: { start: 1, formatType: "decimal" }, 
                margin: { top: convertMillimetersToTwip(15), right: convertMillimetersToTwip(15), bottom: convertMillimetersToTwip(20), left: convertMillimetersToTwip(15) } 
              } 
            }, 
            footers: { 
              default: new Footer({ 
                children: [
                  new Paragraph({ 
                    alignment: AlignmentType.CENTER, 
                    children: [new TextRun("— "), new TextRun({ children: [PageNumber.CURRENT] }), new TextRun(" —")] 
                  })
                ] 
              }) 
            },
            children: [...frontMatterChildren, ...contentChildren] 
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${outline.title}.docx`);
    } catch (err) {
      console.error(err);
      alert("下载 Word 文档失败！");
    }
  };

  const isFullyCompleted = outline && completedChapters.length === outline.chapters.length;
  const isInterrupted = outline && completedChapters.length < outline.chapters.length && !isGeneratingOutline && !generatingChapterIdx;

  const splitIntoPages = (content: string, charsPerPage = 420) => {
    const pages: string[][] = [];
    const paragraphs = content.split('\n\n').filter((p) => p.trim() !== '');
    let currentPage: string[] = [];
    let currentLength = 0;
    paragraphs.forEach(p => {
        if (currentLength + p.length > charsPerPage && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            currentLength = 0;
        }
        currentPage.push(p);
        currentLength += p.length;
    });
    if (currentPage.length > 0) pages.push(currentPage);
    return pages;
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const requestResetProject = () => {
    setShowResetConfirm(true);
  };

  const confirmResetProject = () => {
    stopGeneration();
    setOutline(null);
    setChaptersContent({});
    setCompletedChapters([]);
    setGeneratingChapterIdx(null);
    setTopic("");
    setAuthorName("");
    localStorage.removeItem('instabook-outline');
    localStorage.removeItem('instabook-chaptersContent');
    localStorage.removeItem('instabook-completedChapters');
    setShowResetConfirm(false);
  };

  const resumeGeneration = async () => {
    if (!outline) return;
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
    let currentPage = 1;
    if (outline?.recommendations) currentPage += outline.recommendations.length;
    currentPage += Math.ceil((outline?.chapters.length || 0) / 12);
    const introPages = Math.max(1, Math.ceil((outline?.introduction?.length || 500) / 540));
    const introPageNum = currentPage;
    currentPage += introPages;
    const chaptersToC = outline?.chapters.map((chap, idx) => {
      const startPage = currentPage;
      const contentLen = chaptersContent[idx]?.length || 2000;
      const chapPages = Math.max(1, Math.ceil(contentLen / 540));
      currentPage += chapPages; 
      return { title: chap.title, page: startPage };
    }) || [];
    return { intro: introPageNum, chapters: chaptersToC };
  };

  const estimatedPages = outline ? estimatePageNumbers() : { intro: 1, chapters: [] };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans selection:bg-stone-300 selection:text-stone-900 pb-24">
      
      <header className="no-print bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center text-white"><BookOpen className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold tracking-tight">AI 图书生成器</h1>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" accept=".zip" className="hidden" ref={fileInputRef} onChange={importProject} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 md:px-4 md:py-2 text-stone-600 hover:bg-stone-200 bg-stone-100 rounded-full transition-colors flex items-center gap-2"><Upload className="w-4 h-4" /><span className="hidden md:inline font-medium text-sm">导入</span></button>
            {outline && (
              <>
                <button onClick={requestResetProject} className="p-2 md:px-4 md:py-2 text-red-600 hover:bg-red-50 bg-red-50/50 rounded-full transition-colors flex items-center gap-2"><RotateCcw className="w-4 h-4" /><span className="hidden md:inline font-medium text-sm">重新书写</span></button>
                {isInterrupted && (
                  <button onClick={resumeGeneration} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-medium transition-colors shadow-sm animate-pulse"><Wand2 className="w-4 h-4" />续写完成</button>
                )}
                <button onClick={exportProject} className="p-2 md:px-4 md:py-2 text-stone-600 hover:bg-stone-200 bg-stone-100 rounded-full transition-colors flex items-center gap-2"><Archive className="w-4 h-4" /><span className="hidden md:inline font-medium text-sm">导出ZIP</span></button>
                <button onClick={downloadEpub} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition-colors shadow-sm"><Download className="w-4 h-4" />导出 EPUB</button>
                <button onClick={downloadWord} className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full font-medium transition-colors shadow-sm"><Download className="w-4 h-4" />导出 Word</button>
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
            <div><label className="block text-sm font-medium text-stone-700 mb-1">书名或主题</label><input type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow disabled:opacity-50" placeholder="例如：量子计算发展史..." value={topic} onChange={(e) => setTopic(e.target.value)} disabled={isGeneratingOutline} /></div>
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1"><label className="block text-sm font-medium text-stone-700 mb-1">作者署名</label><input type="text" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow disabled:opacity-50" placeholder="请输入笔名..." value={authorName} onChange={(e) => setAuthorName(e.target.value)} disabled={isGeneratingOutline} /></div>
              <div className="w-full md:w-1/3"><label className="block text-sm font-medium text-stone-700 mb-1">文笔风格</label><select className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow disabled:opacity-50" value={writingStyle} onChange={(e) => setWritingStyle(e.target.value)} disabled={isGeneratingOutline}>{styles.map((s) => (<option key={s.name} value={s.value}>{s.name}</option>))}</select></div>
              <div className="w-full md:w-1/4"><label className="block text-sm font-medium text-stone-700 mb-1">总字数</label><select className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-shadow disabled:opacity-50" value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))} disabled={isGeneratingOutline}><option value={2000}>极短篇 (~2千字)</option><option value={10000}>短篇 (~1万字)</option><option value={30000}>中篇 (~3万字)</option><option value={50000}>长篇 (~5万字)</option><option value={100000}>巨著 (~10万字)</option></select></div>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button onClick={startGeneration} disabled={!topic.trim() || isGeneratingOutline} className="flex-grow py-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"><Wand2 className="w-5 h-5" />开始撰写成书</button>
              <button 
                onClick={testApiKey} 
                disabled={isTestingApi} 
                className={`px-6 py-4 rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
                  apiTestStatus === 'success' ? 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300' :
                  apiTestStatus === 'error' ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300' :
                  'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
                }`}
              >
                {isTestingApi ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                 apiTestStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                 apiTestStatus === 'error' ? <Activity className="w-5 h-5" /> : 
                 <Activity className="w-5 h-5" />
                }
                {isTestingApi ? '测试中...' : 
                 apiTestStatus === 'success' ? '连接成功' : 
                 apiTestStatus === 'error' ? '连接失败' : 
                 '连接测试'
                }
              </button>
            </div>
            {isInterrupted && (<button onClick={resumeGeneration} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-3 mt-3"><Wand2 className="w-5 h-5" />检测到未完成书籍：继续续写</button>)}
          </div>
        </div>
      )}

      {(isGeneratingOutline || (outline && !isFullyCompleted && !stopRequested)) && (
        <div className="max-w-2xl mx-auto px-6 py-16 no-print">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-8"><h3 className="text-xl font-bold flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-stone-500" />正在编撰您的著作...</h3><button onClick={stopGeneration} className="text-stone-500 hover:text-red-500 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"><Square className="w-4 h-4 fill-current" />停止生成</button></div>
            <div className="space-y-4">
              <div className="flex flex-col gap-2"><div className="flex items-center gap-4">{isGeneratingOutline ? (<Loader2 className="w-5 h-5 animate-spin text-stone-400" />) : (<CheckCircle2 className="w-5 h-5 text-emerald-500" />)}<span className={isGeneratingOutline ? "text-stone-600" : "text-stone-900 font-medium"}>正在策划出版大纲与章节结构</span></div>{isGeneratingOutline && outlineProgressText && ( <div className="ml-9 p-3 bg-stone-50 rounded-lg border border-stone-200 max-h-40 overflow-y-auto w-full max-w-[calc(100%-2.25rem)]"><pre className="text-xs text-stone-500 whitespace-pre-wrap font-mono overflow-x-hidden w-full">{outlineProgressText}</pre></div> )}</div>
              {outline && outline.chapters.map((chap, idx) => (<div key={idx} className="flex items-center gap-4 text-sm md:text-base">{completedChapters.includes(idx) ? ( <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> ) : generatingChapterIdx === idx ? ( <Loader2 className="w-5 h-5 animate-spin text-emerald-500 shrink-0" /> ) : ( <div className="w-5 h-5 border-2 border-stone-200 rounded-full shrink-0" /> )}<span className={ completedChapters.includes(idx) ? "text-stone-900 font-medium" : generatingChapterIdx === idx ? "text-emerald-700 font-medium" : "text-stone-400" }>第 {idx + 1} 章：{chap.title}</span></div>))}
            </div>
          </div>
        </div>
      )}

      {outline && (
        <div className="max-w-4xl mx-auto px-6 py-12 printable-book">
          <div className="hidden print:flex print-header"><span>《{outline.title}》</span><span>{outline.author} 著</span></div>
          <div className="hidden print:block print-footer"><span className="page-number"></span></div>
          <div style={{ counterReset: 'page' }}></div>
          <div className="mb-24 page-break-after-always book-cover-page"><BookCover title={outline.title} subtitle={outline.subtitle} author={outline.author} publisher={outline.publisher} /></div>
          <div className="book-page-preview page-break flex flex-col items-center justify-center min-h-[80vh] text-center mb-24"><h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 text-black" style={{ fontFamily: "SimHei" }}>{outline.title}</h1><h2 className="text-xl md:text-2xl font-serif text-stone-600 mb-16" style={{ fontFamily: "SimHei" }}>{outline.subtitle}</h2><div className="mt-auto mb-16"><p className="text-lg font-serif">作者：{outline.author}</p></div><div className="mt-12 text-sm text-stone-500 font-serif flex flex-col gap-2"><span>{outline.publisher} 出版</span></div></div>
          <div className="book-page-preview page-break flex flex-col justify-end min-h-[80vh] pb-12 mb-24 text-stone-600 text-sm font-serif"><p className="mb-4">出版发行：{outline.publisher}</p><p className="mb-4">版权所有 © {new Date().getFullYear()} {outline.author}。保留所有权利。</p><p className="mb-4">未经出版者事先书面许可，不得以任何方式复制、存储或传播本书的任何部分。</p><p className="mb-4">本书字数：约 {wordCount.toLocaleString()} 字</p><p className="mb-4">开本：A5 (148mm × 210mm)</p><div className="mt-8 border-t border-stone-300 pt-4"><p>书号 (ISBN): {outline.isbn}</p><p>定价: {outline.price}</p></div></div>
          {(() => {
            let pageCounter = estimatedPages.intro - (outline.recommendations?.length || 0);
            return outline.recommendations?.map((rec, idx) => {
              const pages = splitIntoPages(rec.content, 540);
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
          <div className="book-page-preview page-break mb-24 mx-auto">
            {/* Header removed as requested */}
            <h2 className="text-[1.35rem] font-serif font-bold mb-8 text-center text-black mt-[1.5rem]" style={{ fontFamily: "SimHei" }}>目 录</h2>
            <div className="space-y-[0.6rem] font-serif text-[0.85rem] leading-tight">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-bold text-[0.95rem]">引言</span>
                <div className="flex-grow border-b border-dotted border-stone-400 relative top-[-4px] mx-4"></div>
                <span className="font-bold text-[0.95rem]">{estimatedPages.intro}</span>
              </div>
              {outline.chapters.map((chap, idx) => (
                <div key={idx} className="flex items-baseline justify-between group">
                  <span className="pr-4 bg-[#fcfbf8] transition-colors z-10 print:bg-[#fcfbf8] inline-block max-w-[85%]">
                    第 {idx + 1} 章 {chap.title}
                  </span>
                  <div className="flex-grow border-b border-dotted border-stone-400 relative top-[-4px]"></div>
                  <span className="pl-4 bg-[#fcfbf8] transition-colors z-10 print:bg-[#fcfbf8]">
                    {estimatedPages.chapters[idx]?.page || "-"}
                  </span>
                </div>
              ))}
            </div>
            <div className="preview-footer">—</div>
          </div>
          {(() => { let pageCounter = estimatedPages.intro - 1; return splitIntoPages(outline.introduction, 540).map((pageParas, pageIdx) => { pageCounter++; return ( <div key={`intro-${pageIdx}`} className="book-page-preview page-break mb-24 mx-auto"><div className="preview-header">{outline.title}</div>{pageIdx === 0 && ( <h2 className="text-[1.35rem] font-serif font-bold mb-8 text-center text-black mt-[1.5rem]" style={{ fontFamily: "SimHei" }}>引言</h2> )}<BookContent content={pageParas.join('\n\n')} /><div className="preview-footer">— {pageCounter} —</div></div> ); }); })()}
          {(() => { let globalPageCounter = 0; if (estimatedPages.chapters.length > 0) { globalPageCounter = estimatedPages.chapters[0].page - 1; } return outline.chapters.map((chap, idx) => { const contentReady = completedChapters.includes(idx) || (generatingChapterIdx === idx && chaptersContent[idx]); const content = contentReady ? chaptersContent[idx] : ""; const pages = contentReady ? splitIntoPages(content, 540) : [[""]]; return pages.map((pageParas, pageIdx) => { globalPageCounter++; return ( <div key={`chap-${idx}-${pageIdx}`} className="book-page-preview page-break flex flex-col relative content-page"><div className="preview-header">{outline.title}</div>{pageIdx === 0 && ( <div className="mt-[2rem] mb-[2rem] text-center w-full"><span className="text-[1rem] font-serif text-black block mb-2" style={{ fontFamily: "SimHei" }}>第 {idx + 1} 章</span><h2 className="text-[1.8rem] font-serif font-bold text-black leading-tight" style={{ fontFamily: "SimHei" }}>{chap.title}</h2></div> )}<div className="w-full text-left flex-grow">{contentReady ? ( <><BookContent content={pageParas.join('\n\n')} />{generatingChapterIdx === idx && pageIdx === pages.length - 1 && ( <div className="flex items-center gap-2 text-stone-400 mt-8 mb-4 justify-center no-print"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm font-serif">AI 正在奋笔疾书...</span></div> )}</> ) : ( <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-stone-400 no-print"><Loader2 className="w-8 h-8 animate-spin mb-4" /><p className="font-serif">等待生成...</p></div> )}</div><div className="preview-footer">— {globalPageCounter} —</div></div> ); }); }); })()}
          <div className="book-page-preview page-break flex flex-col items-center justify-center min-h-[50vh] text-center border-t border-stone-200 mt-32 pt-16"><div className="w-12 h-12 mb-8 mx-auto bg-stone-900 rounded-[12px] flex items-center justify-center text-white"><BookOpen className="w-6 h-6" /></div><p className="font-serif text-lg text-stone-500 max-w-md">全书完</p><p className="mt-8 text-sm text-stone-400 font-sans tracking-wide">本著作由 InstaBook Builder 强力驱动生成</p></div>
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
    </div>
  );
}
