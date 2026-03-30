# API Guide – AI HR Agent

Tài liệu hướng dẫn tích hợp **AI HR Agent API** cho Frontend.  
Server sử dụng **Server-Sent Events (SSE)** cho chat streaming.

**Base URL**: `https://aiagent-9816974896.asia-southeast1.run.app`

---

## 1. Health Check

- **Endpoint**: `GET /`
- **Response**:
  ```json
  { "status": "ok", "message": "HR Agent is running" }
  ```

---

## 2. Tạo Session mới

Bắt buộc tạo session trước khi chat. Mỗi session lưu ngữ cảnh hội thoại riêng biệt.

- **Endpoint**: `POST /sessions/`
- **Request Body**:
  ```json
  {
    "user_id": "sa"
  }
  ```
- **Response thành công**:
  ```json
  {
    "status": "success",
    "data": { "session_id": "6953106475136843776" },
    "message": null
  }
  ```
- **Response lỗi** (user không tồn tại):
  ```json
  {
    "status": "error",
    "data": null,
    "message": "User xyz không tồn tại"
  }
  ```

**CURL**:
```bash
curl -X POST https://aiagent-9816974896.asia-southeast1.run.app/sessions/ \
  -H "Content-Type: application/json" \
  -d '{"user_id": "sa"}'
```

---

## 3. Danh sách Session (Lịch sử chat)

Lấy tối đa 10 session gần nhất của user, dùng để hiển thị sidebar lịch sử chat.

- **Endpoint**: `GET /sessions/{user_id}`
- **Response**: Mảng `SessionHistoryItem[]`
  ```json
  [
    {
      "session_id": "4890444651661623296",
      "title": "công ty có bao nhiêu người",
      "created_at": null
    },
    {
      "session_id": "3128129822476206080",
      "title": "vẽ biểu đồ tỉ lệ số lượng nhân viên mỗi phòng...",
      "created_at": null
    }
  ]
  ```

> **Lưu ý**: `title` được trích xuất tự động từ câu hỏi đầu tiên của user trong session (tối đa 50 ký tự). Nếu session chưa có tin nhắn, title sẽ là `"Cuộc trò chuyện mới"`.

**CURL**:
```bash
curl -X GET https://aiagent-9816974896.asia-southeast1.run.app/sessions/sa
```

---

## 4. Chi tiết lịch sử 1 Session

Lấy toàn bộ tin nhắn qua lại trong 1 session — dùng khi user mở lại session cũ để xem lại hoặc chat tiếp.

- **Endpoint**: `GET /sessions/{user_id}/{session_id}`
- **Response**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "role": "user",
        "type": "text",
        "format": "text",
        "content": "công ty có bao nhiêu người"
      },
      {
        "role": "agent",
        "type": "table",
        "format": "html",
        "content": "<table border=\"1\"><tr><th>Tổng số nhân sự</th></tr><tr><td>385</td></tr></table>"
      },
      {
        "role": "agent",
        "type": "final_response",
        "format": "json",
        "content": "{'response': 'Công ty mình có 385 nhân sự nha anh/chị. 😉'}"
      },
      {
        "role": "user",
        "type": "text",
        "format": "text",
        "content": "xuất danh sách ra file excel cho tôi"
      },
      {
        "role": "agent",
        "type": "file",
        "format": "markdown",
        "content": "[Download file](https://storage.googleapis.com/...report.xlsx?...)"
      },
      {
        "role": "agent",
        "type": "final_response",
        "format": "json",
        "content": "{'response': 'Em đã xuất file Excel rồi nha anh/chị. Anh/chị tải về xem nhé! 😉'}"
      }
    ]
  }
  ```

> **Các loại item** trong mảng `data`:

| role | type | format | content | Cách render |
|:---|:---|:---|:---|:---|
| `user` | `text` | `text` | Tin nhắn user | Hiển thị như chat bubble bên phải |
| `agent` | `table` | `html` | HTML table string | Render bằng `innerHTML` hoặc `dangerouslySetInnerHTML` |
| `agent` | `chart` | `url` | GCS signed URL (.html) | Nhúng `<iframe src="url">` hoặc mở tab mới |
| `agent` | `file` | `markdown` | Markdown link `[Download](url)` | Parse link, hiển thị nút download |
| `agent` | `final_response` | `json` | `{'response': '...'}` | Parse JSON, lấy field `response` hiển thị như chat bubble bên trái |

**CURL**:
```bash
curl -X GET https://aiagent-9816974896.asia-southeast1.run.app/sessions/sa/6953106475136843776
```

---

## 5. Chat Stream (SSE)

Gửi câu hỏi và nhận phản hồi real-time qua **Server-Sent Events**.

- **Endpoint**: `POST /chat/stream`
- **Response Type**: `text/event-stream`

### Request Body

Có 2 chế độ xác thực:

**Chế độ 1: Default User** (không cần password)
```json
{
  "user_id": "default_user",
  "session_id": "6953106475136843776",
  "message": "công ty có bao nhiêu người?"
}
```

**Chế độ 2: User thường** (bắt buộc password)
```json
{
  "user_id": "sa",
  "session_id": "6953106475136843776",
  "message": "công ty có bao nhiêu người?",
  "password": "your_password_here"
}
```

### SSE Event Format

Mỗi event là 1 dòng bắt đầu bằng `data: ` chứa JSON:

```
data: {"type": "notification", "format": "text", "content": "Đang xử lý..."}

