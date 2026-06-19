export async function getTipoCambioBlueSell(): Promise<number> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue", {
      next: { revalidate: 300 },
    });
    const data = await res.json();
    return data.venta ?? 0;
  } catch {
    return 0;
  }
}
