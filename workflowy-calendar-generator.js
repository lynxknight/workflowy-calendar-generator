let generatedCalendarContainer;
let calendarOptionsForm;
let monthCheckbox;
let weekCheckbox;
let yearCheckbox;
let monthAndYearCheckbox;
let dailyPredefinedItemsTextarea;
let bigItemsPredefinedTextarea;

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

const DEFAULT_DAILY_PREDEFINED_ITEMS = `life\n_creatine & omega3\nwork\n_prepare\n__understand free time\n__which big items you want to move\n__which meetings you need to prepare for`;

const DEFAULT_BIG_ITEMS_PREDEFINED = `life\n_meditate daily\n_gym twice a week\n_activity rings closed at least 6 days\nwork\n_status_report_written\npersonal projects\n_spent 3h or made significant progress(which one?)`;

//grab our containers and set some event listeners that get our app functioning the way we want
window.onload = () => {
  generatedCalendarContainer = document.getElementById("generated-calendar");
  calendarOptionsForm = document.getElementById("calendar-options");
  dailyPredefinedItemsTextarea = document.getElementById("daily-predefined-items");
  bigItemsPredefinedTextarea = document.getElementById("big-items-predefined");
  const startDateInput = document.getElementById("start-date");
  const endDateInput = document.getElementById("end-date");
  const weekStartSelect = document.getElementById("week-start");

  // Load daily predefined items from localStorage or use default
  const savedDailyItems = localStorage.getItem('dailyPredefinedItems');
  dailyPredefinedItemsTextarea.value = savedDailyItems || DEFAULT_DAILY_PREDEFINED_ITEMS;

  // Load big items predefined from localStorage or use default
  const savedBigItemsPredefined = localStorage.getItem('bigItemsPredefined');
  bigItemsPredefinedTextarea.value = savedBigItemsPredefined || DEFAULT_BIG_ITEMS_PREDEFINED;

  // Save daily predefined items whenever they change
  dailyPredefinedItemsTextarea.addEventListener('input', function() {
    localStorage.setItem('dailyPredefinedItems', this.value);
  });

  // Save big items predefined whenever it changes
  bigItemsPredefinedTextarea.addEventListener('input', function() {
    localStorage.setItem('bigItemsPredefined', this.value);
  });

  calendarOptionsForm.addEventListener("submit", function (event) {
    event.preventDefault();
  });

  weekCheckbox = document.getElementById("week");
  monthCheckbox = document.getElementById("month");
  yearCheckbox = document.getElementById("year");
  monthAndYearCheckbox = document.getElementById("month-and-year");

  // Set week checkbox as checked by default
  weekCheckbox.checked = true;

  // Load dayjs plugins first
  dayjs.extend(window.dayjs_plugin_weekOfYear);
  dayjs.extend(window.dayjs_plugin_isoWeek);

  // Initialize dates after plugins are loaded
  function initializeDates() {
    const today = dayjs();
    console.log('Initializing dates for:', today.format('YYYY-MM-DD'));
    
    const weekStart = weekStartSelect.value === 'monday' ? today.startOf('isoWeek') : today.startOf('week');
    const weekEnd = weekStartSelect.value === 'monday' ? today.endOf('isoWeek') : today.endOf('week');
    
    console.log('Setting week range:', weekStart.format('YYYY-MM-DD'), 'to', weekEnd.format('YYYY-MM-DD'));
    
    startDateInput.value = weekStart.format('YYYY-MM-DD');
    endDateInput.value = weekEnd.format('YYYY-MM-DD');
  }

  // Set initial dates
  initializeDates();

  // Update dates when week start changes
  weekStartSelect.addEventListener('change', function() {
    initializeDates();
  });

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
    if (monthCheckbox.checked || monthCheckbox.checked) {
      monthAndYearCheckbox.checked = false;
      monthAndYearCheckbox.disabled = true;
    } else {
      monthAndYearCheckbox.disabled = false;
    }
  });
};

/**
 *
 * @param {Date} date
 * @returns {string} - A string representation of the date object in the format of a Workflowy date object
 */
function buildWorkflowyDateObject(date) {
  //months are zero indexed which is super annoying and causes magic numbers in my code :/
  return `<time \n    startYear="${date.year()}"\n    startMonth="${date.month() + 1}" \n    startDay="${date.date()}">date\n    </time>`;
}

