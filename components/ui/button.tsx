import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6200] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[#FF6200] hover:bg-[#E55800] text-white shadow-sm shadow-[#FF6200]/25 active:scale-95",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 active:scale-95",
        outline:
          "border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 shadow-sm active:scale-95",
        secondary:
          "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/20 active:scale-95",
        ghost:
          "hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-900 dark:text-white active:scale-95",
        link: "text-[#FF6200] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-8",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-10 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-14",
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
