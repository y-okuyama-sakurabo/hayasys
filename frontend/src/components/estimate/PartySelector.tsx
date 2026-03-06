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
import debounce from "lodash/debounce";

type Props = {
  basic: any;
  dispatch: React.Dispatch<any>;
  type?: "estimate" | "order";
};

export default function PartySelector({
  basic,
  dispatch,
  type = "estimate",
}: Props) {
  const isOrder = type === "order";

  const idKey = isOrder ? "customer_id" : "party_id";
  const newKey = isOrder ? "new_customer" : "new_party";
  const dateKey = isOrder ? "order_date" : "estimate_date";

  const newData = basic?.[newKey] || {};

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);

  const toPayload = (detail: any) => {
    const getId = (v: any) =>
      v && typeof v === "object" ? v.id : v ?? null;

    return {
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
    };
  };

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

  const handleChange = (field: string, value: any) => {
    let normalizedValue: any = value;

    if (field === "birthdate") {
      if (dayjs.isDayjs(value)) {
        normalizedValue = value.isValid()
          ? value.format("YYYY-MM-DD")
          : null;
      } else if (!value) {
        normalizedValue = null;
      }
    } else {
      if (value === "") normalizedValue = null;
    }

    dispatch({
      type: "SET_BASIC",
      payload: {
        [newKey]: {
          ...newData,
          [field]: normalizedValue,
        },
      },
    });
  };

  const debouncedSearch = useMemo(
    () =>
      debounce(async (value: string) => {
        if (!value) {
          setResults([]);
          return;
        }
        const res = await apiClient.get(
          `/customers/?search=${value}`
        );
        setResults(res.data.results || res.data || []);
      }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(search);
    return () => debouncedSearch.cancel();
  }, [search, debouncedSearch]);

  const handleSelect = async (customer: any) => {
    const res = await apiClient.get(
      `/customers/${customer.id}/`
    );
    const detail = res.data;

    dispatch({
      type: "SET_BASIC",
      payload: {
        [idKey]: detail.id,
        [newKey]: toPayload(detail),
      },
    });

    setSearch(detail.name);
    setResults([]);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* 顧客検索 */}
        <Box display="flex" gap={2} mb={2}>
          <TextField
            label="顧客検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
          />
          <Button
            variant="outlined"
            onClick={() => debouncedSearch(search)}
          >
            検索
          </Button>
        </Box>

        {search && results.length > 0 && (
          <List sx={{ border: "1px solid #ddd", mb: 2 }}>
            {results.map((customer) => (
              <ListItemButton
                key={customer.id}
                onClick={() => handleSelect(customer)}
              >
                <ListItemText
                  primary={customer.name}
                  secondary={customer.phone || ""}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          顧客情報
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="氏名"
              fullWidth
              value={newData?.name || ""}
              onChange={(e) =>
                handleChange("name", e.target.value)
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="カナ"
              fullWidth
              value={newData?.kana || ""}
              onChange={(e) =>
                handleChange("kana", e.target.value)
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="メール"
              fullWidth
              value={newData?.email || ""}
              onChange={(e) =>
                handleChange("email", e.target.value)
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="電話番号"
              fullWidth
              value={newData?.phone || ""}
              onChange={(e) =>
                handleChange("phone", e.target.value)
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="携帯電話"
              fullWidth
              value={newData?.mobile_phone || ""}
              onChange={(e) =>
                handleChange("mobile_phone", e.target.value)
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="郵便番号"
              fullWidth
              value={newData?.postal_code || ""}
              onChange={(e) =>
                handleChange("postal_code", e.target.value)
              }
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="住所"
              fullWidth
              value={newData?.address || ""}
              onChange={(e) =>
                handleChange("address", e.target.value)
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="会社名"
              fullWidth
              value={newData?.company || ""}
              onChange={(e) =>
                handleChange("company", e.target.value)
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="会社電話番号"
              fullWidth
              value={newData?.company_phone || ""}
              onChange={(e) =>
                handleChange("company_phone", e.target.value)
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <DatePicker
              label="生年月日"
              value={
                newData?.birthdate
                  ? dayjs(newData.birthdate)
                  : null
              }
              onChange={(newDate) =>
                handleChange("birthdate", newDate)
              }
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              label="顧客区分"
              fullWidth
              value={newData?.customer_class ?? ""}
              onChange={(e) =>
                handleChange(
                  "customer_class",
                  e.target.value === ""
                    ? null
                    : Number(e.target.value)
                )
              }
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              label="地域"
              fullWidth
              value={newData?.region ?? ""}
              onChange={(e) =>
                handleChange(
                  "region",
                  e.target.value === ""
                    ? null
                    : Number(e.target.value)
                )
              }
            >
              {regions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              label="性別"
              fullWidth
              value={newData?.gender ?? ""}
              onChange={(e) =>
                handleChange(
                  "gender",
                  e.target.value === ""
                    ? null
                    : Number(e.target.value)
                )
              }
            >
              {genders.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 🔥 日付分岐 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <DatePicker
              label={isOrder ? "受注日" : "見積日"}
              value={
                basic?.[dateKey]
                  ? dayjs(basic[dateKey])
                  : dayjs()
              }
              onChange={(newDate) =>
                dispatch({
                  type: "SET_BASIC",
                  payload: {
                    [dateKey]:
                      newDate?.format("YYYY-MM-DD") ||
                      dayjs().format("YYYY-MM-DD"),
                  },
                })
              }
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
}