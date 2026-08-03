"use client";

export function DeleteButton({
  action,
  confirmMessage,
  label = "Delete",
  className = "",
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className={`rounded-md border border-red-300 text-red-700 dark:text-red-400 dark:border-red-900 text-sm px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 ${className}`}
      >
        {label}
      </button>
    </form>
  );
}
