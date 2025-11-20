type ErrorAlertProps = {
  message: string;
};

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
      {message}
    </div>
  );
}

