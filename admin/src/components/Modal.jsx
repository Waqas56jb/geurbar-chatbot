export default function Modal({ title, children, onClose, wide }) {
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target.classList.contains("modal-bg")) onClose(); }}>
      <div className={`modal${wide ? " wide" : ""}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-x" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
