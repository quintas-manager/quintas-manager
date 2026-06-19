"use server";
export async function fetchTipoCambioAction(): Promise<number> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue", { cache: "no-store" });
    const data = await res.json();
    return data.venta ?? 0;
  } catch {
    return 0;
  }
}
