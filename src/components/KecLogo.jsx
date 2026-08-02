import kecLogoImg from "../assets/kec_logo.jpeg";

export default function KecLogo({ className = "", height = 46 }) {
  return (
    <div className={`kec-logo-wrapper ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: "14px" }}>
      <img
        src={kecLogoImg}
        alt="Kongu Engineering College Logo"
        style={{
          height: `${height}px`,
          objectFit: "contain",
          filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))",
          background: "#FFFFFF",
          padding: "4px 8px",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}
