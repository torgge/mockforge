import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { JsonView, defaultStyles } from 'react-json-view-lite'
import 'react-json-view-lite/dist/index.css'
import {
  Play,
  Copy,
  Download,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileJson,
} from 'lucide-react'
import { useProjectStore } from '../store/project.slice'
import { useSchemaStore } from '../store/schema.slice'
import { useGeneratorStore } from '../store/generator.slice'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export function GeneratorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { projects } = useProjectStore()
  const { schema, setSchema, setLoading: setSchemaLoading } = useSchemaStore()
  const {
    generatedData,
    quantity,
    maxGenerationLimit,
    isGenerating,
    error,
    setGeneratedData,
    setQuantity,
    setMaxGenerationLimit,
    setGenerating,
    setError,
  } = useGeneratorStore()

  const [copied, setCopied] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  const project = projects.find((p) => p.id === projectId)

  // Fetch max generation limit on mount
  useEffect(() => {
    const fetchLimit = async () => {
      try {
        const result = await window.mockforge.settings.get({
          key: 'max_generation_limit',
        })
        if (result !== null) {
          setMaxGenerationLimit(Number(result))
        }
      } catch (err) {
        setWarning(
          err instanceof Error ? err.message : 'Failed to load settings, using default limit',
        )
      }
    }
    fetchLimit()
  }, [setMaxGenerationLimit])

  // Fetch schema on mount
  useEffect(() => {
    if (!projectId) return
    const fetchSchema = async () => {
      setSchemaLoading(true)
      try {
        const result = await window.mockforge.schema.getByProject({
          projectId,
        })
        setSchema(result)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load schema',
        )
      } finally {
        setSchemaLoading(false)
      }
    }
    fetchSchema()
  }, [projectId, setSchema, setSchemaLoading])

  const handleGenerate = useCallback(async () => {
    if (!schema) return
    setGenerating(true)
    setError(null)
    try {
      const result = await window.mockforge.generator.run({
        schemaId: schema.id,
        quantity,
      })
      setGeneratedData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [schema, quantity, setGeneratedData, setGenerating, setError])

  const handleCopy = useCallback(async () => {
    if (!generatedData) return
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(generatedData, null, 2),
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }, [generatedData, setError])

  const handleExport = useCallback(async () => {
    if (!generatedData) return
    try {
      const suggestedName = `${project?.name ?? 'data'}-${Date.now()}.json`
      await window.mockforge.export.toFile({
        data: generatedData,
        suggestedName,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }, [generatedData, project, setError])

  const quantityError =
    quantity < 1
      ? 'Minimum is 1'
      : quantity > maxGenerationLimit
        ? `Maximum is ${maxGenerationLimit}`
        : null

  const showLargeWarning = quantity > 1000

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="flex items-center gap-1 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        {project && (
          <>
            <span>/</span>
            <Link
              to={`/project/${projectId}/schema`}
              className="hover:text-gray-900"
            >
              {project.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900">Generator</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Data Generator</h2>
        <p className="mt-1 text-sm text-gray-500">
          {schema
            ? `Schema: ${schema.fields.length} field${schema.fields.length === 1 ? '' : 's'}`
            : 'No schema loaded — navigate to Schema Editor first.'}
        </p>
      </div>

      {/* No schema state */}
      {!schema && !error && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400">
          <FileJson className="mx-auto mb-3 h-10 w-10" />
          <p className="text-lg font-medium">No schema loaded</p>
          <p className="mt-1 text-sm">
            Please set up a schema in the Schema Editor first.
          </p>
          {projectId && (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate(`/project/${projectId}/schema`)}
            >
              Go to Schema Editor
            </Button>
          )}
        </div>
      )}

      {/* Controls */}
      {schema && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-40">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={maxGenerationLimit}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) setQuantity(val)
                }}
                className="mt-1"
              />
              {quantityError && (
                <p className="mt-1 text-xs text-red-500">{quantityError}</p>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !!quantityError}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={!generatedData}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!generatedData}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {showLargeWarning && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Generating more than 1,000 records may take a moment.
            </div>
          )}
        </div>
      )}

      {/* Warning */}
      {warning && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {warning}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {schema && !generatedData && !isGenerating && !error && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-gray-400">
          <FileJson className="mx-auto mb-3 h-12 w-12" />
          <p className="text-lg font-medium">No data generated yet</p>
          <p className="mt-1 text-sm">
            Enter a quantity and click Generate to create mock data.
          </p>
        </div>
      )}

      {/* Generated data viewer */}
      {generatedData && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 text-sm text-gray-500">
            Generated {generatedData.length} record
            {generatedData.length === 1 ? '' : 's'}
          </div>
          <div className="overflow-auto rounded-md bg-gray-50 p-4 font-mono text-xs leading-relaxed">
            <JsonView
              data={generatedData}
              shouldExpandNode={() => true}
              style={defaultStyles}
            />
          </div>
        </div>
      )}
    </div>
  )
}
