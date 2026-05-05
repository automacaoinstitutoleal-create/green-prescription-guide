// ═══════════════════════════════════════════════════════════════════
// pdfTheme.ts — Sistema unificado de PDF
//
// Contém:
//   • PDF_THEME: cores, fontes, margens, espaçamentos consistentes
//   • drawPageHeader: cabeçalho com identidade visual (faixa + nome do médico)
//   • drawPageFooter: rodapé com paginação automática em todas as páginas
//   • drawSectionHeader: títulos de seção numerados, com regra horizontal
//   • drawCallout: caixas destacadas (info / warning / success / legal)
//   • writeParagraph: parágrafos com quebra de linha + paginação
//   • writeKeyValue: campo "Rótulo: valor" alinhado e legível
//   • keepTogether: garante que conteúdo curto não seja cortado entre páginas
//   • drawSignatureBlock: linha de assinatura padronizada
//
// Filosofia: priorizar legibilidade na impressão (fontes ≥ 9pt em
// conteúdo principal, ≥ 8pt em rodapé), espaçamento generoso, contraste
// adequado em cinzas (preto puro pesa demais e cinza muito claro some).
// ═══════════════════════════════════════════════════════════════════

import jsPDF from "jspdf";

// ─── Tema visual ───
export const PDF_THEME = {
  // Cores (RGB)
  color: {
    primary: [29, 158, 117] as [number, number, number],     // verde Greenlion
    primaryDark: [29, 78, 60] as [number, number, number],   // verde escuro (títulos)
    text: [33, 33, 33] as [number, number, number],          // texto principal — cinza escuro (não preto puro)
    textMuted: [85, 85, 85] as [number, number, number],     // texto secundário
    textLight: [125, 125, 125] as [number, number, number],  // rodapés / metadados
    border: [220, 220, 220] as [number, number, number],     // bordas sutis
    rule: [29, 158, 117] as [number, number, number],        // regra horizontal (mesma do primary)

    // Callouts (fundos suaves para destaques)
    infoBg: [232, 244, 253] as [number, number, number],
    infoBorder: [108, 174, 214] as [number, number, number],
    infoText: [33, 78, 122] as [number, number, number],

    warningBg: [255, 244, 222] as [number, number, number],
    warningBorder: [220, 162, 49] as [number, number, number],
    warningText: [120, 80, 0] as [number, number, number],

    successBg: [232, 247, 238] as [number, number, number],
    successBorder: [29, 158, 117] as [number, number, number],
    successText: [22, 110, 75] as [number, number, number],

    legalBg: [248, 240, 235] as [number, number, number],
    legalBorder: [165, 113, 82] as [number, number, number],
    legalText: [110, 65, 35] as [number, number, number],
  },

  // Tipografia (em pontos jsPDF)
  font: {
    title: 16,         // título principal do documento
    subtitle: 11,      // subtítulo abaixo do título
    sectionHeader: 11, // cabeçalho de seção numerada
    body: 10,          // texto corrido principal — legível impresso
    bodySm: 9,         // texto corrido secundário
    label: 9,          // rótulos de campos (chave de "chave: valor")
    metadata: 8,       // metadados (rodapé, datas, etc)
    footer: 8,         // rodapé fixo
    pageNumber: 8,     // numeração de página
  },

  // Margens e espaçamentos (em mm — jsPDF usa mm por padrão)
  layout: {
    marginX: 20,       // margem esquerda/direita padrão
    marginTop: 18,     // margem superior
    marginBottom: 18,  // margem inferior (espaço para rodapé)
    sectionGap: 6,     // espaço antes de uma nova seção
    paragraphGap: 3,   // espaço entre parágrafos
    lineHeight: 1.35,  // multiplicador de altura de linha
  },
} as const;

// ─── Tipos compartilhados ───
export interface DoctorInfo {
  full_name: string;
  crm: string;
  specialty: string;
  phone?: string;
  address?: string;
  email?: string;
}

export interface PatientInfo {
  full_name: string;
  cpf: string;
  rg?: string | null;
  birth_date?: string | null;
  weight?: number | null;
  address?: string | null;
}

