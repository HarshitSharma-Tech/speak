import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "LearnSync — Grounded Study Workspace",
    template: "%s | LearnSync",
  },
  description:
    "Turn uploaded textbooks, past exam papers, and resumes into structured courses, cited quizzes, daily exam plans, company PYQs, and practice interviews.",
  keywords: [
    "LearnSync",
    "Study Workspace",
    "Exam Planner",
    "Company Interview Questions",
    "Mock Interview Practice",
    "Textbook Course Generator",
    "Cited Quizzes",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full ${jakarta.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
    >
      <body className="min-h-full bg-[#F7F8FA] text-[#17212B] antialiased selection:bg-[#1D4ED8]/15 selection:text-[#1D4ED8]">
        {children}
      </body>
    </html>
  );
}
