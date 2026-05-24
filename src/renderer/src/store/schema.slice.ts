import { create } from 'zustand'
import type { SchemaWithFields, Field } from '@shared/ipc.types'

interface SchemaState {
  schema: SchemaWithFields | null
  isLoading: boolean
  error: string | null

  setSchema: (schema: SchemaWithFields) => void
  updateField: (field: Field) => void
  clearSchema: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useSchemaStore = create<SchemaState>((set) => ({
  schema: null,
  isLoading: false,
  error: null,

  setSchema: (schema) => set({ schema }),

  updateField: (field) =>
    set((state) => {
      if (!state.schema) return state
      return {
        schema: {
          ...state.schema,
          fields: state.schema.fields.map((f) =>
            f.id === field.id ? field : f,
          ),
        },
      }
    }),

  clearSchema: () => set({ schema: null }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}))