// ─── Helpers internos ───
function setColor(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setDrawColor(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setFillColor(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

/** Calcula altura de linha dado um tamanho de fonte. */
export function lineHeight(fontSize: number): number {
  return fontSize * 0.4 * PDF_THEME.layout.lineHeight;
}

/** Verifica se há espaço suficiente; senão, adiciona página. Retorna o novo y. */
export function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const ph = doc.internal.pageSize.getHeight();
  if (y + needed > ph - PDF_THEME.layout.marginBottom - 12) {
    doc.addPage();
    return PDF_THEME.layout.marginTop;
  }
  return y;
}

/** Calcula a largura útil do conteúdo. */
export function contentWidth(doc: jsPDF, marginX = PDF_THEME.layout.marginX): number {
  return doc.internal.pageSize.getWidth() - 2 * marginX;
}

// ═══════════════════════════════════════════════════════════════════
// CABEÇALHO DA PRIMEIRA PÁGINA
// ═══════════════════════════════════════════════════════════════════

export interface HeaderOptions {
  /** Documento principal (ex: "Receita Médica" ou "Guia de Uso"). */
  documentTitle: string;
  /** Subtítulo opcional (ex: "Receita branca comum"). */
  documentSubtitle?: string;
  /** Médico assistente. */
  doctor: DoctorInfo;
  /** Data de emissão (default: hoje). */
  emissionDate?: Date;
}

/** Desenha cabeçalho de identidade visual da primeira página. Retorna o y após o cabeçalho. */
export function drawPageHeader(doc: jsPDF, opts: HeaderOptions): number {
  const pw = doc.internal.pageSize.getWidth();
  const M = PDF_THEME.layout.marginX;
  let y = PDF_THEME.layout.marginTop;

  // Faixa decorativa superior (linha colorida fina)
  setFillColor(doc, PDF_THEME.color.primary);
  doc.rect(0, 0, pw, 4, "F");

  // Título centralizado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_THEME.font.title);
  setColor(doc, PDF_THEME.color.primaryDark);
  doc.text(opts.documentTitle, pw / 2, y + 4, { align: "center" });
  y += 8;

  // Subtítulo (se houver)
  if (opts.documentSubtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_THEME.font.subtitle);
    setColor(doc, PDF_THEME.color.textMuted);
    doc.text(opts.documentSubtitle, pw / 2, y, { align: "center" });
    y += 6;
  }

  // Linha divisória sutil
  setDrawColor(doc, PDF_THEME.color.rule);
  doc.setLineWidth(0.4);
  doc.line(M, y + 2, pw - M, y + 2);
  y += 7;

  // Bloco do médico (esquerda) + data (direita)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_THEME.font.body);
  setColor(doc, PDF_THEME.color.text);
  doc.text(`Dr(a). ${opts.doctor.full_name}`, M, y);

  // Data à direita
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_THEME.font.bodySm);
  setColor(doc, PDF_THEME.color.textMuted);
  const date = opts.emissionDate || new Date();
  const dateStr = date.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  doc.text(dateStr, pw - M, y, { align: "right" });
  y += 4.5;

  // Subdetalhes do médico
  doc.setFontSize(PDF_THEME.font.bodySm);
  setColor(doc, PDF_THEME.color.textMuted);
  doc.text(`${opts.doctor.specialty} · CRM ${opts.doctor.crm}`, M, y);
  y += 4;

  // Endereço/telefone do médico
  const contact = [opts.doctor.address, opts.doctor.phone, opts.doctor.email].filter(Boolean).join(" · ");
  if (contact) {
    doc.setFontSize(PDF_THEME.font.metadata);
    setColor(doc, PDF_THEME.color.textLight);
    const lines = doc.splitTextToSize(contact, contentWidth(doc) * 0.7);
    doc.text(lines, M, y);
    y += lines.length * 3.3;
  }

  // Linha de fechamento do cabeçalho
  y += 3;
  setDrawColor(doc, PDF_THEME.color.border);
  doc.setLineWidth(0.2);
  doc.line(M, y, pw - M, y);
  y += 6;

  return y;
}

