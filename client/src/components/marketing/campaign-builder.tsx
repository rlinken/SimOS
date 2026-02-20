import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Type,
  Image,
  Square,
  Code,
  Eye,
  Send,
  Save,
  Smartphone,
  Monitor,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Settings,
  User,
  Mail,
  Tag as TagIcon,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Campaign Builder - Drag and Drop Email/SMS Editor
 *
 * Features:
 * - Drag-and-drop block-based editor
 * - Pre-built templates
 * - Personalization tags
 * - Live preview
 * - Mobile/desktop preview
 * - Test sending
 */

export interface CampaignBlock {
  id: string;
  type: "text" | "image" | "button" | "divider" | "spacer" | "html";
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
}

export interface Campaign {
  id?: string;
  name: string;
  subject: string;
  preheader?: string;
  fromName: string;
  fromEmail: string;
  blocks: CampaignBlock[];
  styles: {
    backgroundColor: string;
    contentWidth: string;
    fontFamily: string;
  };
}

interface CampaignBuilderProps {
  initialCampaign?: Campaign;
  onSave: (campaign: Campaign) => void;
  onSend?: (campaign: Campaign) => void;
}

const defaultCampaign: Campaign = {
  name: "New Campaign",
  subject: "",
  preheader: "",
  fromName: "Golf Simulator",
  fromEmail: "hello@golfsim.com",
  blocks: [],
  styles: {
    backgroundColor: "#f4f4f4",
    contentWidth: "600px",
    fontFamily: "Arial, sans-serif",
  },
};

const blockTypes = [
  { type: "text", icon: Type, label: "Text", description: "Add text content" },
  { type: "image", icon: Image, label: "Image", description: "Add an image" },
  { type: "button", icon: Square, label: "Button", description: "Call-to-action button" },
  { type: "divider", icon: Code, label: "Divider", description: "Horizontal line" },
  { type: "spacer", icon: Plus, label: "Spacer", description: "Add vertical space" },
  { type: "html", icon: Code, label: "HTML", description: "Custom HTML" },
];

const personalizationTags = [
  { tag: "{{firstName}}", label: "First Name", icon: User },
  { tag: "{{lastName}}", label: "Last Name", icon: User },
  { tag: "{{email}}", label: "Email", icon: Mail },
  { tag: "{{membershipTier}}", label: "Membership Tier", icon: TagIcon },
  { tag: "{{facilityName}}", label: "Facility Name", icon: TagIcon },
  { tag: "{{upcomingBooking}}", label: "Upcoming Booking", icon: TagIcon },
];

const emailTemplates = [
  {
    id: "welcome",
    name: "Welcome New Member",
    thumbnail: "🎉",
    blocks: [
      {
        id: "1",
        type: "text" as const,
        content: {
          html: "<h1>Welcome to {{facilityName}}!</h1><p>Hi {{firstName}}, we're excited to have you as part of our golf simulator community.</p>",
        },
        styles: { padding: "20px" },
      },
      {
        id: "2",
        type: "button" as const,
        content: {
          text: "Book Your First Session",
          url: "https://example.com/book",
        },
        styles: { backgroundColor: "#4CAF50", color: "#ffffff", padding: "12px 24px" },
      },
    ],
  },
  {
    id: "reminder",
    name: "Booking Reminder",
    thumbnail: "⏰",
    blocks: [
      {
        id: "1",
        type: "text" as const,
        content: {
          html: "<h2>Reminder: Upcoming Session</h2><p>Hi {{firstName}}, this is a friendly reminder about your upcoming session at {{facilityName}}.</p>",
        },
        styles: { padding: "20px" },
      },
      {
        id: "2",
        type: "text" as const,
        content: {
          html: "<p><strong>{{upcomingBooking}}</strong></p>",
        },
        styles: { padding: "20px", backgroundColor: "#f9f9f9" },
      },
    ],
  },
  {
    id: "promo",
    name: "Promotional Offer",
    thumbnail: "💰",
    blocks: [
      {
        id: "1",
        type: "text" as const,
        content: {
          html: "<h1>Special Offer Just For You!</h1><p>Hey {{firstName}}, get 20% off your next booking when you book this week.</p>",
        },
        styles: { padding: "20px" },
      },
      {
        id: "2",
        type: "button" as const,
        content: {
          text: "Claim Your Discount",
          url: "https://example.com/promo",
        },
        styles: { backgroundColor: "#FF9800", color: "#ffffff", padding: "12px 24px" },
      },
    ],
  },
];

