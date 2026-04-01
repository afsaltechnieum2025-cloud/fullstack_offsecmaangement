const LLM_URL = 'https://technieum-llm-suite-v2-iota.vercel.app/';

export default function LLM() {
  return (
    <iframe
      src={LLM_URL}
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