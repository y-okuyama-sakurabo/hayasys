"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  TextField,
  Typography,
  Grid,
  MenuItem,
  Paper,
  Chip,
  IconButton,
  Autocomplete,
  CircularProgress,
  Collapse,
  Button,
  FormControl,
  Select,
  Divider,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import apiClient from "@/lib/apiClient";
import PhoneField from "@/components/ui/PhoneField";
import debounce from "lodash/debounce";
import DatePartsSelector, {
  DateParts,
  parseDate,
  buildDate,
} from "./DatePartsSelector";

// ─────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────
const THIS_YEAR = new Date().getFullYear();
const YEARS_BIRTH = Array.from({ length: 100 }, (_, i) => THIS_YEAR - i);

// ─────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────

/** 郵便番号フォーマット: xxx-xxxx */
const formatZip = (val: string) => {
  const raw = val.replace(/[^0-9]/g, "").slice(0, 7);
  return raw.length <= 3 ? raw : `${raw.slice(0, 3)}-${raw.slice(3)}`;
};


/** ひらがな → カタカナ変換 */
const hiraganaToKatakana = (str: string) =>
  str.replace(/[ぁ-ゖ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );

// ─────────────────────────────────────────────────────────
// セクション見出し
// ─────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Box mb={1.5} mt={2}>
      <Typography
        variant="overline"
        fontSize={10}
        fontWeight="bold"
        color="text.disabled"
        letterSpacing={1.5}
        display="block"
        lineHeight={1.8}
      >
        {children}
      </Typography>
      <Divider />
    </Box>
  );
}

// ─────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────
type Props = {
  basic: any;
  dispatch: React.Dispatch<any>;
  type?: "estimate" | "order";
};

