const SUPABASE_URL = "https://psnhmrlqjklkgoxbxfny.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7GPAp7RD2_srLBniXAqBBQ_9cQlVOnn";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const KEY = "fittrack_v4_cache";

const today = () => new Date().toISOString().slice(0, 10);

const blankState = () => ({
  daily: {},
  foods: {},
  workouts: [],
  profile: {
    startWeight: 88,
    goalWeight: 83
  },
  week: 0
});

let state =
  JSON.parse(localStorage.getItem(KEY) || "null") ||
  blankState();

let currentUser = null;
let cloudReady = false;

const foods = {
  Eggs: {
    cal: 72,
    protein: 6.3
  },

  EggWhites: {
    cal: 52,
    protein: 11
  },

  WholeWheatBread: {
    cal: 80,
    protein: 4
  },

  Paneer: {
    cal: 265,
    protein: 18
  },

  SoyaChunks: {
    cal: 345,
    protein: 52
  },

  Rice: {
    cal: 130,
    protein: 2.7
  },

  Tortilla: {
    cal: 130,
    protein: 4
  },

  Whey: {
    cal: 120,
    protein: 24
  },

  Milk: {
    cal: 120,
    protein: 8
  },

  GreekYogurt: {
    cal: 100,
    protein: 10
  },

  Banana: {
    cal: 105,
    protein: 1.3
  },

  Orange: {
    cal: 62,
    protein: 1.2
  },

  BabyCarrots: {
    cal: 35,
    protein: 0.8
  },

  Mayo: {
    cal: 90,
    protein: 0
  }
};

const foodLabels = {
  Eggs: "Eggs",
  EggWhites: "Egg whites",
  WholeWheatBread: "Whole-wheat bread",
  Paneer: "Paneer",
  SoyaChunks: "Soya chunks",
  Rice: "Rice",
  Tortilla: "Tortilla / roti",
  Whey: "Whey",
  Milk: "Milk",
  GreekYogurt: "Greek yogurt",
  Banana: "Banana",
  Orange: "Orange",
  BabyCarrots: "Baby carrots",
  Mayo: "Mayonnaise"
};

function el(id) {
  return document.getElementById(id);
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    m =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[m])
  );
}

function avg(a) {
  return a.length
    ? a.reduce((x, y) => x + y, 0) / a.length
    : null;
}

function entries() {
  return Object.entries(state.daily).sort(
    (a, b) => b[0].localeCompare(a[0])
  );
}

function setSync(text, type = "normal") {
  const x = el("syncStatus");

  if (!x) return;

  x.textContent = text;
  x.className = `sync-status ${type}`;
}

function cache() {
  localStorage.setItem(
    KEY,
    JSON.stringify(state)
  );
}

function showTab(name) {
  document
    .querySelectorAll(".tab")
    .forEach(b =>
      b.classList.toggle(
        "active",
        b.dataset.tab === name
      )
    );

  document
    .querySelectorAll(".tab-panel")
    .forEach(p =>
      p.classList.toggle(
        "active",
        p.id === name
      )
    );
}

function setToday() {
  ["dailyDate", "workoutDate"].forEach(id => {
    if (el(id)) {
      el(id).value = today();
    }
  });
}

function normalizeDaily(row) {
  return {
    id: row.id,

    weight:
      row.weight == null
        ? null
        : Number(row.weight),

    calories:
      row.calories == null
        ? null
        : Number(row.calories),

    protein:
      row.protein == null
        ? null
        : Number(row.protein),

    water:
      row.water == null
        ? null
        : Number(row.water),

    sleep:
      row.sleep == null
        ? null
        : Number(row.sleep),

    steps:
      row.steps == null
        ? null
        : Number(row.steps),

    strength: !!row.strength,

    badminton: !!row.badminton,

    notes: row.notes || ""
  };
}

function normalizeFood(row) {
  return {
    id: row.id,
    food: row.food,
    qty: Number(row.qty),
    cal: Number(row.calories),
    protein: Number(row.protein)
  };
}

function normalizeWorkout(row) {
  return {
    id: row.id,
    date: row.workout_date,
    split: row.split,
    exercise: row.exercise || "",

    weight:
      row.weight == null
        ? null
        : Number(row.weight),

    sets:
      row.sets == null
        ? null
        : Number(row.sets),

    reps:
      row.reps == null
        ? null
        : Number(row.reps),

    badminton: !!row.badminton,

    completed: !!row.completed
  };
}


