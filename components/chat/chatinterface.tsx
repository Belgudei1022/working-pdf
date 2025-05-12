"use client";

import { useState, useEffect, useRef } from "react";
import MessageItem from "./chatitems";
import ChatInput from "./chatinput";
import { Message } from "../../lib/types";
import Nav from "../upload/nav";

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isNewMessage, setIsNewMessage] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("selectedLanguage");
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
    }

    const initialMessage = localStorage.getItem("initialMessage");
    if (initialMessage) {
      const newMessage: Message = { role: "user", content: initialMessage };
      setMessages((prev) => [...prev, newMessage]);
      localStorage.removeItem("initialMessage");
      handleSendMessage(initialMessage);
    }

    // Add background effects with reduced density for mobile
    const createStars = () => {
      const starsContainer = document.createElement("div");
      starsContainer.className = "stars-container";
      document.body.appendChild(starsContainer);

      // Reduce number of stars on smaller screens
      const starCount = window.innerWidth < 640 ? 50 : 100;
      for (let i = 0; i < starCount; i++) {
        const star = document.createElement("div");
        star.className = "star";
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 10}s`;
        star.style.animationDuration = `${3 + Math.random() * 7}s`;
        starsContainer.appendChild(star);
      }
    };

    createStars();

    return () => {
      const starsContainer = document.querySelector(".stars-container");
      if (starsContainer) {
        document.body.removeChild(starsContainer);
      }
    };
  }, []);

  useEffect(() => {
    if (isNearBottom) scrollToBottom();
    if (messages.length > 0) {
      setIsNewMessage(true);
      setTimeout(() => setIsNewMessage(false), 500);
    }
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      setIsNearBottom(scrollHeight - scrollTop - clientHeight < 150);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const newMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);
    setIsNearBottom(true);

    try {
      const pdfText = localStorage.getItem("pdfText");
      const documentTitle = localStorage.getItem("documentTitle");

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization:
            "Bearer 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",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "microsoft/phi-4-reasoning-plus:free",
          messages: [
            {
              role: "system",
              content: pdfText
                ? selectedLanguage === "mn"
                  ? `Та "${documentTitle}" баримт бичгийг шинжилж байна. Энэ бол агуулга:\n\n${pdfText}\n\nЭнэ агуулгад үндэслэн дэлгэрэнгүй, үнэн зөв хариулт өгнө үү. Хэрэглэгч баримт бичгийн талаар асуувал, энэ агуулгыг ашиглан хариулна уу.`
                  : `You are analyzing a document titled "${documentTitle}". Here is the content:\n\n${pdfText}\n\nPlease provide detailed and accurate responses based on this content. If the user asks about the document, use this content to answer their questions.`
                : selectedLanguage === "mn"
                ? "Та тусламж үзүүлэх AI ассистент юм. Дэлгэрэнгүй, үнэн зөв хариулт өгнө үү."
                : "You are a helpful AI assistant. Please provide detailed and accurate responses.",
            },
            ...messages,
            newMessage,
          ].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `API request failed with status ${res.status}`
        );
      }

      const data = await res.json();
      if (!data || typeof data !== "object") {
        throw new Error("Invalid API response: response is not an object");
      }

      if (!data.choices) {
        throw new Error("Invalid API response: missing choices field");
      }

      if (!Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error(
          "Invalid API response: choices must be a non-empty array"
        );
      }

      const firstChoice = data.choices[0];
      if (!firstChoice || typeof firstChoice !== "object") {
        throw new Error("Invalid API response: first choice is not an object");
      }

      const message = firstChoice.message;
      if (!message || typeof message !== "object") {
        throw new Error("Invalid API response: message is not an object");
      }

      if (!message.content || typeof message.content !== "string") {
        throw new Error(
          "Invalid API response: message content is not a string"
        );
      }

      const reply = message.content;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      console.error("Chat API Error:", error);
      const errorMessage =
        selectedLanguage === "mn"
          ? "Уучлаарай, хариулт өгөх боломжгүй байна. Дахин оролдоно уу."
          : "Sorry, I couldn't process that. Please try again.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const createFloatingEmoji = () => {
    if (!isNewMessage) return null;

    const emojis = ["✨", "💫", "🔮", "💭", "💬"];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    // Reduce number of emojis on mobile
    const emojiCount = window.innerWidth < 640 ? 3 : 5;

    return (
      <div className="fixed z-50 pointer-events-none">
        {[...Array(emojiCount)].map((_, i) => (
          <div
            key={i}
            className="floating-emoji absolute text-lg sm:text-xl opacity-0"
            style={{
              left: `${40 + Math.random() * 20}%`,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            {randomEmoji}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 text-white relative bg-gradient-to-b from-gray-900 to-black">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      {/* Floating emojis */}
      {createFloatingEmoji()}

      <div className="w-full max-w-[90vw] sm:max-w-3xl lg:max-w-5xl mx-auto relative z-10 flex flex-col">
        <Nav />

        <div className="flex flex-col border border-blue-900/30 bg-black/30 rounded-lg shadow-xl backdrop-blur-sm h-[70vh] sm:h-[80vh] max-h-[90vh] overflow-hidden transition-all duration-300 hover:shadow-blue-900/20 hover:shadow-2xl">
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 border-b border-blue-800/30 scrollbar-thin scrollbar-thumb-blue-800 scrollbar-track-transparent"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="mb-4 text-blue-400 opacity-75">
                  <svg
                    className="w-12 h-12 sm:w-16 sm:h-16 animate-pulse"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-base sm:text-lg">
                  {selectedLanguage === "mn"
                    ? "Харилцаа эхлээгүй байна. Яриа эхлүүлнэ үү!"
                    : "No messages yet. Start a conversation!"}
                </p>
                <p className="text-xs sm:text-sm mt-2 max-w-xs sm:max-w-md text-center text-gray-500">
                  {selectedLanguage === "mn"
                    ? "Асуултаа доор бичээд илгээнэ үү."
                    : "Type your message below to begin chatting."}
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <MessageItem key={index} message={message} />
              ))
            )}

            {isLoading && (
              <div className="flex justify-start py-4 ml-6 sm:ml-10">
                <div className="typing-indicator px-3 sm:px-4 py-2 rounded-2xl bg-gray-800/80 shadow-lg">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {!isNearBottom && messages.length > 0 && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-16 sm:bottom-20 right-4 sm:right-6 bg-blue-600 text-white rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shadow-lg animate-bounce"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>
          )}

          <div className="p-3 sm:p-4 bg-gray-900/50">
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}