import { CloudShape } from "./CloudShape";

export function Hero() {
  return (
    <header id="top" data-cloud-section className="cloud-section hero">
      <div className="cloud-veilwrap">
        <div data-content className="cloud-hero-content" aria-live="polite">
          <div className="cloud-greeting-panel cloud-greeting-panel--morning">
            <div className="cloud-greeting-cloud">
              <CloudShape fillId="heroGreetingCloudMorning" />
              <div className="cloud-greeting-body">
                <h1 className="cloud-greeting-title">좋은 아침이에요.</h1>
                <p className="cloud-greeting-message">
                  오늘도 더 나은 경험을 하나씩 만들어가고 있습니다.
                </p>
              </div>
            </div>
          </div>
          <div className="cloud-greeting-panel cloud-greeting-panel--day">
            <div className="cloud-greeting-cloud">
              <CloudShape fillId="heroGreetingCloudDay" />
              <div className="cloud-greeting-body">
                <h1 className="cloud-greeting-title cloud-greeting-title--day">
                  좋은 하루 보내고 계신가요?
                </h1>
                <p className="cloud-greeting-message">
                  제가 만든 작업들을 천천히 둘러보세요.
                </p>
              </div>
            </div>
          </div>
          <div className="cloud-greeting-panel cloud-greeting-panel--evening">
            <div className="cloud-greeting-cloud">
              <CloudShape fillId="heroGreetingCloudEvening" />
              <div className="cloud-greeting-body">
                <h1 className="cloud-greeting-title">오늘도 수고하셨습니다.</h1>
                <p className="cloud-greeting-message">
                  피곤한 와중에도 제 작업을 확인해 주셔서 감사합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
