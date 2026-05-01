import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { BookOutline } from './api';

export const generateEPUB = async (
  outline: BookOutline,
  chaptersContent: Record<number, string>,
  wordCount: number,
  coverBlob?: Blob | null
) => {
  const zip = new JSZip();

  // 1. mimetype
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. META-INF/container.xml
  const containerXML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`;
  zip.folder("META-INF")?.file("container.xml", containerXML);

  // 3. OEBPS structure
  const oebps = zip.folder("OEBPS")!;
  
  // Handle cover image
  if (coverBlob) {
    oebps.folder("Images")?.file("cover.jpg", coverBlob);
  } else {
    try {
      let hash = 0;
      const str = outline.title || "default";
      for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const seedNum = Math.abs(hash);
      const response = await fetch(`https://picsum.photos/seed/${seedNum}/1450/2100`);
      const blob = await response.blob();
      oebps.folder("Images")?.file("cover.jpg", blob);
    } catch (err) {
      console.warn("Failed to fetch fallback cover image", err);
    }
  }

  const css = `
body { font-family: sans-serif; line-height: 1.8; margin: 0; padding: 5%; color: #333; }
h1, h2, h3 { text-align: center; font-weight: bold; margin-top: 2em; margin-bottom: 1em; color: #000; }
h1 { font-size: 1.5em; }
h2 { font-size: 1.3em; }
h3 { font-size: 1.1em; }
p { text-indent: 2em; margin-top: 0; margin-bottom: 1em; text-align: justify; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.my-12 { margin-top: 4em; margin-bottom: 4em; }
.title-main { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
.title-sub { font-size: 1.2em; color: #666; margin-bottom: 3em; }
.cover-img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
.font-bold { font-weight: bold; }
`;
  oebps.folder("Styles")?.file("style.css", css);

  let manifestItems = `
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="Text/nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="Styles/style.css" media-type="text/css"/>
    <item id="cover-image" href="Images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>
    <item id="cover-page" href="Text/cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="title-page" href="Text/title.xhtml" media-type="application/xhtml+xml"/>
    <item id="copyright-page" href="Text/copyright.xhtml" media-type="application/xhtml+xml"/>
    <item id="toc-page" href="Text/toc.xhtml" media-type="application/xhtml+xml"/>
  `;
  
  let spineRefs = `
    <itemref idref="cover-page" linear="no"/>
    <itemref idref="title-page"/>
    <itemref idref="copyright-page"/>
    <itemref idref="toc-page"/>
  `;

  let ncxNavMap = `
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>封面</text></navLabel>
      <content src="Text/cover.xhtml"/>
    </navPoint>
    <navPoint id="navPoint-2" playOrder="2">
      <navLabel><text>目录</text></navLabel>
      <content src="Text/toc.xhtml"/>
    </navPoint>
  `;
  
  let playOrder = 3;

  if (outline.recommendations && outline.recommendations.length > 0) {
    manifestItems += `<item id="rec-page" href="Text/recommendations.xhtml" media-type="application/xhtml+xml"/>\n`;
    spineRefs += `<itemref idref="rec-page"/>\n`;
    ncxNavMap += `
    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>推荐序</text></navLabel>
      <content src="Text/recommendations.xhtml"/>
    </navPoint>\n`;
    playOrder++;
  }

  manifestItems += `<item id="intro-page" href="Text/intro.xhtml" media-type="application/xhtml+xml"/>\n`;
  spineRefs += `<itemref idref="intro-page"/>\n`;
  ncxNavMap += `
    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>引言</text></navLabel>
      <content src="Text/intro.xhtml"/>
    </navPoint>\n`;
  playOrder++;

  outline.chapters.forEach((chap, idx) => {
    manifestItems += `<item id="chapter-${idx}" href="Text/chapter-${idx}.xhtml" media-type="application/xhtml+xml"/>\n`;
    spineRefs += `<itemref idref="chapter-${idx}"/>\n`;
    ncxNavMap += `
    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>第${idx + 1}章 ${escapeHTML(chap.title)}</text></navLabel>
      <content src="Text/chapter-${idx}.xhtml"/>
    </navPoint>\n`;
    playOrder++;
  });

  const contentOPF = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">
        <dc:title>${escapeHTML(outline.title)}</dc:title>
        <dc:creator>${escapeHTML(outline.author)}</dc:creator>
        <dc:language>zh-CN</dc:language>
        <dc:identifier id="pub-id">urn:isbn:${escapeHTML(outline.isbn)}</dc:identifier>
        <meta property="dcterms:modified">${new Date().toISOString().split('.')[0] + 'Z'}</meta>
        <meta name="cover" content="cover-image"/>
    </metadata>
    <manifest>
        ${manifestItems}
    </manifest>
    <spine toc="ncx">
        ${spineRefs}
    </spine>
</package>`;
  oebps.file("content.opf", contentOPF);

  const tocNCX = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:isbn:${escapeHTML(outline.isbn)}"/>
        <meta name="dtb:depth" content="2"/>
        <meta name="dtb:totalPageCount" content="0"/>
        <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle><text>${escapeHTML(outline.title)}</text></docTitle>
    <navMap>
        ${ncxNavMap}
    </navMap>
</ncx>`;
  oebps.file("toc.ncx", tocNCX);

  const navXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN">
