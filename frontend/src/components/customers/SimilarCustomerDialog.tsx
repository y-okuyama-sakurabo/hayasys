"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";

type Props = {
  open: boolean;
  candidates: any[];
  onSelect: (customer: any) => void;
  onCreateNew: () => void;
  onClose: () => void;
};

export default function SimilarCustomerDialog({
  open,
  candidates,
  onSelect,
  onCreateNew,
  onClose,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>この顧客ではありませんか？</DialogTitle>

      <DialogContent>
        <Typography color="text.secondary" mb={2}>
          入力された情報と似ている顧客が見つかりました。
          <br />
          既存顧客を選択するか、新規顧客として続行できます。
        </Typography>

        <List>
          {candidates.map((c) => (
            <ListItemButton key={c.id} onClick={() => onSelect(c)}>
              <ListItemText
                primary={c.name}
                secondary={
                  <>
                    {c.phone && `📞 ${c.phone}`}
                    {c.email && ` / ✉️ ${c.email}`}
                    <br />
                    {c.address}
                  </>
                }
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCreateNew} color="secondary">
          新規顧客として続行
        </Button>
        <Button onClick={onClose}>キャンセル</Button>
      </DialogActions>
    </Dialog>
  );
}
