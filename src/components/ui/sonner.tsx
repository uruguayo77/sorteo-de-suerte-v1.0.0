import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-gray-800/90 group-[.toaster]:text-white group-[.toaster]:border-gray-600 group-[.toaster]:shadow-xl group-[.toaster]:backdrop-blur-sm group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-gray-300",
          actionButton:
            "group-[.toast]:bg-purple-600 group-[.toast]:text-white group-[.toast]:hover:bg-purple-700",
          cancelButton:
            "group-[.toast]:bg-gray-700 group-[.toast]:text-gray-300 group-[.toast]:hover:bg-gray-600",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
