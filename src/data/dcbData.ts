export interface DcbEntry {
  codigo: string;
  denominacao: string;
  categoria: "Analgésico/Antipirético" | "Antibiótico" | "Anti-inflamatório" | "Anti-hipertensivo" | "Antidiabético" | "Antidepressivo" | "Hormônio" | "Vitamina/Suplemento" | "Anticoagulante" | "Antiviral" | "Vacina" | "Outros";
}

export const dcbData: DcbEntry[] = [
  // Analgésicos/Antipiréticos
  { codigo: "00014", denominacao: "Ácido acetilsalicílico", categoria: "Analgésico/Antipirético" },
  { codigo: "06467", denominacao: "Dipirona sódica", categoria: "Analgésico/Antipirético" },
  { codigo: "07167", denominacao: "Paracetamol", categoria: "Analgésico/Antipirético" },
  { codigo: "04890", denominacao: "Ibuprofeno", categoria: "Anti-inflamatório" },
  { codigo: "06170", denominacao: "Naproxeno", categoria: "Anti-inflamatório" },
  { codigo: "06171", denominacao: "Naproxeno sódico", categoria: "Anti-inflamatório" },
  { codigo: "06572", denominacao: "Diclofenaco sódico", categoria: "Anti-inflamatório" },
  { codigo: "06573", denominacao: "Diclofenaco potássico", categoria: "Anti-inflamatório" },
  { codigo: "06574", denominacao: "Diclofenaco dietilamônio", categoria: "Anti-inflamatório" },
  { codigo: "07660", denominacao: "Nimesulida", categoria: "Anti-inflamatório" },
  { codigo: "07350", denominacao: "Piroxicam", categoria: "Anti-inflamatório" },
  { codigo: "06680", denominacao: "Meloxicam", categoria: "Anti-inflamatório" },
  // Antibióticos
  { codigo: "00560", denominacao: "Amoxicilina", categoria: "Antibiótico" },
  { codigo: "00561", denominacao: "Amoxicilina tri-hidratada", categoria: "Antibiótico" },
  { codigo: "00935", denominacao: "Azitromicina", categoria: "Antibiótico" },
  { codigo: "00936", denominacao: "Azitromicina di-hidratada", categoria: "Antibiótico" },
  { codigo: "02090", denominacao: "Cefalexina", categoria: "Antibiótico" },
  { codigo: "02091", denominacao: "Cefalexina monoidratada", categoria: "Antibiótico" },
  { codigo: "03430", denominacao: "Ciprofloxacino", categoria: "Antibiótico" },
  { codigo: "03431", denominacao: "Cloridrato de ciprofloxacino", categoria: "Antibiótico" },
  { codigo: "05910", denominacao: "Levofloxacino", categoria: "Antibiótico" },
  { codigo: "05911", denominacao: "Levofloxacino hemi-hidratado", categoria: "Antibiótico" },
  { codigo: "07240", denominacao: "Penicilina G benzatina", categoria: "Antibiótico" },
  { codigo: "06700", denominacao: "Metronidazol", categoria: "Antibiótico" },
  // Anti-hipertensivos
  { codigo: "05600", denominacao: "Losartana potássica", categoria: "Anti-hipertensivo" },
  { codigo: "04040", denominacao: "Enalapril maleato", categoria: "Anti-hipertensivo" },
  { codigo: "02510", denominacao: "Captopril", categoria: "Anti-hipertensivo" },
  { codigo: "00780", denominacao: "Atenolol", categoria: "Anti-hipertensivo" },
  { codigo: "00530", denominacao: "Anlodipino besilato", categoria: "Anti-hipertensivo" },
  { codigo: "04750", denominacao: "Hidroclorotiazida", categoria: "Anti-hipertensivo" },
  { codigo: "07450", denominacao: "Propranolol cloridrato", categoria: "Anti-hipertensivo" },
  { codigo: "09110", denominacao: "Valsartana", categoria: "Anti-hipertensivo" },
  // Antidiabéticos
  { codigo: "06650", denominacao: "Metformina cloridrato", categoria: "Antidiabético" },
  { codigo: "04250", denominacao: "Glibenclamida", categoria: "Antidiabético" },
  { codigo: "04260", denominacao: "Gliclazida", categoria: "Antidiabético" },
  { codigo: "04920", denominacao: "Insulina humana NPH", categoria: "Antidiabético" },
  { codigo: "04921", denominacao: "Insulina humana regular", categoria: "Antidiabético" },
  { codigo: "08550", denominacao: "Sitagliptina fosfato", categoria: "Antidiabético" },
  { codigo: "03770", denominacao: "Dapagliflozina", categoria: "Antidiabético" },
  // Antidepressivos
  { codigo: "04190", denominacao: "Fluoxetina cloridrato", categoria: "Antidepressivo" },
  { codigo: "08450", denominacao: "Sertralina cloridrato", categoria: "Antidepressivo" },
  { codigo: "04080", denominacao: "Escitalopram oxalato", categoria: "Antidepressivo" },
  { codigo: "09280", denominacao: "Venlafaxina cloridrato", categoria: "Antidepressivo" },
  { codigo: "00540", denominacao: "Amitriptilina cloridrato", categoria: "Antidepressivo" },
  // Hormônios
  { codigo: "05880", denominacao: "Levotiroxina sódica", categoria: "Hormônio" },
  { codigo: "07430", denominacao: "Progesterona", categoria: "Hormônio" },
  { codigo: "04120", denominacao: "Estradiol", categoria: "Hormônio" },
  { codigo: "07380", denominacao: "Prednisolona", categoria: "Hormônio" },
  { codigo: "07390", denominacao: "Prednisona", categoria: "Hormônio" },
  { codigo: "03940", denominacao: "Dexametasona", categoria: "Hormônio" },
  // Vitaminas/Suplementos
  { codigo: "00110", denominacao: "Ácido ascórbico (Vitamina C)", categoria: "Vitamina/Suplemento" },
  { codigo: "00080", denominacao: "Ácido fólico", categoria: "Vitamina/Suplemento" },
  { codigo: "08890", denominacao: "Sulfato ferroso", categoria: "Vitamina/Suplemento" },
  { codigo: "03490", denominacao: "Colecalciferol (Vitamina D3)", categoria: "Vitamina/Suplemento" },
  { codigo: "08680", denominacao: "Tiamina cloridrato (Vitamina B1)", categoria: "Vitamina/Suplemento" },
  { codigo: "03240", denominacao: "Cianocobalamina (Vitamina B12)", categoria: "Vitamina/Suplemento" },
  // Anticoagulantes
  { codigo: "09100", denominacao: "Varfarina sódica", categoria: "Anticoagulante" },
  { codigo: "04670", denominacao: "Heparina sódica", categoria: "Anticoagulante" },
  { codigo: "04050", denominacao: "Enoxaparina sódica", categoria: "Anticoagulante" },
  { codigo: "08250", denominacao: "Rivaroxabana", categoria: "Anticoagulante" },
  // Antivirais
  { codigo: "00150", denominacao: "Aciclovir", categoria: "Antiviral" },
  { codigo: "07150", denominacao: "Oseltamivir fosfato", categoria: "Antiviral" },
  { codigo: "09380", denominacao: "Zidovudina", categoria: "Antiviral" },
  { codigo: "05800", denominacao: "Lamivudina", categoria: "Antiviral" },
  { codigo: "08640", denominacao: "Tenofovir desoproxila", categoria: "Antiviral" },
  // Vacinas
  { codigo: "09500", denominacao: "Vacina BCG", categoria: "Vacina" },
  { codigo: "09510", denominacao: "Vacina contra hepatite B", categoria: "Vacina" },
  { codigo: "09520", denominacao: "Vacina tríplice viral (sarampo, caxumba, rubéola)", categoria: "Vacina" },
  { codigo: "09530", denominacao: "Vacina contra influenza", categoria: "Vacina" },
  { codigo: "09540", denominacao: "Vacina contra febre amarela", categoria: "Vacina" },
  // Outros
  { codigo: "07080", denominacao: "Omeprazol", categoria: "Outros" },
  { codigo: "07210", denominacao: "Pantoprazol sódico", categoria: "Outros" },
  { codigo: "05590", denominacao: "Loratadina", categoria: "Outros" },
  { codigo: "08590", denominacao: "Sinvastatina", categoria: "Outros" },
  { codigo: "00810", denominacao: "Atorvastatina cálcica", categoria: "Outros" },
  { codigo: "03460", denominacao: "Clonazepam", categoria: "Outros" },
  { codigo: "00410", denominacao: "Alprazolam", categoria: "Outros" },
  { codigo: "08350", denominacao: "Salbutamol sulfato", categoria: "Outros" },
  { codigo: "01400", denominacao: "Budesonida", categoria: "Outros" },
  { codigo: "06760", denominacao: "Montelucaste sódico", categoria: "Outros" },
];
