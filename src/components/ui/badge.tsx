import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        critical:
          "border-transparent bg-red-500/20 text-red-400 border border-red-500/30",
        high:
          "border-transparent bg-orange-500/20 text-orange-400 border border-orange-500/30",
        medium:
          "border-transparent bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
        low:
          "border-transparent bg-green-500/20 text-green-400 border border-green-500/30",
        info:
          "border-transparent bg-blue-500/20 text-blue-400 border border-blue-500/30",
        active:
          "border-transparent bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        pending:
          "border-transparent bg-amber-500/20 text-amber-400 border border-amber-500/30",
        completed:
          "border-transparent bg-sky-500/20 text-sky-400 border border-sky-500/30",
        overdue:
          "border-transparent bg-red-500/20 text-red-400 border border-red-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
