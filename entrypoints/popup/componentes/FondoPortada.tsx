export function FondoPortada(props: {
  portada: string | null;
  descripcion: string;
}) {
  const { descripcion, portada } = props;

  return (
    <div className="absolute inset-0">
      {portada ? (
        <img
          src={portada}
          alt={descripcion}
          className="h-full w-full object-cover grayscale contrast-110 opacity-80"
        />
      ) : (
        <div className="portada-relleno h-full w-full" aria-hidden="true" />
      )}

      <div className="capa-velo absolute inset-0" />
      <div className="capa-trama absolute inset-0" />
    </div>
  );
}