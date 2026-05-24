import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react'
import { useProjectStore } from '../store/project.slice'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog } from '../components/ui/dialog'

const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(1000).optional(),
})

type ProjectFormData = z.infer<typeof projectFormSchema>

export function ProjectsPage() {
  const navigate = useNavigate()
  const { projects, searchQuery, isLoading, error, setProjects, addProject, updateProject, removeProject, setSearchQuery, setLoading, setError } =
    useProjectStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
  })

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await window.mockforge.project.list()
        setProjects(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [setProjects, setLoading, setError])

  const openCreate = useCallback(() => {
    reset({ name: '', description: '' })
    setEditingId(null)
    setCreateOpen(true)
  }, [reset])

  const openEdit = useCallback(
    (id: string) => {
      const project = projects.find((p) => p.id === id)
      if (!project) return
      reset({ name: project.name, description: project.description ?? '' })
      setEditingId(id)
      setCreateOpen(true)
    },
    [projects, reset],
  )

  const onSubmit = useCallback(
    async (data: ProjectFormData) => {
      try {
        if (editingId) {
          const updated = await window.mockforge.project.update({
            id: editingId,
            name: data.name,
            description: data.description,
          })
          updateProject(updated)
        } else {
          const created = await window.mockforge.project.create({
            name: data.name,
            description: data.description,
          })
          addProject(created)
        }
        setCreateOpen(false)
        reset({ name: '', description: '' })
        setEditingId(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Operation failed')
      }
    },
    [editingId, updateProject, addProject, reset, setError],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    try {
      await window.mockforge.project.delete({ id: deleteId })
      removeProject(deleteId)
      setDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }, [deleteId, removeProject, setError])

  const filtered = projects.filter((p) => {
    if (!searchQuery) return true
    return p.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your mock data projects
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && !searchQuery && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-gray-400">
          <FolderOpen className="mx-auto mb-3 h-12 w-12" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="mt-1 text-sm">
            Create your first project to get started.
          </p>
          <Button className="mt-4" variant="outline" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      )}

      {/* Empty search results */}
      {!isLoading && !error && filtered.length === 0 && searchQuery && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400">
          <p className="text-lg font-medium">No projects match "{searchQuery}"</p>
        </div>
      )}

      {/* Project cards grid */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => navigate(`/project/${project.id}/schema`)}
              >
                <h3 className="text-base font-semibold text-gray-900">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </button>
              <div className="mt-3 flex justify-end gap-1 border-t border-gray-100 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(project.id)
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteId(project.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setEditingId(null)
        }}
        title={editingId ? 'Edit Project' : 'New Project'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Project name"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Brief description"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                setEditingId(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingId ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete Project"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete this project? This action cannot be
          undone and will remove all associated schemas and fields.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
