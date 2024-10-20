let generatedCalendarContainer;
let calendarOptionsForm;
let monthCheckbox;
let weekCheckbox;
//structure we need to follow from opml.js
const jsonOpmlStructure = {
  opml: {
    head: {},
    body: {
      subs: [], // Start with an empty array for years or whatever the root node is
    },
  },
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

//grab our containers and set some event listeners that get our app functioning the way we want
window.onload = () => {
  generatedCalendarContainer = document.getElementById("generated-calendar");
  calendarOptionsForm = document.getElementById("calendar-options");

  calendarOptionsForm.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the default form submission to keep semantic html buttons
  });

  weekCheckbox = document.getElementById("week");
  monthCheckbox = document.getElementById("month");

  weekCheckbox.addEventListener("change", disableMonths);
  monthCheckbox.addEventListener("change", disableWeeks);

  dayjs.extend(window.dayjs_plugin_isoWeek);
  dayjs.extend(window.dayjs_plugin_weekOfYear);
};

function disableMonths() {
  if (weekCheckbox.checked) {
    monthCheckbox.checked = false;
    monthCheckbox.disabled = true;
    monthCheckbox.title = "Months are disabled when weeks are enabled";
  } else {
    monthCheckbox.disabled = false;
    monthCheckbox.title = "";
  }
}

function disableWeeks() {
  if (monthCheckbox.checked) {
    weekCheckbox.checked = false;
    weekCheckbox.disabled = true;
    weekCheckbox.title = "Weeks are disabled when months are enabled";
  } else {
    weekCheckbox.disabled = false;
    weekCheckbox.title = "";
  }
}

/**
 *
 * @param {Date} date
 * @returns {string} - A string representation of the date object in the format of a Workflowy date object
 */
function buildWorkflowyDateObject(date) {
  //months are zero indexed which is super annoying and causes magic numbers in my code :/
  return `<time 
    startYear="${date.year()}"
    startMonth="${date.month() + 1}" 
    startDay="${date.date()}">date
    </time>`;
}

//write a function that takes in two date objects, start date and end date. generates an array of date objects between the two dates, including the start date and end date

/**
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Array<Date>} - An array of date objects between the start and end date
 */
function getDateRangeArray(startDate, endDate) {
  const dateArray = [];
  let currentDate = dayjs(startDate);

  if (endDate < startDate) {
    alert("End date must be after start date");
    return;
  }

  while (currentDate <= endDate) {
    // Exclude December dates that are part of week 1 of the next year
    if (!(currentDate.month() === 11 && currentDate.week() === 1)) {
      dateArray.push(dayjs(currentDate));
    }
    currentDate = currentDate.add(1, "day");
  }

  return dateArray;
}

/**
 * @param {Object} jsonOpmlStructure
 * @param {Array<Date>} datesArray
 * @param {Object} calendarOptions
 * @returns {void} - Populates the jsonOpmlStructure with the unique weeks from the datesArray
 */
function populateWeeks(jsonOpmlStructure, datesArray, calendarOptions) {
  const weekMap = {};
  datesArray.forEach((date) => {
    const year = date.year();
    const week = date.week();

    // Initialize week if not already done
    if (!weekMap[year]) {
      weekMap[year] = {};
    }
    if (!weekMap[year][week]) {
      weekMap[year][week] = [];
    }

    // Add the day to the corresponding week
    weekMap[year][week].push(date);
  });

  // Populate the year structure with weeks and their days
  for (const year in weekMap) {
    const yearNode = jsonOpmlStructure.opml.body.subs.find(
      (sub) => sub.level === "year" && sub.text == year
    );

    if (yearNode) {
      for (const week in weekMap[year]) {
        yearNode.subs.push({
          level: "week",
          text: `Week ${week}`,
          subs: weekMap[year][week].map((day) => ({
            text: buildWorkflowyDateObject(day),
          })),
        });
      }
    } else {
      for (const week in weekMap[year]) {
        jsonOpmlStructure.opml.body.subs.push({
          level: "week",
          text: `Week ${week}`,
          subs: weekMap[year][week].map((day) => ({
            text: buildWorkflowyDateObject(day),
          })),
        });
      }
    }
  }
}

/**
 *
 * @param {Object} jsonOpmlStructure
 * @param {Array<Date>} datesArray
 * @param {Object} calendarOptions
 * @returns {void} - Populates the jsonOpmlStructure with the unique from the datesArray
 */
