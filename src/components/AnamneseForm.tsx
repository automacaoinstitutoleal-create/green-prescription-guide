import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Plus, Trash2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ANAMNESE_SCHEMA,
  type AnamneseAnswers,
  type AnamneseField,
  type CustomAnamneseField,
  getMissingRequiredFields,
  makeCustomFieldId,
} from "@/lib/anamneseSchema";

interface AnamneseFormProps {
  answers: AnamneseAnswers;
  onChange: (answers: AnamneseAnswers) => void;
  customFields: CustomAnamneseField[];
  onCustomFieldsChange: (fields: CustomAnamneseField[]) => void;
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: AnamneseField;
  value: string;
  onChange: (v: string) => void;
}) {
  const isAutofill = field.autofill;
  const baseLabel = (
    <Label className="text-sm font-medium">
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
      {isAutofill && <span className="ml-2 text-xs text-muted-foreground italic">(auto-preenchido)</span>}
    </Label>
  );

  const renderControl = () => {
    switch (field.type) {
      case "text":
      case "date":
        return (
          <Input
            type={field.type === "date" ? "date" : "text"}
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            disabled={isAutofill}
          />
        );
      case "textarea":
        return (
          <VoiceTextarea
            voiceCapture={field.voiceCapture}
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            disabled={isAutofill}
            rows={Math.max(3, Math.min(10, (value.match(/\n/g) || []).length + 3))}
            className="resize-y"
          />
        );
      case "select":
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "yes-no":
        return (
          <RadioGroup value={value} onValueChange={onChange} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="sim" id={`${field.id}-sim`} />
              <Label htmlFor={`${field.id}-sim`} className="font-normal cursor-pointer">Sim</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="nao" id={`${field.id}-nao`} />
              <Label htmlFor={`${field.id}-nao`} className="font-normal cursor-pointer">Não</Label>
            </div>
          </RadioGroup>
        );
      case "yes-no-na":
        return (
          <RadioGroup value={value} onValueChange={onChange} className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="sim" id={`${field.id}-sim`} />
              <Label htmlFor={`${field.id}-sim`} className="font-normal cursor-pointer">Sim</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="nao" id={`${field.id}-nao`} />
              <Label htmlFor={`${field.id}-nao`} className="font-normal cursor-pointer">Não</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="solicitando" id={`${field.id}-na`} />
              <Label htmlFor={`${field.id}-na`} className="font-normal cursor-pointer">Em processo de solicitação</Label>
            </div>
          </RadioGroup>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-1.5">
      {baseLabel}
      {renderControl()}
      {field.hint && <p className="text-xs text-muted-foreground italic">{field.hint}</p>}
    </div>
  );
}

export function AnamneseForm({ answers, onChange, customFields, onCustomFieldsChange }: AnamneseFormProps) {
  // Open the first section by default; others closed.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set([ANAMNESE_SCHEMA[0].id, "custom"]));

  // State for the "add custom field" dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "textarea">("textarea");

  const handleAddCustomField = () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    const newField: CustomAnamneseField = {
      id: makeCustomFieldId(),
      label,
      type: newFieldType,
      value: "",
    };
    onCustomFieldsChange([...customFields, newField]);
    setNewFieldLabel("");
    setNewFieldType("textarea");
    setDialogOpen(false);
  };

  const handleUpdateCustomField = (id: string, value: string) => {
    onCustomFieldsChange(customFields.map((f) => (f.id === id ? { ...f, value } : f)));
  };

  const handleRemoveCustomField = (id: string) => {
    onCustomFieldsChange(customFields.filter((f) => f.id !== id));
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateField = (fieldId: string, value: string) => {
    onChange({ ...answers, [fieldId]: value });
  };

  const missing = getMissingRequiredFields(answers);
  const totalRequired = ANAMNESE_SCHEMA.flatMap((s) =>
    s.fields.filter((f) => f.required && !f.autofill)
  ).length;
  const completed = totalRequired - missing.length;

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          {missing.length === 0 ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600" />
          )}
          <span className="font-medium">
            Anamnese: {completed}/{totalRequired} campos obrigatórios preenchidos
          </span>
        </div>
        {missing.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const newOpen = new Set(openSections);
              missing.forEach((m) => newOpen.add(m.sectionId));
              setOpenSections(newOpen);
            }}
            className="text-xs text-primary hover:underline"
          >
            Expandir pendentes
          </button>
        )}
      </div>

      {ANAMNESE_SCHEMA.map((section) => {
        const isOpen = openSections.has(section.id);
        const sectionMissing = missing.filter((m) => m.sectionId === section.id);

        return (
          <Card key={section.id}>
            <button
              type="button"
              className="w-full text-left"
              onClick={() => toggleSection(section.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {section.title}
                      {sectionMissing.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                          {sectionMissing.length} pendente{sectionMissing.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </CardTitle>
                    {section.description && (
                      <CardDescription className="text-xs mt-1">
                        {section.description}
                      </CardDescription>
                    )}
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  )}
                </div>
              </CardHeader>
            </button>
            {isOpen && (
              <CardContent className="space-y-4 pt-2">
                {section.fields.map((field) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    value={answers[field.id] || ""}
                    onChange={(v) => updateField(field.id, v)}
                  />
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* ═══ Custom Fields Section ═══ */}
      <Card className="border-dashed">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => toggleSection("custom")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Campos personalizados
                  {customFields.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {customFields.length}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Adicione campos extras relevantes para este caso. Eles serão incluídos no relatório médico.
                </CardDescription>
              </div>
              {openSections.has("custom") ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              )}
            </div>
          </CardHeader>
        </button>
        {openSections.has("custom") && (
          <CardContent className="space-y-4 pt-2">
            {customFields.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-2">
                Nenhum campo personalizado adicionado. Use o botão abaixo para criar campos específicos para este caso.
              </p>
            )}
            {customFields.map((field) => (
              <div key={field.id} className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium flex-1">{field.label}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCustomField(field.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    title="Remover campo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {field.type === "text" ? (
                  <Input
                    value={field.value}
                    onChange={(e) => handleUpdateCustomField(field.id, e.target.value)}
                    placeholder="Resposta..."
                  />
                ) : (
                  <Textarea
                    value={field.value}
                    onChange={(e) => handleUpdateCustomField(field.id, e.target.value)}
                    placeholder="Resposta..."
                    rows={Math.max(3, Math.min(8, (field.value.match(/\n/g) || []).length + 3))}
                    className="resize-y"
                  />
                )}
              </div>
            ))}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full border-dashed">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar campo personalizado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo campo personalizado</DialogTitle>
                  <DialogDescription>
                    Crie um campo específico para este caso. Ele será incluído no Relatório Médico Detalhado.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Pergunta / Título do campo</Label>
                    <Input
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      placeholder="Ex.: Resultado do exame de polissonografia (08/04/2026)"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newFieldLabel.trim()) {
                          e.preventDefault();
                          handleAddCustomField();
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de resposta</Label>
                    <RadioGroup value={newFieldType} onValueChange={(v) => setNewFieldType(v as "text" | "textarea")} className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="text" id="custom-type-text" />
                        <Label htmlFor="custom-type-text" className="font-normal cursor-pointer">Texto curto</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="textarea" id="custom-type-textarea" />
                        <Label htmlFor="custom-type-textarea" className="font-normal cursor-pointer">Texto longo (parágrafos)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleAddCustomField} disabled={!newFieldLabel.trim()}>
                    Adicionar campo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
