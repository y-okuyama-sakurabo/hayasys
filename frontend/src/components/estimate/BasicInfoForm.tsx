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
  // 顧客データ（新規入力 or 既存顧客）
  const [newParty, setNewParty] = useState<any>({});
  const [shops, setShops] = useState<any[]>([]);

  // 見積データ（受注側では使わないが一旦残す）
  const [estimateData, setEstimateData] = useState({
    shop_id: "",
    estimate_date: dayjs().format("YYYY-MM-DD"),
  });

  // === 店舗一覧ロード ===
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await apiClient.get("/masters/shops/");
        setShops(res.data.results || res.data || []);
      } catch (err) {
        console.error("🏪 店舗一覧の取得エラー:", err);
      }
    };
    fetchShops();
  }, []);

  // === 初期セット（見積から来た customer） ===
  useEffect(() => {
    if (formData?.party) {
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

      console.log("🟢 BasicInfoForm initParty:", init);
      setNewParty(init);

      setFormData((prev: any) => ({
        ...prev,
        new_party: init,
        party_id: p.id,
      }));
    }

    if (formData?.shop && typeof formData.shop === "object") {
      setFormData((prev: any) => ({
        ...prev,
        shop: formData.shop.id,
      }));
    }
  }, [formData?.customer, formData?.shop]);

  // === 既存顧客を選択したとき ===
  const handleSelectParty = (party: any) => {
    setFormData((prev: any) => ({
      ...prev,
      party_id: party.id, // 既存顧客ID
      new_party: {},   // 新規顧客入力は消す
    }));
  };

  // === 手入力中の新規顧客が変わるたびに new_customer を更新 ===
  useEffect(() => {
    if (Object.keys(newParty || {}).length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        new_party: newParty,   // ★ 修正
      }));
    }
  }, [newParty]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>

        {/* 店舗選択 */}
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>
          店舗情報
        </Typography>
        <FormControl size="small" sx={{ mb: 3 }}>
          <InputLabel id="shop-select-label">店舗を選択</InputLabel>
          <Select
            value={formData.shop || ""}
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

        {/* 顧客情報 */}
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>
          顧客情報
        </Typography>

        <PartySelector
          onSelectParty={handleSelectParty}
          newParty={newParty}
          setNewParty={setNewParty}
          estimateData={estimateData}
          setEstimateData={setEstimateData}
          party={formData.customer}
          formData={formData}
          setFormData={setFormData}
        />
      </Box>
    </LocalizationProvider>
  );
}
