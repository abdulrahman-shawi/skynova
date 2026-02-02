type FormTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export function FormTextArea({ label, error, ...props }: FormTextAreaProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>

      <textarea
        {...props}
        rows={4}
        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
