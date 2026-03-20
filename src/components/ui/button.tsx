import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1rem] text-[16px] leading-[1.5] font-semibold transition-all duration-200 active:scale-[0.97] tactile-btn disabled:pointer-events-none disabled:opacity-50 disabled:scale-100 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_2px_0_0_rgba(255,255,255,0.2),inset_0_-4px_0_0_rgba(0,0,0,0.15),0_4px_6px_-1px_rgba(0,0,0,0.2)] hover:brightness-110 active:shadow-[inset_0_4px_4px_0_rgba(0,0,0,0.3)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_2px_0_0_rgba(255,255,255,0.2),inset_0_-4px_0_0_rgba(0,0,0,0.15),0_4px_6px_-1px_rgba(0,0,0,0.2)] hover:brightness-110 active:shadow-[inset_0_4px_4px_0_rgba(0,0,0,0.3)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-2 border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-black/50 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[inset_0_2px_0_0_rgba(255,255,255,0.1),inset_0_-2px_0_0_rgba(0,0,0,0.1)] hover:bg-secondary/80 active:shadow-inner",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[44px] min-w-[44px] px-6 py-2 has-[>svg]:px-4",
        sm: "min-h-[44px] min-w-[44px] gap-1.5 px-4 has-[>svg]:px-3",
        lg: "min-h-[56px] min-w-[56px] rounded-[1.25rem] px-8 text-lg has-[>svg]:px-6",
        icon: "h-[44px] w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
