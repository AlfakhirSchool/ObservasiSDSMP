import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/utils"

interface AvatarProps {
  name?: string | null
  image?: string | null
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
}

export function Avatar({ name, image, className, size = "md" }: AvatarProps) {
  const initials = name ? getInitials(name) : "?"

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name || "Avatar"}
        className={cn(
          "rounded-full object-cover ring-2 ring-white",
          sizeMap[size],
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        "rounded-full bg-linear-to-br from-smp to-sd flex items-center justify-center text-white font-semibold ring-2 ring-white",
        sizeMap[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
