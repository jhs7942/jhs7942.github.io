import { CloudAlphabetGreeting } from "./CloudAlphabetGreeting";

export function Hero() {
  return (
    <header id="top" data-cloud-section className="cloud-section hero">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-hero-content" aria-live="polite">
          <div className="cloud-greeting-panel cloud-greeting-panel--morning">
            <div className="cloud-greeting-cloud">
              <div className="cloud-greeting-body">
                <h1 className="cloud-greeting-title" aria-label="Good morning">
                  <CloudAlphabetGreeting text="GOOD MORNING" />
                </h1>
              </div>
            </div>
          </div>
          <div className="cloud-greeting-panel cloud-greeting-panel--afternoon">
            <div className="cloud-greeting-cloud">
              <div className="cloud-greeting-body">
                <h1 className="cloud-greeting-title" aria-label="Good afternoon">
                  <CloudAlphabetGreeting text="GOOD AFTERNOON" />
                </h1>
              </div>
            </div>
          </div>
          <div className="cloud-greeting-panel cloud-greeting-panel--evening">
            <div className="cloud-greeting-cloud">
              <div className="cloud-greeting-body">
                <h1 className="cloud-greeting-title" aria-label="Good evening">
                  <CloudAlphabetGreeting text="GOOD EVENING" />
                </h1>
              </div>
            </div>
          </div>
          <div className="cloud-greeting-panel cloud-greeting-panel--night">
            <div className="cloud-greeting-cloud">
              <div className="cloud-greeting-body">
                <h1 className="cloud-greeting-title" aria-label="Good night">
                  <CloudAlphabetGreeting text="GOOD NIGHT" />
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
