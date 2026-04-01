const ASM_URL = 'http://43.205.213.93:8000/';

export default function ASM() {
  return (
    <iframe
      src={ASM_URL}
      title="Attack Surface Management"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
        display: 'block',
        zIndex: 9999,
      }}
      allow="same-origin"
    />
  );
}