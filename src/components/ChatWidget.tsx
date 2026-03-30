'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SendHorizontal, Maximize2, X, FileText, Download, Menu, MessageSquare, Loader2, History } from 'lucide-react';

interface Message {
  id: string;
  text?: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'table' | 'chart' | 'notification' | 'file';
  content?: any;
}

interface Session {
  session_id: string;
  title: string;
  timestamp: string;
}

const AsyncChart = ({ url, onExpand }: { url: string, onExpand: (html: string) => void }) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url || !url.startsWith('http')) return;
    fetch(url)
      .then(res => res.text())
      .then(html => {
        // Inject scaling logic
        const injectedCss = '<style>body,html{margin:0;padding:0;overflow:hidden;background:white;} .plotly-graph-div{transform-origin:top left !important;}</style>';
        const injectedJs = `<script>
          function resizePlotly() {
            var gd = document.querySelector('.plotly-graph-div');
            if (gd) {
              var targetW = gd.offsetWidth || 800;
              var targetH = gd.offsetHeight || 600;
              var scale = Math.min(window.innerWidth / targetW, window.innerHeight / targetH);
              gd.style.transform = 'scale(' + scale + ')';
              var marginLeft = (window.innerWidth - (targetW * scale)) / 2;
              var marginTop = (window.innerHeight - (targetH * scale)) / 2;
              gd.style.marginLeft = Math.max(0, marginLeft) + 'px';
              gd.style.marginTop = Math.max(0, marginTop) + 'px';
            }
          }
          window.addEventListener('load', function() {
            setTimeout(resizePlotly, 50);
            setTimeout(resizePlotly, 500);
          });
          window.addEventListener('resize', resizePlotly);
        </script>`;

        let finalHtml = html;
        if (html.includes('plotly-graph-div')) {
          finalHtml = html.replace('</head>', `${injectedCss}${injectedJs}</head>`);
        }
        setContent(finalHtml);
      })
      .catch(() => setError(true));
  }, [url]);

  if (error) return <div className="mt-2 text-xs text-red-400 bg-red-50 p-2 rounded-lg border border-red-100">Lỗi tải biểu đồ</div>;

  if (!content) return (
    <div className="mt-2 rounded-xl border border-slate-200 w-full h-[200px] bg-slate-50 flex flex-col items-center justify-center gap-3 shrink-0">
      <div className="h-5 w-5 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin"></div>
      <span className="text-[11px] text-slate-400 font-medium">Đang tải biểu đồ lịch sử...</span>
    </div>
  );

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 w-full bg-white relative group shrink-0 shadow-sm transition-all hover:shadow-md">
      <iframe
        srcDoc={content}
        title="chart"
        className="w-full h-[250px] border-0 pointer-events-none"
        sandbox="allow-scripts allow-same-origin"
        scrolling="no"
      />
      <div
        className="absolute inset-0 bg-blue-500/5 hover:bg-blue-500/10 transition-colors flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100"
        onClick={() => onExpand(content)}
      >
        <span className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg font-medium transform scale-95 group-hover:scale-100 transition-all">
          <Maximize2 className="w-3.5 h-3.5" />
          Phóng to
        </span>
      </div>
    </div>
  );
};

