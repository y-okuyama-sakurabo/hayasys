import { useCallback, useEffect, useRef, useState } from "react";
import apiClient from "@/lib/apiClient";

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;   // 60分
const WARNING_BEFORE_MS     =  2 * 60 * 1000;    // ログアウト2分前に警告

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown",
  "touchstart", "scroll", "click",
] as const;

export function useInactivityLogout(onLogout: () => void) {
  const [showWarning, setShowWarning]     = useState(false);
  const [countdown,   setCountdown]       = useState(0);      // 秒
  const logoutTimer   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const warningTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = () => {
    if (logoutTimer.current)  clearTimeout(logoutTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  };

  const doLogout = useCallback(async () => {
    clearAll();
    setShowWarning(false);
    try { await apiClient.post("/auth/logout/"); } catch {}
    onLogout();
  }, [onLogout]);

  const resetTimer = useCallback(() => {
    clearAll();
    setShowWarning(false);
    setCountdown(0);

    // 警告タイマー（N分後）
    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(WARNING_BEFORE_MS / 1000);

      // カウントダウン更新
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

    // ログアウトタイマー（N分後）
    logoutTimer.current = setTimeout(() => {
      doLogout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [doLogout]);

  // アクティビティイベントを監視
  useEffect(() => {
    resetTimer();
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    return () => {
      clearAll();
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [resetTimer]);

  // 警告ダイアログで「続ける」を押したとき
  const handleContinue = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  return { showWarning, countdown, handleContinue, doLogout };
}
