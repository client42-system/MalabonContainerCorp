import React from 'react'

export function Button({ children, className, ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}