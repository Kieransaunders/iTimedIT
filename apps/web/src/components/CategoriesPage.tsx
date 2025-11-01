import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { notifyMutationError } from "../lib/notifyMutationError";
import { useOrganization } from "../lib/organization-context";
import { WorkspaceHeader, WorkspaceType } from "./WorkspaceSwitcher";
import { ColorPicker } from "./ui/ColorPicker";
import { Tag, Trash2, Edit, Star } from "lucide-react";

interface CategoriesPageProps {
  workspaceType?: WorkspaceType;
  onWorkspaceChange?: (workspace: WorkspaceType) => void;
}

export function CategoriesPage({
  workspaceType = "work",
  onWorkspaceChange,
}: CategoriesPageProps) {
  // State Management
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const [isDefault, setIsDefault] = useState(false);
  const currentWorkspace = workspaceType;
  const { isReady } = useOrganization();

  // Convex Queries/Mutations
  const categories = useQuery(api.categories.getCategories, isReady ? {} : "skip");
  const createCategory = useMutation(api.categories.createCategory);
  const updateCategory = useMutation(api.categories.updateCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);

  // Form Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryData = { name, color, isDefault };

      if (editingCategory) {
        await updateCategory({
          categoryId: editingCategory._id,
          ...categoryData,
        });
      } else {
        await createCategory(categoryData);
      }

      resetForm();
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: editingCategory
          ? "Unable to update category. Please try again."
          : "Unable to create category. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage categories.",
      });
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color || "#8b5cf6");
    setIsDefault(category.isDefault);
    setShowForm(true);
  };

  const handleDelete = async (categoryId: Id<"categories">) => {
    const category = categories?.find((c) => c._id === categoryId);
    if (!category) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the category "${category.name}"?`
    );

    if (!confirmDelete) return;

    try {
      await deleteCategory({ categoryId });
    } catch (error: any) {
      // Backend will throw error with entry count if in use
      if (error.message?.includes("used by")) {
        alert(error.message);
      } else {
        notifyMutationError(error, {
          fallbackMessage: "Unable to delete category. Please try again.",
          unauthorizedMessage: "You need owner or admin access to manage categories.",
        });
      }
    }
  };

  const resetForm = () => {
    setName("");
    setColor("#8b5cf6");
    setIsDefault(false);
    setShowForm(false);
    setEditingCategory(null);
  };

  // Render loading state
  if (!isReady || !categories) {
    return (
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Workspace Header */}
      {onWorkspaceChange && (
        <WorkspaceHeader
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={onWorkspaceChange}
        />
      )}

      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-md shadow-lg transition-colors"
          >
            Add Category
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {editingCategory ? "Edit Category" : "Add New Category"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
              />
            </div>

            <ColorPicker
              value={color}
              onChange={setColor}
              label="Category Color"
              helpText="Choose a color to help identify this category"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-300">
                Set as default category
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-md shadow-lg transition-colors"
              >
                {editingCategory ? "Update" : "Create"} Category
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Default
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {categories.map((category) => (
                <tr key={category._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Tag className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {category.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="h-6 w-6 rounded-full border border-gray-300 dark:border-gray-600 inline-block"
                      style={{ backgroundColor: category.color || "#8b5cf6" }}
                      title={category.color || "#8b5cf6"}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {category.isDefault && (
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-1.5 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-all"
                        title="Edit Category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="p-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 mb-4">
              <Tag className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No categories yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Create your first category to organize your time entries
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