/* =========================================================
   CLOUD LOADING
   ========================================================= */

async function loadCloud() {
  if (!currentUser) return;

  setSync("Loading cloud data…");

  const uid = currentUser.id;

  const [p, d, f, w] = await Promise.all([
    supabaseClient
      .from("profiles")
      .select("id,start_weight,goal_weight")
      .eq("id", uid)
      .maybeSingle(),

    supabaseClient
      .from("daily_logs")
      .select("*")
      .eq("user_id", uid)
      .order("log_date", {
        ascending: false
      }),

    supabaseClient
      .from("food_logs")
      .select("*")
      .eq("user_id", uid)
      .order("log_date", {
        ascending: false
      }),

    supabaseClient
      .from("workout_logs")
      .select("*")
      .eq("user_id", uid)
      .order("workout_date", {
        ascending: false
      })
  ]);

  const errors = [p, d, f, w].filter(
    x => x.error
  );

  if (errors.length) {
    console.error(errors);

    setSync(
      "Cloud connection error — using local cache",
      "error"
    );

    cloudReady = false;

    renderAll();

    return;
  }

  const hasCloud =
    !!p.data ||
    d.data.length ||
    f.data.length ||
    w.data.length;

  if (
    !hasCloud &&
    (
      Object.keys(state.daily).length ||
      Object.keys(state.foods).length ||
      state.workouts.length
    )
  ) {
    const ok = confirm(
      "Your Supabase account is empty, but this browser has FitTrack data. Upload this local data to the cloud now?"
    );

    if (ok) {
      await migrateLocalToCloud();
      return;
    }
  }

  if (p.data) {
    state.profile = {
      startWeight:
        Number(p.data.start_weight) || 88,

      goalWeight:
        Number(p.data.goal_weight) || 83
    };
  }

  state.daily = {};

  (d.data || []).forEach(r => {
    state.daily[r.log_date] =
      normalizeDaily(r);
  });

  state.foods = {};

  (f.data || []).forEach(r => {
    (state.foods[r.log_date] ??= []).push(
      normalizeFood(r)
    );
  });

  state.workouts =
    (w.data || []).map(
      normalizeWorkout
    );

  cache();

  cloudReady = true;

  setSync(
    "Synced to cloud",
    "good"
  );

  renderAll();
}


/* =========================================================
   MIGRATE LOCAL DATA
   ========================================================= */

async function migrateLocalToCloud() {
  try {
    await supabaseClient
      .from("profiles")
      .upsert(
        {
          id: currentUser.id,
          start_weight:
            state.profile.startWeight,
          goal_weight:
            state.profile.goalWeight
        },
        {
          onConflict: "id"
        }
      )
      .throwOnError();

    for (
      const [date, x] of Object.entries(
        state.daily
      )
    ) {
      await upsertDaily(
        date,
        x,
        true
      );
    }

    for (
      const [date, list] of Object.entries(
        state.foods
      )
    ) {
      for (const x of list) {
        await insertFood(
          date,
          x,
          true
        );
      }
    }

    for (const x of state.workouts) {
      await insertWorkout(
        x,
        true
      );
    }

    cloudReady = true;

    setSync(
      "Local data uploaded and synced",
      "good"
    );

    renderAll();

  } catch (err) {
    console.error(err);

    setSync(
      "Upload failed — local data kept",
      "error"
    );
  }
}


/* =========================================================
   PROFILE
   ========================================================= */

async function upsertProfile() {
  if (
    !cloudReady ||
    !currentUser
  ) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("profiles")
      .upsert(
        {
          id: currentUser.id,
          start_weight:
            state.profile.startWeight,
          goal_weight:
            state.profile.goalWeight
        },
        {
          onConflict: "id"
        }
      );

  if (error) {
    console.error(error);
  }
}


/* =========================================================
   DAILY LOG
   ========================================================= */

