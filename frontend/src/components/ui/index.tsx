"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Info,
  Loader2,
  RefreshCw,
  X,
  AlertTriangle,
} from "lucide-react";

/* ============================================================================
   BUTTON
============================================================================ */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      children,
      className = "",
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shrink-0 cursor-pointer";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#1E3A8A] text-white shadow-xs",
      secondary:
        "bg-[#F1F4F8] hover:bg-[#E2E7ED] active:bg-[#CBD5E1] text-[#17212B]",
      outline:
        "bg-white hover:bg-[#F7F8FA] active:bg-[#F1F4F8] text-[#17212B] border border-[#E2E7ED] hover:border-[#CBD5E1]",
      ghost:
        "bg-transparent hover:bg-[#F1F4F8] active:bg-[#E2E7ED] text-[#526170] hover:text-[#17212B]",
      danger:
        "bg-[#B91C1C] hover:bg-[#991B1B] active:bg-[#7F1D1D] text-white shadow-xs",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-9 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-11 px-5 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : icon ? (
          <span className="shrink-0 flex items-center">{icon}</span>
        ) : null}
        <span>{children}</span>
      </button>
    );
  }
);
Button.displayName = "Button";

/* ============================================================================
   BADGE
============================================================================ */

export interface BadgeProps {
  variant?: "default" | "brand" | "amber" | "success" | "warning" | "error";
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  children,
  className = "",
}) => {
  const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-[#F1F4F8] text-[#526170] border-[#E2E7ED]",
    brand: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
    amber: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
    success: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
    warning: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
    error: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

/* ============================================================================
   CARD
============================================================================ */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ elevated = false, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white border border-[#E2E7ED] rounded-xl ${
          elevated ? "shadow-sm" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

/* ============================================================================
   PAGE HEADER
============================================================================ */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
}) => {
  return (
    <div className="pb-6 border-b border-[#E2E7ED] space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-[#526170]">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-[#64748B] shrink-0" />}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-[#1D4ED8] transition-colors font-medium focus-visible:outline-none focus-visible:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-[#17212B] font-medium truncate max-w-[260px]" aria-current="page">
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-[#17212B] tracking-tight">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-[#526170] max-w-2xl leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

/* ============================================================================
   FORM CONTROLS
============================================================================ */

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}) => {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[#17212B]">
        {label}
        {required && <span className="text-[#B91C1C] ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[#526170]">{hint}</p>}
      {error && (
        <p className="text-xs text-[#B91C1C] flex items-center gap-1" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full h-10 px-3 rounded-lg bg-white border border-[#E2E7ED] text-sm text-[#17212B] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent disabled:bg-[#F1F4F8] disabled:text-[#64748B] transition-shadow ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className = "", children, ...props }, ref) => (
  <select
    ref={ref}
    className={`w-full h-10 px-3 rounded-lg bg-white border border-[#E2E7ED] text-sm text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent disabled:bg-[#F1F4F8] disabled:text-[#64748B] transition-shadow ${className}`}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea
    ref={ref}
    className={`w-full p-3 rounded-lg bg-white border border-[#E2E7ED] text-sm text-[#17212B] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent disabled:bg-[#F1F4F8] disabled:text-[#64748B] transition-shadow leading-relaxed ${className}`}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/* ============================================================================
   EMPTY STATE & ERROR STATE & ALERT BANNER
============================================================================ */

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
}) => {
  return (
    <Card className="p-8 sm:p-12 text-center">
      <div className="max-w-md mx-auto space-y-4">
        {icon && (
          <div className="h-12 w-12 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center mx-auto">
            {icon}
          </div>
        )}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-[#17212B]">{title}</h3>
          <p className="text-sm text-[#526170] leading-relaxed">{description}</p>
        </div>
        {(action || secondaryAction) && (
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    </Card>
  );
};

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Unable to load data",
  message,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="p-4 sm:p-5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[#B91C1C] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-sm font-semibold text-[#991B1B]">{title}</h4>
          <p className="text-xs text-[#B91C1C] leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          className="border-[#FECACA] text-[#991B1B] hover:bg-[#FEE2E2] self-start sm:self-center"
        >
          Retry
        </Button>
      )}
    </div>
  );
};

export interface InlineBannerProps {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
}

export const InlineBanner: React.FC<InlineBannerProps> = ({
  variant = "info",
  title,
  children,
  onDismiss,
}) => {
  const styles = {
    info: {
      bg: "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]",
      icon: <Info className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-0.5" />,
    },
    success: {
      bg: "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]",
      icon: <CheckCircle2 className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />,
    },
    warning: {
      bg: "bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]",
      icon: <AlertTriangle className="h-4 w-4 text-[#B45309] shrink-0 mt-0.5" />,
    },
    error: {
      bg: "bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]",
      icon: <AlertCircle className="h-4 w-4 text-[#B91C1C] shrink-0 mt-0.5" />,
    },
  }[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${styles.bg}`}
    >
      <div className="flex items-start gap-2.5">
        {styles.icon}
        <div className="space-y-0.5 leading-relaxed">
          {title && <div className="font-semibold">{title}</div>}
          <div>{children}</div>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="p-1 rounded hover:bg-black/5 text-current opacity-70 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

/* ============================================================================
   SKELETON
============================================================================ */

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`animate-pulse bg-[#E2E7ED]/70 rounded-lg ${className}`}
    aria-hidden="true"
  />
);

/* ============================================================================
   ACCESSIBLE DIALOG / MODAL (WITH FOCUS TRAP, ESCAPE, AND RETURN FOCUS)
============================================================================ */

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descId = React.useId();

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      // Focus the first focusable element inside the dialog
      const timer = setTimeout(() => {
        if (!dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }, 10);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
          return;
        }
        if (e.key === "Tab" && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
        if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17212B]/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`w-full ${widths[maxWidth]} bg-white border border-[#E2E7ED] rounded-xl shadow-lg flex flex-col max-h-[88vh] overflow-hidden focus:outline-none`}
      >
        <div className="px-6 py-4 border-b border-[#E2E7ED] flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <h2 id={titleId} className="text-base font-semibold text-[#17212B]">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-xs text-[#526170]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[#526170] hover:text-[#17212B] hover:bg-[#F1F4F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-[#E2E7ED] bg-[#F7F8FA] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   CONFIRM DIALOG
============================================================================ */

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#526170] leading-relaxed">{description}</p>
    </Dialog>
  );
};

