/** Ecrã de carregamento em ecrã inteiro: fundo escuro, pontos a girar e texto "Carregando". */
export function Carregando({ detalhe, label = "Carregando" }: { detalhe?: string; label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-foreground text-background"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-12 w-12 animate-spin motion-reduce:animate-none" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <span
              key={index}
              className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-background"
              style={{
                opacity: 0.25 + index * 0.1,
                transform: `translate(-50%, -50%) rotate(${index * 45}deg) translateY(-18px)`,
              }}
            />
          ))}
        </div>
        <div className="text-center">
          <p className="font-display text-lg font-semibold">{label}</p>
          {detalhe && <p className="mt-1 text-sm text-background/70">{detalhe}</p>}
        </div>
      </div>
    </div>
  );
}
