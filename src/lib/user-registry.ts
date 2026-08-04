import { supabase } from "@/integrations/supabase/client";

export interface RegisteredStudent {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  created_at: string;
  updated_at?: string;
  is_blocked?: boolean;
  password?: string;
  custom_enrollments?: string[];
}

export const DEFAULT_ADMIN_USER = {
  id: "admin-user-001",
  full_name: "Administrador",
  email: "admin@protocolo4d.com",
  role: "admin",
};

// Centralized special emails — update here to propagate everywhere
export const ADMIN_EMAIL = "admin@protocolo4d.com";
export const PROFESSOR_EMAIL = "professorjonatasg@gmail.com";
export const EXCLUDED_EMAIL_PATTERNS = ["admin", "jhon", "teste", "test"];
export const SYNTHETIC_STUDENT_PATTERN = { prefix: "aluno_", suffix: "@plataforma.com" };

export const ALLOWED_LOGINS = [
  { name: "Administrador", email: DEFAULT_ADMIN_USER.email, role: "admin" },
];

export function getRegisteredStudents(): RegisteredStudent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("p4d_all_registered_students");
    let list: RegisteredStudent[] = raw ? JSON.parse(raw) : [];

    // Filter out dummy/test logins created during automated testing
    list = list.filter((s) => {
      if (!s || !s.email) return false;
      const email = s.email.toLowerCase();
      const name = s.full_name?.toLowerCase() ?? "";

      // Exclude admin or synthetic placeholder emails
      if (email.includes("admin") || name.includes("administrador")) {
        return false;
      }
      if (email === "professorjonatasg@gmail.com") {
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

    localStorage.setItem("p4d_all_registered_students", JSON.stringify(list));
    return list;
  } catch (e) {
    console.error("Error reading registered students:", e);
    return [];
  }
}

export function saveRegisteredStudent(student: RegisteredStudent): RegisteredStudent[] {
  if (typeof window === "undefined") return [];
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
    return [];
  }
}

export function toggleStudentEnrollmentLocal(
  emailOrId: string,
  courseSlugOrId: string,
  enroll: boolean
): RegisteredStudent[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getRegisteredStudents();
    const idx = current.findIndex(
      (s) => s.id === emailOrId || s.email.toLowerCase() === emailOrId.toLowerCase()
    );
    if (idx >= 0) {
      const student = current[idx];
      const set = new Set(student.custom_enrollments ?? []);
      if (enroll) {
        set.add(courseSlugOrId);
      } else {
        set.delete(courseSlugOrId);
      }
      current[idx].custom_enrollments = Array.from(set);
      localStorage.setItem("p4d_all_registered_students", JSON.stringify(current));
    }
    return current;
  } catch (e) {
    console.error("Error toggling local student enrollment:", e);
    return getRegisteredStudents();
  }
}

export function clearAllRegisteredStudents() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("p4d_all_registered_students");
  } catch (e) {
    console.error("Error clearing registered students:", e);
  }
}

export function updateStudentStatus(studentIdOrEmail: string, isBlocked: boolean): RegisteredStudent[] {
  if (typeof window === "undefined") return [];
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

    // Sync block status to Supabase profiles table
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentIdOrEmail);
    const query = isUuid
      ? supabase.from("profiles").update({ is_blocked: isBlocked }).eq("id", studentIdOrEmail)
      : supabase.from("profiles").update({ is_blocked: isBlocked }).eq("email", studentIdOrEmail.toLowerCase());

    query.then(({ error }) => {
      if (error) console.warn("Could not sync block status to profiles table:", error.message);
    });

    return current;
  } catch (e) {
    console.error("Error updating student status:", e);
    return getRegisteredStudents();
  }
}

export function updateStudentPassword(studentIdOrEmail: string, newPassword: string): RegisteredStudent[] {
  if (typeof window === "undefined") return [];
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

