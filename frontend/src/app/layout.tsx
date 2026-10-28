import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Syne, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "LearnSync Studio — Editorial Study OS & Voice Mentor",
  description:
    "Transform textbooks into structured curriculums, high-yield exam roadmaps, and live voice-adaptive technical interviews.",
  keywords: [
    "LearnSync Studio",
    "Study OS",
    "Exam Sprint Planner",
    "Voice Mock Interview",
    "Textbook Curriculum",
    "Grounded Quiz",
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
      className={`dark h-full ${jakarta.variable} ${syne.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full bg-[#06070a] text-[#f4f4f6] antialiased selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
