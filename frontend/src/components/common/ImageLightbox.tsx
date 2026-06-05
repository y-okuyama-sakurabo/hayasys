"use client";

import { useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, Box, IconButton, Tooltip, Typography,
} from "@mui/material";
import CloseIcon        from "@mui/icons-material/Close";
import ChevronLeftIcon  from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DownloadIcon     from "@mui/icons-material/Download";

export type LightboxImage = {
  src: string;
  /** ダウンロード時のファイル名（省略可）*/
  name?: string;
};

type Props = {
  images: LightboxImage[];
  /** 表示中のインデックス。null のとき非表示 */
  index: number | null;
  onClose: () => void;
  onChange: (index: number) => void;
};

/** fetch → Blob → <a download> でブラウザにファイルとして保存させる */
const downloadImage = async (src: string, name?: string) => {
  try {
    const res  = await fetch(src);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = name ?? src.split("/").pop() ?? "image";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // fetch 失敗時は別タブで開くフォールバック
    window.open(src, "_blank");
  }
};

export default function ImageLightbox({ images, index, onClose, onChange }: Props) {
  const open    = index !== null;
  const current = index !== null ? images[index] : null;
  const total   = images.length;

  const goPrev = useCallback(() => {
    if (index !== null) onChange((index - 1 + total) % total);
  }, [index, total, onChange]);

  const goNext = useCallback(() => {
    if (index !== null) onChange((index + 1) % total);
  }, [index, total, onChange]);

  // キーボード操作
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goPrev, goNext, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          bgcolor: "transparent",
          boxShadow: "none",
          overflow: "visible",
          m: 0,
        },
      }}
      slotProps={{
        backdrop: { sx: { bgcolor: "rgba(0,0,0,0.88)" } },
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
        }}
      >
        {current && (
          <>
            {/* ── 画像本体 ── */}
            <Box
              component="img"
              src={current.src}
              sx={{
                maxWidth: "85vw",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: 1.5,
                display: "block",
                userSelect: "none",
              }}
            />

            {/* ── 右上ボタン群（ダウンロード・閉じる） ── */}
            <Box
              sx={{
                position: "absolute",
                top: -16,
                right: -16,
                display: "flex",
                gap: 0.5,
              }}
            >
              <Tooltip title="ダウンロード">
                <IconButton
                  onClick={() => downloadImage(current.src, current.name)}
                  sx={{
                    bgcolor: "rgba(0,0,0,0.70)",
                    color: "#fff",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.92)" },
                  }}
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="閉じる (Esc)">
                <IconButton
                  onClick={onClose}
                  sx={{
                    bgcolor: "rgba(0,0,0,0.70)",
                    color: "#fff",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.92)" },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* ── 前へ ── */}
            {total > 1 && (
              <IconButton
                onClick={e => { e.stopPropagation(); goPrev(); }}
                sx={{
                  position: "absolute",
                  left: -56,
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor: "rgba(0,0,0,0.60)",
                  color: "#fff",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.90)" },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
            )}

            {/* ── 次へ ── */}
            {total > 1 && (
              <IconButton
                onClick={e => { e.stopPropagation(); goNext(); }}
                sx={{
                  position: "absolute",
                  right: -56,
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor: "rgba(0,0,0,0.60)",
                  color: "#fff",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.90)" },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            )}

            {/* ── 下部：ドットインジケーター + 枚数 ── */}
            {total > 1 && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: -40,
                  left: 0,
                  right: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.75,
                }}
              >
                {images.map((_, i) => (
                  <Box
                    key={i}
                    onClick={() => onChange(i)}
                    sx={{
                      width:  i === index ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: i === index ? "#fff" : "rgba(255,255,255,0.40)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </Box>
            )}

            {/* 枚数テキスト（複数枚のみ） */}
            {total > 1 && index !== null && (
              <Typography
                sx={{
                  position: "absolute",
                  bottom: -40,
                  right: 0,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.55)",
                  userSelect: "none",
                }}
              >
                {index + 1} / {total}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
