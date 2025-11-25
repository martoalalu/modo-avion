"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"
import type { AppData } from "@/lib/types"

interface DataContextType {
  data: AppData
  updateData: (data: AppData) => void
}

export const DataContext = createContext<DataContextType | null>(null)

export function useDataContext() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useDataContext must be used within DataContext.Provider")
  }
  return context
}

export function DataContextProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    /* initial data */
  })

  const updateData = (newData: AppData) => {
    setData(newData)
  }

  return <DataContext.Provider value={{ data, updateData }}>{children}</DataContext.Provider>
}
