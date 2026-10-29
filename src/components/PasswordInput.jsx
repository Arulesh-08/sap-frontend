import { useState } from "react";

export default function PasswordInput({ name, value, onChange, placeholder, required }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field-wrapper">
      <input
        type={visible ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="form-input"
        style={{ width: "100%", paddingRight: "36px" }}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible(!visible)}
        tabIndex={-1}
      >
        {visible ? "🙈" : "👁"}
      </button>
    </div>
  );
}
