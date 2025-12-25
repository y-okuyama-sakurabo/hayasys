import { Box, Button } from "@mui/material";
import { useRouter } from "next/navigation";

export default function CustomerHeader({ customer }: any) {
  const router = useRouter();

  return (
    <Box display="flex" gap={2} mb={2}>
      <Button variant="outlined" onClick={() => router.push("/dashboard/customers")}>
        一覧へ
      </Button>
    </Box>
  );
}
