import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Upload,
  Wand2,
  Loader2,
  ChevronRight,
  ChevronDown,
  Pencil,
  X,
  FileJson,
} from 'lucide-react'
import type { Field, FieldRule, FieldType } from '@shared/ipc.types'
import { validateRuleForFieldType } from '@shared/validation'
import { useProjectStore } from '../store/project.slice'
import { useSchemaStore } from '../store/schema.slice'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog } from '../components/ui/dialog'

// ── Field tree ──

function canHaveRule(type: FieldType): boolean {
  return type === 'string' || type === 'number' || type === 'boolean'
}

const typeColors: Record<FieldType, string> = {
  string: 'bg-blue-100 text-blue-800',
  number: 'bg-green-100 text-green-800',
  boolean: 'bg-yellow-100 text-yellow-800',
  object: 'bg-purple-100 text-purple-800',
  array: 'bg-orange-100 text-orange-800',
  null: 'bg-gray-100 text-gray-500',
}

function ruleSummary(rule: FieldRule | null): string {
  if (!rule) return 'no rule'
  switch (rule.kind) {
    case 'range':
      return `range(${rule.min}-${rule.max})`
    case 'enum':
      return `enum(${rule.values.slice(0, 3).join(', ')}${rule.values.length > 3 ? '...' : ''})`
    case 'format':
      return `format(${rule.subtype})`
  }
}

