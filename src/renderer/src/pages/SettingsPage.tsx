import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, CheckCircle, AlertCircle } from 'lucide-react'
import { useGeneratorStore } from '../store/generator.slice'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

const settingsFormSchema = z.object({
  maxGenerationLimit: z.coerce
    .number()
    .int('Must be a whole number')
    .min(1, 'Minimum is 1')
    .max(10000, 'Maximum is 10,000'),
})

type SettingsFormData = z.infer<typeof settingsFormSchema>

export function SettingsPage() {
  const { maxGenerationLimit, setMaxGenerationLimit } = useGeneratorStore()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      maxGenerationLimit,
    },
  })

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const result = await window.mockforge.settings.get({
          key: 'max_generation_limit',
        })
        if (result !== null) {
          const limit = Number(result)
          setMaxGenerationLimit(limit)
          reset({ maxGenerationLimit: limit })
        }
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load settings',
        )
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [setMaxGenerationLimit, reset])

  const onSubmit = useCallback(
    async (data: SettingsFormData) => {
      setIsSaving(true)
      setSaveSuccess(false)
      setSaveError(null)
      try {
        await window.mockforge.settings.set({
          key: 'max_generation_limit',
          value: String(data.maxGenerationLimit),
        })
        setMaxGenerationLimit(data.maxGenerationLimit)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : 'Failed to save settings',
        )
      } finally {
        setIsSaving(false)
      }
    },
    [setMaxGenerationLimit],
  )

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure application preferences
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Load error */}
      {loadError && !isLoading && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {loadError}
        </div>
      )}

      {/* Settings form */}
      {!isLoading && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-lg border border-gray-200 bg-white p-6"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxGenerationLimit">
                Maximum Generation Limit
              </Label>
              <Input
                id="maxGenerationLimit"
                type="number"
                min={1}
                max={10000}
                {...register('maxGenerationLimit')}
              />
              {errors.maxGenerationLimit && (
                <p className="text-xs text-red-500">
                  {errors.maxGenerationLimit.message}
                </p>
              )}
              <p className="text-xs text-gray-400">
                The maximum number of records that can be generated at once (1 –
                10,000).
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>

          {/* Feedback */}
          {saveSuccess && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Settings saved successfully.
            </div>
          )}
          {saveError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {saveError}
            </div>
          )}
        </form>
      )}
    </div>
  )
}
