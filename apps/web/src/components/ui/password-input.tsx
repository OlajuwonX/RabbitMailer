'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { LinearInputProps } from './linear'

export function LinearPasswordInput({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: Omit<LinearInputProps, 'type'>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={cn(
            'w-full px-3.5 py-2.5 pr-11 rounded-xl text-sm',
            'bg-white/4 backdrop-blur-sm',
            'border',
            error ? 'border-red-500/50' : 'border-white/9',
            'text-slate-100 placeholder:text-slate-600',
            'transition-all duration-150',
            'focus:outline-none',
            error
              ? 'focus:border-red-500/70 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
              : 'focus:border-violet-500/50 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.12)] focus:bg-white/6',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 hover:text-violet-400 transition-colors"
        >
          {visible ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