async function upsertDaily(
  date,
  x,
  silent = false
) {
  if (!currentUser) return;

  const payload = {
    user_id: currentUser.id,
    log_date: date,
    weight: x.weight,
    calories: x.calories,
    protein: x.protein,
    water: x.water,
    sleep: x.sleep,
    steps: x.steps,
    strength: x.strength,
    badminton: x.badminton,
    notes: x.notes
  };

  const { data, error } =
    await supabaseClient
      .from("daily_logs")
      .upsert(
        payload,
        {
          onConflict:
            "user_id,log_date"
        }
      )
      .select()
      .single();

  if (error) {
    console.error(error);

    if (!silent) {
      setSync(
        "Could not save to cloud",
        "error"
      );
    }

    return;
  }

  state.daily[date] =
    normalizeDaily(data);

  cache();

  if (!silent) {
    setSync(
      "Saved to cloud",
      "good"
    );

    renderAll();
  }
}


/* =========================================================
   FOOD
   ========================================================= */

async function insertFood(
  date,
  x,
  silent = false
) {
  if (!currentUser) return;

  const payload = {
    user_id: currentUser.id,
    log_date: date,
    food: x.food,
    qty: x.qty,
    calories: x.cal,
    protein: x.protein
  };

  const { data, error } =
    await supabaseClient
      .from("food_logs")
      .insert(payload)
      .select()
      .single();

  if (error) {
    console.error(error);

    if (!silent) {
      setSync(
        "Could not save food to cloud",
        "error"
      );
    }

    return;
  }

  state.foods[date] ??= [];

  state.foods[date].push(
    normalizeFood(data)
  );

  cache();

  if (!silent) {
    setSync(
      "Food saved to cloud",
      "good"
    );

    renderAll();
  }
}


/* =========================================================
   WORKOUT
   ========================================================= */

async function insertWorkout(
  x,
  silent = false
) {
  if (!currentUser) return;

  const payload = {
    user_id: currentUser.id,
    workout_date: x.date,
    split: x.split,
    exercise: x.exercise,
    weight: x.weight,
    sets: x.sets,
    reps: x.reps,
    badminton: x.badminton,
    completed: x.completed
  };

  const { data, error } =
    await supabaseClient
      .from("workout_logs")
      .insert(payload)
      .select()
      .single();

  if (error) {
    console.error(error);

    if (!silent) {
      setSync(
        "Could not save workout to cloud",
        "error"
      );
    }

    return;
  }

  state.workouts.push(
    normalizeWorkout(data)
  );

  cache();

  if (!silent) {
    setSync(
      "Workout saved to cloud",
      "good"
    );

    renderAll();
  }
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const e = entries();

  const weights =
    e
      .map(x => Number(x[1].weight))
      .filter(Boolean);

  const cals =
    e
      .map(x => Number(x[1].calories))
      .filter(Boolean);

  const prots =
    e
      .map(x => Number(x[1].protein))
      .filter(Boolean);

  const current =
    weights[0] ??
    state.profile.startWeight;

  el("statWeight").textContent =
    current.toFixed(1) +
    " kg";

  el("statLost").textContent =
    Math.max(
      0,
      state.profile.startWeight -
        current
    ).toFixed(1) +
    " kg";

  el("statCal").textContent =
    avg(cals)?.toFixed(0) ??
    "—";

  el("statProtein").textContent =
    avg(prots) !== null
      ? avg(prots).toFixed(0) +
        " g"
      : "—";

  el("statStrength").textContent =
    e.filter(
      x => x[1].strength
    ).length;

  el("statBadminton").textContent =
    e.filter(
      x => x[1].badminton
    ).length;

  el("daysLogged").textContent =
    e.length +
    " days logged";

  const range =
    state.profile.startWeight -
    state.profile.goalWeight;

  const pct =
    range > 0
      ? Math.max(
          0,
          Math.min(
            100,
            (
              (
                state.profile.startWeight -
                current
              ) /
              range
            ) *
              100
          )
        )
      : 0;

  el("goalBar").style.width =
    pct + "%";

  drawChart(
    weights
      .slice(0, 30)
      .reverse()
  );

  el(
    "dashboardWeekly"
  ).innerHTML =
    e
      .slice(0, 7)
      .map(
        x =>
          `<div class="food-row">
            <span>${x[0]}</span>
            <strong>${
              x[1].weight
                ? x[1].weight +
                  " kg"
                : "—"
            }</strong>
          </div>`
      )
      .join("") ||
    '<p class="muted">No daily logs yet.</p>';
}


/* =========================================================
   CHART
   ========================================================= */

