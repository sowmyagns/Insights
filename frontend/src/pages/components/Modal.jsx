export default function Modal({ title, onClose, children, className, showClose }) {
  return (
    <div
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        style={{ background:"#fff",borderRadius:12,padding:24,minWidth:340,maxWidth:620,maxHeight:"85vh",overflowY:"auto",width:"92%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,borderBottom:"1px solid #f1f5f9",paddingBottom:12 }}>
            {title && <h3 style={{ fontWeight:700,fontSize:17,margin:0,color:"#111827" }}>{title}</h3>}
            {(showClose || onClose) && (
              <button
                onClick={onClose}
                style={{ background:"#f3f4f6",border:"none",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:"#6b7280",flexShrink:0 }}
              >
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