function populateYears(jsonOpmlStructure, datesArray, calendarOptions) {
  const years = new Set(); // To collect unique years
  datesArray.forEach((date) => {
    years.add(date.year());
  });

  years.forEach((year) => {
    jsonOpmlStructure.opml.body.subs.push({
      level: "year",
      text: year,
      subs: [],
    });
  });

  if (!calendarOptions.month && !calendarOptions.week) {
    const yearNode = jsonOpmlStructure.opml.body.subs.find(
      (sub) => sub.level === "year"
    );
    yearNode.subs = datesArray.map((date) => ({
      text: buildWorkflowyDateObject(date),
    }));
  }
}

/**
 * @param {Object} jsonOpmlStructure
 * @param {Array<Date>} datesArray
 * @param {Object} calendarOptions
 * @returns {void} - Populates the jsonOpmlStructure with the unique months from the datesArray
 */
function populateMonths(jsonOpmlStructure, datesArray, calendarOptions) {
  const monthMap = {};
  datesArray.forEach((date) => {
    const monthIndex = date.month();

    // Initialize month if not already done
    if (!monthMap[monthIndex]) {
      monthMap[monthIndex] = {month: MONTH_NAMES[monthIndex], days: []};
    }

    // Add the day to the corresponding month
    monthMap[monthIndex].days.push(date);
  });

  // Populate the year structure with months and their days
  for (const monthIndex in monthMap) {
    const monthData = monthMap[monthIndex];
    if (calendarOptions.year) {
      const yearNodes = jsonOpmlStructure.opml.body.subs.filter(
        (sub) => sub.level === "year"
      );
      yearNodes.forEach((yearNode) => {
        const year = parseInt(yearNode.text, 10);
        const monthDaysForYear = monthData.days.filter(
          (day) => day.year() === year
        );

        if (monthDaysForYear.length > 0) {
          yearNode.subs.push({
            level: "month",
            text: monthData.month,
            subs: monthDaysForYear.map((day) => ({
              text: buildWorkflowyDateObject(day),
            })),
          });
        }
      });
    } else {
      jsonOpmlStructure.opml.body.subs.push({
        level: "month",
        text: monthData.month,
        subs: monthData.days.map((day) => ({
          text: buildWorkflowyDateObject(day),
        })),
      });
    }
  }
}

/**
 * @param {Object} jsonOpmlStructure
 * @param {Array<Date>} datesArray
 * @param {Object} calendarOptions
 * @returns {void} - Populates the jsonOpmlStructure with the dates from the datesArray
 */
function populateOpml(jsonOpmlStructure, datesArray, calendarOptions) {
  // Collect unique years from the dates

  // Create or update the year subs
  if (calendarOptions.year) {
    populateYears(jsonOpmlStructure, datesArray, calendarOptions);
  }

  if (calendarOptions.month) {
    populateMonths(jsonOpmlStructure, datesArray, calendarOptions);
  }

  if (calendarOptions.week && !calendarOptions.month) {
    populateWeeks(jsonOpmlStructure, datesArray, calendarOptions);
  }

  if (
    !calendarOptions.year &&
    !calendarOptions.month &&
    !calendarOptions.week
  ) {
    jsonOpmlStructure.opml.body.subs = datesArray.map((date) => ({
      text: buildWorkflowyDateObject(date),
    }));
  }
}

/**
 * @returns {void} - Generates the calendar based on the form data
 */
function generate() {
  resetOpmlStructure(jsonOpmlStructure);
  const formData = new FormData(calendarOptionsForm);

  if (!formData.get("start-date") || !formData.get("end-date")) {
    return;
  }
  //hack for local time zone
  const startDate = dayjs(`${formData.get("start-date")}T00:00:00`);
  const endDate = dayjs(`${formData.get("end-date")}T23:59:59`);
  const datesArray = getDateRangeArray(startDate, endDate);

  const calendarOptions = {
    year: formData.get("year") === "true",
    month: formData.get("month") === "true",
    week: formData.get("week") === "true",
  };

  populateOpml(jsonOpmlStructure, datesArray, calendarOptions);

  generatedCalendarContainer.innerText = opml.stringify(jsonOpmlStructure);
}

/**
 * @returns {void} - Copies the generated calendar to the clipboard
 */
function copyToClipboard() {
  navigator.clipboard
    .writeText(generatedCalendarContainer.innerText)
    .then(() => {
      console.log("Text copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
}

function resetOpmlStructure(jsonOpmlStructure) {
  jsonOpmlStructure.opml.body.subs = [];
}
