"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import PartySelector from "./PartySelector";
import apiClient from "@/lib/apiClient";

export default function BasicInfoForm({ formData, setFormData }: any) {
  const [newParty, setNewParty] = useState<any>({});
  const [shops, setShops] = useState<any[]>([]);

  const [estimateData, setEstimateData] = useState({
    shop_id: "",
    estimate_date: dayjs().format("YYYY-MM-DD"),
  });

  // === 店舗一覧 ===
  useEffect(() => {
    apiClient
      .get("/masters/shops/")
      .then((res) => setShops(res.data.results || res.data || []))
      .catch((err) => console.error("🏪 店舗取得失敗:", err));
  }, []);

  // === 見積編集時のみ party を初期反映 ===
  useEffect(() => {
    if (!formData?.party) return;

    const p = formData.party;

    const init = {
      id: p.id ?? null,
      name: p.name || "",
      kana: p.kana || "",
      email: p.email || "",
      postal_code: p.postal_code || "",
      address: p.address || "",
      phone: p.phone || "",
      mobile_phone: p.mobile_phone || "",
      company: p.company || "",
      company_phone: p.company_phone || "",
      birthdate: p.birthdate ?? null,
      customer_class:
        typeof p.customer_class === "object"
          ? p.customer_class.id
          : p.customer_class ?? null,
      region:
        typeof p.region === "object"
          ? p.region.id
          : p.region ?? null,
      gender:
        typeof p.gender === "object"
          ? p.gender.id
          : p.gender ?? null,
    };

    setNewParty(init);

    // 🔥 見積編集時のみ party_id を使う
    if (formData.id) {
      setFormData((prev: any) => ({
        ...prev,
        party_id: p.id,
      }));
    }
  }, [formData?.party]);

  // === 既存顧客選択 ===
  const handleSelectParty = (customer: any) => {
    setFormData((prev: any) => ({
      ...prev,

      // 🔥 見積作成では party_id を使わない
      party_id: undefined,

      new_party: {
        source_customer: customer.id,
        name: customer.name,
        kana: customer.kana,
        email: customer.email,
        postal_code: customer.postal_code,
        address: customer.address,
        phone: customer.phone,
        mobile_phone: customer.mobile_phone,
        company: customer.company,
        company_phone: customer.company_phone,
        birthdate: customer.birthdate,
        customer_class: customer.customer_class?.id ?? null,
        region: customer.region?.id ?? null,
        gender: customer.gender?.id ?? null,
      },
    }));
  };

  // === 見積編集時：shop を id に正規化 ===
  useEffect(() => {
    if (formData?.shop && typeof formData.shop === "object") {
      setFormData((prev: any) => ({
        ...prev,
        shop: formData.shop.id,
      }));
    }
  }, [formData?.shop]);

  // === 新規顧客入力 ===
  useEffect(() => {
    if (!newParty || Object.keys(newParty).length === 0) return;

    setFormData((prev: any) => ({
      ...prev,
      party_id: undefined, // 🔥 念のため完全排除
      new_party: newParty,
    }));
  }, [newParty]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* 店舗 */}
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>
          店舗情報
        </Typography>

        <FormControl size="small" sx={{ mb: 3, minWidth: 240 }}>
          <InputLabel>店舗を選択</InputLabel>
          <Select
            value={formData.shop || ""}
            label="店舗を選択"
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                shop: e.target.value,
              }))
            }
          >
            {shops.map((shop) => (
              <MenuItem key={shop.id} value={shop.id}>
                {shop.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 顧客 */}
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>
          顧客情報
        </Typography>

        <PartySelector
          onSelectParty={handleSelectParty}
          newParty={newParty}
          setNewParty={setNewParty}
          estimateData={estimateData}
          setEstimateData={setEstimateData}
          party={formData.party}
          formData={formData}
          setFormData={setFormData}
        />
      </Box>
    </LocalizationProvider>
  );
}
