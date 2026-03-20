import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-[1.5rem] relative overflow-hidden bg-slate-900/10 dark:bg-slate-800/30",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
