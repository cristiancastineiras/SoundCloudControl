export function FondoPortada(props: { portada: string | null }) {
  const { portada } = props;

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {portada ? (
        <img
          src={portada}
          alt=""
          className="h-full w-full object-cover grayscale contrast-110 opacity-80"
        />
      ) : (
        <div className="sc-cover-fill h-full w-full" aria-hidden="true" />
      )}
      <div className="sc-veil absolute inset-0" />
      <div className="sc-pattern absolute inset-0" />
    </div>
  );
}
