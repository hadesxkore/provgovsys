import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const getDepartmentFullName = (deptId) => {
  const departments = {
    pgso: "Provincial General Services Office",
    opg: "Office of the Provincial Governor",
    pbo: "Provincial Budget Office",
    ppdo: "Provincial Planning and Development Office",
    pto: "Provincial Treasury Office"
  };
  return departments[deptId] || deptId;
};
