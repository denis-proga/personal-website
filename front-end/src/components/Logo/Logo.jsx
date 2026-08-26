// Фирменная эмблема: шестиугольник с точками на вершинах (внешний контур),
// тройной слой заливки внутри и боковыми засечками — гибрид двух
// утверждённых концептов. Цвета фиксированные (не зависят от темы сайта),
// это единая айдентика для хедера, соцсетей и фавикона.
function Logo({ size = 42, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 188 160"
      className={className}
      role="img"
      aria-label="Denys Perez logo"
    >
      {/* Внешний контур с точками на вершинах */}
      <polygon
        points="94,10 154,45 154,115 94,150 34,115 34,45"
        fill="none"
        stroke="#8c2a32"
        strokeWidth="3"
      />
      {[
        [94, 10],
        [154, 45],
        [154, 115],
        [94, 150],
        [34, 115],
        [34, 45],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#8c2a32" />
      ))}

      {/* Тройной слой заливки */}
      <polygon
        points="94,21 143,49 143,105 94,133 45,105 45,49"
        fill="#4a0f14"
      />
      <polygon
        points="94,34 133,56 133,99 94,121 55,99 55,56"
        fill="none"
        stroke="#c9566a"
        strokeWidth="1.2"
        opacity="0.6"
      />

      {/* Боковые засечки */}
      <rect x="10" y="77" width="14" height="3" rx="1.5" fill="#8c2a32" />
      <rect x="164" y="77" width="14" height="3" rx="1.5" fill="#8c2a32" />

      {/* Инициалы + курсор-подчёркивание */}
      <text
        x="94"
        y="75"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="34"
        fontWeight="500"
        fill="#f5f5f5"
      >
        DP
      </text>
      <rect x="76" y="96" width="36" height="4" rx="2" fill="#c9566a" />
    </svg>
  );
}

export default Logo;
