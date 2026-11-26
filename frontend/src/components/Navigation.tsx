"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Calendar,
  Mic,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Menu,
  X,
  GraduationCap,
  ExternalLink,
  Building2,
  Code2,
  Gauge,
  UserCircle,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth, verifySessionOnce } from "@/lib/auth";
import { useSyncStatus } from "@/lib/prepStore";

export type NavTab =
  | "dashboard"
  | "documents"
  | "courses"
  | "sprints"
  | "interviews"
  | "company-prep"
  | "mock-tests"
  | "coding"
  | "readiness"
  | "account"
  | "settings";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  count?: number;
  badge?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "U";
}

export const WorkspaceShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const { documents, courses, sprints, isOnline } = useWorkspace();
  const { user } = useAuth();
  const syncStatus = useSyncStatus();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Study Focus Timer (25 min Pomodoro) placed in secondary sidebar footer
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    verifySessionOnce();
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Focus trap & Escape dismissal for mobile navigation drawer
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const timer = setTimeout(() => {
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
        "a, button"
      );
      firstFocusable?.focus();
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])"
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const navItems: NavItem[] = [
    {
      href: "/app",
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/app/documents",
      label: "Documents",
      icon: FileText,
      count: documents.length > 0 ? documents.length : undefined,
    },
    {
      href: "/app/courses",
      label: "Courses",
      icon: BookOpen,
      count: courses.length > 0 ? courses.length : undefined,
    },
    {
      href: "/app/sprints",
      label: "Exam plans",
      icon: Calendar,
      count: sprints.length > 0 ? sprints.length : undefined,
    },
    {
      href: "/app/interviews",
      label: "Interview practice",
      icon: Mic,
    },
    {
      href: "/app/company-prep",
      label: "Company PYQs",
      icon: Building2,
      badge: "New",
    },
    {
      href: "/app/company-prep/test",
      label: "Mock tests",
      icon: Timer,
    },
    {
      href: "/app/coding",
      label: "Coding lab",
      icon: Code2,
    },
    {
      href: "/app/readiness",
      label: "Readiness",
      icon: Gauge,
    },
    {
      href: "/app/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  // Longest-match active route detection so /app/company-prep/test highlights "Mock tests" and not "Company PYQs"
  const activeHref = navItems.reduce<string>((best, item) => {
    const matches = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && item.href.length > best.length) {
      return item.href;
    }
    return best;
  }, "");

  const currentSectionLabel =
    pathname === "/app/account"
      ? "Account"
      : navItems.find((item) => item.href === activeHref)?.label || "Workspace";

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Top Brand & Primary Navigation */}
      <div className="space-y-6">
        <div className="h-14 px-5 flex items-center justify-between border-b border-[#E2E7ED]">
          <Link
            href="/app"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded-lg"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-base text-[#17212B] tracking-tight block">
                LearnSync
              </span>
            </div>
          </Link>

          {mobileMenuOpen && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Close navigation menu"
              className="lg:hidden p-1.5 rounded-lg text-[#526170] hover:text-[#17212B] hover:bg-[#F1F4F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav aria-label="Workspace navigation" className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`h-10 px-3 rounded-lg text-sm font-medium flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                  active
                    ? "bg-[#EFF6FF] text-[#1D4ED8] font-semibold"
                    : "text-[#526170] hover:text-[#17212B] hover:bg-[#F1F4F8]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-[#1D4ED8]" : "text-[#64748B]"
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.badge ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                    {item.badge}
                  </span>
                ) : item.count !== undefined ? (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      active
                        ? "bg-[#1D4ED8]/10 text-[#1D4ED8]"
                        : "bg-[#F1F4F8] text-[#526170]"
                    }`}
                  >
                    {item.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Secondary Area: Study Focus Timer & Public Homepage Link */}
      <div className="p-4 border-t border-[#E2E7ED] space-y-3 bg-[#F7F8FA]/60">
        <div
          aria-label="Study timer"
          className="p-3 rounded-xl bg-white border border-[#E2E7ED] space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#526170] flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-[#1D4ED8]" />
              <span>Study timer</span>
            </span>
            <span
              className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                timerRunning
                  ? "bg-[#EFF6FF] text-[#1D4ED8]"
                  : "bg-[#F1F4F8] text-[#64748B]"
              }`}
            >
              {timerRunning ? "Running" : "25m focus"}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="font-mono-code text-lg font-semibold text-[#17212B] tracking-tight">
              {formatTimer(secondsLeft)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                aria-label={timerRunning ? "Pause study timer" : "Start study timer"}
                title={timerRunning ? "Pause timer" : "Start timer"}
                className="h-8 w-8 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] cursor-pointer"
              >
                {timerRunning ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setSecondsLeft(25 * 60);
                }}
                aria-label="Reset study timer to 25 minutes"
                title="Reset timer"
                className="h-8 w-8 rounded-lg hover:bg-[#F1F4F8] text-[#526170] hover:text-[#17212B] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="px-3 py-2 rounded-lg text-xs font-medium text-[#526170] hover:text-[#17212B] hover:bg-[#F1F4F8] flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
        >
          <span>Public overview</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#64748B]" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#17212B] flex">
      {/* Persistent Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-[#E2E7ED] z-30">
        {renderSidebarContent()}
      </aside>

      {/* Accessible Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation"
        >
          <div
            className="fixed inset-0 bg-[#17212B]/40 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            ref={drawerRef}
            className="relative w-72 max-w-[85vw] bg-white h-full shadow-xl z-10 flex flex-col"
          >
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Compact Top Header */}
        <header className="sticky top-0 z-20 h-14 bg-white/95 backdrop-blur-xs border-b border-[#E2E7ED] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2 -ml-1.5 rounded-lg text-[#526170] hover:text-[#17212B] hover:bg-[#F1F4F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
            >
              <Menu className="h-5 w-5" />
            </button>

            <span className="text-sm font-semibold text-[#17212B] truncate">
              {currentSectionLabel}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Mobile Compact Timer Indicator */}
            {timerRunning && (
              <div className="lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-mono-code font-medium text-[#1D4ED8]">
                <Timer className="h-3.5 w-3.5" />
                <span>{formatTimer(secondsLeft)}</span>
              </div>
            )}

            {/* Cloud Sync & Account Chip */}
            <Link
              href="/app/account"
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F7F8FA] hover:bg-[#F1F4F8] border border-[#E2E7ED] text-xs font-medium text-[#17212B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
              title={
                user
                  ? `Signed in as ${user.email}`
                  : "Sign in to sync progress across devices"
              }
            >
              {user ? (
                <>
                  <span className="h-5 w-5 rounded-full bg-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center">
                    {getInitials(user.name)}
                  </span>
                  <span className="max-w-[96px] truncate">
                    {user.name.split(/\s+/)[0]}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      syncStatus.status === "error"
                        ? "bg-[#B91C1C]"
                        : syncStatus.status === "syncing"
                        ? "bg-[#F59E0B]"
                        : "bg-[#15803D]"
                    }`}
                  />
                </>
              ) : (
                <>
                  <UserCircle className="h-4 w-4 text-[#1D4ED8]" />
                  <span>Sign in</span>
                </>
              )}
            </Link>

            {/* Honest API Connection Status Indicator */}
            <Link
              href="/app/settings"
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F7F8FA] hover:bg-[#F1F4F8] border border-[#E2E7ED] text-xs font-medium text-[#526170] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
              title="View service status in Settings"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline === null
                    ? "bg-[#64748B]"
                    : isOnline
                    ? "bg-[#15803D]"
                    : "bg-[#B45309]"
                }`}
              />
              <span>
                {isOnline === null
                  ? "Checking API..."
                  : isOnline
                  ? "API connected"
                  : "API offline"}
              </span>
            </Link>
          </div>
        </header>

        {/* Workspace Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const Navigation = WorkspaceShell;
