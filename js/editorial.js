window.addEventListener("userReady", function () {
  let body = JSON.stringify(window.wp_user);
  fetch(contextAwareURL() + "/user-data", {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    headers: { "Content-Type": "application/json" },
    body: body, // body data type must match "Content-Type" header
    //docs: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.editorial) {
        setPage(data);
        showArticleLengths(data);
      }
      window.wp_user = data;
    })
    .catch((e) => console.error("fetch failed", e));
});

function updateTimeDisplay(sliderSelector, targetSelector, unit) {
  let slider = document.querySelector(sliderSelector);
  let target = document.querySelector(targetSelector);
  target.innerText = `${slider.value} ${unit}`;
  // console.log(sliderSelector, slider.value);
}
updateTimeDisplay("#form-longest_article", "#max-output", "minutes");
updateTimeDisplay("#form-shortest_article", "#min-output", "minutes");
updateTimeDisplay("#form-history_depth", "#history-output", "weeks");

document
  .getElementById("form-longest_article")
  .addEventListener("input", () =>
    updateTimeDisplay("#form-longest_article", "#max-output", "minutes")
  );
document
  .getElementById("form-shortest_article")
  .addEventListener("input", () =>
    updateTimeDisplay("#form-shortest_article", "#min-output", "minutes")
  );
document
  .getElementById("form-history_depth")
  .addEventListener("input", () =>
    updateTimeDisplay("#form-history_depth", "#history-output", "weeks")
  );
document
  .getElementById("update-the-graph-btn")
  .addEventListener("click", () => drawGraphOfTTR());

document
  .getElementById("all-good-btn")
  .addEventListener("click", (e) => collectEditorial(e));

document
  .getElementById("about-me-all-good-btn")
  .addEventListener("click", (e) => collectAboutMe(e));

document
  .getElementById("form-longest_article")
  .addEventListener("change", (e) =>
    gtag("event", "longest-changed", { newVal: e.target.value })
  );
document
  .getElementById("form-history_depth")
  .addEventListener("change", (e) =>
    gtag("event", "history_depth-changed", { newVal: e.target.value })
  );

document.getElementById("form-shortest_article");

function setPage(user) {
  let ed = user.editorial;
  console.log(user, "ready to set the sliders");
  setSliderVal("#form-longest_article", ed.longest_article);
  updateTimeDisplay("#form-longest_article", "#max-output", "minutes");

  setSliderVal("#form-shortest_article", ed.shortest_article);
  updateTimeDisplay("#form-shortest_article", "#min-output", "minutes");

  setSliderVal("#form-history_depth", ed.weeks_to_select_from);
  updateTimeDisplay("#form-history_depth", "#history-output", "weeks");

  document
    .getElementById("paper-colour")
    .querySelector(`option[value=${ed.paper_colour}]`).selected = true;

  if (ed.extraTags) {
    document.getElementById("extra-tags").value = ed.extraTags;
  }
  if (ed.searchTerms) {
    document.getElementById("search-words").value = ed.searchTerms;
  }
  document
    .getElementById("curation_strategy")
    .querySelector(
      `option[value=${ed.curation_strategy || "big_rock"}]`
    ).selected = true;
  document
    .getElementById("sorting_strategy")
    .querySelector(
      `option[value=${ed.sorting_strategy || "magic"}]`
    ).selected = true;
  if (ed.show_name_on_spine != undefined) {
    document.getElementById("show_name_on_spine").checked =
      ed.show_name_on_spine;
  } else {
    document.getElementById("show_name_on_spine").checked = true;
  }

  // about me section
  document.getElementById("form-name-of-user").value =
    user.from_firebase_auth.name || "";

  const addr = user.stripe.address;
  document.getElementById("form-address-line1").value = addr.line1 || "";
  document.getElementById("form-address-line2").value = addr.line2 || "";
  document.getElementById("form-address-city").value = addr.city || "";
  document.getElementById("form-address-state").value = addr.state || "";
  document.getElementById("form-address-post-code").value =
    addr.postal_code || "";
  document
    .getElementById("shipping_address_country")
    .querySelector(`option[value=${addr.country || ""}]`).selected = true;
}

function collectEditorial(event) {
  // triggered by the button being clicked
  // collects up the slider settings,
  // packages them into the user object
  // and patches it back to the server
  event.preventDefault();
  let user = window.wp_user;
  let editorial = {
    allow_code: false,
    editorial_checked: true,
    // history: user.editorial.history || [], //doesn't work until there's an editorial
    longest_article: getSliderVal("#form-longest_article"),
    shortest_article: getSliderVal("#form-shortest_article"),
    paper_colour: document.getElementById("paper-colour").value,
    weeks_to_select_from: getSliderVal("#form-history_depth"),
    extraTags: document.getElementById("extra-tags").value,
    searchTerms: document.getElementById("search-words").value,
    curation_strategy: document.getElementById("curation_strategy").value,
    sorting_strategy: document.getElementById("sorting_strategy").value,
    show_name_on_spine: document.getElementById("show_name_on_spine").checked,
  };
  gtag("event", "editorial-changed", editorial);
  let body = JSON.stringify({ user: user, payload: editorial });

  fetch(contextAwareURL() + "/update-editorial", {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    headers: { "Content-Type": "application/json" },
    body: body,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        window.location = "home";
      }
    })
    .catch((e) => console.error("fetch failed", e));

  document.getElementById("all-good-btn").innerText = "hold on a sec...";
}

