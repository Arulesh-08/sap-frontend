import React from "react";

export default function CertificateModal({ activity, onClose }) {
  if (!activity || !activity.proofUrl) return null;

  const fileUrl = activity.proofUrl;
  const isPdf = activity.proofUrl.toLowerCase().endsWith(".pdf");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Certificate Proof Viewer</h3>
            <p className="modal-subtitle">
              {activity.studentName ? `${activity.studentName} (${activity.rollNumber || "N/A"}) — ` : ""}
              <strong>{activity.title}</strong> ({activity.category})
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {isPdf ? (
            <div className="pdf-container">
              <iframe src={fileUrl} title="Certificate PDF Viewer" className="pdf-iframe" />
              <div className="pdf-fallback">
                <span>Having trouble previewing the PDF?</span>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="open-link-btn">
                  Open PDF in New Tab ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="image-container">
              <img src={fileUrl} alt="Certificate Proof" className="certificate-img" />
              <div className="img-actions">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="open-link-btn">
                  Open Full Image ↗
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
