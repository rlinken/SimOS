import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Phone,
  Tag,
  MessageSquare,
  Plus,
  X,
  Calendar,
  Save,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

interface CustomerNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  author?: {
    firstName: string;
    lastName: string;
  };
}

interface CustomerProfileDialogProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerProfileDialog({
  customerId,
  open,
  onOpenChange,
}: CustomerProfileDialogProps) {
  const { toast } = useToast();
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editedInfo, setEditedInfo] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null>(null);

  // Fetch customer profile
  const { data: customer, isLoading } = useQuery<UserType & { notes: CustomerNote[] }>({
    queryKey: ["/api/customers", customerId],
    enabled: !!customerId && open,
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: Partial<UserType>) => {
      return apiRequest("PATCH", `/api/customers/${customerId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Profile updated",
        description: "Customer profile has been updated successfully.",
      });
      setIsEditingInfo(false);
      setEditedInfo(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer profile",
        variant: "destructive",
      });
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/customer-notes", {
        customerId,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      toast({
        title: "Note added",
        description: "Note has been added successfully.",
      });
      setNewNote("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("DELETE", `/api/customer-notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      toast({
        title: "Note deleted",
        description: "Note has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    if (!newTag.trim() || !customer) return;
    
    const currentTags = customer.tags || [];
    if (currentTags.includes(newTag.trim())) {
      toast({
        title: "Tag already exists",
        variant: "destructive",
      });
      return;
    }

    updateCustomerMutation.mutate({
      tags: [...currentTags, newTag.trim()],
    });
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!customer) return;
    
    const currentTags = customer.tags || [];
    updateCustomerMutation.mutate({
      tags: currentTags.filter((t) => t !== tagToRemove),
    });
  };

  const handleSaveInfo = () => {
    if (!editedInfo) return;
    updateCustomerMutation.mutate(editedInfo);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote.trim());
  };

  const startEditingInfo = () => {
    if (customer) {
      setEditedInfo({
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        email: customer.email || "",
        phone: customer.phone || "",
      });
      setIsEditingInfo(true);
    }
  };

  const cancelEditingInfo = () => {
    setEditedInfo(null);
    setIsEditingInfo(false);
  };

  if (!customerId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-customer-profile">
        <DialogHeader>
          <DialogTitle>Customer Profile</DialogTitle>
          <DialogDescription>
            View and manage customer information, tags, and notes
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : customer ? (
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info" data-testid="tab-info">Information</TabsTrigger>
              <TabsTrigger value="tags" data-testid="tab-tags">Tags</TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
            </TabsList>

            {/* Information Tab */}
            <TabsContent value="info" className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  {!isEditingInfo ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startEditingInfo}
                      data-testid="button-edit-info"
                    >
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditingInfo}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveInfo}
                        disabled={updateCustomerMutation.isPending}
                        data-testid="button-save-info"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      {isEditingInfo ? (
                        <Input
                          id="firstName"
                          value={editedInfo?.firstName || ""}
                          onChange={(e) =>
                            setEditedInfo({ ...editedInfo!, firstName: e.target.value })
                          }
                          data-testid="input-first-name"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span data-testid="text-first-name">{customer.firstName || "—"}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      {isEditingInfo ? (
                        <Input
                          id="lastName"
                          value={editedInfo?.lastName || ""}
                          onChange={(e) =>
                            setEditedInfo({ ...editedInfo!, lastName: e.target.value })
                          }
                          data-testid="input-last-name"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span data-testid="text-last-name">{customer.lastName || "—"}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    {isEditingInfo ? (
                      <Input
                        id="email"
                        type="email"
                        value={editedInfo?.email || ""}
                        onChange={(e) =>
                          setEditedInfo({ ...editedInfo!, email: e.target.value })
                        }
                        data-testid="input-email"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span data-testid="text-email">{customer.email || "—"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    {isEditingInfo ? (
                      <Input
                        id="phone"
                        value={editedInfo?.phone || ""}
                        onChange={(e) =>
                          setEditedInfo({ ...editedInfo!, phone: e.target.value })
                        }
                        data-testid="input-phone"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span data-testid="text-phone">{customer.phone || "—"}</span>
                      </div>
                    )}
                  </div>

                  {customer.membershipTierId && (
                    <div className="space-y-2">
                      <Label>Membership</Label>
                      <Badge variant="default" data-testid="badge-membership">Active Member</Badge>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Tags Tab */}
            <TabsContent value="tags" className="space-y-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Customer Tags</h3>
                
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddTag();
                      }
                    }}
                    data-testid="input-new-tag"
                  />
                  <Button
                    onClick={handleAddTag}
                    disabled={!newTag.trim() || updateCustomerMutation.isPending}
                    data-testid="button-add-tag"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {customer.tags && customer.tags.length > 0 ? (
                    customer.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1"
                        data-testid={`badge-tag-${tag}`}
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:bg-destructive/20 rounded-full"
                          data-testid={`button-remove-tag-${tag}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-tags">
                      No tags added yet
                    </p>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Add Note</h3>
                
                <div className="space-y-2">
                  <Textarea
                    placeholder="Type your note here..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    data-testid="textarea-new-note"
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                    data-testid="button-add-note"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Add Note
                  </Button>
                </div>
              </Card>

              <div className="space-y-3">
                {customer.notes && customer.notes.length > 0 ? (
                  customer.notes.map((note) => (
                    <Card key={note.id} className="p-4" data-testid={`card-note-${note.id}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span data-testid={`text-note-date-${note.id}`}>
                            {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          {note.author && (
                            <>
                              <span>•</span>
                              <span data-testid={`text-note-author-${note.id}`}>
                                {note.author.firstName} {note.author.lastName}
                              </span>
                            </>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          disabled={deleteNoteMutation.isPending}
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-sm" data-testid={`text-note-content-${note.id}`}>
                        {note.content}
                      </p>
                    </Card>
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground" data-testid="text-no-notes">
                      No notes yet
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Customer not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
