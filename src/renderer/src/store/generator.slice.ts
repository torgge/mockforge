import { create } from 'zustand'

interface GeneratorState {
  generatedData: unknown[] | null
  quantity: number
  maxGenerationLimit: number
  isGenerating: boolean
  error: string | null

  setGeneratedData: (data: unknown[]) => void
  setQuantity: (quantity: number) => void
  setMaxGenerationLimit: (limit: number) => void
  setGenerating: (generating: boolean) => void
  setError: (error: string | null) => void
}

export const useGeneratorStore = create<GeneratorState>((set) => ({
  generatedData: null,
  quantity: 10,
  maxGenerationLimit: 1000,
  isGenerating: false,
  error: null,

  setGeneratedData: (data) => set({ generatedData: data }),

  setQuantity: (quantity) => set({ quantity }),

  setMaxGenerationLimit: (limit) => set({ maxGenerationLimit: limit }),

  setGenerating: (generating) => set({ isGenerating: generating }),

  setError: (error) => set({ error }),
}))
