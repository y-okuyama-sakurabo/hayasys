"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  TextField,
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import apiClient from "@/lib/apiClient";

export default function ProductSelectModal({ open, onClose, onSelect }: any) {
  const [tab, setTab] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [largeCategories, setLargeCategories] = useState<any[]>([]);
  const [middleCategories, setMiddleCategories] = useState<any[]>([]);
  const [smallCategories, setSmallCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedLarge, setSelectedLarge] = useState<string>("");
  const [selectedMiddle, setSelectedMiddle] = useState<string>("");
  const [selectedSmall, setSelectedSmall] = useState<string>("");

  // === 大カテゴリロード ===
  useEffect(() => {
    if (open) {
      apiClient.get("/categories/large/").then((res) => {
        setLargeCategories(res.data.results || res.data);
        // ダイアログ開くたびに初期化
        setSelectedLarge("");
        setSelectedMiddle("");
        setSelectedSmall("");
      });
    }
  }, [open]);

  // === リアルタイム検索（デバウンス付き） ===
  useEffect(() => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/products/?q=${keyword}`);
        setSearchResults(res.data.results || res.data || []);
      } catch (err) {
        console.error("検索エラー:", err);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [keyword]);

  // === カテゴリ選択 ===
  const handleLargeChange = async (id: string) => {
    setSelectedLarge(id);
    setSelectedMiddle("");
    setSelectedSmall("");
    const res = await apiClient.get(`/categories/middle/?large_id=${id}`);
    setMiddleCategories(res.data.results || res.data);
    setSmallCategories([]);
    setProducts([]);
  };

  const handleMiddleChange = async (id: string) => {
    setSelectedMiddle(id);
    setSelectedSmall("");
    const res = await apiClient.get(`/categories/small/?middle_id=${id}`);
    setSmallCategories(res.data.results || res.data);
    setProducts([]);
  };

  const handleSmallChange = async (id: string) => {
    setSelectedSmall(id);
    const res = await apiClient.get(`/products/?small_id=${id}`);
    setProducts(res.data.results || res.data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>商品を選択</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="サジェスト検索" />
          <Tab label="カテゴリから選択" />
        </Tabs>

        {/* === サジェスト検索タブ === */}
        {tab === 0 && (
          <Box mt={2}>
            <TextField
              fullWidth
              placeholder="商品名を入力..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              autoFocus
            />
            <List dense>
              {searchResults.map((p) => (
                <ListItemButton key={p.id} onClick={() => onSelect(p)}>
                  <ListItemText
                    primary={p.name}
                    secondary={`¥${p.price?.toLocaleString() ?? 0}`}
                  />
                </ListItemButton>
              ))}

              {keyword && searchResults.length === 0 && (
                <ListItemText
                  sx={{ mt: 2, textAlign: "center", color: "#777" }}
                  primary="該当する商品が見つかりませんでした"
                />
              )}
            </List>
          </Box>
        )}

        {/* === カテゴリ選択タブ === */}
        {tab === 1 && (
          <Box mt={2}>
            <Box display="flex" gap={2} flexWrap="wrap">
              {/* 大カテゴリ */}
              <TextField
                select
                label="大カテゴリ"
                value={selectedLarge || ""} //value追加！
                onChange={(e) => handleLargeChange(e.target.value)}
                fullWidth
              >
                {largeCategories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>

              {/* 中カテゴリ */}
              <TextField
                select
                label="中カテゴリ"
                value={selectedMiddle || ""} 
                onChange={(e) => handleMiddleChange(e.target.value)}
                fullWidth
                disabled={!middleCategories.length}
              >
                {middleCategories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>

              {/* 小カテゴリ */}
              <TextField
                select
                label="小カテゴリ"
                value={selectedSmall || ""} 
                onChange={(e) => handleSmallChange(e.target.value)}
                fullWidth
                disabled={!smallCategories.length}
              >
                {smallCategories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <List dense sx={{ mt: 2, borderTop: "1px solid #eee" }}>
              {products.map((p) => (
                <ListItemButton key={p.id} onClick={() => onSelect(p)}>
                  <ListItemText
                    primary={p.name}
                    secondary={`¥${p.price?.toLocaleString() ?? 0}`}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
