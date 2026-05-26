import localforage from "localforage";

export interface BookRecord {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  topic: string;
  genre: string;
  wordCount: number;
  writingStyle: string;
  detailedRequirements: string;
  outline: any;
  chaptersContent: Record<string, string>;
  completedChapters: string[];
  modelUsed: string;
  virtualModel?: string;
  updatedAt: string;
}

const booksStore = localforage.createInstance({
  name: "InstaBook",
  storeName: "books" // Should be alphanumeric, with underscores.
});

// Helper for HTTP timeout to make sure call is fast and non-blocking
async function fetchWithTimeout(resource: string, options: any = {}, timeout = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function getBooks(page?: number, limit?: number): Promise<{ results: Partial<BookRecord>[]; total: number }> {
  // First, always check if the server-side API is available and works
  try {
    const url = page && limit ? `/api/books?page=${page}&limit=${limit}` : "/api/books";
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) {
        return {
          results: data.results,
          total: data.total
        };
      } else if (Array.isArray(data)) {
        if (page && limit) {
          const startIndex = (page - 1) * limit;
          return {
            results: data.slice(startIndex, startIndex + limit),
            total: data.length
          };
        }
        return {
          results: data,
          total: data.length
        };
      }
    }
  } catch (err) {
    console.warn("Backend server not responding, falling back to local storage:", err);
  }

  // Fallback to local store (IndexedDB)
  const books: any[] = [];
  await booksStore.iterate((value: any) => {
    books.push(value);
  });
  
  // Sort by updatedAt DESC
  books.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  
  const mapped = books.map(b => ({
    id: b.id,
    title: b.title || b.topic || "未命名书目",
    subtitle: b.subtitle || "",
    author: b.author || "佚名",
    topic: b.topic || "",
    genre: b.genre || "",
    wordCount: b.wordCount || 2000,
    chapterCount: b.outline?.chapters?.length || 0,
    completedCount: b.completedChapters?.length || 0,
    modelUsed: b.modelUsed || "未知模型",
    updatedAt: b.updatedAt || new Date().toISOString()
  }));

  if (page && limit) {
    const startIndex = (page - 1) * limit;
    return {
      results: mapped.slice(startIndex, startIndex + limit),
      total: mapped.length
    };
  }

  return {
    results: mapped,
    total: mapped.length
  };
}

export async function getBook(id: string): Promise<BookRecord | null> {
  // First, try from the server-side database
  try {
    const res = await fetchWithTimeout(`/api/books/${id}`);
    if (res.ok) {
      const serverBook = await res.json();
      if (serverBook && !serverBook.error) {
        // Cache to local storage
        await booksStore.setItem(id, serverBook);
        return serverBook;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch book ${id} from server, trying local cache:`, err);
  }

  // Fallback to local IndexedDB
  const book = await booksStore.getItem<BookRecord>(id);
  return book;
}

export async function saveBook(book: Partial<BookRecord>): Promise<BookRecord> {
  if (!book.id) throw new Error("缺少书籍ID");
  
  const existing = await getBook(book.id);
  
  const bookData: BookRecord = {
    id: book.id,
    title: book.title || book.outline?.title || book.topic || existing?.title || "未名书目",
    subtitle: book.subtitle || book.outline?.subtitle || existing?.subtitle || "",
    author: book.author || book.outline?.author || existing?.author || "佚名",
    topic: book.topic || existing?.topic || "",
    genre: book.genre || existing?.genre || "",
    wordCount: Number(book.wordCount) || existing?.wordCount || 2000,
    writingStyle: book.writingStyle || existing?.writingStyle || "",
    detailedRequirements: book.detailedRequirements || existing?.detailedRequirements || "",
    outline: book.outline || existing?.outline || null,
    chaptersContent: book.chaptersContent || existing?.chaptersContent || {},
    completedChapters: book.completedChapters || existing?.completedChapters || [],
    modelUsed: book.modelUsed || existing?.modelUsed || "deepseek-v4-pro",
    virtualModel: book.virtualModel || existing?.virtualModel,
    updatedAt: new Date().toISOString()
  };

  // 1. Save to local IndexedDB (guarantees persistence in browser)
  await booksStore.setItem(book.id, bookData);

  // 2. Try to sync to the server database
  try {
    await fetchWithTimeout("/api/books", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bookData)
    });
  } catch (err) {
    console.error("Failed to sync book with backend server:", err);
  }

  return bookData;
}

export async function deleteBook(id: string): Promise<void> {
  // 1. Delete from local IndexedDB
  await booksStore.removeItem(id);

  // 2. Try to sync deletion to server database
  try {
    await fetchWithTimeout(`/api/books/${id}`, {
      method: "DELETE"
    });
  } catch (err) {
    console.error(`Failed to sync deletion of book ${id} with server:`, err);
  }
}
