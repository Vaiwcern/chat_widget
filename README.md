# Chat Widget - shadcn/ui + Tailwind CSS

Một ứng dụng chat widget hiện đại được xây dựng với **Next.js**, **shadcn/ui** và **Tailwind CSS**.

## 🎯 Tính năng

- 💬 Giao diện chat đẹp mắt với theme tối
- 📱 Responsive design - hoạt động trên mọi thiết bị
- ✨ Hiệu ứng động mượt mà
- 🎨 Được thiết kế với shadcn/ui components
- ⌨️ Hỗ trợ gửi tin nhắn bằng Enter
- 🤖 Giả lập phản hồi từ bot (có thể kết nối với API thực)

## 🚀 Bắt đầu

### Cài đặt

```bash
npm install
```

### Chạy ứng dụng

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt.

### Build cho production

```bash
npm run build
npm start
```

## 📁 Cấu trúc dự án

```
chat_widget/
├── src/
│   ├── app/
│   │   ├── globals.css       # Tailwind CSS globals
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Trang chính
│   ├── components/
│   │   ├── ChatWidget.tsx    # Component chat chính
│   │   └── ui/               # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       └── scroll-area.tsx
│   └── lib/
│       └── utils.ts          # Utility functions
├── components.json           # shadcn/ui config
├── tailwind.config.ts        # Tailwind CSS config
└── package.json
```

## 🛠️ Công nghệ sử dụng

- **Next.js 15** - React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first CSS
- **shadcn/ui** - Reusable React components
- **Lucide React** - Icon library

## 🎨 Tùy chỉnh

### Thêm components từ shadcn/ui

```bash
npx shadcn@latest add [component-name]
```

### Sửa đổi giao diện

Chỉnh sửa file `src/components/ChatWidget.tsx` để tùy chỉnh màu sắc, layout, và hành vi.

## 🔌 Kết nối với API

Sửa đổi hàm `handleSendMessage` trong `ChatWidget.tsx` để kết nối với API thực tế.

## 📚 Tài liệu

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
