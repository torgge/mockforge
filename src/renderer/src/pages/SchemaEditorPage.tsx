import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
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

function getStaticPlaceholder(type: FieldType): string {
  switch (type) {
    case 'number': return 'e.g. 42'
    case 'boolean': return 'true or false'
    case 'string': return 'e.g. 00010'
    default: return 'Enter a fixed value'
  }
}

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
  focusedFieldId,
  expandedSet,
  onEditRule,
  onToggle,
  onFocus,
}: {
  field: Field
  allFields: Field[]
  depth: number
  focusedFieldId: string | null
  expandedSet: Set<string>
  onEditRule: (field: Field) => void
  onToggle: (id: string) => void
  onFocus: (id: string) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const hasChildren = allFields.some((f) => f.parentFieldId === field.id)
  const isFocused = focusedFieldId === field.id
  const expanded = expandedSet.has(field.id)

  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isFocused])

  return (
    <div>
      <div
        ref={rowRef}
        role="treeitem"
        tabIndex={0}
        data-field-id={field.id}
        aria-expanded={hasChildren ? expanded : undefined}
        onClick={() => onFocus(field.id)}
        onFocus={() => onFocus(field.id)}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 outline-none cursor-pointer ${
          isFocused
            ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset'
            : 'hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(field.id)
            }}
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
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEditRule(field) }}>
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
              focusedFieldId={focusedFieldId}
              expandedSet={expandedSet}
              onEditRule={onEditRule}
              onToggle={onToggle}
              onFocus={onFocus}
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
  const [ruleError, setRuleError] = useState<string | null>(null)
  const [rangeMin, setRangeMin] = useState<number>(
    field.rule?.kind === 'range' ? field.rule.min : 0,
  )
  const [rangeMax, setRangeMax] = useState<number>(
    field.rule?.kind === 'range' ? field.rule.max : 100,
  )
  const [formatSubtype, setFormatSubtype] = useState<'uuid' | 'date' | 'datetime'>(
    field.rule?.kind === 'format' ? field.rule.subtype : 'uuid',
  )
  const [enumValues, setEnumValues] = useState<string>(
    field.rule?.kind === 'enum' ? field.rule.values.join(', ') : '',
  )
  const [staticValue, setStaticValue] = useState<string>(
    field.rule?.kind === 'static' ? String(field.rule.value) : '',
  )

  const availableKinds = [
    { kind: 'static', label: 'Static' },
    { kind: 'range', label: 'Range' },
    { kind: 'format', label: 'Format' },
    { kind: 'enum', label: 'Enum' },
  ]

  const handleSave = useCallback(async () => {
    setRuleError(null)
    if (ruleKind === 'none') {
      await onSave(null)
      return
    }
    if (ruleKind === 'range') {
      if (rangeMin > rangeMax) {
        setRuleError('Min must be less than or equal to Max.')
        return
      }
      const rule: FieldRule = { kind: 'range', min: rangeMin, max: rangeMax }
      if (!validateRuleForFieldType(rule, field.type)) {
        setRuleError(`A "range" rule cannot be applied to a "${field.type}" field. Only "number" fields support range rules.`)
        return
      }
      await onSave(rule)
    } else if (ruleKind === 'format') {
      const rule: FieldRule = { kind: 'format', subtype: formatSubtype }
      if (!validateRuleForFieldType(rule, field.type)) {
        setRuleError(`A "format" rule cannot be applied to a "${field.type}" field. Only "string" fields support format rules.`)
        return
      }
      await onSave(rule)
    } else if (ruleKind === 'enum') {
      const values = enumValues
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => {
          if (field.type === 'number') return Number(s)
          if (field.type === 'boolean') return s.toLowerCase() === 'true'
          return s
        })
      if (values.length === 0) {
        setRuleError('At least one non-blank value is required for an enum rule.')
        return
      }
      const rule: FieldRule = { kind: 'enum', values }
      if (!validateRuleForFieldType(rule, field.type)) {
        setRuleError(`An "enum" rule cannot be applied to a "${field.type}" field. Only "string", "number", and "boolean" fields support enum rules.`)
        return
      }
      await onSave(rule)
    } else if (ruleKind === 'static') {
      if (!staticValue.trim()) {
        setRuleError('A value is required for a static rule.')
        return
      }
      let value: unknown = staticValue.trim()
      if (field.type === 'number') {
        const num = Number(value)
        if (isNaN(num)) {
          setRuleError('Value must be a valid number for a number field.')
          return
        }
        value = num
      } else if (field.type === 'boolean') {
        value = value === 'true'
      }
      const rule: FieldRule = { kind: 'static', value }
      if (!validateRuleForFieldType(rule, field.type)) {
        setRuleError(`A "static" rule cannot be applied to a "${field.type}" field.`)
        return
      }
      await onSave(rule)
    }
  }, [ruleKind, rangeMin, rangeMax, formatSubtype, enumValues, staticValue, field.type, onSave])

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
        <Label htmlFor="rule-kind">Rule kind</Label>
        <select
          id="rule-kind"
          className="mt-1 flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm"
          value={ruleKind}
          onChange={(e) => { setRuleKind(e.target.value); setRuleError(null) }}
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
            <Label htmlFor="range-min">Min</Label>
            <Input
              id="range-min"
              type="number"
              value={rangeMin}
              onChange={(e) => setRangeMin(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="range-max">Max</Label>
            <Input
              id="range-max"
              type="number"
              value={rangeMax}
              onChange={(e) => setRangeMax(Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {ruleKind === 'format' && (
        <div className="mb-3">
          <Label htmlFor="format-subtype">Subtype</Label>
          <select
            id="format-subtype"
            className="mt-1 flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm"
            value={formatSubtype}
            onChange={(e) => setFormatSubtype(e.target.value as 'uuid' | 'date' | 'datetime')}
          >
            <option value="uuid">UUID</option>
            <option value="date">Date</option>
            <option value="datetime">Datetime</option>
          </select>
        </div>
      )}

      {ruleKind === 'enum' && (
        <div className="mb-3">
          <Label htmlFor="enum-values">Values (comma-separated)</Label>
          <Input
            id="enum-values"
            placeholder="value1, value2, value3"
            value={enumValues}
            onChange={(e) => setEnumValues(e.target.value)}
            className="mt-1"
          />
        </div>
      )}

      {ruleKind === 'static' && (
        <div className="mb-3">
          <Label htmlFor="static-value">Fixed value</Label>
          <Input
            id="static-value"
            placeholder={getStaticPlaceholder(field.type)}
            value={staticValue}
            onChange={(e) => setStaticValue(e.target.value)}
            className="mt-1"
          />
        </div>
      )}

      {ruleError && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {ruleError}
        </p>
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
  const [isSelectingFile, setIsSelectingFile] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)

  // Tree keyboard navigation state
  const treeRef = useRef<HTMLDivElement>(null)
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set())
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)

  // Initialize expanded set when schema loads (expand depth < 2)
  useEffect(() => {
    if (schema && schema.fields.length > 0) {
      const rootIds = new Set(schema.fields.filter(f => f.parentFieldId === null).map(f => f.id))
      const toExpand = new Set<string>()
      // Expand depth 0 and 1 by default
      for (const field of schema.fields) {
        if (rootIds.has(field.id)) {
          toExpand.add(field.id)
        } else if (field.parentFieldId && rootIds.has(field.parentFieldId)) {
          toExpand.add(field.parentFieldId)
        }
      }
      setExpandedSet(toExpand)
      // Focus the first field on schema load
      const firstField = schema.fields.find(f => f.parentFieldId === null)
      if (firstField) setFocusedFieldId(firstField.id)
    }
  }, [schema])

  // Build flat ordered list of visible fields for navigation
  const visibleFields = useMemo(() => {
    if (!schema) return []
    const result: Field[] = []
    const fieldsByParent: Record<string | 'root', Field[]> = { root: [] }
    for (const f of schema.fields) {
      const key = f.parentFieldId ?? 'root'
      if (!fieldsByParent[key]) fieldsByParent[key] = []
      fieldsByParent[key].push(f)
    }
    for (const key in fieldsByParent) {
      fieldsByParent[key].sort((a, b) => a.order - b.order)
    }
    const walk = (parentId: string | null) => {
      const key = parentId ?? 'root'
      const children = fieldsByParent[key] ?? []
      for (const child of children) {
        result.push(child)
        if (expandedSet.has(child.id)) {
          walk(child.id)
        }
      }
    }
    walk(null)
    return result
  }, [schema, expandedSet])

  const focusedIndex = visibleFields.findIndex(f => f.id === focusedFieldId)

  // Keyboard handler
  useEffect(() => {
    const el = treeRef.current
    if (!el) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIdx = Math.min(focusedIndex + 1, visibleFields.length - 1)
        if (nextIdx >= 0) setFocusedFieldId(visibleFields[nextIdx].id)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIdx = Math.max(focusedIndex - 1, 0)
        if (prevIdx < visibleFields.length) setFocusedFieldId(visibleFields[prevIdx].id)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (focusedFieldId && !expandedSet.has(focusedFieldId)) {
          setExpandedSet(prev => new Set(prev).add(focusedFieldId))
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (focusedFieldId && expandedSet.has(focusedFieldId)) {
          const next = new Set(expandedSet)
          next.delete(focusedFieldId)
          setExpandedSet(next)
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const focused = visibleFields[focusedIndex]
        if (focused && canHaveRule(focused.type)) {
          setEditingField(focused)
        }
      } else if (e.key === 'Escape') {
        setFocusedFieldId(null)
      }
    }
    el.addEventListener('keydown', handleKey)
    return () => el.removeEventListener('keydown', handleKey)
  }, [focusedIndex, focusedFieldId, visibleFields, expandedSet])

  const toggleExpand = useCallback((id: string) => {
    setExpandedSet(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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

  const handleImportClick = async () => {
    if (!projectId || !importAvroJson.trim()) return
    // If schema has existing fields, show confirmation first
    if (schema && schema.fields.length > 0 && !showImportConfirm) {
      setShowImportConfirm(true)
      return
    }
    await handleImportAvro()
  }

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

  const handleOpenAvscFile = useCallback(async () => {
    setIsSelectingFile(true)
    setImportError(null)
    try {
      const result = await window.mockforge.dialog.openFile({
        filters: [{ name: 'Avro Schema', extensions: ['avsc', 'avro', 'json'] }],
      })
      if (result && !result.canceled) {
        setImportAvroJson(result.content)
      }
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Failed to open file',
      )
    } finally {
      setIsSelectingFile(false)
    }
  }, [])

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
          <div
            ref={treeRef}
            className="flex-1 rounded-lg border border-gray-200 bg-white p-4"
            role="tree"
            aria-label="Schema field tree"
          >
            <p className="mb-2 text-xs text-gray-400">
              Arrow keys to navigate, Enter to edit rule
            </p>
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
                    focusedFieldId={focusedFieldId}
                    expandedSet={expandedSet}
                    onEditRule={setEditingField}
                    onToggle={toggleExpand}
                    onFocus={setFocusedFieldId}
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
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) {
            setShowImportConfirm(false)
            setImportAvroJson('')
            setImportError(null)
          }
        }}
        title="Import Avro Schema"
      >
        {showImportConfirm ? (
          <>
            <p className="text-sm text-gray-700">
              This project already has {schema?.fields.length ?? 0} field
              {schema?.fields.length === 1 ? '' : 's'}. Importing will replace
              all existing fields and their rules.
            </p>
            <p className="mt-2 text-sm font-medium text-red-600">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImportConfirm(false)}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleImportAvro}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Replacing...
                  </>
                ) : (
                  'Replace All Fields'
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="avro-json">Paste Avro JSON schema</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAvscFile}
                    disabled={isSelectingFile}
                  >
                    {isSelectingFile ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-3 w-3" />
                    )}
                    Open .avsc File
                  </Button>
                </div>
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
                onClick={handleImportClick}
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
          </>
        )}
      </Dialog>
    </div>
  )
}