const API_URL = 'https://aiagent-9816974896.asia-southeast1.run.app';
const USER_ID = 'default_user';

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Bé Gạo 🍚 có thể giúp gì cho anh/chị?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [currentNotification, setCurrentNotification] = useState<string>('');
  const [recommendQuestions, setRecommendQuestions] = useState<string[]>([]);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paginationSkip, setPaginationSkip] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const PAGE_LIMIT = 20;

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/sessions/${USER_ID}`);
      const data = await response.json();
      const sessionsData = Array.isArray(data) ? data : (data.status === 'success' ? data.data : []);

      if (Array.isArray(sessionsData)) {
        const mapped = sessionsData.map((s: any) => ({
          session_id: s.session_id,
          title: s.title || 'Cuộc trò chuyện',
          timestamp: s.created_at || s.timestamp || new Date().toISOString()
        }));
        const sorted = mapped.sort((a: Session, b: Session) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setSessions(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  // Create session on component mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const response = await fetch(`${API_URL}/sessions/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: USER_ID }),
        });
        const data = await response.json();
        if (data.status === 'success') {
          setSessionId(data.data.session_id);
        }
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    };

    createSession();
    fetchSessions();
  }, []);

  const createNewSession = async () => {
    setIsLoadingHistory(true);
    setMessages([{ id: '1', text: 'Xin chào! Tôi là Bé Gạo 🍚 Mình có thể giúp gì cho bạn?', sender: 'bot', timestamp: new Date() }]);
    try {
      const response = await fetch(`${API_URL}/sessions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSessionId(data.data.session_id);
        setPaginationSkip(0);
        setHasMoreMessages(false);
        fetchSessions();
      }
    } catch (error) { }
    setIsLoadingHistory(false);
    setIsSidebarOpen(false);
  };

  const mapEventToMessage = (item: any, i: number): Message => {
    let msgText = item.content;
    if (item.type === 'table') msgText = '[Bảng dữ liệu]';
    else if (item.type === 'chart') msgText = '[Biểu đồ]';
    else if (item.type === 'file') {
      const mdMatch = typeof item.content === 'string' ? item.content.match(/\[(.+?)\]\((.+?)\)/) : null;
      if (mdMatch) { msgText = mdMatch[1]; item.content = mdMatch[2]; }
    } else if ((item.type === 'text' || item.type === 'final_response') && (item.role === 'bot' || item.role === 'agent')) {
      if (typeof item.content === 'string' && (item.content.startsWith('{') || item.content.startsWith("'"))) {
        try {
          let jsonStr = item.content.replace(/'/g, '"');
          const parsed = JSON.parse(jsonStr);
          msgText = parsed.response || item.content;
        } catch (e) { msgText = item.content; }
      } else if (typeof item.content === 'object' && item.content?.response) {
        msgText = item.content.response;
      }
    }

    let normalizedType = item.type;
    if (normalizedType === 'final_response') normalizedType = 'text';

    return {
      id: `history-${i}-${Date.now()}`,
      text: msgText,
      sender: (item.role === 'agent' ? 'bot' : (item.role || 'user')) as 'user' | 'bot',
      timestamp: item.created_at || item.timestamp ? new Date(item.created_at || item.timestamp) : new Date(),
      type: normalizedType || 'text',
      content: item.content
    };
  };

  const loadSession = async (sid: string) => {
    if (sid === sessionId) { setIsSidebarOpen(false); return; }
    setIsLoadingHistory(true);
    setSessionId(sid);
    setPaginationSkip(0);
    setHasMoreMessages(true);

    try {
      const response = await fetch(`${API_URL}/sessions/${USER_ID}/${sid}?skip=0&limit=${PAGE_LIMIT}`);
      const data = await response.json();
      const sessionData = data.status === 'success' ? data.data : (Array.isArray(data) ? data : []);

      if (Array.isArray(sessionData)) {
        const historyMessages: Message[] = sessionData.map((item: any, i: number) => mapEventToMessage(item, i));
        if (historyMessages.length > 0) {
          setMessages(historyMessages);
          setPaginationSkip(historyMessages.length);
          setHasMoreMessages(historyMessages.length >= PAGE_LIMIT);
        } else {
          setMessages([{ id: '1', text: 'Xin chào! Tôi là Bé Gạo 🍚 Mình có thể giúp gì cho bạn?', sender: 'bot', timestamp: new Date() }]);
          setHasMoreMessages(false);
        }
        setShouldScrollToBottom(true);
      }
    } catch (error) { console.error('Failed load session:', error); }
    setIsLoadingHistory(false);
    setIsSidebarOpen(false);
  };

  const loadMoreHistory = async () => {
    if (isLoadingMore || !hasMoreMessages) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(`${API_URL}/sessions/${USER_ID}/${sessionId}?skip=${paginationSkip}&limit=${PAGE_LIMIT}`);
      const data = await response.json();
      const sessionData = data.status === 'success' ? data.data : (Array.isArray(data) ? data : []);

      if (Array.isArray(sessionData) && sessionData.length > 0) {
        const olderMessages = sessionData.map((item: any, i: number) => mapEventToMessage(item, i + Date.now()));
        setMessages(prev => [...olderMessages, ...prev]);
        setPaginationSkip(prev => prev + olderMessages.length);
        setHasMoreMessages(olderMessages.length >= PAGE_LIMIT);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) { console.error('Failed to load more history:', error); }
    setIsLoadingMore(false);
  };

  // Manage scrolling manually
  useEffect(() => {
    if (shouldScrollToBottom && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      setShouldScrollToBottom(false);
    }
  }, [messages, shouldScrollToBottom]);

  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setRecommendQuestions([]);
    setIsLoading(true);
    setShouldScrollToBottom(true);
    await sendMessageToAPI(userInput);
  };

  const handleStreamEvent = (data: any) => {
    console.log('Stream event received:', data); // Debug log

    // Handle recommendation questions
    if (data.type === 'recommend_questions') {
      console.log('Recommend questions:', data.content);
      let questions: string[] = [];

      if (Array.isArray(data.content)) {
        questions = data.content;
      } else if (typeof data.content === 'object' && data.content) {
        // Handle case where content is object with recommend_next_questions key
        if (Array.isArray(data.content.recommend_next_questions)) {
          questions = data.content.recommend_next_questions;
        } else if (Array.isArray(data.content)) {
          questions = data.content;
        }
      } else if (typeof data.content === 'string') {
        try {
          // Try to parse as JSON
          let jsonStr = data.content.replace(/'/g, '"');
          const parsed = JSON.parse(jsonStr);
          questions = Array.isArray(parsed) ? parsed : (parsed.recommend_next_questions || []);
        } catch {
          questions = [data.content];
        }
      }

      console.log('Parsed questions:', questions);
      setRecommendQuestions(questions);
      return;
    }

    // Handle notification separately - only show temporary
    if (data.type === 'notification') {
      setCurrentNotification(data.content);
      return;
    }

    // Clear notification when receiving other message types
    setCurrentNotification('');

    const message: Message = {
      id: Date.now().toString() + Math.random(),
      sender: 'bot',
      timestamp: new Date(),
      type: data.type,
      content: data.content,
    };

    if (data.type === 'final_response') {
      // Content can be string or JSON object with 'response' key
      let responseText = '';

      console.log('Final response content type:', typeof data.content, data.content); // Debug

      if (typeof data.content === 'string') {
        try {
          // Handle Python dict literal with single quotes
          let jsonStr = data.content.replace(/'/g, '"');
          const parsed = JSON.parse(jsonStr);
          responseText = parsed.response || data.content;
        } catch (e) {
          console.error('Failed to parse response:', e);
          // If not JSON, use as is
          responseText = data.content;
        }
      } else if (typeof data.content === 'object' && data.content?.response) {
        // Direct object with response key
        responseText = data.content.response;
      }

      console.log('Extracted response text:', responseText); // Debug
      message.text = responseText;
    } else if (data.type === 'table') {
      message.text = '[Bảng dữ liệu]';
    } else if (data.type === 'chart') {
      message.text = '[Biểu đồ]';
      // Fetch the actual HTML from GCS, which prevents random downloads
      if (typeof data.content === 'string' && data.content.startsWith('http')) {
        fetch(data.content)
          .then(res => res.blob())
          .then(blob => blob.text())
          .then(html => {
            // Inject CSS and JS to force Plotly chart to scale proportionally like an image snapshot
            const injectedCss = '<style>body,html{margin:0;padding:0;overflow:hidden;background:white;} .plotly-graph-div{transform-origin:top left !important;}</style>';
            const injectedJs = `<script>
              function resizePlotly() {
                var gd = document.querySelector('.plotly-graph-div');
                if (gd) {
                  // Lấy kích thước nguyên gốc do backend cung cấp (ví dụ: 800x600)
                  var targetW = gd.offsetWidth || 800;
                  var targetH = gd.offsetHeight || 600;
                  
                  // Tính tỷ lệ cần thu nhỏ để vừa khít hoàn toàn vào Iframe
                  var scale = Math.min(window.innerWidth / targetW, window.innerHeight / targetH);
                  gd.style.transform = 'scale(' + scale + ')';
                  
                  // Canh giữa bức hình sau khi đã scale
                  var marginLeft = (window.innerWidth - (targetW * scale)) / 2;
                  var marginTop = (window.innerHeight - (targetH * scale)) / 2;
                  gd.style.marginLeft = Math.max(0, marginLeft) + 'px';
                  gd.style.marginTop = Math.max(0, marginTop) + 'px';
                }
              }
              window.addEventListener('load', function() {
                setTimeout(resizePlotly, 50);
                setTimeout(resizePlotly, 500);
              });
              window.addEventListener('resize', resizePlotly);
            </script>`;

            let styledHtml = html.replace('<head>', '<head>' + injectedCss);
            styledHtml = styledHtml.replace('</body>', injectedJs + '</body>');

            setMessages(prev =>
              prev.map(msg => msg.id === message.id ? { ...msg, content: styledHtml } : msg)
            );
          })
          .catch(err => console.error('Error fetching chart HTML:', err));
      }
    } else if (data.type === 'file') {
      // Parse markdown link [text](url)
      const mdMatch = typeof data.content === 'string' ? data.content.match(/\[(.+?)\]\((.+?)\)/) : null;
      if (mdMatch) {
        message.text = mdMatch[1]; // link text
        message.content = mdMatch[2]; // url
      } else {
        message.text = data.content;
      }
    }

    setShouldScrollToBottom(true);
    setMessages((prev) => [...prev, message]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRecommendClick = (question: string) => {
    setInput(question);
    // Auto-send the recommendation
    setTimeout(() => {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: question,
        sender: 'user',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setRecommendQuestions([]);
      setIsLoading(true);

      // Send to API
      sendMessageToAPI(question);
    }, 100);
  };

  const sendMessageToAPI = async (userInput: string) => {
    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          session_id: sessionId,
          message: userInput,
        }),
      });

      if (!response.body) {
        console.error('No response body');
        setIsLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              handleStreamEvent(data);
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }

        // Keep incomplete line in buffer
        buffer = lines[lines.length - 1];
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const transposeTableIfNeeded = (html: string): string => {
    if (typeof window === 'undefined') return html;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      if (!table) return html;

      const rows = Array.from(table.rows);
      if (rows.length === 0) return html;

      const firstRow = rows[0];
      const headers = Array.from(firstRow.querySelectorAll('th, td'));

      // Only transpose if it's a "Wide" horizontal table
      // Trigger: More than 5 columns OR only 1 data row (often a profile)
      const isWide = headers.length > 5;
      const isSingleRow = rows.length === 2; // header + 1 data row

      if (!isWide && !isSingleRow) return html;

      // Ensure we are not transposing a table that is already vertical
      // (a vertical table usually has 1 TH and N TDs per row)
      if (headers.length === 1 && rows.length > 1) return html;

      const columnNames = headers.map(h => h.innerHTML);
      const dataRows = rows.slice(1);

      let transposedHtml = '<table border="1">';
      for (let i = 0; i < columnNames.length; i++) {
        transposedHtml += '<tr>';
        // Original header becomes first column
        transposedHtml += `<th>${columnNames[i]}</th>`;
        // Each original row's value for this column becomes a subsequent cell in this new row
        for (let j = 0; j < dataRows.length; j++) {
          const cell = dataRows[j].cells[i];
          transposedHtml += `<td>${cell ? cell.innerHTML : ''}</td>`;
        }
        transposedHtml += '</tr>';
      }
      transposedHtml += '</table>';
      return transposedHtml;
    } catch (e) {
      console.error("Error transposing table:", e);
      return html;
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.type === 'table' && message.content) {
      const processedHtml = transposeTableIfNeeded(message.content);
      return (
        <div
          className="mt-2 bg-white p-2 rounded-xl text-xs overflow-x-auto border border-slate-200 shadow-sm"
          dangerouslySetInnerHTML={{
            __html: processedHtml
              .replace(/border="1"/g, '')
              .replace(/<table/g, '<table style="border-collapse: collapse; width: 100%; font-size: 11px; color: #1e293b;"')
              .replace(/<th/g, '<th style="border: 1px solid #e2e8f0; padding: 8px 10px; background-color: #f8fafc; text-align: left; font-weight: 600; color: #475569;"')
              .replace(/<td/g, '<td style="border: 1px solid #e2e8f0; padding: 8px 10px;"')
          }}
        />
      );
    }

    if (message.type === 'chart' && message.content) {
      if (message.content.includes('<html')) {
        return (
          <div className="mt-2 rounded-lg overflow-hidden border border-slate-600 w-full bg-white relative group shrink-0">
            <iframe
              srcDoc={message.content}
              title="chart"
              className="w-full h-[250px] border-0 pointer-events-none"
              sandbox="allow-scripts allow-same-origin"
              scrolling="no"
            />
            <div
              className="absolute inset-0 bg-blue-500/5 hover:bg-blue-500/10 transition-colors flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100"
              onClick={() => setExpandedChart(message.content)}
            >
              <span className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg font-medium transform scale-95 group-hover:scale-100 transition-all">
                <Maximize2 className="w-3.5 h-3.5" />
                Phóng to
              </span>
            </div>
          </div>
        );
      } else if (typeof message.content === 'string' && message.content.startsWith('http')) {
        return <AsyncChart url={message.content} onExpand={(html) => setExpandedChart(html)} />;
      }
    }

    if (message.type === 'file' && message.content) {
      let filename = message.text && message.text !== message.content ? message.text : 'Tệp đính kèm';

      // Attempt to extract real filename if it's just a raw URL
      if (filename === 'Tệp đính kèm' && typeof message.content === 'string') {
        const urlParts = message.content.split('/');
        const lastPart = urlParts[urlParts.length - 1].split('?')[0];
        if (lastPart && lastPart.includes('.')) {
          filename = lastPart;
        }
      }

      const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toUpperCase() : 'FILE';

      const isPdf = ext === 'PDF';
      const isExcel = ['XLSX', 'XLS', 'CSV'].includes(ext);
      const isWord = ['DOC', 'DOCX'].includes(ext);

      // Flowbite/Modern Template colors for standard file types
      const colorScheme = isPdf
        ? 'text-red-500 bg-red-50 border-red-200'
        : isExcel
          ? 'text-emerald-500 bg-emerald-50 border-emerald-200'
          : isWord
            ? 'text-blue-500 bg-blue-50 border-blue-200'
            : 'text-slate-500 bg-slate-50 border-slate-200';

      const cornerSplit = isPdf ? 'border-red-500/50' : isExcel ? 'border-emerald-500/50' : isWord ? 'border-blue-500/50' : 'border-slate-500/50';

      return (
        <div className="mt-2 w-full max-w-[280px]">
          <a
            href={message.content}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-all group no-underline shadow-sm"
          >
            {/* Classic Template Folded Document Icon */}
            <div className={`relative flex flex-col justify-center items-center w-11 h-14 rounded shadow-sm shrink-0 border ${colorScheme}`}>
              {/* Folded corner layer */}
              <div className={`absolute top-0 right-0 w-3.5 h-3.5 bg-slate-50 rounded-bl border-b border-l ${cornerSplit}`}></div>
              <span className="text-[10px] font-black tracking-tighter uppercase mt-2">{ext.slice(0, 4)}</span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors" title={filename}>
                {filename}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-slate-400 font-medium">Tài liệu {ext}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <span className="text-[11px] text-blue-400 font-medium group-hover:text-blue-300">Tải xuống</span>
              </div>
            </div>

            <div className="flex-shrink-0 text-slate-400 group-hover:text-blue-600 transition-colors bg-slate-50 group-hover:bg-blue-50 p-2 rounded-full cursor-pointer border border-slate-100">
              <Download className="w-4 h-4" />
            </div>
          </a>
        </div>
      );
    }

    return null;
  };

  return (
    // Fixed container at the bottom right.
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">

      {/* Chat Widget Card */}
      {isOpen && (
        <Card className="relative w-[340px] sm:w-[380px] p-0 gap-0 flex flex-col shadow-lg shadow-black/5 border border-slate-200 ring-0 bg-white rounded-2xl overflow-hidden pointer-events-auto origin-bottom-right animate-in zoom-in slide-in-from-bottom-2 duration-200" style={{ height: '600px', maxHeight: 'calc(100vh - 120px)' }}>

          {/* Sidebar Overlay */}
          {isSidebarOpen && (
            <div className="absolute inset-0 bg-black/60 z-30 cursor-pointer animate-in fade-in duration-200" onClick={() => setIsSidebarOpen(false)} />
          )}

          {/* Sidebar Drawer */}
          <div className={`absolute top-0 left-0 w-[280px] h-full bg-white z-40 border-r border-slate-100 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 invisible'}`}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-slate-800 font-semibold text-sm">Lịch sử trò chuyện</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors focus:outline-none">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 shrink-0">
              <button
                onClick={createNewSession}
                disabled={isLoadingHistory}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Đoạn chat mới
              </button>
            </div>
            <ScrollArea className="flex-1 min-h-0 px-3 pb-3">
              <div className="space-y-1.5 flex flex-col pb-4">
                {sessions.map((session) => (
                  <button
                    key={session.session_id}
                    onClick={() => loadSession(session.session_id)}
                    disabled={isLoadingHistory}
                    className={`w-full text-left p-2.5 rounded-lg flex flex-col gap-1 transition-colors ${sessionId === session.session_id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'} disabled:opacity-50`}
                  >
                    <span className="text-slate-700 text-sm font-medium truncate w-full">{session.title}</span>
                    <span className="text-slate-400 text-[10px]">{new Date(session.timestamp).toLocaleString()}</span>
                  </button>
                ))}
                {sessions.length === 0 && <p className="text-slate-500 text-xs text-center mt-4">Chưa có lịch sử</p>}
              </div>
            </ScrollArea>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-3 border-b border-cyan-500/20 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors focus:outline-none mr-1"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Avatar className="h-9 w-9 border-2 border-white/20 shadow-sm">
                <AvatarImage src="/be_gao_avt.jpg" alt="Bé Gạo" />
                <AvatarFallback className="bg-pink-400 text-xs text-white">🌸</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-sm font-bold text-white leading-tight">Bé Gạo 🍚</h1>
                <p className="text-[11px] text-blue-100/90 leading-tight mt-0.5">Trợ lý ảo nhân sự</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 px-4 py-3 min-h-0">
            <div className="space-y-3">
              {hasMoreMessages && paginationSkip >= PAGE_LIMIT && (
                <div className="flex justify-center pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadMoreHistory()}
                    disabled={isLoadingMore}
                    className="text-[11px] text-blue-500 hover:text-blue-600 hover:bg-blue-50 h-7 gap-1.5"
                  >
                    {isLoadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                    Xem tin nhắn cũ hơn
                  </Button>
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : ''
                    }`}
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage
                      src={
                        message.sender === 'user'
                          ? 'https://github.com/shadcn.png'
                          : '/be_gao_avt.jpg'
                      }
                      alt={message.sender}
                    />
                    <AvatarFallback className={message.sender === 'user' ? 'bg-blue-500 text-xs' : 'bg-pink-400 text-xs'}>
                      {message.sender === 'user' ? 'YOU' : '🌸'}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex-1 flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge
                        variant={
                          message.sender === 'user' ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {message.sender === 'user' ? 'You' : 'Bé Gạo'}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={`px-3 py-2 rounded-2xl w-fit max-w-[85%] break-words shadow-sm ${message.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200/50'
                        }`}
                    >
                      <p className="text-sm leading-relaxed">{message.text}</p>
                      {renderMessageContent(message)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src="/be_gao_avt.jpg" alt="Bé Gạo" />
                    <AvatarFallback className="bg-pink-400 text-xs">🌸</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100">
                      <div className="flex gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></div>
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce animation-delay-100"></div>
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce animation-delay-200"></div>
                      </div>
                    </div>
                    {currentNotification && (
                      <div className="px-3 py-1 rounded-lg bg-slate-50 text-slate-500 text-xs italic border border-slate-100/50">
                        {currentNotification}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Recommend Questions */}
          {recommendQuestions.length > 0 && (
            <div className="px-3 py-1 border-t border-slate-100 bg-slate-50/20">
              <p className="text-[11px] text-slate-500 font-medium mb-1 flex items-center gap-1">
                <span>💡</span> Gợi ý:
              </p>
              <div className="grid grid-cols-2 gap-1">
                {recommendQuestions.map((question, index) => (
                  <button
                    key={index}
                    title={question}
                    onClick={() => handleRecommendClick(question)}
                    className="text-left px-2 py-0.5 rounded-lg text-[11px] text-slate-700 bg-white hover:bg-blue-50 transition-all border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow truncate"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-slate-100 bg-white px-3 py-3 rounded-b-none sm:rounded-b-lg">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400 text-sm h-10"
                disabled={isLoading || !sessionId}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading || !sessionId}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-3 h-9"
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full shadow-lg shadow-slate-200/60 border-2 border-white bg-white hover:scale-105 transition-all overflow-hidden flex items-center justify-center pointer-events-auto shrink-0 relative group focus:outline-none"
      >
        {isOpen ? (
          <X className="text-slate-600 group-hover:text-blue-600 w-6 h-6 transition-colors" />
        ) : (
          <img src="/be_gao_avt.jpg" alt="Chat with us" className="w-full h-full object-cover" />
        )}
      </button>

      {/* Fullscreen Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="relative w-full h-full max-w-5xl max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-700 pointer-events-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shadow-sm z-10">
              <h3 className="font-semibold text-slate-800 text-sm">Biểu đồ chi tiết</h3>
              <button
                className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-500 hover:text-slate-800 focus:outline-none"
                onClick={() => setExpandedChart(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 w-full bg-slate-100 relative">
              {/* Added CSS for fullscreen chart to look big and readable */}
              <iframe
                srcDoc={expandedChart.replace('height:100vh', 'height:100%').replace('width:100vw', 'width:100%')}
                title="expanded chart"
                className="absolute inset-0 w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </div>
          {/* Overlay click to close */}
          <div className="absolute inset-0 -z-10" onClick={() => setExpandedChart(null)}></div>
        </div>
      )}
    </div>
  );
}