function drawChart(weights) {
  const c =
    el("weightChart");

  const ctx =
    c.getContext("2d");

  const w =
    (c.width =
      c.clientWidth * 2);

  const h =
    (c.height =
      230 * 2);

  ctx.scale(2, 2);

  const W = w / 2;
  const H = h / 2;

  ctx.clearRect(
    0,
    0,
    W,
    H
  );

  if (weights.length < 2) {
    ctx.fillStyle =
      "#718096";

    ctx.font =
      "14px system-ui";

    ctx.fillText(
      "Log at least two weights to see your trend.",
      20,
      110
    );

    return;
  }

  const min =
    Math.min(...weights) -
    1;

  const max =
    Math.max(...weights) +
    1;

  ctx.strokeStyle =
    "#cbd5e1";

  ctx.beginPath();

  ctx.moveTo(
    35,
    15
  );

  ctx.lineTo(
    35,
    H - 25
  );

  ctx.lineTo(
    W - 15,
    H - 25
  );

  ctx.stroke();

  ctx.strokeStyle =
    "#111827";

  ctx.lineWidth = 3;

  ctx.beginPath();

  weights.forEach(
    (v, i) => {
      const x =
        35 +
        i *
          (
            (W - 55) /
            (weights.length - 1)
          );

      const y =
        15 +
        (
          (max - v) *
          (H - 40)
        ) /
          (max - min);

      if (i) {
        ctx.lineTo(
          x,
          y
        );
      } else {
        ctx.moveTo(
          x,
          y
        );
      }
    }
  );

  ctx.stroke();
}


/* =========================================================
   DAILY RENDER
   ========================================================= */

