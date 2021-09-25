import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

const USER = "920f2adde45e5733392c2dbc10fc6ac89af6ff3467ecf6acc243b9a2e2adabc7";

(async () => {
  let result = null;
  const host = "http://localhost:3000";

  async function init() {
    const [airlines, flights] = await Promise.all([
      fetch(`${host}/api/airlines`),
      fetch(`${host}/api/flights`),
    ]).then((responses) => Promise.all(responses.map((res) => res.json())));

    renderFlights(airlines, flights);
  }

  let contract = new Contract("localhost", async () => {
    await init();

    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);

      if (error) {
        result = "-";
      }
      DOM.elid("operationStatus").innerHTML = result;
    });

    // User-submitted transaction
    DOM.elid("submit-oracle").addEventListener("click", () => {
      let flight = DOM.elid("flight-number").value;
      // Write transaction
      contract.fetchFlightStatus(flight, (error, result) => {
        display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            error: error,
            value: result.flight + " " + result.timestamp,
          },
        ]);
      });
    });
  });
})();

function formatDatetime(datetime) {
  const dt = new Date(datetime);

  return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
}

function renderFlights(airlines, flights) {
  const flightsInfoHtmlArray = [];
  airlines.forEach((airline, ind) => {
    const airlineFlights = flights[ind];
    airlineFlights.forEach((af) => {
      flightsInfoHtmlArray.push(`
            <div id="${airline.airline}_${af.flightNo}_${
        af.flightTime
      }_${USER}" class="flight row top-10">
                <div class="col-md-1">
                  <label class="form">${airline.name}</label>
                </div>
                <div class="col-md-2">
                  <label class="form">${af.flightNo}</label>
                </div>
                <div class="col-md-4">
                  <label class="form">${formatDatetime(af.flightTime)}</label>
                </div>
                <div name="status" class="col-md-2">
                  <label class="form">Loading...</label>
                </div>
                <div name="insurance" class="col-md-3">
                  <label class="form">Loading...</label>
                </div>
            </div>
          `);
    });
  });

  const container = DOM.elid("flight-info");
  container.innerHTML = flightsInfoHtmlArray.join("");
}

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}