// ═══════════════════════════════════════════════════════════════════
// RODAPÉ DE PÁGINA — chamado no FINAL, aplica em todas as páginas
// ═══════════════════════════════════════════════════════════════════

export interface FooterOptions {
  /** Texto opcional do rodapé (ex: "Greenlion · receita médica"). */
  text?: string;
  /** Nome do médico — sempre incluído. */
  doctorName: string;
  doctorCrm: string;
}

/** Desenha rodapé padronizado em todas as páginas do documento. */
export function drawPageFooter(doc: jsPDF, opts: FooterOptions): void {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = PDF_THEME.layout.marginX;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Linha sutil acima do rodapé
    setDrawColor(doc, PDF_THEME.color.border);
    doc.setLineWidth(0.2);
    doc.line(M, ph - 12, pw - M, ph - 12);

    // Lado esquerdo: nome do médico + CRM
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_THEME.font.footer);
    setColor(doc, PDF_THEME.color.textLight);
    const left = `Dr(a). ${opts.doctorName} · CRM ${opts.doctorCrm}`;
    doc.text(left, M, ph - 7);

    // Centro: texto opcional
    if (opts.text) {
      doc.text(opts.text, pw / 2, ph - 7, { align: "center" });
    }

    // Lado direito: paginação
    doc.text(`Página ${i} de ${pageCount}`, pw - M, ph - 7, { align: "right" });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CABEÇALHO DE SEÇÃO
// ═══════════════════════════════════════════════════════════════════

/** Desenha cabeçalho de seção numerada com regra horizontal abaixo. */
export function drawSectionHeader(doc: jsPDF, y: number, title: string, opts?: { number?: number }): number {
  const pw = doc.internal.pageSize.getWidth();
  const M = PDF_THEME.layout.marginX;
  y = ensureSpace(doc, y, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_THEME.font.sectionHeader);
  setColor(doc, PDF_THEME.color.primaryDark);

  const text = opts?.number != null ? `${opts.number}. ${title.toUpperCase()}` : title.toUpperCase();
  doc.text(text, M, y);
  y += 2;

  setDrawColor(doc, PDF_THEME.color.rule);
  doc.setLineWidth(0.4);
  doc.line(M, y + 1, pw - M, y + 1);
  y += 5;

  return y;
}

// ═══════════════════════════════════════════════════════════════════
// PARÁGRAFO COM QUEBRA AUTOMÁTICA E PAGINAÇÃO
// ═══════════════════════════════════════════════════════════════════

export interface WriteParaOptions {
  size?: number;
  bold?: boolean;
  italic?: boolean;
  color?: [number, number, number];
  /** Espaço após o parágrafo. */
  gap?: number;
  /** Margem esquerda (default: PDF_THEME.layout.marginX). */
  x?: number;
  /** Largura útil (default: contentWidth). */
  width?: number;
  /** Alinhamento. */
  align?: "left" | "center" | "right" | "justify";
}

/** Escreve um parágrafo respeitando quebras de linha e paginação. Retorna o novo y. */
export function writeParagraph(doc: jsPDF, y: number, text: string, opts?: WriteParaOptions): number {
  if (!text || !text.trim()) return y;

  const size = opts?.size ?? PDF_THEME.font.body;
  const bold = opts?.bold ?? false;
  const italic = opts?.italic ?? false;
  const color = opts?.color ?? PDF_THEME.color.text;
  const gap = opts?.gap ?? PDF_THEME.layout.paragraphGap;
  const x = opts?.x ?? PDF_THEME.layout.marginX;
  const width = opts?.width ?? contentWidth(doc);
  const align = opts?.align ?? "left";

  const fontStyle = bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal";
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(size);
  setColor(doc, color);

  const lh = lineHeight(size);

  // Suporta quebras explícitas com \n
  const paragraphs = text.split("\n");

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i] || " ";
    const lines = doc.splitTextToSize(paragraph, width);

    for (const line of lines) {
      y = ensureSpace(doc, y, lh);
      const xPos = align === "center" ? x + width / 2 : align === "right" ? x + width : x;
      doc.text(line, xPos, y, { align: align === "justify" ? "left" : align });
      y += lh;
    }

    if (i < paragraphs.length - 1) y += lh * 0.4; // espaço entre parágrafos do mesmo bloco
  }

  return y + gap;
}

