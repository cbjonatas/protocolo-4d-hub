export interface RegisteredStudent {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  created_at: string;
  updated_at?: string;
  is_blocked?: boolean;
  password?: string;
}

export const DEFAULT_GEOVANNA_STUDENT: RegisteredStudent = {
  id: "student-geovanna-andrade-001",
  full_name: "Geovanna Andrade",
  email: "nti@premierlog.com.br",
  whatsapp: "(11) 98765-4321",
  created_at: "2026-07-30T10:00:00.000Z",
  updated_at: "2026-07-30T10:00:00.000Z",
  is_blocked: false,
};

export const DEFAULT_ADMIN_USER = {
  id: "admin-user-001",
  full_name: "Administrador",
  email: "admin@protocolo4d.com",
  role: "admin",
};

export const ALLOWED_LOGINS = [
  { name: "Administrador", email: DEFAULT_ADMIN_USER.email, role: "admin" },
  { name: DEFAULT_GEOVANNA_STUDENT.full_name, email: DEFAULT_GEOVANNA_STUDENT.email, role: "student" },
];

export function getRegisteredStudents(): RegisteredStudent[] {
  if (typeof window === "undefined") return [DEFAULT_GEOVANNA_STUDENT];
  try {
    const raw = localStorage.getItem("p4d_all_registered_students");
    let list: RegisteredStudent[] = raw ? JSON.parse(raw) : [];

    // Filter out dummy/test logins created during automated testing
    list = list.filter((s) => {
      if (!s || !s.email) return false;
      const email = s.email.toLowerCase();
      const name = s.full_name?.toLowerCase() ?? "";

      // Exclude admin or synthetic placeholder emails
      if (email.includes("admin") || email.startsWith("jhon") || name.includes("administrador")) {
        return false;
      }
      if (email.startsWith("aluno_") && email.endsWith("@plataforma.com")) {
        return false;
      }
      if (email.includes("teste") || email.includes("test")) {
        return false;
      }
      return true;
    });

    // Ensure Geovanna Andrade is always present and updated with nti@premierlog.com.br
    const geoIndex = list.findIndex(
      (s) => s.full_name === DEFAULT_GEOVANNA_STUDENT.full_name || s.email.toLowerCase() === "nti@premierlog.com.br"
    );

    if (geoIndex >= 0) {
      list[geoIndex] = {
        ...DEFAULT_GEOVANNA_STUDENT,
        ...list[geoIndex],
        email: DEFAULT_GEOVANNA_STUDENT.email,
      };
    } else {
      list.unshift(DEFAULT_GEOVANNA_STUDENT);
    }

    localStorage.setItem("p4d_all_registered_students", JSON.stringify(list));
    return list;
  } catch (e) {
    console.error("Error reading registered students:", e);
    return [DEFAULT_GEOVANNA_STUDENT];
  }
}

export function saveRegisteredStudent(student: RegisteredStudent): RegisteredStudent[] {
  if (typeof window === "undefined") return [DEFAULT_GEOVANNA_STUDENT];
  try {
    const current = getRegisteredStudents();
    const existingIndex = current.findIndex(
      (s) => s.id === student.id || s.email.toLowerCase() === student.email.toLowerCase()
    );
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...student };
    } else {
      current.unshift(student);
    }
    localStorage.setItem("p4d_all_registered_students", JSON.stringify(current));
    return current;
  } catch (e) {
    console.error("Error saving registered student:", e);
    return [DEFAULT_GEOVANNA_STUDENT];
  }
}

export function updateStudentStatus(studentIdOrEmail: string, isBlocked: boolean): RegisteredStudent[] {
  if (typeof window === "undefined") return [DEFAULT_GEOVANNA_STUDENT];
  try {
    const current = getRegisteredStudents();
    const idx = current.findIndex(
      (s) => s.id === studentIdOrEmail || s.email.toLowerCase() === studentIdOrEmail.toLowerCase()
    );
    if (idx >= 0) {
      current[idx].is_blocked = isBlocked;
      current[idx].updated_at = new Date().toISOString();
      localStorage.setItem("p4d_all_registered_students", JSON.stringify(current));
    }
    return current;
  } catch (e) {
    console.error("Error updating student status:", e);
    return getRegisteredStudents();
  }
}

export function updateStudentPassword(studentIdOrEmail: string, newPassword: string): RegisteredStudent[] {
  if (typeof window === "undefined") return [DEFAULT_GEOVANNA_STUDENT];
  try {
    const current = getRegisteredStudents();
    const idx = current.findIndex(
      (s) => s.id === studentIdOrEmail || s.email.toLowerCase() === studentIdOrEmail.toLowerCase()
    );
    if (idx >= 0) {
      current[idx].password = newPassword;
      current[idx].updated_at = new Date().toISOString();
      localStorage.setItem("p4d_all_registered_students", JSON.stringify(current));
    }
    return current;
  } catch (e) {
    console.error("Error updating student password:", e);
    return getRegisteredStudents();
  }
}

export function isStudentBlocked(emailOrId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const list = getRegisteredStudents();
    const target = list.find(
      (s) => s.id === emailOrId || s.email.toLowerCase() === emailOrId.toLowerCase()
    );
    return !!target?.is_blocked;
  } catch {
    return false;
  }
}