function FieldNode({
  field,
  allFields,
  depth,
  onEditRule,
}: {
  field: Field
  allFields: Field[]
  depth: number
  onEditRule: (field: Field) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = allFields.some((f) => f.parentFieldId === field.id)

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-900">{field.name}</span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[field.type]}`}
        >
          {field.type}
        </span>
        <span className="text-xs text-gray-400 flex-1">
          {ruleSummary(field.rule)}
        </span>
        {canHaveRule(field.type) && (
          <Button variant="ghost" size="sm" onClick={() => onEditRule(field)}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
      {hasChildren &&
        expanded &&
        allFields
          .filter((f) => f.parentFieldId === field.id)
          .sort((a, b) => a.order - b.order)
          .map((child) => (
            <FieldNode
              key={child.id}
              field={child}
              allFields={allFields}
              depth={depth + 1}
              onEditRule={onEditRule}
            />
          ))}
    </div>
  )
}

// ── Rule editor ──

function RuleEditor({
  field,
  onSave,
  onClose,
}: {
  field: Field
  onSave: (rule: FieldRule | null) => Promise<void>
  onClose: () => void
}) {
  const [ruleKind, setRuleKind] = useState<string>(
    field.rule?.kind ?? 'none',
  )

  const availableKinds = [
    { kind: 'range', label: 'Range' },
    { kind: 'format', label: 'Format' },
    { kind: 'enum', label: 'Enum' },
  ]

  const handleSave = useCallback(async () => {
    if (ruleKind === 'none') {
      await onSave(null)
      return
    }
    if (ruleKind === 'range') {
      const min = Number(
        (document.getElementById('range-min') as HTMLInputElement)?.value ?? 0,
      )
      const max = Number(
        (document.getElementById('range-max') as HTMLInputElement)?.value ?? 100,
      )
      const rule: FieldRule = { kind: 'range', min, max }
      if (validateRuleForFieldType(rule, field.type)) {
        await onSave(rule)
      }
    } else if (ruleKind === 'format') {
      const subtype = (
        document.getElementById('format-subtype') as HTMLSelectElement
      )?.value as 'uuid' | 'date' | 'datetime'
      const rule: FieldRule = { kind: 'format', subtype }
      if (validateRuleForFieldType(rule, field.type)) {
        await onSave(rule)
      }
    } else if (ruleKind === 'enum') {
      const raw = (document.getElementById('enum-values') as HTMLInputElement)
        ?.value ?? ''
      const values = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => {
          if (field.type === 'number') return Number(s)
          if (field.type === 'boolean') return s.toLowerCase() === 'true'
          return s
        })
      const rule: FieldRule = { kind: 'enum', values }
      if (validateRuleForFieldType(rule, field.type)) {
        await onSave(rule)
      }
    }
  }, [ruleKind, field.type, onSave])

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">
          Rule for <span className="text-blue-600">{field.name}</span>
        </h4>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-3">
        <Label>Rule kind</Label>
        <select
          className="mt-1 flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm"
          value={ruleKind}
          onChange={(e) => setRuleKind(e.target.value)}
        >
          <option value="none">No rule</option>
          {availableKinds.map((ak) => (
            <option key={ak.kind} value={ak.kind}>
              {ak.label}
            </option>
          ))}
        </select>
      </div>

      {ruleKind === 'range' && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <Label>Min</Label>
            <Input
              id="range-min"
              type="number"
              defaultValue={field.rule?.kind === 'range' ? field.rule.min : 0}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Max</Label>
            <Input
              id="range-max"
              type="number"
              defaultValue={field.rule?.kind === 'range' ? field.rule.max : 100}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {ruleKind === 'format' && (
        <div className="mb-3">
          <Label>Subtype</Label>
          <select
            id="format-subtype"
            className="mt-1 flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm"
            defaultValue={
              field.rule?.kind === 'format'
                ? field.rule.subtype
                : 'uuid'
            }
          >
            <option value="uuid">UUID</option>
            <option value="date">Date</option>
            <option value="datetime">Datetime</option>
          </select>
        </div>
      )}

      {ruleKind === 'enum' && (
        <div className="mb-3">
          <Label>Values (comma-separated)</Label>
          <Input
            id="enum-values"
            placeholder="value1, value2, value3"
            defaultValue={
              field.rule?.kind === 'enum'
                ? field.rule.values.join(', ')
                : ''
            }
            className="mt-1"
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          Save Rule
        </Button>
      </div>
    </div>
  )
}

// ── Main page ──

export function SchemaEditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { projects } = useProjectStore()
  const {
    schema,
    isLoading,
    error,
    setSchema,
    updateField,
    setLoading,
    setError,
  } = useSchemaStore()

  const [editingField, setEditingField] = useState<Field | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importAvroJson, setImportAvroJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!projectId) return
    const fetchSchema = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await window.mockforge.schema.getByProject({
          projectId,
        })
        setSchema(result)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch schema',
        )
      } finally {
        setLoading(false)
      }
    }
    fetchSchema()
  }, [projectId, setSchema, setLoading, setError])

  const handleSaveRule = useCallback(
    async (rule: FieldRule | null) => {
      if (!editingField) return
      try {
        const updated = await window.mockforge.field.updateRule({
          fieldId: editingField.id,
          rule,
        })
        updateField(updated)
        setEditingField(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update rule',
        )
      }
    },
    [editingField, updateField, setError],
  )

  const handleImportAvro = async () => {
    if (!projectId || !importAvroJson.trim()) return
    setIsImporting(true)
    setImportError(null)
    try {
      const result = await window.mockforge.schema.importAvro({
        projectId,
        avroJson: importAvroJson,
      })
      setSchema(result)
      setImportOpen(false)
      setImportAvroJson('')
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Failed to import Avro schema',
      )
    } finally {
      setIsImporting(false)
    }
  }

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
            <span className="text-gray-900">{project.name}</span>
          </>
        )}
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Schema Editor</h2>
          <p className="mt-1 text-sm text-gray-500">
            {schema
              ? `${schema.fields.length} field${schema.fields.length === 1 ? '' : 's'}`
              : 'No schema loaded'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import Avro
          </Button>
          {projectId && (
            <Button
              onClick={() => navigate(`/project/${projectId}/generator`)}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Go to Generator
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Schema loaded */}
      {!isLoading && !error && schema && (
        <div className="flex gap-6">
          <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
            {schema.fields.length === 0 ? (
              <p className="text-sm text-gray-400">No fields in schema.</p>
            ) : (
              schema.fields
                .filter((f) => f.parentFieldId === null)
                .sort((a, b) => a.order - b.order)
                .map((field) => (
                  <FieldNode
                    key={field.id}
                    field={field}
                    allFields={schema.fields}
                    depth={0}
                    onEditRule={setEditingField}
                  />
                ))
            )}
          </div>

          {editingField && (
            <div className="w-80 flex-shrink-0">
              <RuleEditor
                field={editingField}
                onSave={handleSaveRule}
                onClose={() => setEditingField(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* No schema */}
      {!isLoading && !error && !schema && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400">
          <FileJson className="mx-auto mb-3 h-10 w-10" />
          <p className="text-lg font-medium">No schema found</p>
          <p className="mt-1 text-sm">
            Import an Avro schema file to get started.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Avro
          </Button>
        </div>
      )}

      {/* Import Avro Dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Avro Schema"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="avro-json">Paste Avro JSON schema</Label>
            <textarea
              id="avro-json"
              className="flex min-h-[200px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400"
              placeholder='{"type": "record", "name": "User", "fields": [...]}'
              value={importAvroJson}
              onChange={(e) => setImportAvroJson(e.target.value)}
            />
          </div>
          {importError && (
            <p className="text-xs text-red-500">{importError}</p>
          )}
          <p className="text-xs text-gray-400">
            Existing fields will be replaced with the imported schema.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setImportOpen(false)
              setImportAvroJson('')
              setImportError(null)
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImportAvro}
            disabled={isImporting || !importAvroJson.trim()}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import'
            )}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
