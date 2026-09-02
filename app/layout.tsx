import "./globals.css";
import { Public_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";

const publicSans = Public_Sans({ subsets: ["latin"] });

export const metadata = {
  title: "LangChain agent + Clerk MCP",
  description:
    "A LangChain agent exposed both as a chat UI and as a Clerk-authenticated MCP server.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={publicSans.className}>
        <div className="bg-secondary grid grid-rows-[auto,1fr] h-[100dvh]">
          <header className="flex items-center justify-between gap-2 p-4">
            <span className="font-semibold">🏴‍☠️ Pirate agent</span>
            {/* ISSUE-1: the Clerk <SignInButton /> / <UserButton /> go here */}
          </header>
          <div className="bg-background mx-4 relative grid rounded-t-2xl border border-input border-b-0">
            <div className="absolute inset-0">{children}</div>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
