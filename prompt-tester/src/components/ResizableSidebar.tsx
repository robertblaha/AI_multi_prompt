"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GripVertical } from "lucide-react";

interface ResizableSidebarProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

export function ResizableSidebar({
  children,
  defaultWidth = 288,
  minWidth = 200,
  maxWidth = 500,
  storageKey = "sidebar-width",
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem(storageKey);
    if (savedWidth) {
      const parsed = parseInt(savedWidth);
      if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        setWidth(parsed);
      }
    }
  }, [storageKey, minWidth, maxWidth]);

  // Save width to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, width.toString());
  }, [width, storageKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    },
    [isResizing, minWidth, maxWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={sidebarRef}
      className="fixed left-0 top-0 bottom-0 z-10 flex"
      style={{ width }}
    >
      {/* Sidebar content */}
      <div className="flex-1 min-w-0 overflow-hidden">{children}</div>

      {/* Resize handle */}
      <div
        className={`w-1 cursor-col-resize flex items-center justify-center group hover:bg-primary/20 transition-colors ${
          isResizing ? "bg-primary/30" : ""
        }`}
        onMouseDown={handleMouseDown}
      >
        <div
          className={`h-8 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity ${
            isResizing ? "opacity-100" : ""
          }`}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// Hook to get the current sidebar width for main content margin
export function useSidebarWidth(storageKey = "sidebar-width", defaultWidth = 288) {
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    const updateWidth = () => {
      const savedWidth = localStorage.getItem(storageKey);
      if (savedWidth) {
        const parsed = parseInt(savedWidth);
        if (!isNaN(parsed)) {
          setWidth(parsed);
        }
      }
    };

    updateWidth();

    // Listen for storage changes
    window.addEventListener("storage", updateWidth);
    
    // Also poll for changes (for same-tab updates)
    const interval = setInterval(updateWidth, 100);

    return () => {
      window.removeEventListener("storage", updateWidth);
      clearInterval(interval);
    };
  }, [storageKey]);

  return width;
}
