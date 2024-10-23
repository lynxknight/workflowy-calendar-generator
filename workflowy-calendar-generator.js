let generatedCalendarContainer;
let calendarOptionsForm;
let monthCheckbox;
let weekCheckbox;
let yearCheckbox;
let monthAndYearCheckbox;

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
  yearCheckbox = document.getElementById("year");
  monthAndYearCheckbox = document.getElementById("month-and-year");

  monthAndYearCheckbox.addEventListener("change", function () {
    if (monthAndYearCheckbox.checked) {
      monthCheckbox.checked = false;
      yearCheckbox.checked = false;
      monthCheckbox.disabled = true;
      yearCheckbox.disabled = true;
    } else {
      monthCheckbox.disabled = false;
      yearCheckbox.disabled = false;
    }
  });

  yearCheckbox.addEventListener("change", function () {
    if (yearCheckbox.checked || monthCheckbox.checked) {
      monthAndYearCheckbox.checked = false;
      monthAndYearCheckbox.disabled = true;
    } else {
      monthAndYearCheckbox.disabled = false;
    }
  });

  monthCheckbox.addEventListener("change", function () {
    if (monthCheckbox.checked || yearCheckbox.checked) {
      monthAndYearCheckbox.checked = false;
      monthAndYearCheckbox.disabled = true;
    } else {
      monthAndYearCheckbox.disabled = false;
    }
  });

  dayjs.extend(window.dayjs_plugin_weekOfYear);
  dayjs.extend(window.dayjs_plugin_isoWeek);
};

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

/**
 * @param {dayjs.Dayjs} startDate
 * @param {dayjs.Dayjs} endDate
 * @returns {string} - A string representation of a week range in workflowy
 */

