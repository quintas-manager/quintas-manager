interface MontoDisplayProps {
  montoUSD: number;
  montoARS?: number | null;
  tipoCambio?: number | null;
  moneda?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MontoDisplay({
  montoUSD,
  montoARS,
  tipoCambio,
  moneda,
  size = "md",
  className = "",
}: MontoDisplayProps) {
  const sizeClass =
    size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <div className={`flex flex-col ${className}`}>
      <span className={`font-semibold ${sizeClass}`}>
        USD{" "}
        {montoUSD.toLocaleString("es-AR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}
      </span>
      {moneda === "ARS" && montoARS && tipoCambio && (
        <span className="text-xs text-gray-500">
          ARS{" "}
          {montoARS.toLocaleString("es-AR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}{" "}
          · TC ${tipoCambio.toLocaleString("es-AR")}
        </span>
      )}
    </div>
  );
}