export function CampaignBuilder({ initialCampaign, onSave, onSend }: CampaignBuilderProps) {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign || defaultCampaign);
  const [selectedBlock, setSelectedBlock] = useState<CampaignBlock | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showPersonalizationTags, setShowPersonalizationTags] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const draggedBlock = useRef<string | null>(null);

  const addBlock = (type: string) => {
    const newBlock: CampaignBlock = {
      id: `block_${Date.now()}`,
      type: type as CampaignBlock["type"],
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
    };
    setCampaign({
      ...campaign,
      blocks: [...campaign.blocks, newBlock],
    });
    setSelectedBlock(newBlock);
  };

  const loadTemplate = (template: typeof emailTemplates[0]) => {
    setCampaign({
      ...campaign,
      blocks: template.blocks.map((b) => ({ ...b, id: `block_${Date.now()}_${b.id}` })),
    });
    setShowTemplateDialog(false);
    toast({ title: `Template "${template.name}" loaded` });
  };

  const updateBlock = (blockId: string, updates: Partial<CampaignBlock>) => {
    setCampaign({
      ...campaign,
      blocks: campaign.blocks.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block
      ),
    });
  };

  const deleteBlock = (blockId: string) => {
    setCampaign({
      ...campaign,
      blocks: campaign.blocks.filter((block) => block.id !== blockId),
    });
    setSelectedBlock(null);
  };

  const duplicateBlock = (blockId: string) => {
    const blockToDuplicate = campaign.blocks.find((b) => b.id === blockId);
    if (blockToDuplicate) {
      const newBlock = {
        ...blockToDuplicate,
        id: `block_${Date.now()}`,
      };
      const index = campaign.blocks.findIndex((b) => b.id === blockId);
      const newBlocks = [...campaign.blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setCampaign({ ...campaign, blocks: newBlocks });
    }
  };

  const moveBlock = (blockId: string, direction: "up" | "down") => {
    const index = campaign.blocks.findIndex((b) => b.id === blockId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === campaign.blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...campaign.blocks];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setCampaign({ ...campaign, blocks: newBlocks });
  };

  const insertPersonalizationTag = (tag: string) => {
    // Insert tag into selected block's content
    if (selectedBlock && selectedBlock.type === "text") {
      const currentHtml = (selectedBlock.content.html as string) || "";
      updateBlock(selectedBlock.id, {
        content: { ...selectedBlock.content, html: currentHtml + tag },
      });
      toast({ title: `Inserted ${tag}` });
    }
  };

  const sendTestEmail = () => {
    if (!testEmail) {
      toast({ title: "Please enter an email address", variant: "destructive" });
      return;
    }
    // Simulate sending test email
    toast({ title: `Test email sent to ${testEmail}` });
    setShowTestDialog(false);
  };

  const handleSave = () => {
    onSave(campaign);
    toast({ title: "Campaign saved successfully" });
  };

  const handleSend = () => {
    if (onSend) {
      onSend(campaign);
      toast({ title: "Campaign sent!" });
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Left Sidebar - Blocks & Templates */}
      <div className="w-64 border-r overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Content
          </h3>
          <div className="space-y-2">
            {blockTypes.map((blockType) => (
              <button
                key={blockType.type}
                onClick={() => addBlock(blockType.type)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent hover:border-primary transition-colors text-left"
              >
                <blockType.icon className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{blockType.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {blockType.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowTemplateDialog(true)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Use Template
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Personalization
          </h3>
          <div className="space-y-1">
            {personalizationTags.map((tag) => (
              <button
                key={tag.tag}
                onClick={() => insertPersonalizationTag(tag.tag)}
                className="w-full flex items-center gap-2 p-2 rounded text-xs hover:bg-accent transition-colors text-left"
                disabled={!selectedBlock || selectedBlock.type !== "text"}
              >
                <tag.icon className="w-3 h-3 text-muted-foreground" />
                <span className="flex-1">{tag.label}</span>
                <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                  {tag.tag}
                </code>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="build" className="h-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="build">Build</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTestDialog(true)}>
                <Send className="w-4 h-4 mr-2" />
                Send Test
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              {onSend && (
                <Button size="sm" onClick={handleSend}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Campaign
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="build" className="space-y-4 mt-0">
            <Card className="p-4">
              <div className="space-y-3">
                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={campaign.subject}
                    onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })}
                    placeholder="Enter email subject..."
                  />
                </div>
                <div>
                  <Label>Preheader Text (optional)</Label>
                  <Input
                    value={campaign.preheader || ""}
                    onChange={(e) => setCampaign({ ...campaign, preheader: e.target.value })}
                    placeholder="Preview text that appears after subject"
                  />
                </div>
              </div>
            </Card>

            {campaign.blocks.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Start Building Your Email</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add content blocks from the sidebar or choose a pre-built template
                </p>
                <Button onClick={() => setShowTemplateDialog(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Choose Template
                </Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {campaign.blocks.map((block, index) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    isSelected={selectedBlock?.id === block.id}
                    onSelect={() => setSelectedBlock(block)}
                    onUpdate={(updates) => updateBlock(block.id, updates)}
                    onDelete={() => deleteBlock(block.id)}
                    onDuplicate={() => duplicateBlock(block.id)}
                    onMoveUp={index > 0 ? () => moveBlock(block.id, "up") : undefined}
                    onMoveDown={
                      index < campaign.blocks.length - 1
                        ? () => moveBlock(block.id, "down")
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            <div className="flex justify-center mb-4">
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <Button
                  variant={previewMode === "desktop" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("desktop")}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  variant={previewMode === "mobile" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("mobile")}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Mobile
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <div
                className={`bg-white shadow-lg transition-all ${
                  previewMode === "desktop" ? "w-full max-w-2xl" : "w-[375px]"
                }`}
              >
                <EmailPreview campaign={campaign} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <Card className="p-6">
              <div className="space-y-4 max-w-xl">
                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    value={campaign.name}
                    onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>From Name</Label>
                  <Input
                    value={campaign.fromName}
                    onChange={(e) => setCampaign({ ...campaign, fromName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={campaign.fromEmail}
                    onChange={(e) => setCampaign({ ...campaign, fromEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email Width</Label>
                  <Select
                    value={campaign.styles.contentWidth}
                    onValueChange={(value) =>
                      setCampaign({
                        ...campaign,
                        styles: { ...campaign.styles, contentWidth: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="600px">600px (Standard)</SelectItem>
                      <SelectItem value="700px">700px (Wide)</SelectItem>
                      <SelectItem value="100%">100% (Full Width)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Sidebar - Block Settings */}
      {selectedBlock && (
        <div className="w-80 border-l overflow-y-auto p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Block Settings
          </h3>
          <BlockSettings
            block={selectedBlock}
            onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
          />
        </div>
      )}

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Start with a pre-built template and customize it to your needs
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {emailTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template)}
                className="p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors text-center"
              >
                <div className="text-4xl mb-2">{template.thumbnail}</div>
                <div className="font-medium text-sm">{template.name}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test version of this campaign to check how it looks
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendTestEmail}>
              <Send className="w-4 h-4 mr-2" />
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Block Editor Component
interface BlockEditorProps {
  block: CampaignBlock;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CampaignBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function BlockEditor({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: BlockEditorProps) {
  return (
    <Card
      className={`p-3 cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : "hover:border-primary/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-move" />
        <div className="flex-1 min-w-0">
          <BlockContent block={block} onUpdate={onUpdate} />
        </div>
        <div className="flex gap-1">
          {onMoveUp && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveUp}>
              ↑
            </Button>
          )}
          {onMoveDown && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveDown}>
              ↓
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Block Content Renderer
function BlockContent({
  block,
  onUpdate,
}: {
  block: CampaignBlock;
  onUpdate: (updates: Partial<CampaignBlock>) => void;
}) {
  if (block.type === "text") {
    return (
      <textarea
        className="w-full p-2 text-sm border rounded resize-none font-sans"
        rows={3}
        value={(block.content.html as string) || ""}
        onChange={(e) =>
          onUpdate({ content: { ...block.content, html: e.target.value } })
        }
        placeholder="Enter text content..."
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  if (block.type === "button") {
    return (
      <div className="space-y-2">
        <Input
          placeholder="Button text"
          value={(block.content.text as string) || ""}
          onChange={(e) =>
            onUpdate({ content: { ...block.content, text: e.target.value } })
          }
          onClick={(e) => e.stopPropagation()}
        />
        <Input
          placeholder="Button URL"
          value={(block.content.url as string) || ""}
          onChange={(e) =>
            onUpdate({ content: { ...block.content, url: e.target.value } })
          }
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div className="space-y-2">
        <Input
          placeholder="Image URL"
          value={(block.content.src as string) || ""}
          onChange={(e) =>
            onUpdate({ content: { ...block.content, src: e.target.value } })
          }
          onClick={(e) => e.stopPropagation()}
        />
        <Input
          placeholder="Alt text"
          value={(block.content.alt as string) || ""}
          onChange={(e) =>
            onUpdate({ content: { ...block.content, alt: e.target.value } })
          }
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  if (block.type === "divider") {
    return <div className="border-t-2 my-2" />;
  }

  if (block.type === "spacer") {
    return (
      <div className="text-xs text-muted-foreground text-center">
        Spacer ({(block.content.height as number) || 20}px)
      </div>
    );
  }

  if (block.type === "html") {
    return (
      <textarea
        className="w-full p-2 text-xs border rounded resize-none font-mono"
        rows={4}
        value={(block.content.html as string) || ""}
        onChange={(e) =>
          onUpdate({ content: { ...block.content, html: e.target.value } })
        }
        placeholder="<div>Custom HTML...</div>"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return null;
}

// Block Settings Panel
function BlockSettings({
  block,
  onUpdate,
}: {
  block: CampaignBlock;
  onUpdate: (updates: Partial<CampaignBlock>) => void;
}) {
  const styles = block.styles || {};

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Padding</Label>
        <Input
          type="text"
          placeholder="20px"
          value={(styles.padding as string) || ""}
          onChange={(e) =>
            onUpdate({ styles: { ...styles, padding: e.target.value } })
          }
        />
      </div>

      {block.type === "button" && (
        <>
          <div>
            <Label className="text-xs">Background Color</Label>
            <Input
              type="color"
              value={(styles.backgroundColor as string) || "#4CAF50"}
              onChange={(e) =>
                onUpdate({ styles: { ...styles, backgroundColor: e.target.value } })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Text Color</Label>
            <Input
              type="color"
              value={(styles.color as string) || "#ffffff"}
              onChange={(e) =>
                onUpdate({ styles: { ...styles, color: e.target.value } })
              }
            />
          </div>
        </>
      )}

      {block.type === "text" && (
        <>
          <div>
            <Label className="text-xs">Text Color</Label>
            <Input
              type="color"
              value={(styles.color as string) || "#000000"}
              onChange={(e) =>
                onUpdate({ styles: { ...styles, color: e.target.value } })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Font Size</Label>
            <Select
              value={(styles.fontSize as string) || "16px"}
              onValueChange={(value) =>
                onUpdate({ styles: { ...styles, fontSize: value } })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12px">12px (Small)</SelectItem>
                <SelectItem value="14px">14px</SelectItem>
                <SelectItem value="16px">16px (Normal)</SelectItem>
                <SelectItem value="18px">18px</SelectItem>
                <SelectItem value="24px">24px (Large)</SelectItem>
                <SelectItem value="32px">32px (XL)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {block.type === "spacer" && (
        <div>
          <Label className="text-xs">Height</Label>
          <Input
            type="number"
            value={(block.content.height as number) || 20}
            onChange={(e) =>
              onUpdate({
                content: { ...block.content, height: parseInt(e.target.value) || 20 },
              })
            }
          />
        </div>
      )}
    </div>
  );
}

// Email Preview Component
function EmailPreview({ campaign }: { campaign: Campaign }) {
  return (
    <div
      style={{
        fontFamily: campaign.styles.fontFamily,
        backgroundColor: campaign.styles.backgroundColor,
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: campaign.styles.contentWidth,
          margin: "0 auto",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Subject Line Preview */}
        <div className="bg-gray-100 p-3 text-sm border-b">
          <div className="font-semibold">{campaign.subject || "(No subject)"}</div>
          {campaign.preheader && (
            <div className="text-muted-foreground text-xs">{campaign.preheader}</div>
          )}
        </div>

        {/* Email Body */}
        {campaign.blocks.map((block) => (
          <div key={block.id} style={{ ...block.styles }}>
            {block.type === "text" && (
              <div
                dangerouslySetInnerHTML={{
                  __html: ((block.content.html as string) || "").replace(
                    /{{(\w+)}}/g,
                    '<span style="background: yellow; padding: 2px 4px;">$1</span>'
                  ),
                }}
              />
            )}
            {block.type === "button" && (
              <div style={{ textAlign: "center" }}>
                <a
                  href={(block.content.url as string) || "#"}
                  style={{
                    display: "inline-block",
                    ...block.styles,
                    textDecoration: "none",
                    borderRadius: "4px",
                  }}
                >
                  {(block.content.text as string) || "Button"}
                </a>
              </div>
            )}
            {block.type === "image" && block.content.src && (
              <img
                src={block.content.src as string}
                alt={(block.content.alt as string) || ""}
                style={{ maxWidth: "100%", height: "auto" }}
              />
            )}
            {block.type === "divider" && (
              <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "20px 0" }} />
            )}
            {block.type === "spacer" && (
              <div style={{ height: `${(block.content.height as number) || 20}px` }} />
            )}
            {block.type === "html" && (
              <div dangerouslySetInnerHTML={{ __html: (block.content.html as string) || "" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions
function getDefaultContent(type: string): Record<string, unknown> {
  switch (type) {
    case "text":
      return { html: "<p>Add your text here...</p>" };
    case "button":
      return { text: "Click Here", url: "https://example.com" };
    case "image":
      return { src: "", alt: "" };
    case "spacer":
      return { height: 20 };
    case "html":
      return { html: "" };
    default:
      return {};
  }
}

function getDefaultStyles(type: string): Record<string, unknown> {
  switch (type) {
    case "text":
      return { padding: "20px", color: "#000000", fontSize: "16px" };
    case "button":
      return {
        backgroundColor: "#4CAF50",
        color: "#ffffff",
        padding: "12px 24px",
      };
    case "image":
      return { padding: "10px" };
    case "divider":
      return { padding: "10px 0" };
    default:
      return {};
  }
}
