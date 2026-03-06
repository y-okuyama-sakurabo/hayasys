"use client";

import React, { Suspense, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  Select,
  InputLabel,
  TextField,
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddTaskIcon from "@mui/icons-material/AddTask";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";

import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/apiClient";

type Estimate = {
  id: number;
  estimate_no: string;
  party: { name: string } | null;
  items?: { product?: { name: string } | null; name: string }[];
  grand_total?: string | number;
  created_at: string;
  created_by?: { display_name?: string } | null;
};

type Shop = {
  id: number;
  name: string;
};

function EstimateListPageInner() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshKey = searchParams.get("_r");

  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | "all">("all");

  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [loading, setLoading] = useState(true);

  const [menuAnchor, setMenuAnchor] = useState<{ [key:number]:HTMLElement|null }>({});
  const [deleteTarget,setDeleteTarget] = useState<Estimate|null>(null);

  // =========================
  // 見積取得
  // =========================

  const fetchEstimates = async (shopId:number|"all") => {

    try {

      const params = new URLSearchParams();

      if(shopId!=="all") params.append("shop_id",String(shopId));

      if(searchInput) params.append("search",searchInput);

      if(dateFrom) params.append("date_from",dateFrom);
      if(dateTo) params.append("date_to",dateTo);

      if(amountMin) params.append("amount_min",amountMin);
      if(amountMax) params.append("amount_max",amountMax);

      const query = params.toString()?`?${params.toString()}`:"";

      const res = await apiClient.get(`/estimates/${query}`);

      setEstimates(res.data.results || res.data || []);

    }catch(err){

      console.error("見積一覧取得失敗:",err);

    }

  };

  // =========================
  // 初期ロード
  // =========================

  useEffect(()=>{

    const init = async ()=>{

      try{

        const meRes = await apiClient.get("/auth/user/");
        const staffShopId = meRes.data?.shop_id ?? "all";

        const shopRes = await apiClient.get("/masters/shops/");
        const shopList = shopRes.data.results || shopRes.data;

        setShops(shopList);
        setSelectedShop(staffShopId);

        await fetchEstimates(staffShopId);

      }catch(err){

        console.error(err);
        await fetchEstimates("all");

      }finally{

        setLoading(false);

      }

    };

    init();

  },[refreshKey]);

  // =========================
  // 店舗変更
  // =========================

  const handleShopChange = async (event:any)=>{

    const newShop = event.target.value;

    setSelectedShop(newShop);

    await fetchEstimates(newShop);

  };

  // =========================
  // 検索
  // =========================

  const applySearch = async ()=>{

    await fetchEstimates(selectedShop);

  };

  // =========================
  // メニュー
  // =========================

  const handleMenuOpen = (event:any,id:number)=>{

    event.stopPropagation();

    setMenuAnchor(prev=>({...prev,[id]:event.currentTarget}));

  };

  const handleMenuClose = (id:number)=>{

    setMenuAnchor(prev=>({...prev,[id]:null}));

  };

  // =========================
  // アクション
  // =========================

  const handleAction = (action:string,id:number)=>{

    handleMenuClose(id);

    switch(action){

      case "detail":
        router.push(`/dashboard/estimates/${id}`);
        break;

      case "edit":
        router.push(`/dashboard/estimates/${id}/edit?_r=${Date.now()}`);
        break;

      case "duplicate":
        router.push(`/dashboard/estimates/new?copy_from=${id}`);
        break;

      case "order":
        router.push(`/dashboard/orders/new?from_estimate=${id}`);
        break;

      case "delete":
        const target = estimates.find(e=>e.id===id);
        if(target) setDeleteTarget(target);
        break;

    }

  };

  // =========================
  // 削除
  // =========================

  const handleDelete = async ()=>{

    if(!deleteTarget) return;

    try{

      await apiClient.delete(`/estimates/${deleteTarget.id}/`);

      setEstimates(prev =>
        prev.filter(e => e.id !== deleteTarget.id)
      );

      setDeleteTarget(null);

    }catch(err){

      console.error(err);
      alert("削除に失敗しました");

    }

  };

  const formatPrice = (value:any)=>{

    if(!value) return "-";

    return `¥${Number(value).toLocaleString()}`;

  };

  if(loading)
    return(
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress/>
      </Box>
    );

  return(
    <>

      {/* ヘッダ */}
      <Box display="flex" justifyContent="space-between" mb={3}>

        <Typography variant="h5" fontWeight="bold">
          見積一覧
        </Typography>

        <Box display="flex" gap={2}>

          <FormControl size="small" sx={{minWidth:180}}>
            <InputLabel>店舗</InputLabel>

            <Select
              value={selectedShop}
              label="店舗"
              onChange={handleShopChange}
            >
              <MenuItem value="all">全店舗</MenuItem>

              {shops.map(shop=>(
                <MenuItem key={shop.id} value={shop.id}>
                  {shop.name}
                </MenuItem>
              ))}

            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={()=>router.push(`/dashboard/estimates/new?_r=${Date.now()}`)}
          >
            新規作成
          </Button>

        </Box>

      </Box>

      {/* 検索 */}
      <Paper sx={{p:2,mb:3}}>

        <Box mb={2}>

          <TextField
            size="small"
            value={searchInput}
            onChange={(e)=>setSearchInput(e.target.value)}
            onKeyDown={(e)=>{if(e.key==="Enter")applySearch()}}
            sx={{width:360}}
          />

        </Box>

        <Box display="flex" gap={3} flexWrap="wrap" mb={2}>

          <Box display="flex" alignItems="center" gap={1}>

            <Typography fontSize={13}>見積日</Typography>

            <TextField
              type="date"
              size="small"
              value={dateFrom}
              onChange={(e)=>setDateFrom(e.target.value)}
              sx={{width:160}}
            />

            <Typography>〜</Typography>

            <TextField
              type="date"
              size="small"
              value={dateTo}
              onChange={(e)=>setDateTo(e.target.value)}
              sx={{width:160}}
            />

          </Box>

          <Box display="flex" alignItems="center" gap={1}>

            <Typography fontSize={13}>金額</Typography>

            <TextField
              type="number"
              size="small"
              value={amountMin}
              onChange={(e)=>setAmountMin(e.target.value)}
              sx={{width:120}}
            />

            <Typography>〜</Typography>

            <TextField
              type="number"
              size="small"
              value={amountMax}
              onChange={(e)=>setAmountMax(e.target.value)}
              sx={{width:120}}
            />

          </Box>

        </Box>

        <Box display="flex" justifyContent="flex-end" gap={1}>

          <Button
            variant="contained"
            size="small"
            onClick={applySearch}
          >
            検索
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={async()=>{

              setSearchInput("");
              setDateFrom("");
              setDateTo("");
              setAmountMin("");
              setAmountMax("");

              await fetchEstimates(selectedShop);

            }}
          >
            クリア
          </Button>

        </Box>

      </Paper>

      {/* テーブル */}
      <TableContainer component={Paper}>

        <Table>

          <TableHead sx={{backgroundColor:"#f9f9f9"}}>

            <TableRow>

              <TableCell>見積日</TableCell>
              <TableCell>顧客名</TableCell>
              <TableCell>内容</TableCell>
              <TableCell>担当者</TableCell>
              <TableCell align="right">金額</TableCell>
              <TableCell align="center">操作</TableCell>

            </TableRow>

          </TableHead>

          <TableBody>

            {estimates.map(est=>{

              const productName =
                est.items && est.items.length>0
                  ? est.items[0].product?.name || est.items[0].name
                  : "-";

              return(

                <TableRow
                  key={est.id}
                  hover
                  sx={{cursor:"pointer"}}
                  onClick={()=>router.push(`/dashboard/estimates/${est.id}`)}
                >

                  <TableCell>
                    {new Date(est.created_at).toLocaleDateString("ja-JP")}
                  </TableCell>

                  <TableCell>{est.party?.name || "-"}</TableCell>

                  <TableCell>{productName}</TableCell>

                  <TableCell>{est.created_by?.display_name || "-"}</TableCell>

                  <TableCell align="right">
                    {formatPrice(est.grand_total)}
                  </TableCell>

                  <TableCell
                    align="center"
                    onClick={(e)=>e.stopPropagation()}
                  >

                    <IconButton
                      onClick={(e)=>handleMenuOpen(e,est.id)}
                    >
                      <MoreVertIcon/>
                    </IconButton>

                    <Menu
                      anchorEl={menuAnchor[est.id]}
                      open={Boolean(menuAnchor[est.id])}
                      onClose={()=>handleMenuClose(est.id)}
                    >

                      <MenuItem onClick={()=>handleAction("detail",est.id)}>
                        <ListItemIcon><DescriptionIcon fontSize="small"/></ListItemIcon>
                        <ListItemText primary="詳細"/>
                      </MenuItem>

                      <MenuItem onClick={()=>handleAction("edit",est.id)}>
                        <ListItemIcon><EditIcon fontSize="small"/></ListItemIcon>
                        <ListItemText primary="編集"/>
                      </MenuItem>

                      <MenuItem onClick={()=>handleAction("duplicate",est.id)}>
                        <ListItemIcon><ContentCopyIcon fontSize="small"/></ListItemIcon>
                        <ListItemText primary="複製"/>
                      </MenuItem>

                      <MenuItem onClick={()=>handleAction("order",est.id)}>
                        <ListItemIcon><AddTaskIcon fontSize="small"/></ListItemIcon>
                        <ListItemText primary="受注作成"/>
                      </MenuItem>

                      <MenuItem
                        onClick={()=>handleAction("delete",est.id)}
                        sx={{color:"error.main"}}
                      >
                        <ListItemIcon>
                          <DeleteIcon fontSize="small" color="error"/>
                        </ListItemIcon>
                        <ListItemText primary="削除"/>
                      </MenuItem>

                    </Menu>

                  </TableCell>

                </TableRow>

              );

            })}

          </TableBody>

        </Table>

      </TableContainer>

      {/* 削除Dialog */}

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={()=>setDeleteTarget(null)}
      >

        <DialogTitle>見積削除</DialogTitle>

        <DialogContent>
          <DialogContentText>
            この見積を削除しますか？
          </DialogContentText>
        </DialogContent>

        <DialogActions>

          <Button onClick={()=>setDeleteTarget(null)}>
            キャンセル
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
          >
            削除
          </Button>

        </DialogActions>

      </Dialog>

    </>
  );

}

export default function EstimateListPage(){

  return(
    <Suspense fallback={<CircularProgress/>}>
      <EstimateListPageInner/>
    </Suspense>
  );

}