// ─────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────
export default function PartySelector({
  basic,
  dispatch,
  type = "estimate",
}: Props) {
  const isOrder = type === "order";
  const idKey  = isOrder ? "customer_id" : "party_id";
  const newKey = isOrder ? "new_customer" : "new_party";

  const newData    = basic?.[newKey] || {};
  const selectedId = basic?.[idKey];

  // ── 検索 ──
  const [searchInput, setSearchInput]     = useState("");
  const [searchOptions, setSearchOptions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [detailOpen, setDetailOpen]       = useState(false);

  // ── マスター ──
  const [classes, setClasses] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);

  // ── 生年月日 ──
  const [dateBirth, setDateBirth] = useState<DateParts>(() =>
    parseDate(newData?.birthdate)
  );

  // ── 郵便番号 ──
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError,   setZipError]   = useState<string | null>(null);

  // ── バリデーション (改善③) ──
  const [nameTouched, setNameTouched] = useState(false);
  const nameError = nameTouched && !newData?.name?.trim();

  // ── フリガナ自動入力 (改善②) ──
  const composingHiraganaRef = useRef("");
  const kanaAutoRef          = useRef(true); // true=自動入力モード, false=手動編集済み

  // ── 既存顧客上書き警告 (改善⑤) ──
  const [overwriteDialog, setOverwriteDialog] = useState(false);
  const [pendingCustomer,  setPendingCustomer]  = useState<any>(null);

  // マスター取得
  useEffect(() => {
    Promise.all([
      apiClient.get("/masters/customer_classes/"),
      apiClient.get("/masters/regions/"),
      apiClient.get("/masters/genders/"),
    ]).then(([cls, reg, gen]) => {
      setClasses(cls.data);
      setRegions(reg.data);
      setGenders(gen.data);
    });
  }, []);

  // 既存顧客選択時に検索欄へ名前を反映
  useEffect(() => {
    if (newData?.name && selectedId) {
      setSearchInput(newData.name);
      kanaAutoRef.current = false; // 既存顧客はフリガナが確定済みなので自動入力しない
    }
  }, [selectedId]);

  // 生年月日の外部変更を同期
  useEffect(() => {
    setDateBirth(parseDate(newData?.birthdate));
  }, [newData?.birthdate]);

  // ── フィールド変更 ──
  const handleChange = (field: string, value: any) => {
    const normalized = value === "" ? null : value;
    dispatch({
      type: "SET_BASIC",
      payload: { [newKey]: { ...newData, [field]: normalized } },
    });
  };

  // ── 生年月日 ──
  const handleDateBirth = (parts: DateParts) => {
    setDateBirth(parts);
    const str = buildDate(parts.year, parts.month, parts.day);
    dispatch({
      type: "SET_BASIC",
      payload: { [newKey]: { ...newData, birthdate: str } },
    });
  };


  // ── フリガナ自動入力 (改善②) ──
  const handleNameCompositionUpdate = (
    e: React.CompositionEvent<HTMLInputElement>
  ) => {
    composingHiraganaRef.current = e.data || "";
  };
  const handleNameCompositionEnd = () => {
    if (!kanaAutoRef.current) return;
    const katakana = hiraganaToKatakana(composingHiraganaRef.current);
    if (katakana) {
      const next = (newData?.kana || "") + katakana;
      handleChange("kana", next);
    }
    composingHiraganaRef.current = "";
  };

  // ── 氏名変更 (バリデーション③ + フリガナ②) ──
  const handleNameChange = (val: string) => {
    setNameTouched(true);
    handleChange("name", val);
  };

  // ── フリガナ手動編集時は自動入力モード解除 ──
  const handleKanaChange = (val: string) => {
    kanaAutoRef.current = false;
    handleChange("kana", val);
  };

  // ── payload helper ──
  const toPayload = (detail: any) => {
    const getId = (v: any) => (v && typeof v === "object" ? v.id : v ?? null);
    return {
      source_customer: detail?.id ?? null,
      name:           detail?.name || "",
      kana:           detail?.kana ?? "",
      email:          detail?.email ?? "",
      postal_code:    detail?.postal_code ?? "",
      address:        detail?.address ?? "",
      phone:          detail?.phone ?? "",
      mobile_phone:   detail?.mobile_phone ?? "",
      company:        detail?.company ?? "",
      company_phone:  detail?.company_phone ?? "",
      customer_class: getId(detail?.customer_class),
      region:         getId(detail?.region),
      gender:         getId(detail?.gender),
      birthdate:      detail?.birthdate ?? null,
    };
  };

  // ── デバウンス検索 ──
  const debouncedSearch = useMemo(
    () =>
      debounce(async (value: string) => {
        if (!value.trim()) { setSearchOptions([]); return; }
        setSearchLoading(true);
        try {
          const res = await apiClient.get(
            `/customers/?search=${encodeURIComponent(value)}`
          );
          setSearchOptions(res.data.results || res.data || []);
        } catch {
          setSearchOptions([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchInput);
    return () => debouncedSearch.cancel();
  }, [searchInput, debouncedSearch]);

  // ── 顧客確定選択 ──
  const doSelect = async (customer: any) => {
    const res    = await apiClient.get(`/customers/${customer.id}/`);
    const detail = res.data;
    dispatch({
      type: "SET_BASIC",
      payload: { [idKey]: detail.id, [newKey]: toPayload(detail) },
    });
    setSearchInput(detail.name);
    setDetailOpen(false);
    kanaAutoRef.current = false;
    setNameTouched(false);
  };

  // ── 顧客選択（上書き警告あり: 改善⑤） ──
  const handleSelect = (customer: any) => {
    if (!customer) return;
    if (selectedId) {
      // 既に別顧客が選択されている → 確認ダイアログ
      setPendingCustomer(customer);
      setOverwriteDialog(true);
    } else {
      doSelect(customer);
    }
  };

  // ── 顧客クリア ──
  const handleClear = () => {
    dispatch({ type: "SET_BASIC", payload: { [idKey]: null, [newKey]: null } });
    setSearchInput("");
    setSearchOptions([]);
    setDetailOpen(false);
    setDateBirth({ year: "", month: "", day: "" });
    kanaAutoRef.current = true;
    setNameTouched(false);
  };

  // ── 郵便番号 → 住所自動入力 ──
  const fetchAddress = async () => {
    const raw = (newData?.postal_code || "").replace(/[^0-9]/g, "");
    if (raw.length !== 7) {
      setZipError("7桁の郵便番号を入力してから検索してください");
      return;
    }
    setZipLoading(true);
    setZipError(null);
    try {
      const res  = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${raw}`
      );
      const data = await res.json();
      if (!data.results) {
        setZipError("該当する住所が見つかりませんでした");
        return;
      }
      const r           = data.results[0];
      const addr        = r.address2 + r.address3;
      const regionMatch = regions.find((x) => x.name === r.address1);
      dispatch({
        type: "SET_BASIC",
        payload: {
          [newKey]: {
            ...newData,
            address: addr,
            ...(regionMatch ? { region: regionMatch.id } : {}),
          },
        },
      });
    } catch {
      setZipError("住所取得に失敗しました（通信エラー）");
    } finally {
      setZipLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ── 既存顧客検索 ── */}
      <Box mb={2.5}>
        <Typography
          variant="subtitle2"
          fontWeight="bold"
          color="text.secondary"
          mb={1}
        >
          既存顧客を検索（任意）
        </Typography>

        <Box display="flex" gap={1} alignItems="center">
          <Autocomplete
            sx={{ flex: 1, maxWidth: 420 }}
            freeSolo
            filterOptions={(x) => x}
            options={searchOptions}
            getOptionLabel={(opt) =>
              typeof opt === "string"
                ? opt
                : `${opt.name}${opt.phone ? `（${opt.phone}）` : ""}`
            }
            inputValue={searchInput}
            onInputChange={(_, v, reason) => {
              if (reason !== "reset") setSearchInput(v);
            }}
            onChange={(_, v) => {
              if (v && typeof v === "object") handleSelect(v);
            }}
            loading={searchLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="氏名・電話番号・住所などで検索"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchLoading && <CircularProgress size={16} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, opt) => (
              <li {...props} key={opt.id}>
                <Box>
                  <Typography fontSize={14} fontWeight="bold">
                    {opt.name}
                  </Typography>
                  <Typography fontSize={12} color="text.secondary">
                    {[opt.phone, opt.kana, opt.address]
                      .filter(Boolean)
                      .join(" / ")}
                  </Typography>
                </Box>
              </li>
            )}
            noOptionsText="該当なし"
          />

          {selectedId && (
            <IconButton
              size="small"
              onClick={handleClear}
              title="顧客選択を解除"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* 選択中バッジ */}
        {selectedId && newData?.name && (
          <Box mt={1} display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Chip
              icon={<PersonIcon />}
              label={`${newData.name}（ID: ${selectedId}）`}
              color="primary"
              size="small"
            />
            <Button
              size="small"
              variant="text"
              onClick={() => setDetailOpen((v) => !v)}
              endIcon={detailOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ fontSize: 12 }}
            >
              {detailOpen ? "顧客情報を隠す" : "顧客情報を確認・編集"}
            </Button>
          </Box>
        )}
      </Box>

      {/* ── 顧客情報フォーム ── */}
      <Collapse in={!selectedId || detailOpen}>
        {selectedId && (
          <Paper
            variant="outlined"
            sx={{ p: 1.5, mb: 2, bgcolor: "#f9fbff", borderColor: "#90caf9" }}
          >
            <Typography variant="caption" color="primary" fontWeight="bold">
              ※ 既存顧客の情報を確認・編集中です（保存時に顧客マスタへは反映されません）
            </Typography>
          </Paper>
        )}

        {/* ━━━━━━━━ 基本情報 ━━━━━━━━ */}
        <SectionLabel>基本情報</SectionLabel>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              fullWidth
              size="small"
              label="氏名 *"
              value={newData?.name || ""}
              error={nameError}
              helperText={nameError ? "氏名は必須です" : ""}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => setNameTouched(true)}
              inputProps={{
                onCompositionUpdate: handleNameCompositionUpdate,
                onCompositionEnd:    handleNameCompositionEnd,
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              fullWidth
              size="small"
              label="フリガナ（カタカナ）"
              value={newData?.kana || ""}
              onChange={(e) => handleKanaChange(e.target.value)}
              onFocus={() => { kanaAutoRef.current = false; }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="性別"
              value={newData?.gender ?? ""}
              onChange={(e) =>
                handleChange(
                  "gender",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            >
              <MenuItem value="">-</MenuItem>
              {genders.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {/* ━━━━━━━━ 個人属性 ━━━━━━━━ */}
        <SectionLabel>個人属性</SectionLabel>
        {/* 顧客区分: 単独行 */}
        <Box mb={2}>
          <TextField
            select
            size="small"
            label="顧客区分"
            value={newData?.customer_class ?? ""}
            onChange={(e) =>
              handleChange(
                "customer_class",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">未選択</MenuItem>
            {classes.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {/* 生年月日: 単独行 */}
        <Box mb={1}>
          <DatePartsSelector
            label="生年月日"
            value={dateBirth}
            onChange={handleDateBirth}
            years={YEARS_BIRTH}
          />
        </Box>

        {/* ━━━━━━━━ 連絡先 ━━━━━━━━ */}
        <SectionLabel>連絡先</SectionLabel>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <PhoneField
              fullWidth
              size="small"
              label="電話番号（自宅・固定）"
              value={newData?.phone}
              onChange={(v) => handleChange("phone", v)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <PhoneField
              fullWidth
              size="small"
              label="携帯電話番号"
              value={newData?.mobile_phone}
              onChange={(v) => handleChange("mobile_phone", v)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="メールアドレス"
              type="email"
              value={newData?.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </Grid>
        </Grid>

        {/* ━━━━━━━━ 住所 ━━━━━━━━ */}
        <SectionLabel>住所</SectionLabel>
        {zipError && (
          <Alert
            severity="warning"
            onClose={() => setZipError(null)}
            sx={{ mb: 1.5 }}
          >
            {zipError}
          </Alert>
        )}
        <Grid container spacing={2} alignItems="flex-end">
          {/* 郵便番号 */}
          <Grid size={{ xs: 7, sm: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="郵便番号"
              placeholder="000-0000"
              value={newData?.postal_code || ""}
              onChange={(e) =>
                handleChange("postal_code", formatZip(e.target.value))
              }
              inputProps={{ maxLength: 8 }}
            />
          </Grid>

          {/* 住所検索ボタン */}
          <Grid size={{ xs: 5, sm: "auto" }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={
                zipLoading ? (
                  <CircularProgress size={14} />
                ) : (
                  <SearchIcon fontSize="small" />
                )
              }
              onClick={fetchAddress}
              disabled={zipLoading}
              sx={{ whiteSpace: "nowrap", height: 40 }}
            >
              住所を検索
            </Button>
          </Grid>

          {/* 都道府県 */}
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="都道府県"
              value={newData?.region ?? ""}
              onChange={(e) =>
                handleChange(
                  "region",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            >
              <MenuItem value="">未選択</MenuItem>
              {regions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 市区町村・番地 */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              label="市区町村・番地・建物名"
              value={newData?.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </Grid>
        </Grid>

        {/* ━━━━━━━━ 勤務先 ━━━━━━━━ */}
        <SectionLabel>勤務先</SectionLabel>
        <Grid container spacing={2} mb={0.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="会社名・法人名"
              value={newData?.company || ""}
              onChange={(e) => handleChange("company", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <PhoneField
              fullWidth
              size="small"
              label="会社電話番号"
              value={newData?.company_phone}
              onChange={(v) => handleChange("company_phone", v)}
            />
          </Grid>
        </Grid>
      </Collapse>

      {/* 折りたたみ中サマリ */}
      {selectedId && !detailOpen && newData?.name && (
        <Box
          sx={{
            p: 1.5,
            mt: 1,
            bgcolor: "#f5f5f5",
            borderRadius: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          {[
            { label: "電話",   value: newData.phone },
            { label: "携帯",   value: newData.mobile_phone },
            { label: "住所",   value: newData.address },
            { label: "メール", value: newData.email },
          ]
            .filter((i) => i.value)
            .map((i) => (
              <Typography key={i.label} variant="body2" color="text.secondary">
                {i.label}: {i.value}
              </Typography>
            ))}
        </Box>
      )}

      {/* ━━━━━━━━ 既存顧客上書き確認ダイアログ (改善⑤) ━━━━━━━━ */}
      <Dialog
        open={overwriteDialog}
        onClose={() => setOverwriteDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          顧客を切り替えますか？
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            現在選択中の顧客「{newData?.name}」の情報が、新しく選択した顧客の情報に置き換わります。
          </Typography>
          {pendingCustomer && (
            <Box
              mt={1.5}
              p={1.5}
              bgcolor="#e3f2fd"
              borderRadius={1}
              border="1px solid #90caf9"
            >
              <Typography variant="body2" fontWeight="bold">
                切り替え先: {pendingCustomer.name}
              </Typography>
              {pendingCustomer.phone && (
                <Typography variant="caption" color="text.secondary">
                  {pendingCustomer.phone}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOverwriteDialog(false);
              setPendingCustomer(null);
              // 検索欄を現在の顧客名に戻す
              setSearchInput(newData?.name || "");
            }}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setOverwriteDialog(false);
              if (pendingCustomer) doSelect(pendingCustomer);
              setPendingCustomer(null);
            }}
          >
            切り替える
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
