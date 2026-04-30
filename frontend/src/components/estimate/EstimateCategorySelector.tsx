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

type Category = {
  id: number;
  name: string;
  children?: Category[];
};

let categoryCache: Record<string, Category[]> = {};

export default function EstimateCategorySelector({
  value,
  onChange,
  categoryTypes,
  taxType,
}: {
  value?: number | null;
  onChange: (selectedCategoryId: number | null) => void;
  categoryTypes?: string[];
  taxType?: "taxable" | "non_taxable";
}) {
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [laborCost, setLaborCost] = useState<number | "">("");
  const [manufacturerId, setManufacturerId] = useState<number | null>(null);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  

  /* =============================
     初期ロード（type対応 安定版）
  ============================= */
  useEffect(() => {
    const fetch = async () => {
      try {
        const key = `${categoryTypes?.join(",") || "all"}_${taxType || "all"}`;

        if (categoryCache[key]) {
          setRootCategories(categoryCache[key]);
          return;
        }

        const params = new URLSearchParams();

        if (categoryTypes?.length) {
          categoryTypes.forEach((t) => params.append("type", t));
        }

        if (taxType) {
          params.append("tax_type", taxType);
        }

        const url =
          params.toString().length > 0
            ? `/categories/tree/?${params.toString()}`
            : "/categories/tree/";

        const res = await apiClient.get(url);
        const data = res.data.results || res.data || [];

        categoryCache[key] = data;
        setRootCategories(data);

      } catch {
        setRootCategories([]);
      }
    };

    fetch();
  }, [categoryTypes, taxType]);

  /* =============================
     id からチェーン復元
  ============================= */
  useEffect(() => {
    if (!value || rootCategories.length === 0) {
      setSelectedIds([]);
      return;
    }

    const findChain = (
      nodes: Category[],
      targetId: number,
      path: number[] = []
    ): number[] | null => {
      for (const node of nodes) {
        const nextPath = [...path, node.id];

        if (node.id === targetId) {
          return nextPath;
        }

        if (node.children?.length) {
          const result = findChain(node.children, targetId, nextPath);
          if (result) return result;
        }
      }
      return null;
    };

    const chain = findChain(rootCategories, value);
    if (chain) {
      setSelectedIds(chain);
    }
  }, [value, rootCategories]);

  /* =============================
     現在選択ノード
  ============================= */
  const { selectedNodes, lastSelectedNode } = useMemo(() => {
    const nodes: Category[] = [];
    let currentOptions = rootCategories;
    let last: Category | null = null;

    for (const id of selectedIds) {
      const node = currentOptions.find((c) => c.id === id);
      if (!node) break;
      nodes.push(node);
      last = node;
      currentOptions = node.children || [];
    }

    return { selectedNodes: nodes, lastSelectedNode: last };
  }, [selectedIds, rootCategories]);

  const isLeaf = (cat?: Category | null) =>
    !cat?.children || cat.children.length === 0;

  /* =============================
    カテゴリ検索用：ツリーを平坦化
  ============================= */
  const flattenCategories = (
    nodes: Category[],
    parentPath: string[] = []
  ): { id: number; name: string; path: string; node: Category }[] => {
    return nodes.flatMap((node) => {
      const currentPath = [...parentPath, node.name];

      return [
        {
          id: node.id,
          name: node.name,
          path: currentPath.join(" / "),
          node,
        },
        ...(node.children?.length
          ? flattenCategories(node.children, currentPath)
          : []),
      ];
    });
  };

  const flatCategories = useMemo(() => {
    return flattenCategories(rootCategories);
  }, [rootCategories]);

  const searchResults = useMemo(() => {
    const keyword = searchText.trim();

    if (!keyword) return [];

    return flatCategories
      .filter((c) => c.path.includes(keyword))
      .slice(0, 20);
  }, [flatCategories, searchText]);

  const handleSearchSelect = (categoryId: number) => {
    onChange(categoryId);
    setSearchText("");
  };

  /* =============================
     深さごとの選択肢
  ============================= */
  const depthOptions = useMemo(() => {
    const result: Category[][] = [];
    let currentOptions = rootCategories;

    result.push(currentOptions);

    for (const id of selectedIds) {
      const node = currentOptions.find((c) => c.id === id);
      if (!node) break;
      currentOptions = node.children || [];
      result.push(currentOptions);
    }

    return result;
  }, [selectedIds, rootCategories]);

  const leafSelected = isLeaf(lastSelectedNode);

  const shownDepth =
    selectedIds.length === 0
      ? 0
      : leafSelected
      ? selectedIds.length - 1
      : selectedIds.length;

  const optionsForShownDepth = depthOptions[shownDepth] || [];
  const valueForShownDepth = selectedIds[shownDepth] ?? "";

  /* =============================
     選択処理
  ============================= */
  const handlePick = (categoryId: number) => {
    const nextSelectedIds = [
      ...selectedIds.slice(0, shownDepth),
      categoryId,
    ];

    setSelectedIds(nextSelectedIds);

    let currentOptions = rootCategories;
    let selectedNode: Category | undefined;

    for (const id of nextSelectedIds) {
      selectedNode = currentOptions.find((c) => c.id === id);
      if (!selectedNode) break;
      currentOptions = selectedNode.children || [];
    }

    if (selectedNode && isLeaf(selectedNode)) {
      onChange(selectedNode.id);
    }
  };

  const handleReset = () => {
    setSelectedIds([]);
    onChange(null);
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        mb={1}
      >
        {selectedNodes.length > 0 ? (
          selectedNodes.map((n) => (
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

      <Box mb={1.5}>
        <TextField
          fullWidth
          size="small"
          label="カテゴリ検索"
          placeholder="カテゴリ名で検索"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        {searchResults.length > 0 && (
          <Box
            sx={{
              mt: 1,
              border: "1px solid #ddd",
              borderRadius: 1,
              maxHeight: 240,
              overflowY: "auto",
              backgroundColor: "#fff",
            }}
          >
            {searchResults.map((category) => (
              <Box
                key={category.id}
                onClick={() => handleSearchSelect(category.id)}
                sx={{
                  px: 1.5,
                  py: 1,
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                  "&:hover": {
                    backgroundColor: "#f5f5f5",
                  },
                }}
              >
                <Typography fontSize="13px">
                  {category.path}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <TextField
        select
        label={`カテゴリ${shownDepth + 1}`}
        value={valueForShownDepth}
        onChange={(e) => handlePick(Number(e.target.value))}
        fullWidth
        size="small"
      >
        {optionsForShownDepth.length > 0 ? (
          optionsForShownDepth.map((cat) => (
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

      <Box mt={1}>
        <Typography variant="caption" color="text.secondary">
          最下層まで選択するとカテゴリが確定します
        </Typography>
      </Box>
    </Box>
  );
}
