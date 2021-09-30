import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

const USER = "0x819de596d99fc8515e200aad7a8b6b1b9839c88b";
const HOST = "http://localhost:3000";
const FLIGHT_STATUS = {
  // 0: "Unknown",
  10: "On Time",
  20: "Late Airline",
  30: "Late Weather",
  40: "Late Technical",
  50: "Late Other",
};

(async () => {
  let result = null;

  async function init() {
    const [airlines, flights] = await Promise.all([
      fetch(`${HOST}/api/airlines`),
      fetch(`${HOST}/api/flights`),
    ]).then((responses) => Promise.all(responses.map((res) => res.json())));

    await renderFlights(airlines, flights);
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

    Array.from(document.getElementsByClassName("request-flight-status")).forEach((reqFSBtn) => {
      reqFSBtn.onclick = async () => {
        const domRootId = reqFSBtn.dataset.id;
        const [airline, flight, timestamp] = domRootId.split("_");
        contract.fetchFlightStatus(airline, flight, timestamp, async (error, result) => {
          console.log(error, result);
          await refreshFlightStatus({ domRootId, airline, flight, timestamp });
        });
        // await fetch(`${HOST}/api/flights/fetchFlightStatus`, {
        //   method: "POST",
        //   mode: "cors",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({ airline, flight, timestamp }),
        // });

        // await refreshFlightStatus({ domRootId, airline, flight, timestamp });
      };
    });

    Array.from(document.getElementsByClassName("purchase-insurance")).forEach((purchaseBtn) => {
      purchaseBtn.onclick = async () => {
        const domRootId = purchaseBtn.dataset.id;
        const [airline, flight, timestamp] = domRootId.split("_");

        await fetch(`${HOST}/api/flights/purchaseInsurance`, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ airline, flight, timestamp, passenger: USER }),
        });

        await refreshInsuranceInfo({ domRootId, airline, flight, timestamp });
      };
    });
  });
})();

function formatDatetime(datetime) {
  const dt = new Date(datetime);

  return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
}

async function getFlightStatus(airline, flight, timestamp) {
  const paramsUrl = Object.entries({ airline, flight, timestamp })
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const response = await fetch(`${HOST}/api/flights/status?${paramsUrl}`);
  const status = await response.json();

  return status;
}

async function refreshFlightStatus({ domRootId, airline, flight, timestamp }) {
  const statusDom = document.getElementById(domRootId).getElementsByClassName("status")[0];

  statusDom.innerHTML = `<label class="form">Loading...</label>`;

  const statusCode = await getFlightStatus(airline, flight, timestamp);

  if (FLIGHT_STATUS[statusCode]) {
    statusDom.innerHTML = `<label class="form">${FLIGHT_STATUS[statusCode]}</label>`;
  } else {
    // unknown
    statusDom.innerHTML = `<label class="form">UNKNOWN</label><btn data-id="${domRootId}" class="btn btn-primary request-flight-status">Retry</btn>`;
  }
}

async function getInsuranceInfo(airline, flight, timestamp) {
  const paramsUrl = Object.entries({ airline, flight, timestamp, passenger: USER })
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const response = await fetch(`${HOST}/api/flights/insuranceInfo?${paramsUrl}`);
  const insuranceInfo = response.json();

  return insuranceInfo;
}

async function refreshInsuranceInfo({ domRootId, airline, flight, timestamp }) {
  const insuranceInfoDom = document
    .getElementById(domRootId)
    .getElementsByClassName("insurance-info")[0];

  insuranceInfoDom.innerHTML = `<label class="form">Loading...</label>`;

  const { amount, isCredited } = await getInsuranceInfo(airline, flight, timestamp);
  if (amount > 0) {
    insuranceInfoDom.innerHTML = `<label class="form">${amount} wei [${
      isCredited ? "PAID" : "NOT PAY"
    }]</label>`;
  } else {
    // unknown
    insuranceInfoDom.innerHTML = `<label class="form">NO INSURANCE</label><btn data-id="${domRootId}" class="btn btn-primary purchase-insurance">Purchase</btn>`;
  }
}

async function renderFlights(airlines, flights) {
  const flightsInfoHtmlArray = [];
  const rootIdList = [];
  const flightStatusRefreshInfo = [];
  const flightInsuranceRefreshInfo = [];

  airlines.forEach((airline, ind) => {
    const airlineFlights = flights[ind];
    airlineFlights.forEach((af) => {
      const rootId = `${airline.airline}_${af.flightNo}_${af.flightTime}`;
      rootIdList.push(rootId);

      flightsInfoHtmlArray.push(`
            <div id="${rootId}" class="flight row top-10">
                <div class="col-md-1">
                  <label class="form">${airline.name}</label>
                </div>
                <div class="col-md-1">
                  <label class="form">${af.flightNo}</label>
                </div>
                <div class="col-md-3">
                  <label class="form">${formatDatetime(af.flightTime)}</label>
                </div>
                <div class="col-md-3 status">
                  <label class="form">Loading...</label>
                </div>
                <div class="col-md-4 insurance-info">
                  <label class="form">Loading...</label>
                </div>
            </div>
          `);

      flightStatusRefreshInfo.push({
        domRootId: rootId,
        airline: airline.airline,
        flight: af.flightNo,
        timestamp: af.flightTime,
      });

      flightInsuranceRefreshInfo.push({
        domRootId: rootId,
        airline: airline.airline,
        flight: af.flightNo,
        timestamp: af.flightTime,
      });
    });
  });

  const container = DOM.elid("flight-info");
  container.innerHTML = flightsInfoHtmlArray.join("");

  // try to get flights' status code
  await Promise.all(flightStatusRefreshInfo.map(refreshFlightStatus));

  // try to get insurance information
  await Promise.all(flightInsuranceRefreshInfo.map(refreshInsuranceInfo));
}
