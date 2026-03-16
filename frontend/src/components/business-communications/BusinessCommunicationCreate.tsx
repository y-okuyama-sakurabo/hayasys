"use client";

import {
  Paper,
  TextField,
  Button,
  Stack,
  Typography,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Box
} from "@mui/material";

import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";

export default function BusinessCommunicationCreate({
  customerId,
  refresh
}: any) {

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // FROM
  const [fromType, setFromType] = useState<"shop" | "staff">("staff");

  // TO
  const [toType, setToType] = useState<"shop" | "staff">("shop");

  const [shops, setShops] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);

  const [to, setTo] = useState<any>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {

    const load = async () => {

      const shopRes = await apiClient.get("/masters/shops/");
      const staffRes = await apiClient.get("/masters/staffs/");

      const shopData = Array.isArray(shopRes.data)
        ? shopRes.data
        : shopRes.data.results ?? [];

      const staffData = Array.isArray(staffRes.data)
        ? staffRes.data
        : staffRes.data.results ?? [];

      setShops(shopData);
      setStaffs(staffData);

    };

    load();

  }, []);

  const optionLabel = (o: any) => {

    if (!o) return "";

    if (o.name) return o.name;

    if (o.display_name) {
      return `${o.display_name}（${o.shop_name ?? ""}）`;
    }

    return "";

  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {

    const f = Array.from(e.target.files || []);

    setFiles(f);
    setPreviews(f.map(x => URL.createObjectURL(x)));

  };

  const send = async () => {

    if (!title || !content) return;

    // -------------------------
    // ① thread作成
    // -------------------------

    const threadRes = await apiClient.post(
      `/customers/${customerId}/communication-threads/`,
      { title }
    );

    const threadId = threadRes.data.id;

    // -------------------------
    // ② message作成
    // -------------------------

    const form = new FormData();

    form.append("content", content);

    // sender
    form.append("sender_type", fromType);

    // receiver
    if (toType === "shop" && to) form.append("receiver_shop", to.id);
    if (toType === "staff" && to) form.append("receiver_staff", to.id);

    files.forEach(file => form.append("files", file));

    await apiClient.post(
      `/communication-threads/${threadId}/messages/`,
      form
    );

    // reset
    setTitle("");
    setContent("");
    setFiles([]);
    setPreviews([]);
    setTo(null);

    refresh();

  };

  const toOptions = toType === "shop" ? shops : staffs;

  return (

    <Paper sx={{ p:3, mb:3 }}>

      <Typography fontWeight="bold" mb={2}>
        業務連絡作成
      </Typography>

      <Grid container spacing={2} mb={2}>

        {/* FROM */}

        <Grid size={{ xs:12 }}>

          <Stack direction="row" spacing={1} alignItems="center">

            <Typography sx={{ width:45, fontSize:13 }}>
              From
            </Typography>

            <ToggleButtonGroup
              size="small"
              value={fromType}
              exclusive
              onChange={(e,v)=>{
                if(!v) return
                setToType(v)
                setTo(null)
              }}
            >
              <ToggleButton value="staff">
                スタッフ
              </ToggleButton>

              <ToggleButton value="shop">
                店舗
              </ToggleButton>
            </ToggleButtonGroup>

          </Stack>

        </Grid>

        {/* TO */}

        <Grid size={{ xs:12 }}>

          <Stack direction="row" spacing={1} alignItems="center">

            <Typography sx={{ width:30, fontSize:13 }}>
              To
            </Typography>

            <ToggleButtonGroup
              size="small"
              value={toType}
              exclusive
              onChange={(e, v) => v && setToType(v)}
            >

              <ToggleButton value="shop">
                店舗
              </ToggleButton>

              <ToggleButton value="staff">
                スタッフ
              </ToggleButton>

            </ToggleButtonGroup>

            <Autocomplete
              key={toType}
              size="small"
              sx={{flex:1}}
              options={toOptions}
              getOptionLabel={optionLabel}
              isOptionEqualToValue={(o,v)=>o.id===v.id}
              value={to}
              onChange={(e,v)=>setTo(v)}
              renderOption={(props,option)=>(
                <li {...props} key={`to-${option.id}`}>
                  {optionLabel(option)}
                </li>
              )}
              renderInput={(params)=>(
                <TextField {...params} placeholder="選択"/>
              )}
            />

          </Stack>

        </Grid>

      </Grid>

      {/* title */}

      <TextField
        fullWidth
        size="small"
        label="タイトル"
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
        sx={{ mb:2 }}
      />

      {/* content */}

      <TextField
        fullWidth
        multiline
        rows={3}
        label="内容"
        value={content}
        onChange={(e)=>setContent(e.target.value)}
        sx={{ mb:2 }}
      />

      {/* files */}

      <Stack spacing={1} mb={2}>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFiles}
        />

        {previews.length > 0 && (

          <Stack direction="row" spacing={1} flexWrap="wrap">

            {previews.map((src, i) => (
              <Box
                key={`preview-${i}`}
                component="img"
                src={src}
                sx={{
                  width:80,
                  height:80,
                  objectFit:"cover",
                  borderRadius:1
                }}
              />
            ))}

          </Stack>

        )}

      </Stack>

      <Stack direction="row" justifyContent="flex-end">

        <Button
          variant="contained"
          onClick={send}
        >
          送信
        </Button>

      </Stack>

    </Paper>

  );

}