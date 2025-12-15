// src/theme.ts
"use client";

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" }, // Hayasysブルー
    secondary: { main: "#f50057" },
  },
  typography: {
    fontFamily: ["Roboto", "Noto Sans JP", "sans-serif"].join(","),
  },
});

export default theme;
