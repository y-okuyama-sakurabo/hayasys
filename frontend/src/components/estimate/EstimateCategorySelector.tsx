"use client";
import { useMemo, useState, useEffect } from "react";
import {
  Box,
  TextField,
  MenuItem,
  Typography,
  Stack,
  Chip,
  Button,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import apiClient from "@/lib/apiClient";

/**
 * 階層カテゴリ選択（/categories/tree）
 * - 上：パンくず表示（Chip）
 * - 下：いま選べる階層だけ Select を1つ表示
 * - 最下層（leaf）を選んだ時だけ onChange を呼ぶ
 */
export default function EstimateCategorySelector({
  value,
  onChange,
}: {
  value?: any;
  onChange: (selectedCategory: any) => void;
}) {
  const [rootCategories, setRootCategories] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[][]>([[]]);

  // 選択中のidを配列で持つ（最大5）
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ===== treeに parent を付与して正規化 =====
  const attachParents = (nodes: any[], parent: any = null): any[] => {
    return (nodes || []).map((n) => {
      const node = { ...n, parent };
      node.children = attachParents(node.children || [], node);
      return node;
    });
  };

  const isLeaf = (cat: any) => !cat?.children || cat.children.length === 0;

  // === 初期ロード ===
  useEffect(() => {
    apiClient.get("/categories/tree/").then((res) => {
      const data = res.data.results || res.data;
      const normalized = attachParents(data);
      setRootCategories(normalized);
      setLevels([normalized]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === value（編集時）から chain を復元 ===
  useEffect(() => {
    if (!value) return;
    if (rootCategories.length === 0) return;

    const buildChain = (cat: any): any[] => {
      const chain: any[] = [];
      let current = cat;
      while (current) {
        chain.unshift(current);
        current = current.parent || null;
      }
      return chain;
    };

    const chain = buildChain(value);
    if (chain.length === 0) return;

    let currentLevel = rootCategories;
    const newLevels: any[][] = [];
    const newSelectedIds: number[] = [];

    for (const cat of chain) {
      newLevels.push(currentLevel);
      const selectedCat = currentLevel.find((c) => c.id === cat.id);
      if (!selectedCat) break;

      newSelectedIds.push(selectedCat.id);
      currentLevel = selectedCat.children || [];
    }

    // 次に選べる階層があるなら levels に追加
    if (currentLevel.length > 0) newLevels.push(currentLevel);

    setLevels(newLevels);
    setSelectedIds(newSelectedIds);
  }, [value, rootCategories]);

  // === 現在の “選択済みノード” を解決（パンくず表示用） ===
  const selectedNodes = useMemo(() => {
    const nodes: any[] = [];
    let currentOptions = rootCategories;

    for (const id of selectedIds) {
      const node = currentOptions?.find((c: any) => c.id === id);
      if (!node) break;
      nodes.push(node);
      currentOptions = node.children || [];
    }
    return nodes;
  }, [selectedIds, rootCategories]);

  const currentLevelIndex = Math.max(0, levels.length - 1);
  const currentOptions = levels[currentLevelIndex] || [];

  const currentSelectedId = selectedIds[currentLevelIndex] ?? "";

  // === 変更（いまの階層だけ） ===
  const handlePick = (categoryId: number) => {
    const options = currentOptions;
    const picked = options.find((c: any) => c.id === categoryId);
    const nextChildren = picked?.children || [];

    // ここまでの選択 + 今回選んだもの、以降は切り捨て
    const nextSelectedIds = selectedIds.slice(0, currentLevelIndex);
    nextSelectedIds.push(categoryId);

    setSelectedIds(nextSelectedIds);

    // levels も同様にここまで + 次候補（子があるなら）
    const nextLevels = levels.slice(0, currentLevelIndex + 1);
    if (nextChildren.length > 0) nextLevels.push(nextChildren);
    setLevels(nextLevels);

    // ★ leaf を選んだ時だけ親へ通知（途中通知でフォームが揺れない）
    if (picked && isLeaf(picked)) {
      onChange(picked);
    }
  };

  // === リセット ===
  const handleReset = () => {
    setSelectedIds([]);
    setLevels([rootCategories]);
  };

  return (
    <Box>
      {/* パンくず */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={1}>
        {selectedNodes.length > 0 ? (
          selectedNodes.map((n, i) => (
            <Chip key={n.id} size="small" label={n.name} />
          ))
        ) : (
          <Typography variant="caption" color="text.secondary">
            カテゴリを選択してください
          </Typography>
        )}

        <Box sx={{ flex: 1 }} />

        <Button
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
          disabled={selectedNodes.length === 0}
        >
          リセット
        </Button>
      </Stack>

      {/* いま選べる階層だけ Select を1個 */}
      <TextField
        select
        label={`カテゴリ${currentLevelIndex + 1}`}
        value={currentSelectedId}
        onChange={(e) => handlePick(Number(e.target.value))}
        fullWidth
        size="small"
      >
        {Array.isArray(currentOptions) && currentOptions.length > 0 ? (
          currentOptions.map((cat: any) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled value="">
            {rootCategories.length === 0 ? "ロード中..." : "該当なし"}
          </MenuItem>
        )}
      </TextField>

      {/* ヒント */}
      <Box mt={1}>
        <Typography variant="caption" color="text.secondary">
          最下層まで選択するとカテゴリが確定します
        </Typography>
      </Box>
    </Box>
  );
}
