"use client";

import { useEffect, useState } from "react";
import { Box, Chip, Stack } from "@mui/material";
import apiClient from "@/lib/apiClient";

type Category = {
  id: number;
  name: string;
  children?: Category[];
};

export default function CategoryFilter({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const [tree, setTree] = useState<Category[]>([]);
  const [path, setPath] = useState<Category[]>([]);

  // -----------------------------
  // 初期ロード
  // -----------------------------
  useEffect(() => {
    apiClient.get("/categories/tree/")
      .then(res => {
        const data = res.data.results || res.data || [];
        setTree(data);
      })
      .catch(() => setTree([]));
  }, []);

  // -----------------------------
  // クリック
  // -----------------------------
  const handleClick = (cat: Category, depth: number) => {
    const newPath = [...path.slice(0, depth), cat];
    setPath(newPath);
    onChange(cat.id);
  };

  // -----------------------------
  // リセット
  // -----------------------------
  const reset = () => {
    setPath([]);
    onChange(null);
  };

  // -----------------------------
  // 現在表示する層
  // -----------------------------
  const getLevels = () => {
    const levels: Category[][] = [];
    let current = tree;

    levels.push(current);

    for (const p of path) {
      const found = current.find((c) => c.id === p.id);
      current = found?.children || [];
      if (current.length) levels.push(current);
    }

    return levels;
  };

  const levels = getLevels();

  return (
    <Box>
      <Stack direction="row" spacing={1} mb={1}>
        <Chip
          label="全体"
          onClick={reset}
          color={path.length === 0 ? "primary" : "default"}
        />
      </Stack>

      {levels.map((cats, depth) => (
        <Stack key={depth} direction="row" spacing={1} mb={1} flexWrap="wrap">
          {cats.map((cat) => {
            const selected = path[depth]?.id === cat.id;

            return (
              <Chip
                key={cat.id}
                label={cat.name}
                clickable
                color={selected ? "primary" : "default"}
                onClick={() => handleClick(cat, depth)}
              />
            );
          })}
        </Stack>
      ))}
    </Box>
  );
}