data: {"type": "table", "format": "html", "content": "<table>...</table>"}

data: {"type": "final_response", "format": "json", "content": {"response": "Câu trả lời..."}}

data: {"type": "recommend_questions", "format": "json", "content": {"recommend_next_questions": ["Câu 1?", "Câu 2?", "Câu 3?"]}}
```

### Bảng Event Types

| type | format | content | Thứ tự | Mô tả |
|:---|:---|:---|:---|:---|
| `notification` | `text` | String | Đầu tiên, xen giữa | Trạng thái xử lý: `"Đang xử lý..."`, `"Đang tìm kiếm..."`, `"Đang tổng hợp..."` |
| `table` | `html` | HTML string | Sau khi query xong | Bảng kết quả SQL |
| `chart` | `url` | URL string | Sau table (nếu có) | URL biểu đồ HTML trên GCS |
| `file` | `markdown` | Markdown link | Sau khi export xong | Link download file PDF/Excel |
| `final_response` | `json` | `{"response": "..."}` | Gần cuối | Câu trả lời chính của agent |
| `recommend_questions` | `json` | `{"recommend_next_questions": [...]}` | **Luôn cuối cùng** | 3 câu hỏi gợi ý tiếp theo |

### Ví dụ luồng SSE hoàn chỉnh

User hỏi: *"Cho tôi danh sách nhân viên phòng IT và xuất ra Excel"*

```
data: {"type":"notification","format":"text","content":"Đang xử lý..."}

data: {"type":"notification","format":"text","content":"Đang tìm kiếm..."}

data: {"type":"table","format":"html","content":"<table border=\"1\"><tr><th>Tên</th><th>Phòng ban</th></tr><tr><td>Nguyễn Văn A</td><td>IT</td></tr></table>"}

data: {"type":"notification","format":"text","content":"Đang tổng hợp..."}

data: {"type":"file","format":"markdown","content":"[Download file](https://storage.googleapis.com/.../report.xlsx?...)"}

data: {"type":"final_response","format":"json","content":{"response":"Dạ, phòng IT có 15 nhân viên nha anh/chị. Em đã xuất file Excel rồi, anh/chị tải về xem nhé! 😉"}}

data: {"type":"recommend_questions","format":"json","content":{"recommend_next_questions":["Ai là trưởng phòng IT?","Phòng IT có bao nhiêu người mới?","Lương trung bình phòng IT?"]}}
```

### Frontend JavaScript Example

```javascript
const response = await fetch('/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'default_user',
    session_id: sessionId,
    message: userMessage
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split('\n');

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = JSON.parse(line.slice(6));

    switch (data.type) {
      case 'notification':
        showLoadingStatus(data.content);
        break;
      case 'table':
        renderTable(data.content); // innerHTML
        break;
      case 'chart':
        renderChart(data.content); // iframe src
        break;
      case 'file':
        renderDownloadLink(data.content); // parse markdown link
        break;
      case 'final_response':
        const reply = typeof data.content === 'object'
          ? data.content.response
          : data.content;
        showAgentMessage(reply);
        break;
      case 'recommend_questions':
        const questions = typeof data.content === 'object'
          ? data.content.recommend_next_questions
          : [];
        showSuggestions(questions);
        break;
    }
  }
}
```

**CURL**:
```bash
curl -N -X POST https://aiagent-9816974896.asia-southeast1.run.app/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "default_user",
    "session_id": "YOUR_SESSION_ID",
    "message": "Tổng số nhân viên công ty"
  }'
```

---

## 6. Error Responses

Các API đều trả lỗi theo format thống nhất:

```json
{
  "status": "error",
  "message": "Mô tả lỗi",
  "data": null
}
```

| Trường hợp | message |
|:---|:---|
| Thiếu field (default_user) | `"Missing info: session_id or message"` |
| Thiếu field (user thường) | `"Missing info: user_id or session_id or message or password"` |
| User không tồn tại | `"User xyz không tồn tại"` |
| Session không tìm thấy | `"Session not found"` |
| Lỗi hệ thống (SSE) | Event: `{"type": "notification", "content": "Lỗi hệ thống."}` |

---

## 7. Lưu ý quan trọng cho Frontend

1. **Thứ tự event SSE cố định**: `notification` → `table`/`chart`/`file` → `final_response` → `recommend_questions`
2. **`recommend_questions` luôn là event cuối cùng** — dùng để biết stream đã kết thúc
3. **`final_response` content** có thể là JSON object hoặc text string — luôn check `typeof` trước khi parse
4. **`table` content** là raw HTML — cần render bằng `innerHTML`, nên wrap trong container có overflow-x scroll
5. **`chart` URL** là signed URL có thời hạn (7 ngày) — nhúng bằng `<iframe>` để hiển thị chart HTML tương tác
6. **`file` content** là markdown link dạng `[Download file](url)` — parse regex `\[(.+?)\]\((.+?)\)` để lấy URL
7. **Session cần tạo trước khi chat** — nếu gọi `/chat/stream` với `session_id` không tồn tại sẽ lỗi