// ═══════════════════════════════════════════════════════════════════
// CAMPO ROTULADO ("Nome: João")
// ═══════════════════════════════════════════════════════════════════

/** Escreve um par "Rótulo: valor" em uma linha, com rótulo bold. */
export function writeKeyValue(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  opts?: { size?: number; gap?: number; x?: number; width?: number; color?: [number, number, number] }
): number {
  if (!value || !value.trim()) return y;

  const size = opts?.size ?? PDF_THEME.font.body;
  const gap = opts?.gap ?? 1.5;
  const x = opts?.x ?? PDF_THEME.layout.marginX;
  const width = opts?.width ?? contentWidth(doc);
  const color = opts?.color ?? PDF_THEME.color.text;
  const lh = lineHeight(size);

  setColor(doc, color);
  doc.setFontSize(size);

  // Mede o rótulo
  doc.setFont("helvetica", "bold");
  const labelText = `${label}: `;
  const labelWidth = doc.getTextWidth(labelText);

  // Se o valor inteiro cabe na mesma linha, escreve inline
  const fullText = labelText + value;
  if (doc.getTextWidth(fullText) <= width) {
    y = ensureSpace(doc, y, lh);
    doc.text(labelText, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + labelWidth, y);
    return y + lh + gap;
  }

  // Caso contrário: rótulo em uma linha, valor abaixo (ou multilinha)
  y = ensureSpace(doc, y, lh);
  doc.text(label + ":", x, y);
  y += lh;
  doc.setFont("helvetica", "normal");

  const valueLines = doc.splitTextToSize(value, width);
  for (const line of valueLines) {
    y = ensureSpace(doc, y, lh);
    doc.text(line, x, y);
    y += lh;
  }
  return y + gap;
}

// ═══════════════════════════════════════════════════════════════════
// CAIXA DESTACADA (CALLOUT)
// ═══════════════════════════════════════════════════════════════════

export type CalloutVariant = "info" | "warning" | "success" | "legal";

/** Desenha caixa destacada com fundo colorido sutil e barra lateral. */
export function drawCallout(
  doc: jsPDF,
  y: number,
  text: string,
  opts: { variant?: CalloutVariant; title?: string; size?: number; gap?: number } = {}
): number {
  const variant = opts.variant ?? "info";
  const size = opts.size ?? PDF_THEME.font.bodySm;
  const gap = opts.gap ?? 4;
  const M = PDF_THEME.layout.marginX;
  const pw = doc.internal.pageSize.getWidth();
  const w = pw - 2 * M;
  const innerPadX = 4;
  const innerPadY = 3;
  const lh = lineHeight(size);
  const titleLh = lineHeight(size + 0.5);

  const palette = {
    info: { bg: PDF_THEME.color.infoBg, border: PDF_THEME.color.infoBorder, text: PDF_THEME.color.infoText },
    warning: { bg: PDF_THEME.color.warningBg, border: PDF_THEME.color.warningBorder, text: PDF_THEME.color.warningText },
    success: { bg: PDF_THEME.color.successBg, border: PDF_THEME.color.successBorder, text: PDF_THEME.color.successText },
    legal: { bg: PDF_THEME.color.legalBg, border: PDF_THEME.color.legalBorder, text: PDF_THEME.color.legalText },
  }[variant];

  // Mede texto
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, w - 2 * innerPadX - 2);
  const titleLines = opts.title
    ? doc.splitTextToSize(opts.title, w - 2 * innerPadX - 2)
    : [];

  const totalH =
    innerPadY * 2 +
    titleLines.length * titleLh +
    lines.length * lh +
    (titleLines.length > 0 ? 1 : 0);

  y = ensureSpace(doc, y, totalH + 2);

  // Fundo
  setFillColor(doc, palette.bg);
  doc.rect(M, y, w, totalH, "F");

  // Barra lateral esquerda (3pt de largura, mais visível)
  setFillColor(doc, palette.border);
  doc.rect(M, y, 1.2, totalH, "F");

  // Título
  let cy = y + innerPadY + titleLh - 1;
  if (titleLines.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size + 0.5);
    setColor(doc, palette.text);
    titleLines.forEach((line: string, i: number) => {
      doc.text(line, M + innerPadX + 2, cy);
      if (i < titleLines.length - 1) cy += titleLh;
    });
    cy += titleLh + 0.5;
  }

  // Texto
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  setColor(doc, palette.text);
  for (const line of lines) {
    doc.text(line, M + innerPadX + 2, cy);
    cy += lh;
  }

  return y + totalH + gap;
}