function buildWorkflowyWeekRange(startDate, endDate) {
  return `<time
    startYear="${startDate.year()}"
    startMonth="${startDate.month() + 1}"
    startDay="${startDate.date()}"
    endYear="${endDate.year()}"
    endMonth="${endDate.month() + 1}"
    endDay="${endDate.date()}">week range
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

  if (endDate < startDate) {
    alert("End date must be after start date");
    return;
  }

  let currentDate = dayjs(startDate);
  while (currentDate < endDate) {
    dateArray.push(currentDate);
    currentDate = currentDate.add(1, "day");
  }

  return dateArray;
}

function buildOpml(jsonOpmlStructure, datesArray, calendarOptions) {
  let arrayToSort;

  if (calendarOptions.sortDescending) {
    arrayToSort = datesArray.slice().reverse();
  } else {
    arrayToSort = datesArray;
  }

  arrayToSort.forEach((date) => {
    let yearNode, monthNode, weekNode, monthAndYearNode;

    if (calendarOptions.monthAndYear) {
      //monthAndYear signifies a date formatted with the month name and then the year for a single heading ex January 2025
      //write the code to make that happen
      monthAndYearNode = jsonOpmlStructure.opml.body.subs.find(
        (node) => node.text === `${MONTH_NAMES[date.month()]} ${date.year()}`
      );
      if (!monthAndYearNode) {
        monthAndYearNode = {
          text: `${MONTH_NAMES[date.month()]} ${date.year()}`,
          subs: [],
        };
        jsonOpmlStructure.opml.body.subs.push(monthAndYearNode);
      }
    }

    if (calendarOptions.year) {
      yearNode = jsonOpmlStructure.opml.body.subs.find(
        (node) => node.text === date.year().toString()
      );
      if (!yearNode) {
        yearNode = {text: date.year().toString(), subs: []};
        jsonOpmlStructure.opml.body.subs.push(yearNode);
      }
    }

    if (calendarOptions.month) {
      monthNode = (
        yearNode ? yearNode.subs : jsonOpmlStructure.opml.body.subs
      ).find((node) => node.text === MONTH_NAMES[date.month()]);
      if (!monthNode) {
        monthNode = {text: MONTH_NAMES[date.month()], subs: []};
        (yearNode ? yearNode.subs : jsonOpmlStructure.opml.body.subs).push(
          monthNode
        );
      }
    }

    if (calendarOptions.week) {
      let startOfWeek = calendarOptions.startWeekOnMonday
        ? date.startOf("isoWeek")
        : date.startOf("week");
      let endOfWeek = calendarOptions.startWeekOnMonday
        ? date.endOf("isoWeek")
        : date.endOf("week");

      let weekRange;
      if (calendarOptions.sortDescending) {
        weekRange = buildWorkflowyWeekRange(endOfWeek, startOfWeek);
      } else {
        weekRange = buildWorkflowyWeekRange(startOfWeek, endOfWeek);
      }
      const weekLabel = `Week ${
        calendarOptions.startWeekOnMonday
          ? startOfWeek.isoWeek()
          : startOfWeek.week()
      }`;

      //strange and opinionated edge case
      if (date.year() !== endOfWeek.year() && calendarOptions.year) {
        let nextYearNode = jsonOpmlStructure.opml.body.subs.find(
          (node) => node.text === endOfWeek.year().toString()
        );
        if (!nextYearNode) {
          nextYearNode = {text: endOfWeek.year().toString(), subs: []};
          jsonOpmlStructure.opml.body.subs.push(nextYearNode);
        }

        yearNode = nextYearNode;

        if (calendarOptions.month) {
          monthNode = yearNode.subs.find(
            (node) => node.text === MONTH_NAMES[endOfWeek.month()]
          );
          if (!monthNode) {
            monthNode = {text: MONTH_NAMES[endOfWeek.month()], subs: []};
            yearNode.subs.push(monthNode);
          }
        }
      } else if (
        date.month() !== endOfWeek.month() &&
        calendarOptions.month &&
        yearNode
      ) {
        let nextMonthNode = yearNode.subs.find(
          (node) => node.text === MONTH_NAMES[endOfWeek.month()]
        );
        if (!nextMonthNode) {
          nextMonthNode = {text: MONTH_NAMES[endOfWeek.month()], subs: []};
          yearNode.subs.push(nextMonthNode);
        }

        monthNode = nextMonthNode;
      } else if (
        calendarOptions.monthAndYear &&
        date.month() !== endOfWeek.month() &&
        date.year() !== endOfWeek.year()
      ) {
        let nextMonthAndYearNode = jsonOpmlStructure.opml.body.subs.find(
          (node) =>
            node.text ===
            `${MONTH_NAMES[endOfWeek.month()]} ${endOfWeek.year()}`
        );
        if (!nextMonthAndYearNode) {
          nextMonthAndYearNode = {
            text: `${MONTH_NAMES[endOfWeek.month()]} ${endOfWeek.year()}`,
            subs: [],
          };
          jsonOpmlStructure.opml.body.subs.push(nextMonthAndYearNode);
        }

        monthAndYearNode = nextMonthAndYearNode;
      }
      weekNode = (
        monthNode
          ? monthNode.subs
          : yearNode
          ? yearNode.subs
          : monthAndYearNode
          ? monthAndYearNode.subs
          : jsonOpmlStructure.opml.body.subs
      ).find((node) => node.text === weekLabel);
      if (!weekNode) {
        weekNode = {
          text: weekLabel,
          _note: calendarOptions.weekRange ? weekRange : "",
          subs: [],
        };
        (monthNode
          ? monthNode.subs
          : yearNode
          ? yearNode.subs
          : monthAndYearNode
          ? monthAndYearNode.subs
          : jsonOpmlStructure.opml.body.subs
        ).push(weekNode);
      }
    }

    const targetNode =
      weekNode ||
      monthNode ||
      yearNode ||
      monthAndYearNode ||
      jsonOpmlStructure.opml.body;
    targetNode.subs.push({text: buildWorkflowyDateObject(date)});
  });
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
    monthAndYear: formData.get("month-and-year") === "true",
    weekRange: formData.get("week-range") === "true",
    startWeekOnMonday: formData.get("week-start") === "monday",
    sortDescending: formData.get("sort") === "desc",
  };

  buildOpml(jsonOpmlStructure, datesArray, calendarOptions);

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