function renderDaily() {
  const rows =
    entries().slice(
      0,
      14
    );

  el("dailyTable").innerHTML =
    rows.length
      ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Weight</th>
              <th>Calories</th>
              <th>Protein</th>
              <th>Water</th>
              <th>Training</th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map(
                ([d, x]) =>
                  `<tr>
                    <td>${d}</td>
                    <td>${x.weight ?? "—"}</td>
                    <td>${x.calories ?? "—"}</td>
                    <td>${x.protein ?? "—"}</td>
                    <td>${x.water ?? "—"}</td>
                    <td>${
                      [
                        x.strength
                          ? "Strength"
                          : "",
                        x.badminton
                          ? "Badminton"
                          : ""
                      ]
                        .filter(Boolean)
                        .join(
                          " + "
                        ) ||
                      "—"
                    }</td>
                  </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `
      : '<p class="muted">No daily logs yet.</p>';
}


/* =========================================================
   NUTRITION
   ========================================================= */

function foodTotals(
  date = today()
) {
  const list =
    state.foods[date] ||
    [];

  return {
    cal:
      list.reduce(
        (s, x) =>
          s +
          x.cal *
            x.qty,
        0
      ),

    protein:
      list.reduce(
        (s, x) =>
          s +
          x.protein *
            x.qty,
        0
      )
  };
}

function renderNutrition() {
  const date =
    today();

  const list =
    state.foods[date] ||
    [];

  const t =
    foodTotals(date);

  el("foodCal").textContent =
    Math.round(t.cal);

  el("foodProtein").textContent =
    Math.round(
      t.protein
    );

  el("foodList").innerHTML =
    list.length
      ? list
          .map(
            (x, i) =>
              `<div class="food-row">
                <span>
                  ${
                    foodLabels[
                      x.food
                    ] ||
                    esc(x.food)
                  }
                  × ${x.qty}
                </span>

                <span>
                  ${Math.round(
                    x.cal *
                      x.qty
                  )}
                  kcal •
                  ${Math.round(
                    x.protein *
                      x.qty
                  )}g

                  <button
                    class="danger"
                    onclick="removeFood(${i})"
                  >
                    ×
                  </button>
                </span>
              </div>`
          )
          .join("")
      : '<p class="muted">No food logged today.</p>';
}

function renderFoodOptions() {
  el("foodSelect").innerHTML =
    Object.keys(foods)
      .map(
        k =>
          `<option value="${k}">
            ${foodLabels[k]} —
            ${foods[k].cal} kcal /
            ${foods[k].protein}g protein
          </option>`
      )
      .join("");

  el("foodCards").innerHTML =
    Object.keys(foods)
      .slice(0, 8)
      .map(
        k =>
          `<div
            class="food-card"
            onclick="quickFood('${k}')"
          >
            <strong>
              ${foodLabels[k]}
            </strong>

            <br>

            <small>
              ${foods[k].cal}
              kcal •
              ${foods[k].protein}
              g protein
            </small>
          </div>`
      )
      .join("");
}

async function addFood(
  food,
  qty
) {
  await insertFood(
    today(),
    {
      food,
      qty: Number(qty),
      cal: foods[food].cal,
      protein:
        foods[food].protein
    }
  );
}

function quickFood(k) {
  addFood(k, 1);
}

async function removeFood(i) {
  const item =
    (
      state.foods[today()] ||
      []
    )[i];

  if (!item) return;

  if (
    currentUser &&
    cloudReady &&
    item.id
  ) {
    const { error } =
      await supabaseClient
        .from("food_logs")
        .delete()
        .eq(
          "id",
          item.id
        )
        .eq(
          "user_id",
          currentUser.id
        );

    if (error) {
      setSync(
        "Could not delete food",
        "error"
      );

      return;
    }
  }

  state.foods[
    today()
  ].splice(
    i,
    1
  );

  cache();

  setSync(
    "Food updated",
    "good"
  );

  renderAll();
}


/* =========================================================
   WORKOUT RENDER
   ========================================================= */

function renderWorkout() {
  const rows =
    state.workouts
      .slice()
      .reverse()
      .slice(
        0,
        20
      );

  el("workoutTable").innerHTML =
    rows.length
      ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Split</th>
              <th>Exercise</th>
              <th>Weight</th>
              <th>Sets</th>
              <th>Reps</th>
              <th>Badminton</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map(
                x =>
                  `<tr>
                    <td>${x.date}</td>
                    <td>${esc(x.split)}</td>
                    <td>${esc(
                      x.exercise ||
                      "—"
                    )}</td>
                    <td>${x.weight ?? "—"}</td>
                    <td>${x.sets ?? "—"}</td>
                    <td>${x.reps ?? "—"}</td>
                    <td>${
                      x.badminton
                        ? "Yes"
                        : "No"
                    }</td>
                    <td>${
                      x.completed
                        ? "Completed"
                        : "—"
                    }</td>
                  </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `
      : '<p class="muted">No workouts yet.</p>';
}


/* =========================================================
   WEEKLY
   ========================================================= */

function weekStart(i) {
  const d =
    new Date();

  d.setHours(
    0,
    0,
    0,
    0
  );

  d.setDate(
    d.getDate() -
      d.getDay() +
      1 -
      i * 7
  );

  return d;
}

function renderWeeks() {
  const sel =
    el("weekSelect");

  sel.innerHTML =
    Array.from(
      {
        length: 8
      },
      (_, i) =>
        `<option value="${i}">
          Week ${i + 1}
        </option>`
    ).join("");

  sel.value =
    state.week;

  const s =
    weekStart(
      Number(
        state.week
      )
    );

  const dates = [];

  for (
    let i = 0;
    i < 7;
    i++
  ) {
    const d =
      new Date(s);

    d.setDate(
      s.getDate() +
        i
    );

    dates.push(
      d
        .toISOString()
        .slice(
          0,
          10
        )
    );
  }

  const rows =
    dates.map(
      d => [
        d,
        state.daily[d]
      ]
    );

  const valid =
    rows
      .map(
        x => x[1]
      )
      .filter(Boolean);

  const weights =
    valid
      .map(
        x => +x.weight
      )
      .filter(Boolean);

  const cals =
    valid
      .map(
        x => +x.calories
      )
      .filter(Boolean);

  const prots =
    valid
      .map(
        x => +x.protein
      )
      .filter(Boolean);

  el("weekDays").textContent =
    valid.length;

  el("weekWeight").textContent =
    avg(weights) !== null
      ? avg(weights).toFixed(1) +
        " kg"
      : "—";

  el("weekCalories").textContent =
    avg(cals) !== null
      ? avg(cals).toFixed(0)
      : "—";

  el("weekProtein").textContent =
    avg(prots) !== null
      ? avg(prots).toFixed(0) +
        " g"
      : "—";

  el("weekTable").innerHTML =
    `
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Weight</th>
            <th>Calories</th>
            <th>Protein</th>
            <th>Workout</th>
          </tr>
        </thead>

        <tbody>
          ${rows
            .map(
              ([d, x]) =>
                `<tr>
                  <td>${d}</td>
                  <td>${x?.weight ?? "—"}</td>
                  <td>${x?.calories ?? "—"}</td>
                  <td>${x?.protein ?? "—"}</td>
                  <td>
                    ${
                      x
                        ? [
                            x.strength
                              ? "Strength"
                              : "",
                            x.badminton
                              ? "Badminton"
                              : ""
                          ]
                            .filter(Boolean)
                            .join(
                              " + "
                            ) ||
                          "—"
                        : "—"
                    }
                  </td>
                </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderAll() {
  renderDashboard();
  renderDaily();
  renderNutrition();
  renderWorkout();
  renderWeeks();
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function login(
  email,
  password
) {
  el("authMessage").textContent =
    "Signing in…";

  const {
    data,
    error
  } =
    await supabaseClient.auth.signInWithPassword(
      {
        email,
        password
      }
    );

  if (error) {
    el("authMessage").textContent =
      error.message;

    return;
  }

  currentUser =
    data.user;

  await enterApp();
}


/* =========================================================
   ENTER APP
   ========================================================= */

async function enterApp() {
  /*
    Hide login screen.
  */

  el("authScreen")
    .classList.add(
      "hidden"
    );

  el("authScreen")
    .style.display =
    "none";

  /*
    Show application.
  */

  el("appShell")
    .classList.remove(
      "hidden"
    );

  el("appShell")
    .style.display =
    "";

  el("userEmail").textContent =
    currentUser?.email ||
    "";

  setToday();

  renderFoodOptions();

  renderAll();

  await loadCloud();
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {
  await supabaseClient.auth.signOut();

  currentUser = null;
  cloudReady = false;

  /*
    Hide dashboard.
  */

  el("appShell")
    .classList.add(
      "hidden"
    );

  el("appShell")
    .style.display =
    "none";

  /*
    Show login.
  */

  el("authScreen")
    .classList.remove(
      "hidden"
    );

  el("authScreen")
    .style.display =
    "";

  el("loginPassword").value =
    "";

  el("authMessage").textContent =
    "Signed out.";
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

el("loginForm")
  .addEventListener(
    "submit",
    e => {
      e.preventDefault();

      login(
        el("loginEmail")
          .value
          .trim(),

        el("loginPassword")
          .value
      );
    }
  );


el("logoutBtn")
  .addEventListener(
    "click",
    logout
  );


document
  .querySelectorAll(".tab")
  .forEach(b =>
    b.addEventListener(
      "click",
      () =>
        showTab(
          b.dataset.tab
        )
    )
  );


document
  .querySelectorAll(
    "[data-jump]"
  )
  .forEach(b =>
    b.addEventListener(
      "click",
      () =>
        showTab(
          b.dataset.jump
        )
    )
  );


/* =========================================================
   DAILY FORM
   ========================================================= */

el("dailyForm")
  .addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const d =
        el("dailyDate")
          .value;

      const x = {
        weight:
          +el(
            "dailyWeight"
          ).value || null,

        calories:
          +el(
            "dailyCalories"
          ).value || null,

        protein:
          +el(
            "dailyProtein"
          ).value || null,

        water:
          +el(
            "dailyWater"
          ).value || null,

        sleep:
          +el(
            "dailySleep"
          ).value || null,

        steps:
          +el(
            "dailySteps"
          ).value || null,

        strength:
          el(
            "dailyStrength"
          ).checked,

        badminton:
          el(
            "dailyBadminton"
          ).checked,

        notes:
          el(
            "dailyNotes"
          ).value
      };

      state.daily[d] =
        x;

      cache();

      renderAll();

      await upsertDaily(
        d,
        x
      );
    }
  );


/* =========================================================
   FOOD BUTTON
   ========================================================= */

el("addFood")
  .addEventListener(
    "click",
    () =>
      addFood(
        el("foodSelect")
          .value,

        el("foodQty")
          .value
      )
  );


/* =========================================================
   CLEAR FOOD
   ========================================================= */

el("clearFood")
  .addEventListener(
    "click",
    async () => {
      if (
        !confirm(
          "Clear today's food?"
        )
      ) {
        return;
      }

      if (
        currentUser &&
        cloudReady
      ) {
        const {
          error
        } =
          await supabaseClient
            .from(
              "food_logs"
            )
            .delete()
            .eq(
              "user_id",
              currentUser.id
            )
            .eq(
              "log_date",
              today()
            );

        if (error) {
          setSync(
            "Could not clear food",
            "error"
          );

          return;
        }
      }

      delete state.foods[
        today()
      ];

      cache();

      setSync(
        "Today's food cleared",
        "good"
      );

      renderAll();
    }
  );


/* =========================================================
   WORKOUT FORM
   ========================================================= */

el("workoutForm")
  .addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const x = {
        date:
          el(
            "workoutDate"
          ).value,

        split:
          el(
            "workoutSplit"
          ).value,

        exercise:
          el(
            "exerciseName"
          ).value,

        weight:
          +el(
            "exerciseWeight"
          ).value || null,

        sets:
          +el(
            "exerciseSets"
          ).value || null,

        reps:
          +el(
            "exerciseReps"
          ).value || null,

        badminton:
          el(
            "workoutBadminton"
          ).checked,

        completed:
          el(
            "workoutCompleted"
          ).checked
      };

      if (!currentUser) {
        state.workouts.push(
          x
        );

        cache();

        renderAll();

        return;
      }

      await insertWorkout(
        x
      );
    }
  );


/* =========================================================
   WEEK SELECT
   ========================================================= */

el("weekSelect")
  .addEventListener(
    "change",
    () => {
      state.week =
        +el(
          "weekSelect"
        ).value;

      cache();

      renderWeeks();
    }
  );


/* =========================================================
   EXPORT
   ========================================================= */

el("exportBtn")
  .addEventListener(
    "click",
    () => {
      const blob =
        new Blob(
          [
            JSON.stringify(
              state,
              null,
              2
            )
          ],
          {
            type:
              "application/json"
          }
        );

      const a =
        document.createElement(
          "a"
        );

      a.href =
        URL.createObjectURL(
          blob
        );

      a.download =
        "fittrack-backup.json";

      a.click();

      URL.revokeObjectURL(
        a.href
      );
    }
  );


/* =========================================================
   RESET
   ========================================================= */

el("resetBtn")
  .addEventListener(
    "click",
    async () => {
      if (
        !confirm(
          "Reset all FitTrack data? This will delete your cloud data for this account too."
        )
      ) {
        return;
      }

      if (
        currentUser &&
        cloudReady
      ) {
        const uid =
          currentUser.id;

        await Promise.all([
          supabaseClient
            .from(
              "food_logs"
            )
            .delete()
            .eq(
              "user_id",
              uid
            ),

          supabaseClient
            .from(
              "workout_logs"
            )
            .delete()
            .eq(
              "user_id",
              uid
            ),

          supabaseClient
            .from(
              "daily_logs"
            )
            .delete()
            .eq(
              "user_id",
              uid
            ),

          supabaseClient
            .from(
              "profiles"
            )
            .delete()
            .eq(
              "id",
              uid
            )
        ]);
      }

      localStorage.removeItem(
        KEY
      );

      state =
        blankState();

      renderAll();

      setSync(
        "Data reset",
        "good"
      );
    }
  );


/* =========================================================
   SUPABASE SESSION LISTENER
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (
    _event,
    session
  ) => {
    if (session) {
      currentUser =
        session.user;

      await enterApp();

    } else {
      currentUser = null;
      cloudReady = false;

      el("appShell")
        .classList.add(
          "hidden"
        );

      el("appShell")
        .style.display =
        "none";

      el("authScreen")
        .classList.remove(
          "hidden"
        );

      el("authScreen")
        .style.display =
        "";
    }
  }
);


/* =========================================================
   CHECK EXISTING SESSION
   ========================================================= */

(async () => {
  const {
    data
  } =
    await supabaseClient.auth.getSession();

  if (data.session) {
    currentUser =
      data.session.user;

    await enterApp();

  } else {
    currentUser = null;
    cloudReady = false;

    /*
      No session:
      show login screen only.
    */

    el("appShell")
      .classList.add(
        "hidden"
      );

    el("appShell")
      .style.display =
      "none";

    el("authScreen")
      .classList.remove(
        "hidden"
      );

    el("authScreen")
      .style.display =
      "";
  }
})();
