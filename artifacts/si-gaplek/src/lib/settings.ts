export interface InstitutionProfile {
  companyName: string;
  subTitle: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  // Signers
  directorName: string;
  directorNip: string;
  directorTitle: string;
  warehouseHeadName: string;
  warehouseHeadNip: string;
  warehouseHeadTitle: string;
  spiHeadName: string;
  spiHeadNip: string;
  spiHeadTitle: string;
}

export const DEFAULT_INSTITUTION_PROFILE: InstitutionProfile = {
  companyName: "PERUMDAM TIRTA ARDHIA RINJANI",
  subTitle: "KABUPATEN LOMBOK TENGAH",
  address: "Jl. Basuki Rahmat No. 10, Praya",
  city: "Kabupaten Lombok Tengah, Nusa Tenggara Barat",
  phone: "(0370) 654123",
  email: "logistik@perumdamtar.co.id",
  website: "www.perumdamtar.co.id",
  directorName: "Bambang Supratomo, S.T., M.T.",
  directorNip: "19780512 200312 1 002",
  directorTitle: "Direktur Utama",
  warehouseHeadName: "Ahmad Munawir, S.Sos.",
  warehouseHeadNip: "19840215 200801 1 007",
  warehouseHeadTitle: "Kepala Bagian Logistik & Gudang",
  spiHeadName: "Lalu Muhammad Ikhsan, S.E., M.Ak.",
  spiHeadNip: "19810920 200604 1 005",
  spiHeadTitle: "Kepala Satuan Pengawas Intern (SPI)",
};

export function getInstitutionProfile(): InstitutionProfile {
  try {
    const saved = localStorage.getItem("sigaplek_institution_profile");
    if (saved) {
      return { ...DEFAULT_INSTITUTION_PROFILE, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Error reading institution profile", e);
  }
  return DEFAULT_INSTITUTION_PROFILE;
}

export function saveInstitutionProfile(profile: InstitutionProfile) {
  localStorage.setItem("sigaplek_institution_profile", JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent("institution-profile-updated", { detail: profile }));
}