// ═══════════════════════════════════════════════════════════════════
// LINHA DIVISÓRIA HORIZONTAL
// ═══════════════════════════════════════════════════════════════════

export function drawHorizontalRule(
  doc: jsPDF,
  y: number,
  opts?: { gap?: number; color?: [number, number, number]; width?: number }
): number {
  const M = PDF_THEME.layout.marginX;
  const pw = doc.internal.pageSize.getWidth();
  const gap = opts?.gap ?? 5;
  const color = opts?.color ?? PDF_THEME.color.border;
  const width = opts?.width ?? 0.2;

  y = ensureSpace(doc, y, gap * 2);
  setDrawColor(doc, color);
  doc.setLineWidth(width);
  doc.line(M, y, pw - M, y);
  return y + gap;
}

// ═══════════════════════════════════════════════════════════════════
// BLOCO DE ASSINATURA (mantém junto, evita órfão)
// ═══════════════════════════════════════════════════════════════════

export interface SignatureBlockOptions {
  doctor: DoctorInfo;
  /** Texto auxiliar (ex.: "Local e data"). */
  locationLabel?: string;
  /** Largura da linha de assinatura. */
  width?: number;
  /** Posição: 'left' | 'center' | 'right'. Default: center. */
  align?: "left" | "center" | "right";
}

/** Desenha bloco de assinatura completo. Garante que não fique órfão. */
export function drawSignatureBlock(doc: jsPDF, y: number, opts: SignatureBlockOptions): number {
  const M = PDF_THEME.layout.marginX;
  const pw = doc.internal.pageSize.getWidth();
  const lineW = opts.width ?? 90;
  const align = opts.align ?? "center";

  // Bloco mínimo: linha + assinatura/CRM + (opcional) local/data = ~30mm
  y = ensureSpace(doc, y, 35);

  // Pequeno espaço acima
  y += 8;

  let xLineStart: number;
  let xText: number;
  switch (align) {
    case "left":
      xLineStart = M;
      xText = M;
      break;
    case "right":
      xLineStart = pw - M - lineW;
      xText = pw - M - lineW / 2;
      break;
    case "center":
    default:
      xLineStart = (pw - lineW) / 2;
      xText = pw / 2;
      break;
  }

  // Linha de assinatura
  setDrawColor(doc, PDF_THEME.color.text);
  doc.setLineWidth(0.4);
  doc.line(xLineStart, y, xLineStart + lineW, y);
  y += 4;

  // Nome do médico (centrado na linha)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_THEME.font.bodySm);
  setColor(doc, PDF_THEME.color.text);
  doc.text(`Dr(a). ${opts.doctor.full_name}`, xText, y, { align });
  y += 3.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_THEME.font.metadata);
  setColor(doc, PDF_THEME.color.textMuted);
  doc.text(`${opts.doctor.specialty} · CRM ${opts.doctor.crm}`, xText, y, { align });
  y += 3.5;

  if (opts.doctor.phone) {
    doc.text(`Tel: ${opts.doctor.phone}`, xText, y, { align });
    y += 3.5;
  }

  return y;
}
