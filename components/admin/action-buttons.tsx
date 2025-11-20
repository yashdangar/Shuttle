import { Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionButtonsProps = {
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
  disabled?: boolean;
};

export function ActionButtons({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  disabled,
}: ActionButtonsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={editLabel}
        onClick={onEdit}
        disabled={disabled}
      >
        <Edit3 className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={deleteLabel}
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

