'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, CheckCircle2, Bot, Sparkles, FileDown } from "lucide-react";
import type { CerfaData, FieldSource } from "./types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  data: CerfaData;
  onFillFields: (data: Partial<CerfaData>, sources: Partial<Record<keyof CerfaData, FieldSource>>) => void;
  onSave?: () => void;
}

export function ProjectChat({ data, onFillFields, onSave }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const callChat = useCallback(async (msgs: Message[], currentData: CerfaData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/cerfa/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: currentData, messages: msgs }),
      });
      const json = await res.json();

      const assistantMsg: Message = { role: "assistant", content: json.message };
      setMessages((prev) => [...prev, assistantMsg]);

      if (json.fieldsToFill?.length) {
        const newData: Partial<CerfaData> = {};
        const newSources: Partial<Record<keyof CerfaData, FieldSource>> = {};
        for (const { key, value } of json.fieldsToFill) {
          if (key && value) {
            (newData as Record<string, string>)[key] = value;
            (newSources as Record<string, FieldSource>)[key] = "document";
          }
        }
        onFillFields(newData, newSources);
      }

      if (json.isDone) setIsDone(true);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Désolé, une erreur s'est produite. Réessayez." }]);
    } finally {
      setLoading(false);
    }
  }, [onFillFields]);

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      callChat([], data);
    }
  }, [initialized, data, callChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading || isDone) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);

    await callChat(updated, data);
    inputRef.current?.focus();
  };

  return (
    <div>
      {/* Messages */}
      <div className="h-[340px] overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && loading && (
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Loader2 size={15} className="animate-spin text-[#316BF2]" />
            <span className="text-[13px]">L&apos;assistant prépare ses questions…</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-[#EEF3FE] flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-[#316BF2]" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
              msg.role === "user"
                ? "bg-[#316BF2] text-white rounded-tr-sm"
                : "bg-[#F8FAFF] border border-[#E5E9F2] text-[#1A1A2E] rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && messages.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#EEF3FE] flex items-center justify-center shrink-0">
              <Bot size={14} className="text-[#316BF2]" />
            </div>
            <div className="px-4 py-2.5 bg-[#F8FAFF] border border-[#E5E9F2] rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((n) => (
                  <span key={n} className="w-1.5 h-1.5 bg-[#316BF2]/40 rounded-full animate-bounce"
                    style={{ animationDelay: `${n * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        {isDone && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            <span className="text-[13px] text-green-700 font-medium">Formulaire complété ! Vérifiez les sections ci-dessous puis sauvegardez.</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isDone && (
        <div className="border-t border-[#E5E9F2] px-4 py-3 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Votre réponse…"
            disabled={loading}
            className="flex-1 border border-[#E5E9F2] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-9 h-9 flex items-center justify-center bg-[#316BF2] hover:bg-[#1E54D4] disabled:opacity-40 text-white rounded-lg transition-colors shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      )}
      {isDone && (
        <div className="border-t border-[#E5E9F2] px-4 py-3 flex items-center gap-3">
          <Sparkles size={13} className="text-[#316BF2] shrink-0" />
          <span className="text-[12px] text-[#6B7280] flex-1">Toutes les informations clés ont été recueillies.</span>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 bg-[#316BF2] hover:bg-[#1E54D4] text-white text-[13px] font-semibold rounded-lg transition-colors shrink-0"
            >
              <FileDown size={14} /> Sauvegarder
            </button>
          )}
        </div>
      )}
    </div>
  );
}
