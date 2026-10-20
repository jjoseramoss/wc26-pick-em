import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="landing">
      <header className="landing-header">
        <Link className="landing-logo flex gap-2" to="/">
          <span className="brand-mark">
            <img
              className="brand-img"
              src="/soccer-ball.png"
              alt="Soccer Ball"
            />
          </span>
          PICKEM<span className="brand-period">.</span>
        </Link>
        <nav>
          {user ? (
            <Link className="button-dark" to="/dashboard">
              Open dashboard <span>↗</span>
            </Link>
          ) : (
            <>
              <Link className="button-outline" to="/login">
                Sign in
              </Link>
              <Link
                className="button-dark"
                to="/login"
                state={{ mode: "signup" }}
              >
                Get started <span>↗</span>
              </Link>
            </>
          )}
        </nav>
      </header>
      <section className="landing-hero">
        <div>
          <span className="eyebrow">A BETTER WAY TO WATCH THE GAME / 001</span>
          <h1>
            CALL THE
            <br />
            SCORE<em>.</em>
            <br />
            OWN THE
            <br />
            TABLE.
          </h1>
        </div>
        <div className="landing-hero-aside">
          <p>
            Turn every match into a competition with your people. Make your
            picks, track the scores, and see who knows the game.
          </p>
          <Link
            className="button-primary"
            to={user ? "/groups" : "/login"}
            state={user ? undefined : { mode: "signup" }}
          >
            Start your group <span>↗</span>
          </Link>
        </div>
      </section>
      <div className="landing-band">
        <strong>EVERY FIXTURE. EVERY PREDICTION. ONE TABLE.</strong>
        <span>Futbol feels better together</span>
      </div>
      <section className="landing-steps">
        <span className="eyebrow">HOW IT WORKS / 003</span>
        <div className="steps-grid">
          <div className="step">
            <span className="step-num">01 / SET UP</span>
            <h3>Pick a season.</h3>
            <p>
              Create a private group around a season and share the invite code
              with your friends.
            </p>
          </div>
          <div className="step">
            <span className="step-num">02 / PREDICT</span>
            <h3>Call the score.</h3>
            <p>
              Enter your scoreline before kickoff. Picks lock when the match
              starts.
            </p>
          </div>
          <div className="step">
            <span className="step-num">03 / COMPETE</span>
            <h3>Climb the table.</h3>
            <p>
              Score points for correct results and exact scorelines. Follow your
              group leaderboard.
            </p>
          </div>
        </div>
      </section>
      <footer className="landing-footer">
        <strong>
          PICKEM<span className="brand-period">.</span>
        </strong>
        <span>Built for people who talk futbol.</span>
      </footer>
    </div>
  );
}
