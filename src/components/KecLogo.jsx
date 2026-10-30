import kecLogoImg from "../assets/kec_logo.jpeg";

export default function KecLogo({ className = "", height, size = 48 }) {
  const displayHeight = height || size;
  return (
    <div
      className={`kec-logo-wrapper ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
      }}
    >
      <img
        src={kecLogoImg}
        alt="Kongu Engineering College Logo"
        style={{
          height: `${displayHeight}px`,
          maxWidth: "100%",
          objectFit: "contain",
          filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.25))",
          background: "#FFFFFF",
          padding: "4px 10px",
          borderRadius: "10px",
          display: "block",
        }}
      />
    </div>
  );
}