/**
 * @param {dayjs.Dayjs} startDate
 * @param {dayjs.Dayjs} endDate
 * @returns {string} - A string representation of a week range in workflowy
 */

function buildWorkflowyWeekRange(startDate, endDate) {
  return `<time\n    startYear="${startDate.year()}"\n    startMonth="${startDate.month() + 1}"\n    startDay="${startDate.date()}"\n    endYear="${endDate.year()}"\n    endMonth="${endDate.month() + 1}"\n    endDay="${endDate.date()}">week range\n    </time>`;
}

//write a function that takes in two date objects, start date and end date. generates an array of date objects between the two dates, including the start date and end date

/**
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Array<Date>} - An array of date objects between the start and end date
 */
function getDateRangeArray(startDate, endDate) {
  const dateArray = [];

  if (endDate.isBefore(startDate)) {
    alert("End date must be after start date");
    return;
  }

  let currentDate = dayjs(startDate);
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
    dateArray.push(currentDate);
    currentDate = currentDate.add(1, "day");
  }

  return dateArray;
}

// Add a helper function to parse indented items and create a hierarchy
function parseIndentedItems(items) {
  const result = [];
  const stack = [{ level: -1, node: { subs: result } }];

  items.forEach(item => {
    let trimmed = item.trim();
    if (!trimmed) return; // Skip empty lines

    const leadingUnderscores = item.match(/^_*/)[0].length;
    const level = Math.floor(leadingUnderscores)
    trimmed = trimmed.replace(/^_+/, '');


    // Create the new node
    const newNode = {
      text: trimmed,
      subs: []
    };

    // Find the appropriate parent
    while (stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    // Add to parent's subs
    stack[stack.length - 1].node.subs.push(newNode);

    // Push to stack for potential children
    stack.push({ level, node: newNode });
  });

  return result;
}

function buildOpml(jsonOpmlStructure, datesArray, calendarOptions) {
  let arrayToSort;
  const dailyPredefinedItems = dailyPredefinedItemsTextarea.value.split('\n');
  const bigItemsPredefined = bigItemsPredefinedTextarea.value.split('\n');

  if (calendarOptions.sortDescending) {
    arrayToSort = datesArray.slice().reverse();
  } else {
    arrayToSort = datesArray;
  }

  arrayToSort.forEach((date) => {
    let yearNode, monthNode, weekNode, monthAndYearNode;

    if (calendarOptions.monthAndYear) {
      //monthAndYear signifies a date formatted with the month name and then the year for a single heading ex January 2025
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

        // Add Big Items
        weekNode.subs.push({
          text: "Big Items",
          subs: parseIndentedItems(bigItemsPredefined)
        });
      }
    }

    const dateNode = {text: buildWorkflowyDateObject(date), subs: []};
    
    // Add predefined items to the date node with hierarchy
    if (dailyPredefinedItems.length > 0) {
      const parsedItems = parseIndentedItems(dailyPredefinedItems);
      dateNode.subs = parsedItems;
    }

    const targetNode =
      weekNode ||
      monthNode ||
      yearNode ||
      monthAndYearNode ||
      jsonOpmlStructure.opml.body;
    targetNode.subs.push(dateNode);
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

// Add a helper function to add predefined items to a date node
function addPredefinedItems(node, items) {
  if (items && items.length > 0) {
    if (!node.subs) {
      node.subs = [];
    }
    items.forEach(item => {
      node.subs.push({
        text: item.trim(),
        subs: []
      });
    });
  }
}

// Add a helper function to add big items to a week node
function addBigItems(node) {
  if (!node.subs) {
    node.subs = [];
  }
  node.subs.unshift({
    text: "Big Items",
    subs: []
  });
}

// Add function to reset predefined items to default
function resetDailyPredefinedItems() {
  dailyPredefinedItemsTextarea.value = DEFAULT_DAILY_PREDEFINED_ITEMS;
  localStorage.setItem('dailyPredefinedItems', DEFAULT_DAILY_PREDEFINED_ITEMS);
}

// Add function to reset big items to default
function resetBigItemsPredefined() {
  bigItemsPredefinedTextarea.value = DEFAULT_BIG_ITEMS_PREDEFINED;
  localStorage.setItem('bigItemsPredefined', DEFAULT_BIG_ITEMS_PREDEFINED);
}