function getSliderVal(selector) {
  return parseInt(document.querySelector(selector).value, 10);
}

function setSliderVal(selector, value) {
  document.querySelector(selector).value = value;
}

function showArticleLengths(data) {
  let body = data.pocket;
  body.for_timing = true;
  fetch(contextAwareURL() + "/sample-pocket-articles", {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), // body data type must match "Content-Type" header
    //docs: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
  })
    .then((response) => response.json())
    .then((data) => {
      window.waldenPond_articleData = Object.values(data);
      document.getElementById("plotlyDiv").classList.remove("hide");
      document.getElementById("update-the-graph-btn").classList.remove("hide");
      document.getElementById("graph-title").classList.remove("hide");

      document.getElementById("graph-loading-message").classList.add("hide");
      drawGraphOfTTR();
    })
    .catch((e) => console.error("fetch failed", e));
}

function drawGraphOfTTR() {
  // If the data hasn't showed up yet, don't do anything
  if (!window.waldenPond_articleData) return;

  const longest_article = getSliderVal("#form-longest_article");
  const shortest_article = getSliderVal("#form-shortest_article");
  const weeks_to_select_from = getSliderVal("#form-history_depth");

  const wpd = window.waldenPond_articleData;

  const allTTR = wpd.map((a) => a.time_to_read);
  const total_time = allTTR.reduce((a, b) => a + (b || 0), 0);
  console.log(total_time, "minutes of content");

  const deepTimeCutoff = weeks_to_select_from * 7 * 24 * 60 * 60;
  const inRangeTTR = wpd
    .filter(
      (x) => parseInt(x.time_added, 10) > Date.now() / 1000 - deepTimeCutoff
    )
    .map((x) => x.time_to_read)
    .filter((x) => x > shortest_article && x < longest_article);
  const inRangeTime = inRangeTTR.reduce((a, b) => a + (b || 0), 0);
  console.log(inRangeTime, "minutes of content in range");
  const xbins = { size: 1 };
  var traces = [
    {
      x: allTTR,
      type: "histogram",
      name: "All Articles",
      xbins: xbins,
    },
    {
      x: inRangeTTR,
      type: "histogram",
      name: "In Slider Range",
      xbins: xbins,
    },
  ];
  let layout = {
    barmode: "overlay",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    xaxis: { title: "Time to read", range: [0, 60] },
    // yaxis: { title: "Count" },
    showlegend: true,
    legend: {
      x: 1,
      xanchor: "right",
      y: 1,
    },
  };
  Plotly.newPlot("plotlyDiv", traces, layout);
  document.getElementById("graph-title").innerHTML =
    `You have ${rational_time(total_time)}` +
    "  of content in your Pocket, " +
    `${rational_time(inRangeTime)} of it is in range`;
  if (rational_time(inRangeTime) > 260) {
    // show some text if the user doesn't have much in their pocket.
    document.getElementById("pocket-bare-warning").classList.remove("hide");
  }
}
function rational_time(time_in_minutes) {
  if (time_in_minutes < 120) {
    return `${time_in_minutes} minutes`;
  } else {
    // round to the nearest 10th of an hour
    const subdivisions = 10;
    const h = Math.round((time_in_minutes / 60) * subdivisions) / subdivisions;
    return `${h} hours`;
  }
}

function collectAboutMe(event) {
  // triggered by the button being clicked collects up the settings,
  // packages them into an object and patches it back to the server
  event.preventDefault();
  let user = window.wp_user;
  let aboutMe = {
    name: document.getElementById("form-name-of-user").value,
    city: document.getElementById("form-address-city").value,
    country: document.getElementById("shipping_address_country").value,
    line1: document.getElementById("form-address-line1").value,
    line2: document.getElementById("form-address-line2").value,
    postal_code: document.getElementById("form-address-post-code").value,
    state: document.getElementById("form-address-state").value,
  };
  gtag("event", "about_me_data_changed");
  let body = JSON.stringify({ user: user, payload: aboutMe });

  fetch(contextAwareURL() + "/update-about-me", {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    headers: { "Content-Type": "application/json" },
    body: body,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        window.location = "home";
      }
    })
    .catch((e) => console.error("fetch failed", e));

  document.getElementById("about-me-all-good-btn").innerText =
    "hold on a sec...";
}
