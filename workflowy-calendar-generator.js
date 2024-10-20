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

  dayjs.extend(window.dayjs_plugin_isoWeek);
  dayjs.extend(window.dayjs_plugin_weekOfYear);
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
  let currentDate = dayjs(startDate);

  if (endDate < startDate) {
    alert("End date must be after start date");
    return;
  }

  while (currentDate <= endDate) {
    currentDate = currentDate.add(1, "day");
    dateArray.push(dayjs(currentDate));
  }

  return dateArray;
}

function buildOpml(jsonOpmlStructure, datesArray, calendarOptions) {
  datesArray.forEach((date) => {
    let yearNode, monthNode, weekNode;

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
      const startOfWeek = date.startOf("week");
      const endOfWeek = date.endOf("week");

      // Handle edge case where week crosses into the next year
      //if the week is the first week of the year, but our date is still in the previous year, push the date into the next year node
      if (startOfWeek.year() !== date.year()) {
        yearNode = jsonOpmlStructure.opml.body.subs.find(
          (node) => node.text === startOfWeek.year().toString()
        );
        if (!yearNode) {
          yearNode = {text: startOfWeek.year().toString(), subs: []};
          jsonOpmlStructure.opml.body.subs.push(yearNode);
        }
      }

      const weekRange = buildWorkflowyWeekRange(startOfWeek, endOfWeek);
      const weekLabel = `Week ${startOfWeek.week()}`;
      weekNode = (
        monthNode
          ? monthNode.subs
          : yearNode
          ? yearNode.subs
          : jsonOpmlStructure.opml.body.subs
      ).find((node) => node.text === weekLabel);
      if (!weekNode) {
        weekNode = {text: weekLabel, _note: weekRange, subs: []};
        (monthNode
          ? monthNode.subs
          : yearNode
          ? yearNode.subs
          : jsonOpmlStructure.opml.body.subs
        ).push(weekNode);
      }
    }

    const targetNode =
      weekNode || monthNode || yearNode || jsonOpmlStructure.opml.body;
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
