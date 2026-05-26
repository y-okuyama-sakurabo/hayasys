"use client";

/**
 * VehicleCategorySelect
 * 親カテゴリ → 子カテゴリ → … と階層的に選択できるカスケードセレクト。
 * value: 選択中の末端カテゴリ ID (null = 未選択)
 * onChange: 末端カテゴリが確定したら呼ばれる
 * categoryType: /categories/?type=XXX で絞るタイプ (省略時 = "vehicle")
 */

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import apiClient from "@/lib/apiClient";

type CatNode = {
  id: number;
  name: string;
  children?: CatNode[];
};

type Props = {
  value: number | null;
  onChange: (id: number | null) => void;
  categoryType?: string;
  size?: "small" | "medium";
};

// ツリーから id のパス（祖先の id 配列）を返す
function findPath(nodes: CatNode[], targetId: number): number[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return [n.id];
    if (n.children?.length) {
      const sub = findPath(n.children, targetId);
      if (sub) return [n.id, ...sub];
    }
  }
  return null;
}

// ノードリストから id のノードを取得
function findNode(nodes: CatNode[], id: number): CatNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const sub = findNode(n.children, id);
      if (sub) return sub;
    }
  }
  return null;
}

export default function VehicleCategorySelect({
  value,
  onChange,
  categoryType = "vehicle",
  size = "small",
}: Props) {
  const [tree, setTree] = useState<CatNode[]>([]);
  const [loading, setLoading] = useState(false);

  // 各レベルで選択中の ID
  const [selections, setSelections] = useState<(number | null)[]>([null]);

  // ツリー取得
  useEffect(() => {
    setLoading(true);
    apiClient
      .get(`/categories/tree/?type=${categoryType}`)
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.results ?? [];
        setTree(data);
      })
      .finally(() => setLoading(false));
  }, [categoryType]);

  // value が変わったら選択パスを初期化
  useEffect(() => {
    if (!tree.length) return;
    if (!value) {
      setSelections([null]);
      return;
    }
    const path = findPath(tree, value);
    if (path) {
      setSelections(path);
    } else {
      setSelections([null]);
    }
  }, [value, tree]);

  // level i で id を選択したとき
  const handleSelect = useCallback(
    (level: number, id: number | null) => {
      const newSels = selections.slice(0, level + 1);
      newSels[level] = id;

      if (id !== null) {
        // 子があればレベルを追加（null 初期）
        const node = level === 0
          ? tree.find((n) => n.id === id) ?? null
          : findNode(tree, id);
        if (node?.children?.length) {
          newSels.push(null);
        }
      }

      setSelections(newSels);

      // onChange: 末端（子のない選択）か、null にリセット時に通知
      if (id === null) {
        onChange(null);
      } else {
        const node = findNode(tree, id) ?? tree.find((n) => n.id === id);
        if (!node?.children?.length) {
          // 子なし → 末端
          onChange(id);
        } else {
          // 子あり → まだ末端未確定
          onChange(null);
        }
      }
    },
    [selections, tree, onChange]
  );

  // レベル i のオプション
  const optionsAtLevel = (level: number): CatNode[] => {
    if (level === 0) return tree;
    const parentId = selections[level - 1];
    if (parentId === null) return [];
    const parent = findNode(tree, parentId) ?? tree.find((n) => n.id === parentId);
    return parent?.children ?? [];
  };

  const levelLabels = ["カテゴリ（大）", "カテゴリ（中）", "カテゴリ（小）", "カテゴリ（末）"];

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <CircularProgress size={16} />
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      {selections.map((sel, i) => {
        const opts = optionsAtLevel(i);
        if (opts.length === 0 && i > 0) return null;
        const labelId = `cat-level-${i}`;
        const label = levelLabels[i] ?? `カテゴリ (L${i + 1})`;
        return (
          <FormControl key={i} fullWidth size={size}>
            <InputLabel id={labelId}>{label}</InputLabel>
            <Select
              labelId={labelId}
              label={label}
              value={sel !== null ? String(sel) : ""}
              onChange={(e) => {
                const raw = e.target.value as string;
                const v = raw === "" ? null : Number(raw);
                handleSelect(i, v);
              }}
            >
              <MenuItem value="">未選択</MenuItem>
              {opts.map((o) => (
                <MenuItem key={o.id} value={String(o.id)}>
                  {o.name}
                  {o.children?.length ? "" : " ✓"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      })}
    </Box>
  );
}
