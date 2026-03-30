# Chat Widget Project Instructions

## Project Overview
This is a modern chat widget application built with Next.js, shadcn/ui, and Tailwind CSS. The project includes a fully functional chat interface with message history, user avatars, and a responsive design.

## Technology Stack
- **Frontend Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

## Project Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (renders ChatWidget)
│   └── globals.css         # Global Tailwind styles
├── components/
│   ├── ChatWidget.tsx      # Main chat widget component
│   └── ui/                 # shadcn/ui components
└── lib/
    └── utils.ts            # Utility functions
```

## Development Guidelines

### Running the Project
```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Adding New Components
To add new shadcn/ui components:
```bash
npx shadcn@latest add [component-name]
```

Available components: button, input, textarea, card, avatar, badge, scroll-area, dialog, dropdown-menu, form, etc.

### Customizing the Chat Widget
Edit `src/components/ChatWidget.tsx` to:
- Modify the color scheme (currently blue-cyan gradient theme)
- Add new message types or features
- Integrate with backend APIs
- Change animations and transitions

### Key Features
1. **Message Display**: Uses ScrollArea component for smooth scrolling
2. **User/Bot Distinction**: Different styling for user vs bot messages
3. **Auto-scroll**: Automatically scrolls to latest message
4. **Loading State**: Shows typing indicator during bot response
5. **Responsive Design**: Works on desktop and mobile devices

### API Integration
The app currently simulates bot responses. To integrate with a real API:

1. Modify the `handleSendMessage` function in ChatWidget.tsx
2. Replace the setTimeout with actual API call:
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: input }),
});
```

## Styling Notes
- Dark theme with gradient accents (blue to cyan)
- Uses Tailwind CSS utility classes
- Responsive breakpoints: sm, md, lg, xl
- Custom animations for loading indicator

## Common Tasks

### Change Primary Colors
Update the color classes in `ChatWidget.tsx` gradient sections:
- Search for `from-blue-600 to-cyan-600`
- Replace with desired gradient colors

### Modify Message Styling
The message bubbles are styled with:
- User messages: `bg-blue-600 text-white`
- Bot messages: `bg-slate-700 text-slate-100`

### Add More UI Components
```bash
npx shadcn@latest add [component] &&  npm run dev
```

## Notes for Future Development
- The component uses React hooks (useState, useRef, useEffect)
- All dependencies are already installed
- Tailwind CSS v4 PostCSS is configured
- TypeScript strict mode is enabled

## Related Files
- Configuration: `tailwind.config.ts`, `components.json`, `tsconfig.json`
- Globals: `src/app/globals.css`
- Package info: `package.json`
