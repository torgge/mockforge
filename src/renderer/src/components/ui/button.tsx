import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-gray-900 text-white shadow hover:bg-gray-800': variant === 'default',
            'bg-red-600 text-white shadow-sm hover:bg-red-700': variant === 'destructive',
            'border border-gray-200 bg-white shadow-sm hover:bg-gray-100 text-gray-900': variant === 'outline',
            'hover:bg-gray-100 text-gray-900': variant === 'ghost',
            'text-gray-900 underline-offset-4 hover:underline': variant === 'link',
          },
          {
            'h-9 px-4 py-2': size === 'default',
            'h-8 rounded-md px-3 text-xs': size === 'sm',
            'h-10 rounded-md px-8': size === 'lg',
            'h-9 w-9': size === 'icon',
          },
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button }
export type { ButtonProps }
