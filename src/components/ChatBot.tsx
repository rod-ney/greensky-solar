"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Leaf } from "lucide-react";

const GREETING = "Hi! I'm the GreenSky Solar assistant. How can I help you today?";
const DEFAULT_RESPONSE =
  "Thanks for reaching out. For specific inquiries, please call us or book a free site inspection. Would you like me to help you find the booking page?";

const QUICK_REPLIES = [
  "Pricing & packages",
  "Book a site inspection",
  "Solar installation process",
  "Warranty & support",
];

const KEYWORD_RESPONSES: Record<string, string> = {
  price: "Our grid-tie packages start at ₱137,000 (3.4KW). Hybrid systems vary by battery size. Check our Prices page for full details!",
  pricing: "Our grid-tie packages start at ₱137,000 (3.4KW). Hybrid systems vary by battery size. Check our Prices page for full details!",
  cost: "Our grid-tie packages start at ₱137,000 (3.4KW). Hybrid systems vary by battery size. Check our Prices page for full details!",
  book: "You can book a free site inspection through our client portal. I'll link you there!",
  booking: "You can book a free site inspection through our client portal. I'll link you there!",
  inspection: "We offer complimentary site inspections to assess your property's solar potential. Book yours today!",
  install: "Our process: 1) Free site inspection, 2) Custom quote, 3) Installation, 4) Commissioning. We handle permits and paperwork.",
  installation: "Our process: 1) Free site inspection, 2) Custom quote, 3) Installation, 4) Commissioning. We handle permits and paperwork.",
  warranty: "We offer industry-leading warranties on all installations plus dedicated after-sales support. Your investment is protected.",
  support: "We provide ongoing maintenance and rapid repair services. Contact us anytime for system health checks.",
  solar: "GreenSky Solar has been helping Filipinos go solar since 2012. We offer site inspection, installation, commissioning, and maintenance.",
  hi: "Hello! How can I help you today?",
  hello: "Hello! How can I help you today?",
  thanks: "You're welcome! Is there anything else you'd like to know?",
  thank: "You're welcome! Is there anything else you'd like to know?",
};

function getBotResponse(input: string): string {
  const normalized = input.toLowerCase().trim();
  for (const [keyword, response] of Object.entries(KEYWORD_RESPONSES)) {
    if (normalized.includes(keyword)) return response;
  }
  return DEFAULT_RESPONSE;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: "0", text: GREETING, isUser: false, timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const botText = getBotResponse(text);
      const botMsg: Message = {
        id: crypto.randomUUID(),
        text: botText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 500);
  };

  const handleQuickReply = (reply: string) => {
    setInput(reply);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Leaf className="h-5 w-5" />
              </div>
              <div>   
                <p className="font-semibold">Sunny</p>
                <p className="text-xs text-white/90">Online Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 hover:bg-white/20 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="h-72 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.isUser
                      ? "bg-brand text-white rounded-br-md"
                      : "bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="border-t border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-medium text-slate-500 mb-2">Quick options:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-brand-50 hover:border-brand/30 hover:text-brand transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 border-t border-slate-200 bg-white p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your question..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button
              onClick={handleSend}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-dark transition-colors"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark hover:scale-105 transition-all"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
