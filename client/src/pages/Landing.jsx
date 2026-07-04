import { ArrowRight, Shield } from "lucide-react";
import EncryptedText from "../components/EncryptedText.jsx";
import Spotlight from "../components/Spotlight.jsx";

export default function Landing({ onEnter }) {
  return (
    <main className="landing-screen">
      <Spotlight />
      <section className="landing-panel">
        <div className="landing-kicker">
          <Shield size={18} />
          Office of Joint CP, West Zone
        </div>

        <h1>
          <EncryptedText
            text="High Court Monitoring Cell"
            className="encrypted-title"
            revealDelayMs={68}
            flipDelayMs={48}
            encryptedClassName="encrypted-char"
            revealedClassName="revealed-char"
          />
        </h1>

        <p>
          Legal case monitoring, compliance tracking, and court coordination for
          West Zone High Court matters.
        </p>

        <div className="landing-metrics" aria-label="System highlights">
          <span>Register</span>
          <span>Cause List</span>
          <span>Compliance</span>
        </div>

        <button className="enter-button" onClick={onEnter}>
          Enter
          <ArrowRight size={18} />
        </button>
      </section>
    </main>
  );
}
