const LOGO_SRC = "/logo.png";

const SIZE_CLASS = {
  sm: "h-9",
  md: "h-12",
  lg: "h-14",
  xl: "h-20",
  hero: "h-28",
};

export default function BrandLogo({
  size = "md",
  className = "",
  imageClassName = "",
  showName = false,
  name = "Insights Iva",
  nameClassName = "",
  nameStyle,
}) {
  const heightClass = SIZE_CLASS[size] || SIZE_CLASS.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={LOGO_SRC}
        alt="Insights Iva logo"
        className={`${heightClass} w-auto max-w-full object-contain shrink-0 ${imageClassName}`}
      />
      {showName ? (
        <span className={nameClassName} style={nameStyle}>
          {name}
        </span>
      ) : null}
    </div>
  );
}
