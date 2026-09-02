"use client";

import { TextStreamChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { toast } from "sonner";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { ArrowDown, LoaderCircle } from "lucide-react";

import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import { Button } from "./ui/button";
import { cn } from "@/utils/cn";

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={props.className}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="w-4 h-4" />
      <span>Scroll to bottom</span>
    </Button>
  );
}

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const { scrollRef, contentRef } = useStickToBottomContext();
  return (
    <div
      ref={scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={cn("grid grid-rows-[1fr,auto]", props.className)}
    >
      <div ref={contentRef} className={props.contentClassName}>
        {props.content}
      </div>
      {props.footer}
    </div>
  );
}

export function ChatWindow(props: {
  endpoint: string;
  emptyStateComponent: ReactNode;
  placeholder?: string;
  emoji?: string;
}) {
  const [input, setInput] = useState("");

  const transport = useMemo(
    () => new TextStreamChatTransport({ api: props.endpoint }),
    [props.endpoint],
  );

  const chat = useChat({
    transport,
    onError: (e) =>
      toast.error("Error while processing your request", {
        description: e.message,
      }),
  });

  const isLoading = chat.status === "streaming" || chat.status === "submitted";

  function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading || !input.trim()) return;
    chat.sendMessage({ text: input });
    setInput("");
  }

  return (
    <StickToBottom>
      <StickyToBottomContent
        className="absolute inset-0"
        contentClassName="py-8 px-2"
        content={
          chat.messages.length === 0 ? (
            <div>{props.emptyStateComponent}</div>
          ) : (
            <div className="flex flex-col max-w-[768px] mx-auto pb-12 w-full">
              {chat.messages.map((m) => (
                <ChatMessageBubble
                  key={m.id}
                  message={m}
                  aiEmoji={props.emoji}
                />
              ))}
            </div>
          )
        }
        footer={
          <div className="sticky bottom-8 px-2">
            <ScrollToBottom className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4" />
            <form onSubmit={sendMessage} className="flex w-full flex-col">
              <div className="border border-input bg-secondary rounded-lg flex flex-col gap-2 max-w-[768px] w-full mx-auto">
                <input
                  value={input}
                  placeholder={props.placeholder ?? "Ask me anything"}
                  onChange={(e) => setInput(e.target.value)}
                  className="border-none outline-none bg-transparent p-4"
                />
                <div className="flex justify-end mr-2 mb-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <span role="status" className="flex justify-center">
                        <LoaderCircle className="animate-spin" />
                        <span className="sr-only">Loading...</span>
                      </span>
                    ) : (
                      <span>Send</span>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        }
      />
    </StickToBottom>
  );
}
