"use client";

type ToastNotice = {
  id: string;
  tone: "success" | "error";
  message: string;
};

type ToastStackProps = {
  notices: ToastNotice[];
  onDismiss: (id: string) => void;
};

function ToastStack({ notices, onDismiss }: ToastStackProps) {
  if (notices.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {notices.map((notice) => (
        <div key={notice.id} className={`toast-card toast-card-${notice.tone}`}>
          <div className="toast-card-body">
            <span className={`toast-indicator toast-indicator-${notice.tone}`} aria-hidden="true" />
            <p>{notice.message}</p>
          </div>
          <button type="button" className="toast-close" onClick={() => onDismiss(notice.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

export { ToastStack };
export type { ToastNotice };
