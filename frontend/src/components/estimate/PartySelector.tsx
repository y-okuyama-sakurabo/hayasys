"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Grid,
  MenuItem,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import apiClient from "@/lib/apiClient";
import { debounce } from "lodash";

type Customer = {
  id: number;
  name: string;
  kana?: string;
  email?: string;
  postal_code?: string;
  address?: string;
  phone?: string;
  mobile_phone?: string;
  company?: string;
  company_phone?: string;
  // ※ detail API だと object の場合があるので any で受ける
  customer_class?: any;
  region?: any;
  gender?: any;
  birthdate?: string | null;
};

type EstimatePartyPayload = {
  // ★ここが肝：元顧客IDをスナップショットとして持つ
  source_customer?: number | null;

  name: string;
  kana?: string | null;
  email?: string | null;
  postal_code?: string | null;
  address?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  company?: string | null;
  company_phone?: string | null;

  customer_class?: number | null;
  region?: number | null;
  gender?: number | null;
  birthdate?: string | null;

  // ここは画面で使ってないなら無くてもOK
  first_shop?: number | null;
  last_shop?: number | null;

  staff?: number | null;
};

export default function PartySelector({
  onSelectParty,
  newParty,
  setNewParty,
  estimateData,
  setEstimateData,
  formData,
  setFormData,
  party,
}: {
  onSelectParty: (party: Customer) => void;
  newParty: any;
  setNewParty: (data: any) => void;
  estimateData: any;
  setEstimateData: (data: any) => void;
  formData?: any;
  setFormData?: (data: any) => void;
  party?: any;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [shopName, setShopName] = useState("");
  const [estimateDate, setEstimateDate] = useState(dayjs());

  // ==============================
  // helper: detail/customer → new_party payload
  // ==============================
  const toPartyPayload = (detail: any): EstimatePartyPayload => {
    const getId = (v: any) => (v && typeof v === "object" ? v.id : v ?? null);

    return {
      // ★元顧客
      source_customer: detail?.id ?? null,

      name: detail?.name || "",
      kana: detail?.kana ?? "",
      email: detail?.email ?? "",
      postal_code: detail?.postal_code ?? "",
      address: detail?.address ?? "",
      phone: detail?.phone ?? "",
      mobile_phone: detail?.mobile_phone ?? "",
      company: detail?.company ?? "",
      company_phone: detail?.company_phone ?? "",

      customer_class: getId(detail?.customer_class),
      region: getId(detail?.region),
      gender: getId(detail?.gender),
      birthdate: detail?.birthdate ?? null,

      first_shop: getId(detail?.first_shop),
      last_shop: getId(detail?.last_shop),

      staff: getId(detail?.staff),
    };
  };

  // ==============================
  // 共通更新関数（フォーム入力 → new_party 更新）
  // ==============================
  const handleChange = (field: keyof EstimatePartyPayload, value: any) => {
    let normalizedValue: any = value;

    if (field === "birthdate") {
      // DatePicker から来る Dayjs / null を YYYY-MM-DD or null に
      if (dayjs.isDayjs(value)) {
        normalizedValue = value.isValid() ? value.format("YYYY-MM-DD") : null;
      } else if (!value || value === "") {
        normalizedValue = null;
      }
    } else {
      if (value === "" || value === undefined) {
        normalizedValue = null;
      }
    }

    const updated: EstimatePartyPayload = {
      ...(newParty || {}),
      [field]: normalizedValue,
    };

    setNewParty(updated);

    // ★保存用 formData も必ず new_party を更新
    if (setFormData) {
      setFormData((prev: any) => ({
        ...prev,
        new_party: updated,
      }));
    }
  };

  // ==============================
  // 初期ロード
  // ==============================
  useEffect(() => {
    Promise.all([
      apiClient.get("/masters/customer_classes/"),
      apiClient.get("/masters/regions/"),
      apiClient.get("/masters/genders/"),
      apiClient.get("/masters/shops/"),
      apiClient.get("/auth/user/"),
    ])
      .then(([cls, reg, gen, shp, user]) => {
        setClasses(cls.data);
        setRegions(reg.data);
        setGenders(gen.data);
        setShops(shp.data);
        setShopName(user.data.shop_name || "");
        setEstimateData({
          ...estimateData,
          shop_id: user.data.shop_id,
          estimate_date: dayjs().format("YYYY-MM-DD"),
        });
      })
      .catch((err) => console.error("初期データ取得失敗:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==============================
  // 編集モード：既存見積の party をフォームへ初期表示
  // ==============================
  useEffect(() => {
    if (party && Object.keys(party).length > 0 && !newParty?.name) {
      // 既存見積の party は EstimateParty なので source_customer があればそれも引き継ぎ
      const initParty: EstimatePartyPayload = {
        source_customer: party?.source_customer ?? null,

        name: party?.name || "",
        kana: party?.kana ?? "",
        email: party?.email ?? "",
        postal_code: party?.postal_code ?? "",
        address: party?.address ?? "",
        phone: party?.phone ?? "",
        mobile_phone: party?.mobile_phone ?? "",
        company: party?.company ?? "",
        company_phone: party?.company_phone ?? "",

        customer_class:
          party?.customer_class && typeof party.customer_class === "object"
            ? party.customer_class.id
            : party?.customer_class ?? null,
        region:
          party?.region && typeof party.region === "object"
            ? party.region.id
            : party?.region ?? null,
        gender:
          party?.gender && typeof party.gender === "object"
            ? party.gender.id
            : party?.gender ?? null,

        birthdate: party?.birthdate ?? null,

        first_shop:
          party?.first_shop && typeof party.first_shop === "object"
            ? party.first_shop.id
            : party?.first_shop ?? null,
        last_shop:
          party?.last_shop && typeof party.last_shop === "object"
            ? party.last_shop.id
            : party?.last_shop ?? null,

        staff:
          party?.staff && typeof party.staff === "object"
            ? party.staff.id
            : party?.staff ?? null,
      };

      setNewParty(initParty);

      if (setFormData) {
        setFormData((prev: any) => ({
          ...prev,
          new_party: initParty,
        }));
      }

      setSearch(party?.name || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party]);

  // ==============================
  // リアルタイム検索（インクリメンタルサーチ）
  // ==============================
  const debouncedSearch = useMemo(
    () =>
      debounce(async (value: string) => {
        if (!value || value.trim() === "") {
          setResults([]);
          return;
        }
        try {
          const res = await apiClient.get(`/customers/?search=${value}`);
          setResults(res.data.results || res.data || []);
        } catch (err) {
          console.error("リアルタイム顧客検索失敗:", err);
        }
      }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(search);
    return () => debouncedSearch.cancel();
  }, [search, debouncedSearch]);

  // ==============================
  // 顧客選択：必ず detail を取り、new_party（スナップショット）として保存する
  // ==============================
  const handleSelect = async (customer: Customer) => {
    try {
      const res = await apiClient.get(`/customers/${customer.id}/`);
      const detail = res.data;

      const partyData = toPartyPayload(detail);

      setNewParty(partyData);

      if (setFormData) {
        setFormData((prev: any) => ({
          ...prev,
          // ✅ 既存顧客でも「new_party」で送る（party_id / customer_id は使わない）
          new_party: partyData,

          // ✅ 事故防止：もし残ってたら消す
          customer_id: undefined,
          party_id: undefined,
        }));
      }

      onSelectParty(detail);

      setResults([]);
      setSearch(detail.name || "");
    } catch (err) {
      console.error("顧客詳細取得失敗:", err);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* ========================== */}
        {/* 顧客検索 */}
        {/* ========================== */}
        <Box display="flex" gap={2} mb={2}>
          <TextField
            label="顧客検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
          />
          <Button variant="outlined" onClick={() => debouncedSearch(search)}>
            検索
          </Button>
        </Box>

        {/* ========================== */}
        {/* 検索結果一覧 */}
        {/* ========================== */}
        {search && (
          <>
            {results.length > 0 ? (
              <List
                sx={{
                  border: "1px solid #ddd",
                  mb: 2,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {results.map((customer) => (
                  <ListItemButton
                    key={customer.id}
                    onClick={() => handleSelect(customer)}
                  >
                    <ListItemText
                      primary={customer.name}
                      secondary={customer.phone || customer.address || ""}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Box
                sx={{
                  border: "1px solid #ddd",
                  p: 2,
                  mb: 2,
                  textAlign: "center",
                  color: "text.secondary",
                  borderRadius: 1,
                  backgroundColor: "#fafafa",
                }}
              >
                該当する顧客が見つかりませんでした
              </Box>
            )}
          </>
        )}

        {/* ========================== */}
        {/* 顧客情報フォーム */}
        {/* ========================== */}
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>
          顧客情報
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="氏名"
              value={newParty?.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="カナ"
              value={newParty?.kana || ""}
              onChange={(e) => handleChange("kana", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="メールアドレス"
              type="email"
              value={newParty?.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="電話番号"
              value={newParty?.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="携帯電話"
              value={newParty?.mobile_phone || ""}
              onChange={(e) => handleChange("mobile_phone", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="郵便番号"
              value={newParty?.postal_code || ""}
              onChange={(e) => handleChange("postal_code", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="住所"
              value={newParty?.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="会社名"
              value={newParty?.company || ""}
              onChange={(e) => handleChange("company", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="会社電話番号"
              value={newParty?.company_phone || ""}
              onChange={(e) => handleChange("company_phone", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <DatePicker
              label="生年月日"
              value={newParty?.birthdate ? dayjs(newParty.birthdate) : null}
              onChange={(newDate: any) => {
                handleChange("birthdate", newDate);
              }}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="顧客区分"
              value={newParty?.customer_class ?? ""}
              onChange={(e) =>
                handleChange(
                  "customer_class",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              fullWidth
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="地域"
              value={newParty?.region ?? ""}
              onChange={(e) =>
                handleChange(
                  "region",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              fullWidth
            >
              {regions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="性別"
              value={newParty?.gender ?? ""}
              onChange={(e) =>
                handleChange(
                  "gender",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              fullWidth
            >
              {genders.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {/* ========================== */}
        {/* 見積情報 */}
        {/* ========================== */}
        <Box mt={5} pt={3} borderTop="1px solid #ddd">
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>
            見積情報
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <DatePicker
                label="見積日"
                value={dayjs(estimateData?.estimate_date) || estimateDate}
                onChange={(newDate) => {
                  const date = newDate || dayjs();
                  setEstimateDate(date);
                  setEstimateData((prev: any) => ({
                    ...prev,
                    estimate_date: date.format("YYYY-MM-DD"),
                  }));
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}
