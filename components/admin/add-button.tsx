import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type AddButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export function AddButton({ label, onClick, disabled }: AddButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled}>
      <Plus className="size-4" />
      {label}
    </Button>
  );
}

