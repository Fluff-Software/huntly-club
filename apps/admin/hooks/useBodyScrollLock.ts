"use client";

import { useEffect } from "react";

const MAIN_SCROLL_SELECTOR = "main[data-app-scroll]";

let lockCount = 0;
let savedScrollTop = 0;
let scrollEl: HTMLElement | null = null;
let previousMainOverflow = "";
let previousBodyOverflow = "";

function getScrollElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(MAIN_SCROLL_SELECTOR);
}

function lockBodyScroll() {
  if (typeof document === "undefined") return;
  const el = getScrollElement();

  if (lockCount === 0) {
    scrollEl = el;
    savedScrollTop = el?.scrollTop ?? 0;
    if (el) {
      previousMainOverflow = el.style.overflow;
      el.style.overflow = "hidden";
    }
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    if (scrollEl) {
      scrollEl.style.overflow = previousMainOverflow;
      scrollEl.scrollTop = savedScrollTop;
      scrollEl = null;
    }
    document.body.style.overflow = previousBodyOverflow;
  }
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [locked]);
}
