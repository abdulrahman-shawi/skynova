import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils"; // وظيفة تجمع بين clsx و tailwind-merge

// تحديد الأنماط المتغيرة باستخدام CVA
const headerVariants = cva(
  "flex flex-col gap-2 transition-all duration-300",
  {
    variants: {
      align: {
        left: "text-left items-start",
        center: "text-center items-center",
        right: "text-right items-end",
      },
      spacing: {
        sm: "mb-4",
        md: "mb-8",
        lg: "mb-12",
      },
    },
    defaultVariants: {
      align: "center",
      spacing: "md",
    },
  }
);

const titleVariants = cva("font-bold tracking-tight text-slate-900 dark:text-white", {
  variants: {
    size: {
      sm: "text-xl",
      md: "text-3xl",
      lg: "text-4xl md:text-5xl",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const descriptionVariants = cva("text-muted-foreground max-w-[70ch] leading-relaxed", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

// تعريف الـ Props باستخدام TypeScript
interface SectionHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof headerVariants> {
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
  titleSize?: VariantProps<typeof titleVariants>["size"];
  descSize?: VariantProps<typeof descriptionVariants>["size"];
}

const SectionHeader = ({
  title,
  description,
  align,
  spacing,
  titleSize,
  descSize,
  isLoading,
  error,
  className,
  children, // لدعم إضافة أزرار أو عناصر إضافية بجانب العنوان
  ...props
}: SectionHeaderProps) => {
  
  // 1. حالة التحميل (Loading State)
  if (isLoading) {
    return (
      <div className={cn(headerVariants({ align, spacing }), "animate-pulse")} {...props}>
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-md" />
        <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800 rounded-md" />
      </div>
    );
  }

  // 2. حالة الخطأ (Error State)
  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg">
        <p className="font-semibold">Error:</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <header className={cn(headerVariants({ align, spacing }), className)} {...props}>
      <div className="flex flex-col gap-1">
        <h2 className={cn(titleVariants({ size: titleSize || "md" }))}>
          {title}
        </h2>
        
        {/* Conditional Rendering للوصف */}
        {description && (
          <p className={cn(descriptionVariants({ size: descSize || "md" }))}>
            {description}
          </p>
        )}
      </div>

      {/* دعم محتوى إضافي (مثلاً أزرار Action) */}
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
};

export { SectionHeader, headerVariants };