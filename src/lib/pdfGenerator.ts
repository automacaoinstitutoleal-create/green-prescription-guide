import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfParams {
  doctor: {
    full_name: string;
    crm: string;
    specialty: string;
    phone?: string | null;
    address?: string | null;
  };
  patient: {
    full_name: string;
    cpf: string;
    rg?: string | null;
    birth_date?: string | null;
    weight?: number | null;
    address?: string | null;
  };
  prescriptionData: {
    pathology: string;
    product: string;
    productType: string;
    dosePerKg: number;
    calculatedDose: number;
    concentration: number;
    titulationSteps: Array<{
      week: number;
      days: string;
      doseMorning: number;
      doseEvening: number;
      totalDaily: number;
      volumeMorning: number;
      volumeEvening: number;
    }>;
    patientWeight?: number | null;
  };
  tcleAccepted: boolean;
}

export function generatePrescriptionPDF({ doctor, patient, prescriptionData, tcleAccepted }: PdfParams) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(29, 158, 117); // #1D9E75
  doc.text("Greenlion Precision", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Guia de Prescrição — Cannabis Medicinal", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(29, 158, 117);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // Doctor info
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("MÉDICO PRESCRITOR", 20, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${doctor.full_name}`, 20, y); y += 5;
  doc.text(`CRM: ${doctor.crm} | Especialidade: ${doctor.specialty}`, 20, y); y += 5;
  if (doctor.phone) { doc.text(`Telefone: ${doctor.phone}`, 20, y); y += 5; }
  if (doctor.address) { doc.text(`Endereço: ${doctor.address}`, 20, y); y += 5; }
  y += 5;

  // Patient info
  doc.setFont("helvetica", "bold");
  doc.text("PACIENTE", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${patient.full_name}`, 20, y); y += 5;
  doc.text(`CPF: ${patient.cpf}${patient.rg ? ` | RG: ${patient.rg}` : ""}`, 20, y); y += 5;
  if (patient.birth_date) { doc.text(`Data de nascimento: ${new Date(patient.birth_date).toLocaleDateString("pt-BR")}`, 20, y); y += 5; }
  doc.text(`Peso: ${patient.weight ?? "N/I"} kg`, 20, y); y += 5;
  if (patient.address) { doc.text(`Endereço: ${patient.address}`, 20, y); y += 5; }
  y += 5;

  // Prescription
  doc.setFont("helvetica", "bold");
  doc.text("PRESCRIÇÃO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Patologia: ${prescriptionData.pathology}`, 20, y); y += 5;
  doc.text(`Produto: ${prescriptionData.product} (${prescriptionData.productType})`, 20, y); y += 5;
  doc.text(`Concentração: ${prescriptionData.concentration} mg/mL`, 20, y); y += 5;
  doc.text(`Dose: ${prescriptionData.dosePerKg} mg/kg/dia = ${prescriptionData.calculatedDose} mg/dia`, 20, y); y += 5;
  const vol = Math.round((prescriptionData.calculatedDose / prescriptionData.concentration) * 100) / 100;
  doc.text(`Volume diário alvo: ${vol} mL/dia (administrar 12/12h)`, 20, y); y += 8;

  // Titulation table
  doc.setFont("helvetica", "bold");
  doc.text("PROTOCOLO DE TITULAÇÃO", 20, y); y += 4;

  (doc as any).autoTable({
    startY: y,
    head: [["Semana", "Período", "Manhã (mg)", "Noite (mg)", "Total/dia (mg)", "Vol. manhã (mL)", "Vol. noite (mL)"]],
    body: prescriptionData.titulationSteps.map((s) => [
      s.week, s.days, s.doseMorning, s.doseEvening, s.totalDaily, s.volumeMorning, s.volumeEvening,
    ]),
    theme: "grid",
    headStyles: { fillColor: [29, 158, 117] },
    styles: { fontSize: 8 },
    margin: { left: 20, right: 20 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // TCLE
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.text("TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const tcleText = `Eu, ${patient.full_name}, CPF ${patient.cpf}, declaro que fui devidamente informado(a) pelo(a) Dr(a). ${doctor.full_name} (CRM ${doctor.crm}) sobre a natureza do tratamento com produtos à base de Cannabis medicinal, os benefícios esperados e possíveis efeitos adversos, o produto prescrito (${prescriptionData.product} - ${prescriptionData.productType}), a posologia e o protocolo de titulação gradual, a necessidade de acompanhamento médico regular, e que o tratamento pode ser suspenso a qualquer momento. Declaro estar ciente e de acordo com o tratamento proposto.`;

  const lines = doc.splitTextToSize(tcleText, pageWidth - 40);
  doc.text(lines, 20, y);
  y += lines.length * 4 + 10;

  if (y > 260) { doc.addPage(); y = 20; }

  doc.setFontSize(9);
  doc.text(`Status do TCLE: ${tcleAccepted ? "ACEITO" : "PENDENTE"}`, 20, y); y += 15;

  // Signatures
  doc.line(20, y, 90, y);
  doc.line(pageWidth - 90, y, pageWidth - 20, y);
  y += 5;
  doc.text("Assinatura do Paciente", 30, y);
  doc.text("Assinatura do Médico", pageWidth - 80, y);
  y += 10;

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Data de emissão: ${new Date().toLocaleDateString("pt-BR")} | Greenlion Precision — Guia de Prescrição`, pageWidth / 2, y, { align: "center" });

  doc.save(`receita_${patient.full_name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
