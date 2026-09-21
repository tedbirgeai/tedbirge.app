import type { HTMLAttributes, ReactNode } from "react";

export function DesktopGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={`grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-y-8 gap-x-4 p-8 max-h-[calc(100vh-80px)] overflow-y-auto w-full items-start align-content-start ${className}`.trim()}
    >
      {children}
    </div>
  );
}
