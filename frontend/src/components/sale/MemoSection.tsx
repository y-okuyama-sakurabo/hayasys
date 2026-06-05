"use client";

import {
  Box, Paper, Typography, TextField, Chip, Divider, Stack,
} from "@mui/material";
import PrintIcon        from "@mui/icons-material/Print";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

type Props = {
  /** 書類種別（見積書 / 受注書） */
  docLabel: string;
  memo: string;
  internalMemo: string;
  onMemoChange:         (v: string) => void;
  onInternalMemoChange: (v: string) => void;
};

const MAX_LEN = 500;

function CharCount({ value }: { value: string }) {
  const len = value.length;
  return (
    <Typography
      variant="caption"
      sx={{ color: len >= MAX_LEN ? "error.main" : "text.disabled" }}
    >
      {len} / {MAX_LEN}
    </Typography>
  );
}

export default function MemoSection({
  docLabel, memo, internalMemo, onMemoChange, onInternalMemoChange,
}: Props) {
  return (
    <Stack spacing={2}>

      {/* ── 商談メモ ── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {/* ヘッダー */}
        <Box
          sx={{
            px: 2, py: 1.25,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            bgcolor: "grey.50",
            borderBottom: "1px solid", borderColor: "divider",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <PrintIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography fontWeight="bold" fontSize={14}>商談メモ</Typography>
          </Stack>
          <Chip
            label={`${docLabel}に印字`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: 11, height: 22 }}
          />
        </Box>

        {/* 入力 */}
        <Box sx={{ p: 2 }}>
          <TextField
            multiline
            minRows={3}
            maxRows={10}
            fullWidth
            placeholder={`${docLabel}のフッターに印刷されます`}
            value={memo}
            onChange={(e) => onMemoChange(e.target.value)}
            inputProps={{ maxLength: MAX_LEN }}
            variant="outlined"
            size="small"
          />
          <Box display="flex" justifyContent="flex-end" mt={0.5}>
            <CharCount value={memo} />
          </Box>
        </Box>
      </Paper>

      {/* ── 内部メモ ── */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2, overflow: "hidden",
          borderLeft: "4px solid",
          borderLeftColor: "warning.main",
        }}
      >
        {/* ヘッダー */}
        <Box
          sx={{
            px: 2, py: 1.25,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            bgcolor: "warning.50",
            borderBottom: "1px solid", borderColor: "divider",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <LockOutlinedIcon sx={{ fontSize: 18, color: "warning.dark" }} />
            <Typography fontWeight="bold" fontSize={14}>内部メモ</Typography>
          </Stack>
          <Chip
            label="社内専用・お客様非公開"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ fontSize: 11, height: 22 }}
          />
        </Box>

        {/* 入力 */}
        <Box sx={{ p: 2, bgcolor: "warning.50" }}>
          <TextField
            multiline
            minRows={3}
            maxRows={10}
            fullWidth
            placeholder="社内スタッフ向けの共有メモ（書類には印字されません）"
            value={internalMemo}
            onChange={(e) => onInternalMemoChange(e.target.value)}
            inputProps={{ maxLength: MAX_LEN }}
            variant="outlined"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "background.paper",
              },
            }}
          />
          <Box display="flex" justifyContent="flex-end" mt={0.5}>
            <CharCount value={internalMemo} />
          </Box>
        </Box>
      </Paper>

    </Stack>
  );
}