<head><title>Navigation</title></head>
<body>
    <nav epub:type="toc">
        <h1>目录</h1>
        <ol>
            <li><a href="cover.xhtml">封面</a></li>
            <li><a href="toc.xhtml">详细目录</a></li>
            ${outline.recommendations ? '<li><a href="recommendations.xhtml">推荐序</a></li>' : ''}
            <li><a href="intro.xhtml">引言</a></li>
            ${outline.chapters.map((c, i) => `<li><a href="chapter-${i}.xhtml">第${i+1}章 ${escapeHTML(c.title)}</a></li>`).join('')}
        </ol>
    </nav>
</body>
</html>`;
  oebps.folder("Text")?.file("nav.xhtml", navXHTML);

  const wrapHTML = (title: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN">
<head>
    <title>${escapeHTML(title)}</title>
    <link href="../Styles/style.css" rel="stylesheet" type="text/css"/>
</head>
<body>
${body}
</body>
</html>`;

  const texts = oebps.folder("Text")!;

  texts.file("cover.xhtml", wrapHTML("封面", `<div class="text-center"><img src="../Images/cover.jpg" alt="Cover" class="cover-img"/></div>`));
  texts.file("title.xhtml", wrapHTML("扉页", `<div class="text-center my-12"><div class="title-main">${escapeHTML(outline.title)}</div><div class="title-sub">${escapeHTML(outline.subtitle || "")}</div><p class="my-12">作者：${escapeHTML(outline.author)}</p><p>${escapeHTML(outline.publisher)} 出版</p></div>`));
  texts.file("copyright.xhtml", wrapHTML("版权", `<div class="my-12"><p>出版发行：${escapeHTML(outline.publisher)}</p><p>版权所有 © ${new Date().getFullYear()} ${escapeHTML(outline.author)}。保留所有权利。</p><p>未经出版者事先书面许可，不得以任何方式复制、存储或传播本书的任何部分。</p><p>字数：约 ${wordCount.toLocaleString()} 字</p><p>ISBN: ${escapeHTML(outline.isbn)}</p><p>定价: ${escapeHTML(outline.price)}</p></div>`));
  
  let tocBody = `<h1 class="text-center">目录</h1><ul style="list-style: none; padding: 0;">`;
  if (outline.recommendations && outline.recommendations.length > 0) {
    tocBody += `<li style="margin-bottom: 0.5em;"><a href="recommendations.xhtml" style="text-decoration: none; color: #333;">推荐序</a></li>`;
  }
  tocBody += `<li style="margin-bottom: 0.5em;"><a href="intro.xhtml" style="text-decoration: none; color: #333;">引言</a></li>`;
  outline.chapters.forEach((chap, idx) => {
      tocBody += `<li style="margin-bottom: 0.5em;"><a href="chapter-${idx}.xhtml" style="text-decoration: none; color: #333;">第${idx + 1}章 ${escapeHTML(chap.title)}</a></li>`;
  });
  tocBody += `</ul>`;
  texts.file("toc.xhtml", wrapHTML("目录", tocBody));

  const renderMarkdown = (text: string) => {
      return text.split('\\n\\n').filter(p => p.trim()).map(p => {
          if (p.startsWith('#')) {
              const level = p.match(/^#+/)?.[0].length || 1;
              const clean = p.replace(/^#+\\s*/, '');
              const tag = `h${Math.min(level + 1, 6)}`;
              return `<${tag}>${escapeHTML(clean)}</${tag}>`;
          }
          let html = escapeHTML(p.trim());
          html = html.replace(/\\*\\*(.*?)\\*\\*/g, '<span class="font-bold">$1</span>');
          return `<p>${html}</p>`;
      }).join('\\n');
  };

  if (outline.recommendations && outline.recommendations.length > 0) {
    let recHtml = `<h1 class="text-center">推荐序</h1>`;
    outline.recommendations.forEach(rec => {
      recHtml += renderMarkdown(rec.content);
      recHtml += `<div class="text-right" style="margin-top: 2em; font-weight: bold;">${escapeHTML(rec.recommender)}</div>`;
      recHtml += `<div class="text-right" style="color: #666;">${escapeHTML(rec.recommenderTitle)}</div><br/>`;
    });
    texts.file("recommendations.xhtml", wrapHTML("推荐序", recHtml));
  }

  texts.file("intro.xhtml", wrapHTML("引言", `<h1 class="text-center">引言</h1>${renderMarkdown(outline.introduction)}`));

  outline.chapters.forEach((chap, idx) => {
      const contentStr = chaptersContent[idx] || "本章内容尚未生成。";
      const chapHTML = `<h1 class="text-center">第${idx+1}章 ${escapeHTML(chap.title)}</h1>${renderMarkdown(contentStr)}`;
      texts.file(`chapter-${idx}.xhtml`, wrapHTML(`第${idx+1}章`, chapHTML));
  });

  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
  saveAs(blob, `${outline.title}.epub`);
};

function escapeHTML(str: string) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
