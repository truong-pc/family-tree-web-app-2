"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  Users,
  Plus,
  Trash2,
  Edit2,
  Save,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddChildModal from "@/components/tree/add-child-modal";
import { Person, FamilyTreeData } from "@/components/tree/family-tree-view";
import { api } from "@/lib/api";

interface Props {
  person: Person | null;
  isOpen: boolean;
  onClose: () => void;
  familyTreeData: FamilyTreeData;
  onDataUpdate: () => void;
  chartId: string;
}

export default function PersonSidebar({
  person,
  isOpen,
  onClose,
  familyTreeData,
  onDataUpdate,
  chartId,
}: Props) {
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    gender: "M" as "M" | "F" | "O",
    level: "",
    dob: "",
    dod: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);

  // Reset edit form when person changes
  useEffect(() => {
    if (person) {
      setEditForm({
        name: person.name || "",
        gender: person.gender || "M",
        level: person.level?.toString() || "",
        dob: person.dob || "",
        dod: person.dod || "",
        description: person.description || "",
      });
      setIsEditing(false);
      setError(null);
    }
  }, [person]);

  if (!person) return null;

  // Save edited person
  const handleSave = async () => {
    setError(null);

    // Validate level
    if (!editForm.level || editForm.level.trim() === "") {
      setError("Generation Level is required");
      return;
    }

    const levelNum = parseInt(editForm.level);
    if (isNaN(levelNum) || levelNum <= 0) {
      setError("Generation Level must be a positive number");
      return;
    }

    setIsSaving(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) throw new Error("Authentication required");

      await api.updatePerson(token, chartId, person.personId, {
        name: editForm.name,
        gender: editForm.gender,
        level: levelNum,
        dob: editForm.dob || null,
        dod: editForm.dod || null,
        description: editForm.description || null,
      });

      setIsEditing(false);
      setError(null);
      onDataUpdate(); // Refresh data after successful update
    } catch (error) {
      console.error("Error updating person:", error);
      setError("Failed to update person. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditForm({
      name: person.name || "",
      gender: person.gender || "M",
      level: person.level?.toString() || "",
      dob: person.dob || "",
      dod: person.dod || "",
      description: person.description || "",
    });
    setIsEditing(false);
    setError(null);
  };

  // Delete person function
  const deletePerson = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${person.name}? This will also remove all their relationships.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) throw new Error("Authentication required");

      await api.deletePerson(token, chartId, person.personId);
      onDataUpdate(); // Refresh data after successful deletion
      onClose(); // Close sidebar
    } catch (error) {
      console.error("Error deleting person:", error);
      alert("Failed to delete person. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Get parents and children
  const parents = familyTreeData.links
    .filter((link) => link.target === person.name)
    .map((link) => link.source);

  const children = familyTreeData.links
    .filter((link) => link.source === person.name)
    .map((link) => link.target);

  return (
    <>
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-lg transform transition-transform duration-300 z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{isEditing ? "Edit Person" : "Person Details"}</h2>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deletePerson}
                    disabled={isDeleting}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-88px)]">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-500" />
              <span className="font-medium">Basic Information</span>
            </div>
            <div className="pl-7 space-y-2">
              <div>
                <span className="text-sm text-gray-500">Person ID: </span>
                <span className="font-mono font-medium text-blue-600">
                  {person.personId}
                </span>
              </div>

              {isEditing ? (
                <>
                  {/* Edit Mode */}
                  <div>
                    <label className="text-sm text-gray-500">Name:</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="mt-1"
                      placeholder="Enter name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Level:</label>
                      <Input
                        type="number"
                        value={editForm.level}
                        onChange={(e) =>
                          setEditForm({ ...editForm, level: e.target.value })
                        }
                        className="mt-1"
                        placeholder="1, 2, 3..."
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Gender:</label>
                      <Select
                        value={editForm.gender}
                        onValueChange={(value: "M" | "F" | "O") =>
                          setEditForm({ ...editForm, gender: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                          <SelectItem value="O">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">
                      Date of Birth:
                    </label>
                    <Input
                      type="date"
                      value={editForm.dob}
                      onChange={(e) =>
                        setEditForm({ ...editForm, dob: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">
                      Date of Death:
                    </label>
                    <Input
                      type="date"
                      value={editForm.dod}
                      onChange={(e) =>
                        setEditForm({ ...editForm, dod: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">
                      Description:
                    </label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      className="mt-1"
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !editForm.name.trim()}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* View Mode */}
                  <div>
                    <span className="text-sm text-gray-500">Level: </span>
                    <span className="font-medium text-gray-700">
                      {person.level}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Name:</span>
                    <p className="font-medium">{person.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Gender:</span>
                    <Badge variant="secondary" className="ml-2">
                      {person.gender === "M"
                        ? "Male"
                        : person.gender === "F"
                        ? "Female"
                        : "Other"}
                    </Badge>
                  </div>
                  {person.dob && (
                    <div>
                      <span className="text-sm text-gray-500">
                        Date of Birth:
                      </span>
                      <p className="text-sm mt-1">{person.dob}</p>
                    </div>
                  )}
                  {person.dod && (
                    <div>
                      <span className="text-sm text-gray-500">
                        Date of Death:
                      </span>
                      <p className="text-sm mt-1">{person.dod}</p>
                    </div>
                  )}
                  {person.description && (
                    <div>
                      <span className="text-sm text-gray-500">
                        Description:
                      </span>
                      <p className="text-sm mt-1">{person.description}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Parents */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-500" />
              <span className="font-medium">Parents ({parents.length})</span>
            </div>
            <div className="pl-7">
              {parents.length > 0 ? (
                <div className="space-y-2">
                  {parents.map((parent, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded">
                      {parent}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No parents recorded</p>
              )}
            </div>
          </div>

          {/* Children */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="font-medium">
                  Children ({children.length})
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddChildModal(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Child
              </Button>
            </div>
            <div className="pl-7">
              {children.length > 0 ? (
                <div className="space-y-2">
                  {children.map((child, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded">
                      {child}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No children recorded</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Child Modal */}
      <AddChildModal
        isOpen={showAddChildModal}
        onClose={() => setShowAddChildModal(false)}
        parent={person}
        onSuccess={() => {
          onDataUpdate();
          setShowAddChildModal(false);
        }}
        chartId={chartId}
      />
    </>
  );
}
