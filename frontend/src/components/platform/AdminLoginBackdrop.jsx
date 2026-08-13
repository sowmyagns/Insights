/** Abstract wave backdrop for the Insights Iva Admin Portal sign-in (Figma palette). */
export default function AdminLoginBackdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="adminSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C9D7E8" />
          <stop offset="28%" stopColor="#DAE6F4" />
          <stop offset="62%" stopColor="#F5F8FE" />
          <stop offset="100%" stopColor="#E4EFFB" />
        </linearGradient>
        <linearGradient id="adminCream" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#FAEED6" />
          <stop offset="100%" stopColor="#F0E8DC" />
        </linearGradient>
        <linearGradient id="adminNavy" x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0%" stopColor="#102D55" />
          <stop offset="38%" stopColor="#2C4A70" />
          <stop offset="70%" stopColor="#2F4F78" />
          <stop offset="100%" stopColor="#8CA5C3" />
        </linearGradient>
        <linearGradient id="adminNavyDeep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0B2344" />
          <stop offset="55%" stopColor="#2C4A70" />
          <stop offset="100%" stopColor="#8CA5C3" />
        </linearGradient>
      </defs>

      <rect width="1600" height="1000" fill="url(#adminSky)" />

      <path
        fill="url(#adminCream)"
        d="M0 0h620C480 90 390 170 340 280 270 430 90 470 0 520V0Z"
      />
      <path
        fill="#C9D7E8"
        opacity="0.85"
        d="M0 180c160 20 280 90 340 210 70 140-20 250-160 320C90 760 30 820 0 880V180Z"
      />
      <path
        fill="#FFFFFF"
        d="M0 320c220 40 360 40 520-40 180-90 340-40 460 80 90 90 220 140 420 90V0H0v320Z"
        opacity="0.55"
      />
      <path
        fill="#FFFFFF"
        d="M0 430c180-20 300 30 420 10 200-30 300-140 520-90 160 36 300 10 660-80v-270H0v430Z"
        opacity="0.35"
      />

      <path
        fill="#8CA5C3"
        d="M1600 1000H0V780c140-70 280-40 430 10 200 70 320 20 500-40 170-55 330-20 670 90v160Z"
        opacity="0.45"
      />
      <path
        fill="url(#adminNavy)"
        d="M0 1000V690c90-30 170-10 250 30 130 64 210 20 330-30 150-64 280-40 430 20 200 80 360 40 590-50V1000H0Z"
      />
      <path
        fill="url(#adminNavyDeep)"
        d="M0 1000V760c110-24 190 16 280 50 140 54 230 8 350-36 170-62 310-20 470 40 180 68 330 30 500-40V1000H0Z"
      />
      <path
        fill="none"
        stroke="#E0D5B0"
        strokeWidth="3.5"
        d="M0 690c90-30 170-10 250 30 130 64 210 20 330-30 150-64 280-40 430 20 200 80 360 40 590-50"
      />
    </svg>
  );
}
